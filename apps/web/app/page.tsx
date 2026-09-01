"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

import LoginButton from "./components/login-button"
import RepoList from "./components/repo-list"
import EventList from "./components/event-list"
import AIInsights from "./components/ai-insights"
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
interface Event {
  id: number
  owner_github_id?: string | null
  event_type: string
  repository_github_id?: string | null
  repository_name: string
  payload: string
  summary?: string
}

export default function Home() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<Event[]>([])

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "hidden" }}>

      {/* Grid background */}
      <div
        className="grid-bg"
        style={{ position: "fixed", inset: 0, opacity: 0.7, pointerEvents: "none", zIndex: 0 }}
      />

      {/* Ambient glow — top center */}
      <div style={{
        position: "fixed", top: "-180px", left: "50%", transform: "translateX(-50%)",
        width: "900px", height: "500px",
        background: "radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.055) 0%, transparent 68%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Ambient glow — bottom right */}
      <div style={{
        position: "fixed", bottom: "-100px", right: "-100px",
        width: "500px", height: "500px",
        background: "radial-gradient(ellipse, rgba(167,139,250,0.04) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--border)",
        background: "rgba(6,7,9,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        padding: "0 32px",
        height: "58px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "9px",
            background: "linear-gradient(135deg, var(--accent) 0%, #0099bb 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px var(--accent-glow)",
            flexShrink: 0,
          }}>
            {/* Target / crosshair icon */}
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="2.5" fill="#060709"/>
              <circle cx="9" cy="9" r="6.5" stroke="#060709" strokeWidth="1.5" fill="none"/>
              <line x1="9" y1="1" x2="9" y2="3.5" stroke="#060709" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="9" y1="14.5" x2="9" y2="17" stroke="#060709" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="9" x2="3.5" y2="9" stroke="#060709" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="14.5" y1="9" x2="17" y2="9" stroke="#060709" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0" }}>
            <span style={{ fontWeight: 800, fontSize: "17px", letterSpacing: "-0.4px", fontFamily: "var(--font-sans)" }}>
              Root<span style={{ color: "var(--accent)" }}>Pilot</span>
            </span>
          </div>

          <div style={{
            height: "18px",
            width: "1px",
            background: "var(--border-light)",
            margin: "0 2px",
          }} />

          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            GitHub Monitor
          </span>
        </div>

        {/* Nav right */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LoginButton />
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{
        position: "relative", zIndex: 1,
        maxWidth: "1240px", margin: "0 auto",
        padding: "36px 28px 80px",
      }}>
        <AIInsights events={events} />
        <RepoList />
        <EventList onEventsChange={setEvents} />
      </main>
    </div>
  )
}
