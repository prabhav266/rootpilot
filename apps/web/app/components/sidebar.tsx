export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-zinc-950 border-r border-zinc-800 p-6">
      <h1 className="text-2xl font-bold text-white mb-10">
        RootPilot
      </h1>

      <nav className="flex flex-col gap-4 text-zinc-300">
        <button className="text-left hover:text-white">
          Dashboard
        </button>

        <button className="text-left hover:text-white">
          Repositories
        </button>

        <button className="text-left hover:text-white">
          Activity
        </button>

        <button className="text-left hover:text-white">
          Analytics
        </button>

        <button className="text-left hover:text-white">
          AI Insights
        </button>

        <button className="text-left hover:text-white">
          Settings
        </button>
      </nav>
    </div>
  )
}