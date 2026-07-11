"use client"
import { useEffect, useState, useRef } from "react"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

interface Event {
  id: number
  event_type: string
  repository_name: string
  payload?: string
}

interface BackendInsights {
  health: string
  risk: string
  total_events: number
  push_events: number
  workflow_events: number
  failed_workflows: number
  repositories: number
  anomalies: string[]
  insight: string
}

export default function AIInsights({ events }: { events: Event[] }) {
  const [backendInsights, setBackendInsights] = useState<BackendInsights | null>(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const prevLengthRef = useRef(-1)

  useEffect(() => {
    // Only re-fetch when the event count actually changes, not on every render
    if (events.length === 0 || events.length === prevLengthRef.current) return
    prevLengthRef.current = events.length

    async function fetchInsights() {
      setLoadingInsights(true)
      try {
        const res = await fetch(`${API}/ai/insights`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(events),
        })
        if (res.ok) {
          const data: BackendInsights = await res.json()
          setBackendInsights(data)
        }
      } catch (err) {
        console.error("AI insights error:", err)
      } finally {
        setLoadingInsights(false)
      }
    }

    fetchInsights()
  }, [events])

  const rawInsight = backendInsights?.insight || ""
  const aiInsight =
    rawInsight.includes("RESOURCE_EXHAUSTED") ||
    rawInsight.includes("AI analysis failed") ||
    rawInsight.includes("429") ||
    rawInsight.includes("503")
      ? "AI operational analysis is temporarily unavailable. Repository monitoring and workflow tracking continue normally."
      : rawInsight || (events.length === 0 ? "No events yet — connect a repository and trigger some workflows." : "Analyzing repository ecosystem…")

  const metrics = [
    {
      label: "Total Events",
      value: backendInsights?.total_events ?? events.length,
      color: "var(--accent)",
      icon: "⚡",
    },
    {
      label: "Push Events",
      value: backendInsights?.push_events ?? events.filter(e => e.event_type === "push").length,
      color: "var(--green)",
      icon: "🚀",
    },
    {
      label: "Workflow Runs",
      value: backendInsights?.workflow_events ?? events.filter(e => e.event_type === "workflow_run").length,
      color: "var(--purple)",
      icon: "🔄",
    },
  ]

  const insights = [
    {
      label: "Repository Health",
      value: backendInsights?.health || "—",
      badge: backendInsights?.health === "Healthy" ? "badge-green" : backendInsights?.health === "Degraded" ? "badge-red" : "badge-amber",
    },
    {
      label: "Risk Level",
      value: backendInsights?.risk || "—",
      badge: backendInsights?.risk === "High" ? "badge-red" : backendInsights?.risk === "Medium" ? "badge-amber" : "badge-green",
    },
    {
      label: "Repositories",
      value: backendInsights?.repositories ?? 0,
      badge: "badge-blue",
    },
  ]

  return (
    <div
      className="card"
      style={{
        padding: "22px 24px",
        background: "rgba(11,13,17,0.95)",
        position: "relative",
        overflow: "hidden",
        marginBottom: "32px",
      }}
    >
      {/* Corner glow */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "160px", height: "160px",
        background: "radial-gradient(ellipse at 100% 0%, rgba(167,139,250,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "7px",
              background: "var(--purple-dim)",
              border: "1px solid rgba(167,139,250,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px",
            }}>🤖</div>
            <h2 style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.2px" }}>
              AI Repository Health
            </h2>
          </div>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "10px",
            color: "var(--text-muted)", letterSpacing: "0.08em",
            textTransform: "uppercase", marginLeft: "34px",
          }}>
            Operational intelligence
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {loadingInsights ? (
            <span className="spin" style={{
              width: "8px", height: "8px",
              border: "1.5px solid var(--purple-dim)",
              borderTopColor: "var(--purple)",
              borderRadius: "50%", display: "inline-block",
            }} />
          ) : (
            <span className="status-dot dot-green pulse-dot" style={{ width: "6px", height: "6px" }} />
          )}
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "9px",
            fontWeight: 700,
            color: loadingInsights ? "var(--purple)" : "var(--green)",
            letterSpacing: "0.1em",
          }}>
            {loadingInsights ? "ANALYZING" : "LIVE"}
          </span>
        </div>
      </div>

      {/* ── Mini KPI row ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px", marginBottom: "18px",
      }}>
        {metrics.map((m) => (
          <div key={m.label} style={{
            padding: "11px 12px",
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "11px", marginBottom: "4px" }}>{m.icon}</div>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: "22px",
              fontWeight: 800, color: m.color, lineHeight: 1,
              marginBottom: "4px", letterSpacing: "-0.5px",
            }}>
              {m.value}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "9px",
              color: "var(--text-muted)", letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Status rows ── */}
      <div style={{
        display: "flex", flexDirection: "column", gap: "0",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        marginBottom: "18px",
      }}>
        {insights.map((row, i) => (
          <div key={row.label} style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 14px",
            borderBottom: i < insights.length - 1 ? "1px solid var(--border)" : "none",
            background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.012)",
          }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
              {row.label}
            </span>
            <span className={`badge ${row.badge}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Anomalies ── */}
      {backendInsights?.anomalies && backendInsights.anomalies.length > 0 && (
        <div style={{
          padding: "11px 14px", marginBottom: "14px",
          background: "var(--amber-dim)",
          border: "1px solid rgba(255,176,32,0.16)",
          borderLeft: "3px solid var(--amber)",
          borderRadius: "var(--r-md)",
        }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color: "var(--amber)", marginBottom: "6px", letterSpacing: "0.06em" }}>
            ⚠ ANOMALIES DETECTED
          </p>
          {backendInsights.anomalies.map((a, i) => (
            <p key={i} style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>• {a}</p>
          ))}
        </div>
      )}

      {/* ── AI Insight block ── */}
      <div style={{
        padding: "13px 15px",
        background: "rgba(167,139,250,0.05)",
        border: "1px solid rgba(167,139,250,0.12)",
        borderLeft: "3px solid var(--purple)",
        borderRadius: "var(--r-md)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "7px" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "9px",
            fontWeight: 700, color: "var(--purple)",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            ✦ AI Insight
          </span>
        </div>
        <p style={{
          fontSize: "13px", color: "var(--text-secondary)",
          lineHeight: 1.75, fontStyle: "italic",
        }}>
          {`"${aiInsight.trim()}"`}
        </p>
      </div>
    </div>
  )
}
