"use client"

import { useEffect, useState } from "react"

interface Event {
  id: number
  event_type: string
  repository_name: string
  payload: string
  summary?: string
}

export default function EventList() {

  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {

    async function fetchEvents() {//tyt

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

    socket.onopen = () => {
        console.log("WebSocket Connected")
    }

    socket.onerror = (error) => {
        console.log("WebSocket Error:", error)
    }

    socket.onmessage = (event) => {

      console.log(
        "Live Event:",
        event.data
      )

      fetchEvents()
    }

    return () => {
      socket.close()
    }

  }, [])

  return (

    <div className="mt-8 w-full max-w-4xl">

      <h2 className="text-3xl font-bold text-black mb-6">
        Live DevOps Events
      </h2>

      <div className="space-y-4">

        {events.map((event) => (

          <div
            key={event.id}
            className="border p-4 rounded-lg shadow bg-white"
          >

            <h3 className="text-lg font-semibold text-black">

              {event.summary || event.event_type}

            </h3>

            <p className="text-gray-600 mt-1">

              {event.repository_name}

            </p>

            <details className="mt-3">

              <summary className="cursor-pointer text-blue-500">

                View Payload

              </summary>

              <pre className="text-xs overflow-auto mt-2 bg-gray-100 p-2 rounded">

                {JSON.stringify(
                  JSON.parse(event.payload),
                  null,
                  2
                )}

              </pre>

            </details>

          </div>

        ))}

      </div>

    </div>
  )
}