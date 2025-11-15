/**
 * ChainSelector Component
 *
 * Dropdown selector for filtering pools by blockchain network.
 */

'use client';

import { useChains } from '@/hooks/useChains';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChainSelectorProps {
  selectedChain: string | null;
  onChainChange: (chainId: string | null) => void;
  className?: string;
}

export function ChainSelector({
  selectedChain,
  onChainChange,
  className = '',
}: ChainSelectorProps) {
  const { chains, loading } = useChains();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const selectedChainInfo = selectedChain
    ? chains.find(c => c.id === selectedChain)
    : null;

  const displayText = selectedChainInfo
    ? selectedChainInfo.name
    : 'All Chains';

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
          <span className="text-gray-400">Loading chains...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          {selectedChainInfo?.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedChainInfo.color }}
            />
          )}
          <span className="text-white font-medium">{displayText}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* All Chains Option */}
          <button
            onClick={() => {
              onChainChange(null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-750 transition-colors text-left min-h-[44px] ${
              !selectedChain ? 'bg-gray-750' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
              ALL
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">All Chains</div>
              <div className="text-xs text-gray-400">
                Show pools from all networks
              </div>
            </div>
          </button>

          {/* Individual Chains */}
          {chains.map(chain => (
            <button
              key={chain.id}
              onClick={() => {
                onChainChange(chain.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-750 transition-colors text-left min-h-[44px] ${
                selectedChain === chain.id ? 'bg-gray-750' : ''
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: chain.color || '#6B7280' }}
              >
                {chain.native_token.slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{chain.name}</div>
                <div className="text-xs text-gray-400">
                  Chain ID: {chain.chain_id}
                </div>
              </div>
              {selectedChain === chain.id && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
