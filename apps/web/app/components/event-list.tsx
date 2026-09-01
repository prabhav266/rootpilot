"use client"
import { useCallback, useEffect, useState } from "react"
import AnalyticsDashboard from "./analytics-dashboard"
import { useSession } from "next-auth/react"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

interface Event {
  id: number
  owner_github_id?: string | null
  event_type: string
  repository_github_id?: string | null
  repository_name: string
  payload: string
  jobs_url?: string
  summary?: string
  created_at?: string
}

interface DiagnosisAction {
  step: string | number
  title: string
  detail: string
  command: string
}

interface Diagnosis {
  summary?: string
  likely_cause?: string
  actions?: DiagnosisAction[]
  prevention?: string | string[]
  failed_steps?: { step_name: string; status: string }[]
  error?: string
}


function timeAgo(iso: string | undefined) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}


function eventBadgeClass(type: string) {
  if (type === "workflow_run") return "badge badge-blue"
  if (type === "push")         return "badge badge-green"
  if (type === "ping")         return "badge badge-muted"
  if (type === "pull_request") return "badge badge-amber"
  return "badge badge-muted"
}

function getConclusion(event: Event): string | null {
  try {
    const p = JSON.parse(event.payload)
    return p?.workflow_run?.conclusion || null
  } catch { return null }
}

const EVENT_ICONS: Record<string, string> = {
  push:         "🚀",
  ping:         "🔗",
  pull_request: "🔀",
  workflow_job: "⚙️",
}

function EventIcon({ type, conclusion }: { type: string; conclusion: string | null }) {
  let icon = EVENT_ICONS[type] || "📌"
  let bg = "var(--accent-dim)"
  let border = "rgba(0,229,255,0.12)"

  if (type === "workflow_run") {
    if (conclusion === "success") { icon = "✅"; bg = "var(--green-dim)"; border = "rgba(0,255,136,0.12)" }
    else if (conclusion === "failure") { icon = "❌"; bg = "var(--red-dim)"; border = "rgba(255,61,87,0.12)" }
    else { icon = "🔄" }
  }

  return (
    <div style={{
      width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg, border: `1px solid ${border}`,
      fontSize: "17px",
    }}>
      {icon}
    </div>
  )
}

function formatLocalSummary(event: Event): string {
  if (event.summary) return event.summary
  try {
    const payload = JSON.parse(event.payload || "{}")
    if (event.event_type === "workflow_run") {
      const run = payload.workflow_run
      const name = run?.name || "CI Workflow"
      const conclusion = run?.conclusion
      return conclusion === "success"
        ? `CI workflow '${name}' completed successfully in ${event.repository_name}.`
        : conclusion === "failure"
        ? `CI workflow '${name}' failed in ${event.repository_name}.`
        : `CI workflow '${name}' ran in ${event.repository_name}.`
    }
    if (event.event_type === "push") {
      const commits = payload.commits || []
      const branch = (payload.ref || "").replace("refs/heads/", "")
      const count = commits.length
      return `${count} commit(s) pushed to ${branch || "main"} in ${event.repository_name}.`
    }
    if (event.event_type === "ping") {
      return `Webhook connected successfully to ${event.repository_name}.`
    }
    if (event.event_type === "pull_request") {
      const pr = payload.pull_request
      return `Pull Request #${pr?.number || ""} ${payload.action || "updated"} in ${event.repository_name}.`
    }
  } catch {
    // ignore
  }
  return `${(event.event_type || "Event").replace(/_/g, " ")} in ${event.repository_name}`
}

function getDirectGitHubLink(event: Event): { url: string; label: string } | null {
  try {
    const payload = JSON.parse(event.payload || "{}")
    if (event.event_type === "workflow_run" && payload.workflow_run?.html_url) {
      return { url: payload.workflow_run.html_url, label: "View Run ↗" }
    }
    if (event.event_type === "pull_request" && payload.pull_request?.html_url) {
      return { url: payload.pull_request.html_url, label: `PR #${payload.pull_request.number} ↗` }
    }
    if (event.event_type === "push" && (payload.compare || payload.head_commit?.url)) {
      return { url: payload.compare || payload.head_commit.url, label: "Diff ↗" }
    }
  } catch {
    // ignore
  }
  return null
}

