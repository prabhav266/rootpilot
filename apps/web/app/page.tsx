"use client"

import { useEffect, useState } from "react"

import Sidebar from "./components/sidebar"
import Navbar from "./components/navbar"
import StatsCards from "./components/stats-cards"

import RepoList from "./components/repo-list"
import EventList from "./components/event-list"
import AnalyticsDashboard from "./components/analytics-dashboard"

interface Event {
  id: number
  event_type: string
  repository_name: string
  payload: string
  summary?: string
}

export default function Home() {

  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {

    async function fetchEvents() {

      const res = await fetch(
        "http://127.0.0.1:8000/events"
      )

      const data = await res.json()

      const summarizedEvents = await Promise.all(

        data.map(async (event: Event) => {

          const aiRes = await fetch(
            "http://127.0.0.1:8000/ai/summarize",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(event),
            }
          )

          const aiData = await aiRes.json()

          return {
            ...event,
            summary: aiData.summary,
          }

        })

      )

      setEvents(summarizedEvents)
    }

    fetchEvents()

    const socket = new WebSocket(
      "ws://127.0.0.1:8000/ws"
    )

    socket.onmessage = () => {
      fetchEvents()
    }

    return () => {
      socket.close()
    }

  }, [])
  return (
    <main className="flex bg-zinc-950 min-h-screen">

      <Sidebar />

      <div className="flex-1 flex flex-col">

        <Navbar />

        <div className="p-6 space-y-6">

          <StatsCards />

          <AnalyticsDashboard events={events} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            <div className="bg-zinc-950 rounded-2xl">
              <RepoList />
            </div>

            <div className="bg-zinc-950 rounded-2xl">
              <EventList
                events={events}
              />
            </div>

          </div>

        </div>

      </div>

    </main>
  )
}