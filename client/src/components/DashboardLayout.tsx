import Sidebar from './Sidebar'
import NavBar from './NavBar'
import type { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <NavBar />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        {/* marginLeft: 260px on large screens, 0 on mobile where sidebar is hidden */}
        <main className="flex-grow-1 dashboard-main" style={{ paddingTop: '56px' }}>
          {children}
        </main>
      </div>
      <style>{`
        @media (min-width: 992px) {
          .dashboard-main {
            margin-left: 260px;
          }
        }
      `}</style>
    </div>
  )
}
