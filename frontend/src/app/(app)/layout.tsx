// TODO Phase 4: Add real sidebar nav
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 hidden md:flex flex-col gap-4">
        <div className="text-xl font-bold text-white">HabitFlow AI</div>
        <nav className="flex flex-col gap-2 mt-4">
          <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-gray-800">
            Dashboard
          </a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