export default function EventList({ onEventsChange }: { onEventsChange?: (events: Event[]) => void }) {
  const { data: session } = useSession()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [diagnosing, setDiagnosing] = useState<number | null>(null)
  const [diagnoses, setDiagnoses] = useState<Record<number, Diagnosis>>({})
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "failures" | "workflows" | "pushes" | "prs">("all")
  const [repoFilter, setRepoFilter] = useState<string>("all")
  const githubUserId = session?.user?.id

  const fetchEvents = useCallback(async () => {
    if (!githubUserId) {
      setEvents([])
      onEventsChange?.([])
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({
        limit: "50",
        owner_github_id: githubUserId,
      })
      const res = await fetch(`${API}/events?${params.toString()}`)
      if (!res.ok) return
      const data: Event[] = await res.json()

      const formatted: Event[] = data.map((event) => ({
        ...event,
        summary: event.summary || formatLocalSummary(event),
      }))

      setEvents(formatted)
      onEventsChange?.(formatted)
    } finally {
      setLoading(false)
    }
  }, [githubUserId, onEventsChange])

  // Polling fallback
  useEffect(() => {
    queueMicrotask(() => {
      void fetchEvents()
    })
    const interval = setInterval(() => {
      void fetchEvents()
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  // Real-time WebSocket connection
  useEffect(() => {
    if (!githubUserId) return

    const wsProtocol = API.startsWith("https") ? "wss" : "ws"
    const wsHost = API.replace(/^https?:\/\//, "").replace(/\/$/, "")
    const wsUrl = `${wsProtocol}://${wsHost}/ws`

    let socket: WebSocket | null = null
    let reconnectTimer: NodeJS.Timeout

    function connectWs() {
      try {
        socket = new WebSocket(wsUrl)
        socket.onopen = () => {
          setWsConnected(true)
        }
        socket.onmessage = (e) => {
          try {
            const newEv = JSON.parse(e.data)
            if (newEv && newEv.id) {
              const formatted: Event = {
                ...newEv,
                summary: newEv.summary || formatLocalSummary(newEv),
              }
              setEvents(prev => {
                if (prev.some(x => x.id === formatted.id)) return prev
                const updated = [formatted, ...prev]
                onEventsChange?.(updated)
                return updated
              })
            }
          } catch {
            // ignore
          }
        }
        socket.onclose = () => {
          setWsConnected(false)
          reconnectTimer = setTimeout(connectWs, 5000)
        }
        socket.onerror = () => {
          setWsConnected(false)
        }
      } catch {
        setWsConnected(false)
      }
    }

    connectWs()

    return () => {
      clearTimeout(reconnectTimer)
      if (socket) socket.close()
    }
  }, [githubUserId, onEventsChange])

  const diagnose = async (event: Event) => {
    if (diagnoses[event.id]) {
      setExpandedId(expandedId === event.id ? null : event.id)
      return
    }

    setDiagnosing(event.id)
    setExpandedId(event.id)

    try {
      const body: Record<string, string> = {
        jobs_url: event.jobs_url || "",
      }
      if (session?.accessToken) {
        body.github_token = session.accessToken
      }

      const res = await fetch(`${API}/ci/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setDiagnoses(prev => ({ ...prev, [event.id]: data }))
    } catch {
      setDiagnoses(prev => ({ ...prev, [event.id]: { error: "Diagnosis failed. Please try again." } }))
    } finally {
      setDiagnosing(null)
    }
  }


  const clearEvents = async () => {
    if (!githubUserId) return

    if (!confirm("Clear all events?")) return
    const params = new URLSearchParams({ owner_github_id: githubUserId })
    await fetch(`${API}/events?${params.toString()}`, { method: "DELETE" })
    setEvents([])
    onEventsChange?.([])
    setDiagnoses({})
  }

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  const repoNames = Array.from(new Set(events.map(e => e.repository_name).filter(Boolean)))

  const filteredEvents = events.filter(e => {
    if (repoFilter !== "all" && e.repository_name !== repoFilter) return false
    const conclusion = getConclusion(e)
    const isFailed = (e.event_type === "workflow_run" && conclusion === "failure")
    if (filterType === "failures") return isFailed
    if (filterType === "workflows") return e.event_type === "workflow_run" || e.event_type === "workflow_job"
    if (filterType === "pushes") return e.event_type === "push"
    if (filterType === "prs") return e.event_type === "pull_request"
    return true
  })

  return (
    <div>
      <AnalyticsDashboard events={events} />

      {/* ── Section header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "3px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-0.2px" }}>
              Live Feed
            </h2>
            <span
              className={`badge ${wsConnected ? "badge-green" : "badge-blue"}`}
              style={{ fontSize: "10px", padding: "2px 8px" }}
              title={wsConnected ? "Connected to WebSocket real-time event stream" : "Polling every 15 seconds"}
            >
              <span className={`status-dot ${wsConnected ? "dot-green pulse-dot" : "dot-blue"}`} style={{ width: "5px", height: "5px" }} />
              {wsConnected ? "LIVE WS" : "POLLING"}
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
            Showing {filteredEvents.length} of {events.length} events
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {repoNames.length > 1 && (
            <select
              value={repoFilter}
              onChange={e => setRepoFilter(e.target.value)}
              className="input"
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "var(--r-sm)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">All Repositories</option>
              {repoNames.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}

          <button onClick={fetchEvents} className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "12px" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L8 0M6 2L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>

          {events.length > 0 && (
            <button onClick={clearEvents} className="btn btn-danger" style={{ padding: "7px 14px", fontSize: "12px" }}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      {events.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { id: "all", label: "All Events", count: events.length },
            { id: "failures", label: "🚨 Failures", count: events.filter(e => e.event_type === "workflow_run" && getConclusion(e) === "failure").length },
            { id: "workflows", label: "🔄 Workflows", count: events.filter(e => e.event_type === "workflow_run" || e.event_type === "workflow_job").length },
            { id: "pushes", label: "🚀 Pushes", count: events.filter(e => e.event_type === "push").length },
            { id: "prs", label: "🔀 Pull Requests", count: events.filter(e => e.event_type === "pull_request").length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className="btn btn-ghost"
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "20px",
                background: filterType === tab.id ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.03)",
                color: filterType === tab.id ? "var(--accent)" : "var(--text-secondary)",
                borderColor: filterType === tab.id ? "rgba(0,229,255,0.3)" : "var(--border)",
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                opacity: 0.7,
                marginLeft: "4px",
              }}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: "18px 20px", opacity: 1 - i * 0.18 }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div className="skeleton" style={{ width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: "12px", width: "30%", marginBottom: "8px" }} />
                  <div className="skeleton" style={{ height: "14px", width: "65%", marginBottom: "8px" }} />
                  <div className="skeleton" style={{ height: "11px", width: "45%" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredEvents.length === 0 && (
        <div className="card" style={{ padding: "64px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px", filter: "grayscale(0.3)" }}>📭</div>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
            {events.length === 0 ? "No events yet" : "No events matching current filter"}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "320px", margin: "0 auto", lineHeight: 1.7 }}>
            {events.length === 0
              ? "Connect a repository and add the webhook URL to start receiving live events."
              : "Try selecting a different filter tab or clearing the repository filter."}
          </p>
        </div>
      )}

      {/* Event list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filteredEvents.map((event, idx) => {
          const conclusion = getConclusion(event)
          const isFailed   = event.event_type === "workflow_run" && conclusion === "failure"
          const diag       = diagnoses[event.id]
          const isExpanded = expandedId === event.id
          const githubLink = getDirectGitHubLink(event)

          return (
            <div
              key={event.id}
              className={`card event-item ${isFailed ? "card-failed" : ""}`}
              style={{ animationDelay: `${idx * 0.025}s` }}
            >
              {/* ── Main row ── */}
              <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <EventIcon type={event.event_type} conclusion={conclusion} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Badge row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px", flexWrap: "wrap" }}>
                    <span className={eventBadgeClass(event.event_type)}>
                      {event.event_type}
                    </span>
                    {isFailed && (
                      <span className="badge badge-red">
                        <span className="status-dot dot-red" style={{ width: "5px", height: "5px" }} />
                        Failed
                      </span>
                    )}
                    {conclusion === "success" && (
                      <span className="badge badge-green">✓ Success</span>
                    )}
                    <span style={{
                      marginLeft: "auto",
                      fontFamily: "var(--font-mono)", fontSize: "10px",
                      color: "var(--text-dim)",
                    }}>
                      {timeAgo(event.created_at)}
                    </span>
                  </div>

                  {/* Summary */}
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px", lineHeight: 1.4 }}>
                    {event.summary || event.event_type}
                  </p>

                  {/* Repo name */}
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                    {event.repository_name}
                  </p>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "7px", flexShrink: 0, alignItems: "center" }}>
                  {githubLink && (
                    <a
                      href={githubLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                      style={{ padding: "6px 10px", fontSize: "11px", color: "var(--text-secondary)" }}
                      title="Open on GitHub"
                    >
                      {githubLink.label}
                    </a>
                  )}

                  {isFailed && (
                    <button
                      onClick={() => diagnose(event)}
                      className="btn"
                      style={{
                        padding: "6px 13px", fontSize: "11px",
                        background: "rgba(255,61,87,0.09)",
                        color: "var(--red)",
                        border: "1px solid rgba(255,61,87,0.2)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {diagnosing === event.id ? (
                        <>
                          <span className="spin" style={{
                            width: "10px", height: "10px",
                            border: "1.5px solid rgba(255,61,87,0.25)",
                            borderTopColor: "var(--red)",
                            borderRadius: "50%", display: "inline-block",
                          }} />
                          Analyzing…
                        </>
                      ) : diag
                          ? (isExpanded ? "▲ Hide" : "▼ Show")
                          : "🤖 Diagnose"
                      }
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    className="btn btn-ghost"
                    style={{ padding: "6px 10px", fontSize: "11px", color: "var(--text-muted)" }}
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {/* ── AI Diagnosis panel ── */}
              {isExpanded && diag && !diag.error && (
                <div style={{ borderTop: "1px solid var(--border)", background: "rgba(0,0,0,.22)" }}>
                  {/* Panel header */}
                  <div style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex", alignItems: "center", gap: "10px",
                  }}>
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "6px",
                      background: "var(--red-dim)",
                      border: "1px solid rgba(255,61,87,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px",
                    }}>🤖</div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)", letterSpacing: "0.02em" }}>
                      Gemini AI Diagnosis
                    </span>
                    <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-dim)", letterSpacing: "0.08em" }}>
                      POWERED BY GEMINI
                    </span>
                  </div>

                  <div style={{ padding: "18px" }}>
                    {/* Summary */}
                    {diag.summary && (
                      <div style={{
                        padding: "13px 16px", marginBottom: "16px",
                        background: "rgba(255,61,87,0.06)",
                        borderRadius: "var(--r-md)",
                        border: "1px solid rgba(255,61,87,0.12)",
                        borderLeft: "3px solid var(--red)",
                      }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>
                          {diag.summary}
                        </p>
                      </div>
                    )}

                    {/* Root cause */}
                    {diag.likely_cause && (
                      <div style={{ marginBottom: "16px" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "7px" }}>
                          Root Cause
                        </p>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.75 }}>
                          {diag.likely_cause}
                        </p>
                      </div>
                    )}

                    {/* Fix actions */}
                    {diag.actions && diag.actions.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                          Fix Actions
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {diag.actions.map((action, i) => (
                            <div key={i} style={{
                              padding: "13px 15px",
                              background: "rgba(255,255,255,.018)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--r-md)",
                            }}>
                              <div style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                                <span style={{
                                  width: "22px", height: "22px", borderRadius: "50%",
                                  flexShrink: 0, background: "var(--accent-dim)",
                                  color: "var(--accent)", border: "1px solid rgba(0,229,255,.2)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700,
                                }}>
                                  {action.step}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                                    {action.title}
                                  </p>
                                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: action.command ? "10px" : 0 }}>
                                    {action.detail}
                                  </p>
                                  {action.command && (
                                    <div style={{
                                      display: "flex", alignItems: "center",
                                      background: "var(--bg-inset)",
                                      borderRadius: "var(--r-sm)",
                                      border: "1px solid var(--border)",
                                      overflow: "hidden",
                                    }}>
                                      <span style={{
                                        padding: "7px 10px",
                                        fontFamily: "var(--font-mono)", fontSize: "10px",
                                        color: "var(--text-dim)",
                                        borderRight: "1px solid var(--border)",
                                        flexShrink: 0,
                                      }}>$</span>
                                      <code style={{
                                        fontFamily: "var(--font-mono)", fontSize: "11px",
                                        color: "var(--green)", flex: 1,
                                        padding: "7px 10px", overflowX: "auto",
                                      }}>
                                        {action.command}
                                      </code>
                                      <button
                                        onClick={() => copyCmd(action.command)}
                                        style={{
                                          background: copiedCmd === action.command ? "rgba(0,255,136,0.08)" : "transparent",
                                          border: "none",
                                          borderLeft: "1px solid var(--border)",
                                          color: copiedCmd === action.command ? "var(--green)" : "var(--text-muted)",
                                          cursor: "pointer",
                                          padding: "7px 12px",
                                          fontFamily: "var(--font-mono)",
                                          fontSize: "10px",
                                          fontWeight: 600,
                                          transition: "all .2s",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {copiedCmd === action.command ? "✓" : "copy"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prevention */}
                    {diag.prevention && (
                      <div style={{
                        padding: "13px 16px",
                        background: "var(--green-dim)",
                        borderRadius: "var(--r-md)",
                        border: "1px solid rgba(0,255,136,0.12)",
                        borderLeft: "3px solid var(--green)",
                      }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color: "var(--green)", marginBottom: "5px", letterSpacing: "0.06em" }}>
                          💡 PREVENTION
                        </p>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                          {Array.isArray(diag.prevention)
                            ? diag.prevention.join(" ")
                            : diag.prevention}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Raw payload (expanded, no diagnosis) ── */}
              {isExpanded && !diag && (
                <div style={{ borderTop: "1px solid var(--border)", background: "rgba(0,0,0,.15)" }}>
                  <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Raw Payload
                    </span>
                  </div>
                  <pre style={{
                    padding: "14px 18px",
                    fontSize: "11px", color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                    overflowX: "auto", maxHeight: "280px", overflowY: "auto",
                    lineHeight: 1.65,
                  }}>
                    {(() => {
                      try { return JSON.stringify(JSON.parse(event.payload), null, 2) }
                      catch { return event.payload }
                    })()}
                  </pre>
                </div>
              )}


              {/* Error state */}
              {diag?.error && isExpanded && (
                <div style={{
                  borderTop: "1px solid var(--border)",
                  padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <span style={{ fontSize: "13px" }}>⚠️</span>
                  <span style={{ fontSize: "12px", color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                    {diag.error}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
