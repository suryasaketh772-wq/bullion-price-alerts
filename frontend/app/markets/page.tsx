export default function MarketsPage() {
  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Trading Economics</h2>
        </div>
        <a
          href="https://tradingeconomics.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          Open in new tab ↗
        </a>
      </div>
      <iframe
        src="https://tradingeconomics.com/"
        className="flex-1 w-full border-0"
        title="Trading Economics"
        loading="lazy"
      />
    </div>
  );
}
