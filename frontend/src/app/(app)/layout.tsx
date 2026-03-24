// TODO Phase 4: Replace anchor tags with Next.js Link and add active state detection
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 hidden md:flex flex-col gap-4">
        <div className="text-xl font-bold text-white bg-gradient-to-r from-[#FF8243] to-[#FFC0CB] bg-clip-text text-transparent">
          HabitFlow AI
        </div>
        <nav className="flex flex-col gap-1 mt-4" aria-label="Main navigation">
          <a
            href="/dashboard"
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7a1 1 0 0 0 1.414 1.414L4 10.414V17a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6.586l.293.293a1 1 0 0 0 1.414-1.414l-7-7Z" />
            </svg>
            Dashboard
          </a>
          <a
            href="/habits"
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11V15a1.5 1.5 0 0 0 2.3 1.269l9.344-5.447a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
            </svg>
            Habits
          </a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
