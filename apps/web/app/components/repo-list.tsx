"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

interface Repo {
  id: number
  name: string
  html_url: string
}

export default function RepoList() {
  const { data: session } = useSession()
  const [repos, setRepos] = useState<Repo[]>([])

  useEffect(() => {
    async function fetchRepos() {
      console.log(session)

      if (!session?.accessToken) return

      const res = await fetch("https://api.github.com/user/repos", {
        headers: {
          Authorization: `token ${session.accessToken}`,
        },
      })

      const data = await res.json()
      setRepos(data)
    }

    fetchRepos()
  }, [session])

  return (
    <div className="mt-8 w-full max-w-2xl">
      <h2 className="text-2xl font-bold text-black mb-4">
        Your Repositories
      </h2>

      <div className="space-y-4">
        {repos.map((repo) => (
          <div
  key={repo.id}
  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all"
>
  <div className="flex items-start justify-between mb-4">

    <div>
      <h3 className="text-white text-lg font-semibold">
        {repo.name}
      </h3>

      <p className="text-zinc-500 text-sm mt-1">
        GitHub Repository
      </p>
    </div>

    <div className="w-3 h-3 rounded-full bg-green-500 mt-2" />

  </div>

  <div className="flex items-center gap-3 mt-4">

    <a
      href={repo.html_url}
      target="_blank"
      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-all"
    >
      View Repo
    </a>

    <button
      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm transition-all"
    >
      Connect
    </button>

  </div>
</div>
        ))}
      </div>
    </div>
  )
}