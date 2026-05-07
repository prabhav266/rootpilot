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

      <div className="space-y-3">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="border p-4 rounded-lg shadow"
          >
            <h3 className="text-lg font-semibold text-black">
              {repo.name}
            </h3>

            <a
              href={repo.html_url}
              target="_blank"
              className="text-blue-500 block"
            >
              View Repository
            </a>

            <button
              onClick={async () => {
                const res = await fetch(
                  "http://127.0.0.1:8000/repositories/connect",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      repo_name: repo.name,
                      github_repo_id: repo.id,
                      repo_url: repo.html_url,
                    }),
                  }
                )

                const data = await res.json()
                console.log(data)
              }}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Connect Repository
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}