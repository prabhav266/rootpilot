import "./globals.css"
import Providers from "./providers"
import type { Metadata } from "next"
import { JetBrains_Mono, Syne } from "next/font/google"

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sans",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "RootPilot — GitHub Actions Monitor",
  description: "AI-powered GitHub Actions monitoring and diagnostics",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${jetBrainsMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
