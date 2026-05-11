export default function Navbar() {
  return (
    <div className="flex items-center gap-4">

  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
    
    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

    <span className="text-green-400 text-sm">
      Live
    </span>

  </div>

  <div className="w-10 h-10 rounded-full bg-zinc-700" />

</div>
  )
}