import LoginButton from "./components/login-button"
import RepoList from "./components/repo-list"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-8">
      <LoginButton />
      <RepoList />
    </main>
  )
}