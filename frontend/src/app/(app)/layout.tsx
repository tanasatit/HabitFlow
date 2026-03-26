import { AppNav } from '@/components/features/AppNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 hidden md:flex flex-col gap-4">
        <div className="text-xl font-bold text-white bg-gradient-to-r from-[#FF8243] to-[#FFC0CB] bg-clip-text text-transparent">
          HabitFlow AI
        </div>
        <AppNav />
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
