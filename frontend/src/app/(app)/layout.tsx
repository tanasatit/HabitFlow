import { AppNav } from '@/components/features/AppNav'
import { UserAvatarMenu } from '@/components/features/UserAvatarMenu'
import { UpgradePromo } from '@/components/ui/UpgradePromo'
import { PageTransition } from '@/components/ui/PageTransition'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-background flex">
      <aside className="w-72 bg-surface border-r border-outline hidden md:flex flex-col sticky top-0 h-screen">
        <div className="px-8 pt-8 pb-6">
          <span className="font-headline italic font-black text-2xl text-primary">HabitFlow AI</span>
        </div>
        <AppNav />
        <div className="mt-auto">
          <div className="px-6 pb-4">
            <UpgradePromo />
          </div>
          <UserAvatarMenu />
        </div>
      </aside>
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileBottomNav className="md:hidden" />
    </div>
  )
}
