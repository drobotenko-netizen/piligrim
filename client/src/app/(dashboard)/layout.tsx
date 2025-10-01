import { ReactNode } from 'react'
import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 bg-background h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

