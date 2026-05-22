"use client";

interface NavbarProps {
  onMenuClick: () => void;
  prices?: { gold: number | null; silver: number | null; usdinr: number | null };
  isDark?: boolean;
  onThemeToggle?: () => void;
}

export default function Navbar({ onMenuClick, prices, isDark, onThemeToggle }: NavbarProps) {

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700 transition-colors md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-500 flex items-center justify-center text-yellow-900 font-bold text-xs shrink-0">
          Au
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bullion Market Alerts</h1>
      </div>

      {/* Price Display in Center */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Gold:</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {prices?.gold ? `$${prices.gold.toFixed(2)}` : "---"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Silver:</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {prices?.silver ? `$${prices.silver.toFixed(2)}` : "---"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">USD/INR:</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {prices?.usdinr ? `₹${prices.usdinr.toFixed(2)}` : "---"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onThemeToggle}
          className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle theme"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium text-sm">
          U
        </div>
      </div>
    </header>
  );
}
