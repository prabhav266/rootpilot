"use client"
import { useEffect, useState, useRef } from "react"
import AnalyticsDashboard from "./analytics-dashboard"

const API = process.env.NEXT_PUBLIC_API_URL

const WS = process.env.NEXT_PUBLIC_WS_URL

interface Event {
  id: number
  event_type: string
  repository_name: string
  payload: string
  summary?: string
  created_at?: string
}

interface DiagnosisAction {
  step: number
  title: string
  detail: string
  command: string
}

interface Diagnosis {
  summary?: string
  likely_cause?: string
  actions?: DiagnosisAction[]
  prevention?: string
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

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  //const [wsConnected, setWsConnected] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [diagnosing, setDiagnosing] = useState<number | null>(null)
  const [diagnoses, setDiagnoses] = useState<Record<number, Diagnosis>>({})
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  //const wsRef = useRef<WebSocket | null>(null)

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API}/events?limit=50`)
      if (!res.ok) return
      const data: Event[] = await res.json()

      const summarized = await Promise.all(
        data.map(async (event) => {
          try {
            const aiRes = await fetch(`${API}/ai/summarize`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(event),
            })
            const aiData = await aiRes.json()
            return { ...event, summary: aiData.summary }
          } catch {
            return event
          }
        })
      )
      setEvents(summarized)
    } finally {
      setLoading(false)
    }
  }

  /*useEffect(() => {
    fetchEvents()

    const connect = () => {
      const ws = new WebSocket(`${WS}/ws`)
      wsRef.current = ws
      ws.onopen = () => setWsConnected(true)
      ws.onclose = () => {
        setWsConnected(false)
        setTimeout(connect, 3000)
      }
      ws.onerror = () => setWsConnected(false)
      ws.onmessage = () => fetchEvents()
    }
    connect()
    return () => wsRef.current?.close()
  }, [])*/

  useEffect(() => {
  fetchEvents()

  const interval = setInterval(() => {
    fetchEvents()
  }, 10000)

  return () => clearInterval(interval)
}, [])

  const diagnose = async (event: Event) => {
    if (false && diagnoses[event.id]) {
      setExpandedId(expandedId === event.id ? null : event.id)
      return
    }
    setDiagnosing(event.id)
    setExpandedId(event.id)
    try {
      const res = await fetch(`${API}/ci/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      })
      const data = await res.json()
      console.log(data)
      setDiagnoses(prev => ({ ...prev, [event.id]: data }))
    } catch {
      setDiagnoses(prev => ({ ...prev, [event.id]: { error: "Diagnosis failed. Please try again." } }))
    } finally {
      setDiagnosing(null)
    }
  }

  const clearEvents = async () => {
    if (!confirm("Clear all events?")) return
    await fetch(`${API}/events`, { method: "DELETE" })
    setEvents([])
  }

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  return (
    <div>
      <AnalyticsDashboard events={events} />

      {/* ── Section header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 800, marginBottom: "3px", letterSpacing: "-0.2px" }}>
            Live Feed
          </h2>
          {/*<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
              {events.length} events
            </span>
            <span style={{ color: "var(--border-light)" }}>·</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
             <span className={`status-dot ${wsConnected ? "dot-green pulse-dot" : "dot-red"}`} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 600,
                letterSpacing: "0.06em",
                color: wsConnected ? "var(--green)" : "var(--red)",
              }}>
                {wsConnected ? "WS LIVE" : "RECONNECTING"}
              </span>
            </div>
          </div>*/}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={fetchEvents} className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "12px" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L8 0M6 2L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
          <button onClick={clearEvents} className="btn btn-danger" style={{ padding: "7px 14px", fontSize: "12px" }}>
            Clear All
          </button>
        </div>
      </div>

      {/* Loading */}
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
      {!loading && events.length === 0 && (
        <div className="card" style={{ padding: "64px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px", filter: "grayscale(0.3)" }}>📭</div>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
            No events yet
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "320px", margin: "0 auto", lineHeight: 1.7 }}>
            Connect a repository and add the webhook URL to start receiving live events.
          </p>
        </div>
      )}

      {/* Event list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {events.map((event, idx) => {
          const conclusion = getConclusion(event)
          const isFailed   = event.event_type === "workflow_run" && conclusion === "failure"
          const diag       = diagnoses[event.id]
          const isExpanded = expandedId === event.id

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
                  {/* Top badge row */}
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
                <div style={{
                  borderTop: "1px solid var(--border)",
                  background: "rgba(0,0,0,.22)",
                }}>
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
                          {diag.prevention}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Raw payload ── */}
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
                    {JSON.stringify(JSON.parse(event.payload), null, 2)}
                  </pre>
                </div>
              )}

              
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
