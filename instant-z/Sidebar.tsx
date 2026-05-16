'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  label: string
  href: string
  icon: string
}

const MANAGER_NAV: NavItem[] = [
  { label: 'Overview',      href: '/dashboard',              icon: '◻' },
  { label: 'Emergency',     href: '/dashboard/emergency',    icon: '🆘' },
  { label: 'Residents',     href: '/dashboard/residents',    icon: '👥' },
  { label: 'Maintenance',   href: '/dashboard/maintenance',  icon: '🔧' },
  { label: 'Announcements', href: '/dashboard/announcements',icon: '📢' },
  { label: 'QR Nodes',      href: '/dashboard/qr',          icon: '📱' },
  { label: 'Marketplace',   href: '/dashboard/marketplace',  icon: '🛒' },
]

const RESIDENT_NAV: NavItem[] = [
  { label: 'Home',          href: '/dashboard',              icon: '◻' },
  { label: 'Emergency',     href: '/dashboard/emergency',    icon: '🆘' },
  { label: 'Maintenance',   href: '/dashboard/maintenance',  icon: '🔧' },
  { label: 'Messages',      href: '/dashboard/messages',     icon: '✉️' },
  { label: 'Marketplace',   href: '/dashboard/marketplace',  icon: '🛒' },
]

interface SidebarProps {
  role?: string
}

export function Sidebar({ role = 'resident' }: SidebarProps) {
  const pathname = usePathname()
  const items = role === 'facility_manager' || role === 'platform_admin'
    ? MANAGER_NAV
    : RESIDENT_NAV

  return (
    <aside className="sidebar">
      <div className="sidebar-section">Menu</div>
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </aside>
  )
}
