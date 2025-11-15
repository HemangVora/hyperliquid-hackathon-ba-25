'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Target,
  History,
  TrendingUp,
  Settings,
  User
} from 'lucide-react';
import ClientOnly from './ClientOnly';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navigationSections = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'Portfolio',
      items: [
        { label: 'Positions', href: '/dashboard/positions', icon: TrendingUp },
        { label: 'Strategies', href: '/dashboard/strategies', icon: Target },
        { label: 'History', href: '/dashboard/history', icon: History }
      ]
    },
    {
      title: 'Settings',
      items: [
        { label: 'Account', href: '/dashboard/account', icon: User },
        { label: 'Preferences', href: '/dashboard/preferences', icon: Settings }
      ]
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem-env(safe-area-inset-bottom))] bg-gray-900 border-r border-gray-800 transition-transform duration-300 z-30 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="w-56 lg:w-64 p-3 sm:p-4 overflow-y-auto h-full">
          <ClientOnly>
            <nav className="space-y-2">
              {navigationSections.map((section) => (
                <SidebarSection key={section.title} title={section.title}>
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      label={item.label}
                      href={item.href}
                      icon={item.icon}
                      active={pathname === item.href}
                    />
                  ))}
                </SidebarSection>
              ))}
            </nav>
          </ClientOnly>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarItem({
  label,
  href,
  icon: Icon,
  active = false
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 lg:py-2 rounded-lg text-sm transition-all duration-200 min-h-[44px] ${
        active
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/50'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
