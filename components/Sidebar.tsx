'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  label: string
  href: string
  icon: string
}

const MANAGER_NAV: NavItem[] = [
  { label: 'Home',          href: '/dashboard',              icon: '◻' },
  { label: 'Emergency',     href: '/dashboard/emergency',    icon: '🆘' },
  { label: 'Residents',     href: '/dashboard/residents',    icon: '👥' },
  { label: 'Maintenance',   href: '/dashboard/maintenance',  icon: '🔧' },
  { label: 'Announcements', href: '/dashboard/announcements',icon: '📢' },
  { label: 'Marketplace',   href: '/dashboard/marketplace',  icon: '🛒' },
  { label: 'Analytics',     href: '/dashboard/analytics',    icon: '📊' },
  { label: 'Jobs',          href: '/dashboard/jobs',         icon: '💼' },
  { label: 'Messages',      href: '/dashboard/messages',     icon: '✉️' },
  { label: 'QR Nodes',      href: '/dashboard/qr',          icon: '📱' },
  { label: 'Settings',      href: '/dashboard/settings',     icon: '⚙️' },
]

const ADMIN_NAV: NavItem[] = [
  { label: 'Home',          href: '/dashboard',              icon: '◻' },
  { label: 'Emergency',     href: '/dashboard/emergency',    icon: '🆘' },
  { label: 'Residents',     href: '/dashboard/residents',    icon: '👥' },
  { label: 'Maintenance',   href: '/dashboard/maintenance',  icon: '🔧' },
  { label: 'Announcements', href: '/dashboard/announcements',icon: '📢' },
  { label: 'Marketplace',   href: '/dashboard/marketplace',  icon: '🛒' },
  { label: 'Analytics',     href: '/dashboard/analytics',    icon: '📊' },
  { label: 'Jobs',          href: '/dashboard/jobs',         icon: '💼' },
  { label: 'Messages',      href: '/dashboard/messages',     icon: '✉️' },
  { label: 'QR Nodes',      href: '/dashboard/qr',          icon: '📱' },
  { label: 'Settings',      href: '/dashboard/settings',     icon: '⚙️' },
  { label: 'Admin',         href: '/admin',                  icon: '🏢' },
  { label: 'Floor Plans',   href: '/admin/floorplan',        icon: '🗺️' },
]

const RESIDENT_NAV: NavItem[] = [
  { label: 'Home',          href: '/dashboard',              icon: '◻' },
  { label: 'Emergency',     href: '/dashboard/emergency',    icon: '🆘' },
  { label: 'Maintenance',   href: '/dashboard/maintenance',  icon: '🔧' },
  { label: 'Messages',      href: '/dashboard/messages',     icon: '✉️' },
  { label: 'Marketplace',   href: '/dashboard/marketplace',  icon: '🛒' },
  { label: 'My Household',  href: '/dashboard/household',    icon: '🏠' },
  { label: 'Settings',      href: '/dashboard/settings',     icon: '⚙️' },
]

interface SidebarProps {
  role?: string
  onItemClick?: () => void
}

export function Sidebar({ role = 'resident', onItemClick }: SidebarProps) {
  const pathname = usePathname()
  const items = role === 'platform_admin' ? ADMIN_NAV
    : role === 'facility_manager' ? MANAGER_NAV
    : RESIDENT_NAV

  return (
    <aside className="sidebar">
      <div className="sidebar-section">Menu</div>
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
          onClick={onItemClick}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </aside>
  )
}
