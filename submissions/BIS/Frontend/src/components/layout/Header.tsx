'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ClientOnly from './ClientOnly';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[64px] py-2">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Hamburger Menu Button - Only visible on mobile/tablet */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <ClientOnly fallback={
              <div className="flex items-center space-x-2 sm:space-x-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  BIS
                </h1>
                <span className="text-sm text-gray-400 hidden md:inline">
                  HyperLiquid Dashboard
                </span>
              </div>
            }>
              <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  BIS
                </h1>
                <span className="text-sm text-gray-400 hidden md:inline">
                  HyperLiquid Dashboard
                </span>
              </Link>
            </ClientOnly>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <ConnectButton
              chainStatus="icon"
              accountStatus="address"
              showBalance={false}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
