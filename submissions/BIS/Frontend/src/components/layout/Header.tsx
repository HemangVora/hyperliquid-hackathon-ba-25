'use client';

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">
              HyperGlueX
            </h1>
            <span className="text-sm text-gray-400 hidden md:inline">
              HyperLiquid Dashboard
            </span>
          </div>

          <nav className="flex items-center space-x-6">
            <a
              href="#portfolio"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Portfolio
            </a>
            <a
              href="#markets"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Markets
            </a>
            <a
              href="#trading"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Trading
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
