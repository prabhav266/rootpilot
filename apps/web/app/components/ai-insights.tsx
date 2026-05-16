"use client"
import { useEffect, useState } from "react"
interface Event {
  id: number
  event_type: string
  repository_name: string
}


export default function AIInsights({ events }: { events: Event[] }) {
  const [backendInsights, setBackendInsights] =
  useState<any>(null)
  useEffect(() => {

  async function fetchInsights() {

    const res = await fetch(
      "http://127.0.0.1:8000/ai/insights",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(events),
      }
    )

    const data = await res.json()

    setBackendInsights(data)
  }

  if (events.length > 0) {
    fetchInsights()
  }

}, [events])
  const totalEvents = events.length
  const pushEvents = events.filter((e) => e.event_type === "push").length
  const workflowEvents = events.filter((e) => e.event_type === "workflow_run").length

  let activityLevel = "Low"
  let activityColor = "var(--text-muted)"
  let activityBadge = "badge-muted"
  if (totalEvents > 15) { activityLevel = "High"; activityColor = "var(--red)"; activityBadge = "badge-red" }
  else if (totalEvents > 5) { activityLevel = "Moderate"; activityColor = "var(--amber)"; activityBadge = "badge-amber" }
  else { activityBadge = "badge-muted" }

  let workflowHealth = "Stable"
  let healthColor = "var(--green)"
  let healthBadge = "badge-green"
  if (workflowEvents > 10) { workflowHealth = "Heavy CI"; healthColor = "var(--amber)"; healthBadge = "badge-amber" }

  let pushFrequency = "Calm"
  let pushColor = "var(--text-secondary)"
  let pushBadge = "badge-muted"
  if (pushEvents > 10) { pushFrequency = "Very Active"; pushColor = "var(--accent)"; pushBadge = "badge-blue" }
  else if (pushEvents > 5) { pushFrequency = "Active"; pushColor = "var(--accent)"; pushBadge = "badge-blue" }

  const rawInsight =
  backendInsights?.insight || ""

const aiInsight =
  rawInsight.includes("RESOURCE_EXHAUSTED") ||
  rawInsight.includes("AI analysis failed") ||
  rawInsight.includes("429")
    ? "AI operational analysis is temporarily unavailable. Repository monitoring and workflow tracking continue normally."
    : rawInsight || "Analyzing repository ecosystem..."

  const metrics = [
  {
    label: "Total Events",
    value: backendInsights?.total_events || 0,
    color: "var(--accent)",
    icon: "⚡",
  },
  {
    label: "Push Events",
    value: backendInsights?.push_events || 0,
    color: "var(--green)",
    icon: "🚀",
  },
  {
    label: "Workflow Runs",
    value: backendInsights?.workflow_events || 0,
    color: "var(--purple)",
    icon: "🔄",
  },
]
const insights = [
  
  {
    label: "Risk Level",
    value: backendInsights?.risk || "Low",
    badge: "badge-amber",
  },
  {
    label: "Repositories",
    value: backendInsights?.repositories || 0,
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

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className="status-dot dot-green pulse-dot"
            style={{ width: "6px", height: "6px" }}
          />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "9px",
            fontWeight: 700, color: "var(--green)", letterSpacing: "0.1em",
          }}>
            LIVE
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
        {insights.map((row: any, i: number) => (
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
          "{aiInsight.trim()}"
        </p>
      </div>
    </div>
  )
}