"use client"

import { useEffect, useState } from "react"

interface Event {
  id: number
  event_type: string
  repository_name: string
  payload: string
  summary?: string
}

export default function EventList(){
    const [events, setEvents] = useState<Event[]>([])

    useEffect(()=> {
        async function fetchEvents(){
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
    }, [])
    return(
        <div className="mt-10 w-full max-w-2xl">

      <h2 className="text-2xl font-bold text-black mb-4">
        Recent Events
      </h2>

      <div className="space-y-3">

        {events.map((event) => (

          <div
            key={event.id}
            className="border p-4 rounded-lg shadow"
          >

            <h3 className="text-lg font-semibold text-black">
                {event.summary || event.event_type}
            </h3>

            <p className="text-gray-600">
                {event.repository_name}
            </p>

          </div>

        ))}

      </div>

    </div>
    )
}