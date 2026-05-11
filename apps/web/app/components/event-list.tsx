"use client"

import { motion } from "framer-motion"

interface Event {
  id: number
  event_type: string
  repository_name: string
  payload: string
  summary?: string
}

export default function EventList({
  events,
}: {
  events: Event[]
}) {
  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between mb-6">

        <div>
          <h2 className="text-2xl font-bold text-white">
            Live Activity
          </h2>

          <p className="text-zinc-500 text-sm mt-1">
            Realtime GitHub repository events
          </p>
        </div>

        <div className="flex items-center gap-2">

          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

          <span className="text-green-400 text-sm">
            Live Feed
          </span>

        </div>

      </div>

      {events.map((event) => (

        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.01 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all duration-300"
        >

          <div className="flex items-center justify-between mb-3">

            <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
              {event.event_type}
            </span>

            <span className="text-zinc-500 text-sm">
              Event #{event.id}
            </span>

          </div>

          <h3 className="text-white text-lg font-semibold mb-2">
            {event.repository_name}
          </h3>

          <p className="text-zinc-300 mb-3">
            {event.summary || "No AI summary available"}
          </p>

          <details className="text-zinc-500 text-sm">

            <summary className="cursor-pointer">
              Raw Payload
            </summary>

            <pre className="mt-2 whitespace-pre-wrap break-all text-xs">
              {event.payload}
            </pre>

          </details>

        </motion.div>

      ))}

    </div>
  )
}