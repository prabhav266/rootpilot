"use client"

import{
    PieChart,
    Pie,
    Cell,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts"

interface Event{
    id: number
    event_type : string
    repository_name: string
}

export default function AnalyticsDashboard({
    events,
}:{
    events: Event[]
}){
    const totalEvents = events.length

    const workflowFailures = events.filter(
        (event) =>
            event.event_type === "workflow_run"
    ).length

    const pushEvents = events.filter(
        (event) => 
            event.event_type === "push"
    ).length

    const eventCounts: Record<string, number> = {}

    events.forEach((event)=> {
        if(!eventCounts[event.event_type]){
            eventCounts[event.event_type] = 0
        }

        eventCounts[event.event_type] += 1
    })

    const chartData = Object.entries(
        eventCounts
    ).map(([name, value]) => ({
        name,
        value,
    }))

    return(
        <div className="w-full max-w-6xl mb-10">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        <div className="bg-white shadow rounded-xl p-6">

          <h3 className="text-gray-500">
            Total Events
          </h3>

          <p className="text-3xl font-bold text-black mt-2">
            {totalEvents}
          </p>

        </div>

        <div className="bg-white shadow rounded-xl p-6">

          <h3 className="text-gray-500">
            Workflow Events
          </h3>

          <p className="text-3xl font-bold text-black mt-2">
            {workflowFailures}
          </p>

        </div>

        <div className="bg-white shadow rounded-xl p-6">

          <h3 className="text-gray-500">
            Push Events
          </h3>

          <p className="text-3xl font-bold text-black mt-2">
            {pushEvents}
          </p>

        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <div className="bg-white p-6 rounded-xl shadow">

          <h3 className="text-xl font-bold text-black mb-4">
            Event Distribution
          </h3>

          <PieChart width={350} height={300}>

            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              fill="#8884d8"
              label
            >

              {chartData.map((_, index) => (

                <Cell
                  key={index}
                  fill={[
                    "#8884d8",
                    "#82ca9d",
                    "#ffc658",
                    "#ff7f7f",
                    "#8dd1e1",
                  ][index % 5]}
                />

              ))}

            </Pie>

            <Tooltip />

          </PieChart>

        </div>

        <div className="bg-white p-6 rounded-xl shadow">

          <h3 className="text-xl font-bold text-black mb-4">
            Event Counts
          </h3>

          <BarChart
            width={400}
            height={300}
            data={chartData}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="name" />

            <YAxis />

            <Tooltip />

            <Bar dataKey="value" fill="#8884d8" />

          </BarChart>

        </div>

      </div>

    </div>
    )
}