"use client"
import Image from "next/image"
import { signIn, signOut, useSession } from "next-auth/react"

export default function LoginButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div className="skeleton" style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
        <div className="skeleton" style={{ width: "72px", height: "14px" }} />
      </div>
    )
  }

  if (session) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* WS status pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: "7px",
          padding: "5px 12px",
          background: "rgba(0,255,136,0.06)",
          border: "1px solid rgba(0,255,136,0.14)",
          borderRadius: "20px",
        }}>
          <span className="status-dot dot-green pulse-dot" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 600, color: "var(--green)", letterSpacing: "0.06em" }}>
            CONNECTED
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "22px", background: "var(--border)" }} />

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {session.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || "user"}
              width={28}
              height={28}
              style={{
                width: "28px", height: "28px", borderRadius: "50%",
                border: "1.5px solid var(--border-light)",
                boxShadow: "0 0 0 2px rgba(0,229,255,0.08)",
              }}
            />
          )}
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            {session.user?.name?.split(" ")[0]}
          </span>
        </div>

        <button
          onClick={() => signOut()}
          className="btn btn-ghost"
          style={{ padding: "6px 14px", fontSize: "12px" }}
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="btn btn-primary"
      style={{ padding: "8px 20px", fontSize: "13px" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      Login with GitHub
    </button>
  )
}
