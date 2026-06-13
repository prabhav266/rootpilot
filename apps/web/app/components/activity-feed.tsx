"use client"
import { useEffect, useState } from "react"

const API = process.env.NEXT_PUBLIC_API_URL

interface Event {
  id: number
  event_type: string
  repository_name: string
  created_at?: string
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

const TYPE_ICON: Record<string, string> = {
  push: "🚀",
  workflow_run: "🔄",
  ping: "🔗",
  pull_request: "🔀",
  workflow_job: "⚙️",
  check_run: "✓",
  check_suite: "📋",
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/events?limit=20`)
        if (res.ok) setEvents(await res.json())
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", opacity: 1 - i * 0.15 }}>
            <div className="skeleton" style={{ width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: "11px", width: "55%", marginBottom: "5px" }} />
              <div className="skeleton" style={{ height: "10px", width: "35%" }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
        No activity yet
      </p>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      {events.map((e, i) => (
        <div key={e.id} style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 10px",
          borderRadius: "var(--r-sm)",
          transition: "background .15s",
          animation: `eventSlideIn .3s ${i * 0.025}s cubic-bezier(.16,1,.3,1) both`,
        }}
        onMouseEnter={el => (el.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={el => (el.currentTarget.style.background = "transparent")}
        >
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px",
          }}>
            {TYPE_ICON[e.event_type] || "📌"}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: "12px", fontWeight: 600, color: "var(--text-primary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {e.repository_name.split("/")[1] || e.repository_name}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>
              {e.event_type}
            </p>
          </div>

          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", flexShrink: 0 }}>
            {timeAgo(e.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
