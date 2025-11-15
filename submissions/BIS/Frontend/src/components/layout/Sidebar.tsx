'use client';

import { useState } from 'react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-gray-900 border-r border-gray-800 transition-transform duration-300 z-30 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="w-64 p-4 overflow-y-auto h-full">
          <nav className="space-y-2">
            <SidebarSection title="Overview">
              <SidebarItem label="Dashboard" active />
              <SidebarItem label="Analytics" />
            </SidebarSection>

            <SidebarSection title="Trading">
              <SidebarItem label="Spot" />
              <SidebarItem label="Perpetuals" />
              <SidebarItem label="Orders" />
            </SidebarSection>

            <SidebarSection title="Portfolio">
              <SidebarItem label="Positions" />
              <SidebarItem label="History" />
              <SidebarItem label="PnL" />
            </SidebarSection>

            <SidebarSection title="Settings">
              <SidebarItem label="Account" />
              <SidebarItem label="Preferences" />
            </SidebarSection>
          </nav>
        </div>
      </aside>

      {/* Toggle button for mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 lg:hidden z-40 p-3 bg-primary-600 text-white rounded-full shadow-lg"
      >
        {isOpen ? '✕' : '☰'}
      </button>
    </>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <a
      href={`#${label.toLowerCase()}`}
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {label}
    </a>
  );
}
