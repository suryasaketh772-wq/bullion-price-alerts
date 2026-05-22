"use client";

import { useState, useEffect } from "react";

interface AlertHistory {
  id: number;
  alert_id: number | null;
  asset: string;
  condition: string;
  target_price: number;
  triggered_price: number;
  name: string | null;
  triggered_at: string;
}

function getBaseUrl() {
  const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return process.env.NEXT_PUBLIC_API_URL || `http://${defaultHost}:8000/api/v1`;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${getBaseUrl()}/alerts/history?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all alert history?")) return;
    try {
      const response = await fetch(`${getBaseUrl()}/alerts/history/clear`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        setHistory([]);
        load();
      } else {
        const errorText = await response.text();
        console.error("Failed to clear history", errorText);
        alert(`Unable to clear history: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to clear history", error);
      alert("Unable to clear history: network error");
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Alert History</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Triggered Alerts</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : history.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">No history yet</p>
            <p className="text-sm mt-1">Triggered alerts will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map(item => (
              <li key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${item.asset === "Gold" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                    {item.asset === "Gold" ? "Au" : "Ag"}
                  </div>
                  <div>
                    {item.name && <p className="text-xs text-indigo-500 font-medium mb-0.5">{item.name}</p>}
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.asset} went <span className={item.condition === "above" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{item.condition}</span>{" "}
                      <span className="font-bold">${item.target_price.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Triggered at: <span className="font-medium">${item.triggered_price.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(item.triggered_at).toLocaleDateString("en-IN")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.triggered_at).toLocaleTimeString("en-IN")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
