import LoginButton from "./components/login-button"
import RepoList from "./components/repo-list"
import EventList from "./components/event-list"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-8">
      <LoginButton />
      <RepoList />
      <EventList />
    </main>
  )
}