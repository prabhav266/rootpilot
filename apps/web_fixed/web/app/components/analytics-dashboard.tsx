"use client"
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

interface Event {
  id: number
  event_type: string
  repository_name: string
  payload: string
}

const CHART_COLORS = ["#00e5ff", "#00ff88", "#a78bfa", "#ffb020", "#ff3d57", "#8dd1e1"]

interface KPIProps {
  label: string
  value: string | number
  sub?: string
  color: string
  icon: string
}

function KPICard({ label, value, sub, color, icon }: KPIProps) {
  return (
    <div className="card" style={{ padding: "20px 22px", position: "relative", overflow: "hidden" }}>
      {/* Glow accent */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "80px", height: "80px",
        background: `radial-gradient(ellipse at 100% 0%, ${color}12 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 600,
          color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          {label}
        </span>
        <div style={{
          width: "28px", height: "28px", borderRadius: "7px",
          background: `${color}14`,
          border: `1px solid ${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px",
        }}>
          {icon}
        </div>
      </div>

      <p style={{
        fontSize: "32px", fontWeight: 800, color,
        lineHeight: 1, marginBottom: "5px", letterSpacing: "-1px",
        fontFamily: "var(--font-sans)",
      }}>
        {value}
      </p>

      {sub && (
        <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {sub}
        </p>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-light)",
      borderRadius: "var(--r-md)",
      padding: "10px 14px",
      fontSize: "12px",
      fontFamily: "var(--font-mono)",
    }}>
      {label && <p style={{ color: "var(--text-muted)", marginBottom: "4px", fontSize: "10px" }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || "var(--accent)" }}>
          {p.name || ""}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsDashboard({ events }: { events: Event[] }) {
  if (events.length === 0) return null

  const total     = events.length
  const workflows = events.filter(e => e.event_type === "workflow_run").length
  const pushes    = events.filter(e => e.event_type === "push").length

  const failures = events.filter(e => {
    if (e.event_type !== "workflow_run") return false
    try { return JSON.parse(e.payload)?.workflow_run?.conclusion === "failure" } catch { return false }
  }).length

  const counts: Record<string, number> = {}
  events.forEach(e => { counts[e.event_type] = (counts[e.event_type] || 0) + 1 })
  const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }))

  const repoCounts: Record<string, number> = {}
  events.forEach(e => { repoCounts[e.repository_name] = (repoCounts[e.repository_name] || 0) + 1 })
  const repoData = Object.entries(repoCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name: name.split("/")[1] || name, value }))

  return (
    <div style={{ marginBottom: "36px" }} className="fade-up-2">
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-0.2px" }}>Analytics</h2>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            {total} events processed
          </p>
        </div>
        {failures > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "6px 13px", background: "var(--red-dim)", border: "1px solid rgba(255,61,87,.18)", borderRadius: "20px" }}>
            <span className="status-dot dot-red pulse-dot" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, color: "var(--red)", letterSpacing: "0.06em" }}>
              {failures} FAILURE{failures !== 1 ? "S" : ""}
            </span>
          </div>
        )}
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <KPICard label="Total Events"   value={total}    color="var(--accent)"  icon="⚡" sub="all time" />
        <KPICard label="Workflow Runs"  value={workflows} color="var(--purple)" icon="🔄" sub="triggered" />
        <KPICard label="Push Events"    value={pushes}   color="var(--green)"  icon="🚀" sub="commits pushed" />
        <KPICard label="Failures"       value={failures} color={failures > 0 ? "var(--red)" : "var(--green)"} icon={failures > 0 ? "❌" : "✅"} sub="workflow failures" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "12px" }}>
        {/* Pie chart */}
        <div className="card" style={{ padding: "22px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Event Types</h3>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", marginBottom: "16px" }}>distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                outerRadius={75}
                innerRadius={38}
                paddingAngle={3}
                strokeWidth={0}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "8px" }}>
            {chartData.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-secondary)", flex: 1 }}>{item.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="card" style={{ padding: "22px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Activity by Repository</h3>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", marginBottom: "16px" }}>top 5 repos</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={repoData} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
