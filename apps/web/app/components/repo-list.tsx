"use client"
import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

interface GithubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  private: boolean
  language: string | null
  pushed_at: string
  description: string | null
}

interface ConnectedRepo {
  id: number
  owner_github_id: string
  owner_login: string | null
  repo_name: string
  github_repo_id: string
  repo_url: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572A5",
  Go: "#00add8", Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d",
  Ruby: "#CC342D", Swift: "#FA7343", Kotlin: "#7F52FF", CSS: "#563d7c",
}

export default function RepoList() {
  const { data: session } = useSession()
  const [repos, setRepos] = useState<GithubRepo[]>([])
  const [connected, setConnected] = useState<ConnectedRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState<number | null>(null)
  const [disconnecting, setDisconnecting] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState(false)
  const githubUserId = session?.user?.id

  // Fetch repos already registered in our backend
  const fetchConnected = useCallback(async () => {
    if (!githubUserId) return

    try {
      const params = new URLSearchParams({ owner_github_id: githubUserId })
      const res = await fetch(`${API}/repositories?${params.toString()}`)
      if (!res.ok) return
      const data: ConnectedRepo[] = await res.json()
      setConnected(data)
    } catch (err) {
      console.error("fetchConnected error:", err)
    }
  }, [githubUserId])

  // Fetch user's GitHub repos via GitHub API
  useEffect(() => {
    async function loadRepos() {
      if (!session?.accessToken || !githubUserId) {
        setRepos([])
        setConnected([])
        return
      }

      setLoading(true)
      try {
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=50&type=all", {
          headers: { Authorization: `token ${session.accessToken}` },
        })
        const data = await res.json()
        if (Array.isArray(data)) setRepos(data)
        await fetchConnected()
      } finally {
        setLoading(false)
      }
    }

    loadRepos()
  }, [session?.accessToken, githubUserId, fetchConnected])

  const connect = async (repo: GithubRepo) => {
    if (!githubUserId) return

    setConnecting(repo.id)
    try {
      const res = await fetch(`${API}/repositories/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_github_id: githubUserId,
          owner_login: session?.user?.login ?? session?.user?.name ?? null,
          repo_name: repo.full_name,
          github_repo_id: String(repo.id),   // backend expects string
          repo_url: repo.html_url,
        }),
      })
      if (res.ok) {
        await fetchConnected()
      }
    } finally {
      setConnecting(null)
    }
  }

  const disconnect = async (repo: GithubRepo) => {
    if (!githubUserId) return

    const match = connected.find(c => c.github_repo_id === String(repo.id))
    if (!match) return
    setDisconnecting(repo.id)
    try {
      const params = new URLSearchParams({ owner_github_id: githubUserId })
      await fetch(`${API}/repositories/${match.id}?${params.toString()}`, { method: "DELETE" })
      await fetchConnected()
    } finally {
      setDisconnecting(null)
    }
  }

  const webhookUrl = `${API.replace(/\/$/, "")}/webhooks/github/`
  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isConnected = (repo: GithubRepo) =>
    connected.some(c => c.github_repo_id === String(repo.id))

  const filtered = repos.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  /* ── Hero (logged out) ── */
  if (!session) {
    return (
      <div style={{ textAlign: "center", padding: "90px 24px 70px" }} className="fade-up">
        <div style={{
          width: "72px", height: "72px", borderRadius: "20px",
          background: "linear-gradient(135deg, var(--accent) 0%, #0099bb 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px",
          boxShadow: "0 0 40px var(--accent-glow), 0 0 80px rgba(0,229,255,0.1)",
        }}>
          <svg width="34" height="34" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2.5" fill="#060709"/>
            <circle cx="9" cy="9" r="6.5" stroke="#060709" strokeWidth="1.5" fill="none"/>
            <line x1="9" y1="1" x2="9" y2="3.5" stroke="#060709" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="14.5" x2="9" y2="17" stroke="#060709" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="1" y1="9" x2="3.5" y2="9" stroke="#060709" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="14.5" y1="9" x2="17" y2="9" stroke="#060709" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{ fontSize: "42px", fontWeight: 800, marginBottom: "14px", letterSpacing: "-1px", lineHeight: 1.1 }}>
          Root<span style={{ color: "var(--accent)" }}>Pilot</span>
        </h1>

        <p style={{
          fontSize: "16px", color: "var(--text-secondary)",
          maxWidth: "440px", margin: "0 auto 48px", lineHeight: 1.75,
        }}>
          AI-powered GitHub monitoring that watches your repositories,
          catches failures instantly, and tells you exactly how to fix them.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          {[
            { icon: "⚡", label: "Real-time webhooks" },
            { icon: "🤖", label: "Gemini AI diagnosis" },
            { icon: "📊", label: "Analytics dashboard" },
            { icon: "🔌", label: "WebSocket live feed" },
          ].map(f => (
            <div key={f.label} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "9px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "40px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              fontWeight: 500,
            }}>
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ── Main repo view ── */
  return (
    <div className="fade-up" style={{ marginBottom: "40px" }}>

      {/* ── Webhook card ── */}
      <div className="card" style={{
        padding: "20px 24px",
        marginBottom: "28px",
        background: "rgba(0,229,255,0.03)",
        borderColor: "rgba(0,229,255,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "7px",
                background: "var(--accent-dim)",
                border: "1px solid rgba(0,229,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px",
              }}>🔗</div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>Webhook Endpoint</span>
              <span className="badge badge-blue">Required</span>
            </div>

            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.6 }}>
              Add this URL to your GitHub repo under{" "}
              <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "11px" }}>Settings → Webhooks</code>.
              {" "}Select <em>Send me everything</em> for full event capture.
            </p>

            <div style={{
              display: "flex", alignItems: "center", gap: "0",
              background: "var(--bg-inset)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border)",
              overflow: "hidden",
              maxWidth: "520px",
            }}>
              <div style={{ padding: "9px 14px", borderRight: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em" }}>POST</span>
              </div>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--green)", flex: 1, padding: "9px 12px", overflowX: "auto", whiteSpace: "nowrap" }}>
                {webhookUrl}
              </code>
              <button
                onClick={copyWebhook}
                style={{
                  background: copied ? "rgba(0,255,136,0.1)" : "transparent",
                  border: "none",
                  borderLeft: "1px solid var(--border)",
                  color: copied ? "var(--green)" : "var(--text-muted)",
                  cursor: "pointer",
                  padding: "9px 14px",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  transition: "all .2s",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Repos header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 800, marginBottom: "3px", letterSpacing: "-0.2px" }}>
            Repositories
          </h2>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            {connected.length} connected · {repos.length} available
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <svg
            width="13" height="13" viewBox="0 0 16 16" fill="none"
            style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Filter repos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: "32px", paddingRight: "14px", paddingTop: "8px", paddingBottom: "8px", width: "220px" }}
          />
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: "20px", opacity: 1 - i * 0.12 }}>
              <div className="skeleton" style={{ height: "14px", width: "60%", marginBottom: "10px" }} />
              <div className="skeleton" style={{ height: "11px", width: "80%", marginBottom: "16px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <div className="skeleton" style={{ height: "10px", width: "50px" }} />
                <div className="skeleton" style={{ height: "10px", width: "70px" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Repo grid */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
          {filtered.map((repo, idx) => {
            const conn = isConnected(repo)
            const isBusy = connecting === repo.id || disconnecting === repo.id
            return (
              <div
                key={repo.id}
                className={`card ${conn ? "card-connected" : ""}`}
                style={{
                  padding: "18px 20px",
                  animation: `fadeUp .4s ${idx * 0.03}s cubic-bezier(.16,1,.3,1) both`,
                }}
              >
                {/* Repo name row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", lineHeight: 1 }}>
                        {repo.private ? "🔒" : "🌐"}
                      </span>
                      <span style={{
                        fontSize: "14px", fontWeight: 700,
                        color: conn ? "var(--green)" : "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        letterSpacing: "-0.2px",
                      }}>
                        {repo.name}
                      </span>
                    </div>
                    {repo.description && (
                      <p style={{
                        fontSize: "12px", color: "var(--text-muted)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        lineHeight: 1.5,
                      }}>
                        {repo.description}
                      </p>
                    )}
                  </div>

                  {conn && (
                    <span className="badge badge-green" style={{ flexShrink: 0, marginLeft: "8px" }}>
                      ✓ Active
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
                  {repo.language && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{
                        width: "9px", height: "9px", borderRadius: "50%",
                        background: LANG_COLORS[repo.language] || "var(--text-muted)",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                        {repo.language}
                      </span>
                    </div>
                  )}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
                    pushed {timeAgo(repo.pushed_at)}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {!conn ? (
                    <button
                      onClick={() => connect(repo)}
                      disabled={isBusy}
                      className="btn btn-primary"
                      style={{ padding: "7px 14px", fontSize: "12px", flex: 1, justifyContent: "center" }}
                    >
                      {isBusy ? (
                        <>
                          <span className="spin" style={{
                            width: "11px", height: "11px",
                            border: "2px solid rgba(3,8,12,0.3)",
                            borderTopColor: "#060709",
                            borderRadius: "50%", display: "inline-block",
                          }} />
                          Connecting…
                        </>
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
                            <line x1="6" y1="3" x2="6" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <line x1="3" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          Connect
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => disconnect(repo)}
                      disabled={isBusy}
                      className="btn btn-danger"
                      style={{ padding: "7px 14px", fontSize: "12px", flex: 1, justifyContent: "center" }}
                    >
                      {isBusy ? (
                        <>
                          <span className="spin" style={{
                            width: "11px", height: "11px",
                            border: "2px solid rgba(255,61,87,0.25)",
                            borderTopColor: "var(--red)",
                            borderRadius: "50%", display: "inline-block",
                          }} />
                          Disconnecting…
                        </>
                      ) : "Disconnect"}
                    </button>
                  )}
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ padding: "7px 14px", fontSize: "12px" }}
                  >
                    GitHub
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && repos.length > 0 && (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
          <p style={{ fontSize: "14px" }}>{`No repositories match "${search}"`}</p>
        </div>
      )}

      {/* No repos at all */}
      {!loading && repos.length === 0 && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "14px" }}>📦</div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
            No repositories found
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Make sure your GitHub account has repositories and your token has repo access.
          </p>
        </div>
      )}
    </div>
  )
}
