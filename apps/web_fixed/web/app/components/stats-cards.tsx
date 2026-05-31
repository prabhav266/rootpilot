export default function StatsCards() {
  const stats = [
    {
      title: "Total Events",
      value: "128",
    },
    {
      title: "Repositories",
      value: "12",
    },
    {
      title: "Push Events",
      value: "84",
    },
    {
      title: "AI Summaries",
      value: "128",
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
        >
          <p className="text-zinc-400 text-sm">
            {stat.title}
          </p>

          <h3 className="text-white text-3xl font-bold mt-2">
            {stat.value}
          </h3>
        </div>
      ))}
    </div>
  )
}