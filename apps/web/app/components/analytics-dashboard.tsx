"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"

interface Event {
  id: number
  event_type: string
  repository_name: string
}

export default function AnalyticsDashboard({
  events,
}: {
  events: Event[]
}) {
  const totalEvents = events.length

  const workflowFailures = events.filter(
    (event) => event.event_type === "workflow_run"
  ).length

  const pushEvents = events.filter(
    (event) => event.event_type === "push"
  ).length

  const eventCounts: Record<string, number> = {}

  events.forEach((event) => {
    if (!eventCounts[event.event_type]) {
      eventCounts[event.event_type] = 0
    }

    eventCounts[event.event_type] += 1
  })

  const chartData = Object.entries(eventCounts).map(
    ([name, value]) => ({
      name,
      value,
    })
  )

  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7f7f",
    "#8dd1e1",
  ]

  return (
    
    <div className="w-full space-y-8">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-zinc-400 text-sm">
            Total Events
          </h3>

          <p className="text-4xl font-bold text-white mt-2">
            {totalEvents}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-zinc-400 text-sm">
            Workflow Events
          </h3>

          <p className="text-4xl font-bold text-white mt-2">
            {workflowFailures}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-zinc-400 text-sm">
            Push Events
          </h3>

          <p className="text-4xl font-bold text-white mt-2">
            {pushEvents}
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">
            Event Distribution
          </h3>

          <div className="flex justify-center">

            <PieChart width={400} height={300}>

                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />

              </PieChart>

          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">
            Event Counts
          </h3>

          <div className="flex justify-center">

            <BarChart
              width={500}
              height={300}
              data={chartData}
            >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                />

                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                />

                <YAxis
                  stroke="#a1a1aa"
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  fill="#8884d8"
                  radius={[8, 8, 0, 0]}
                />

              </BarChart>

          </div>
        </div>

      </div>

    </div>
  )
}