"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePrices } from "@/context/PriceContext";

interface Alert {
  id: number;
  asset: string;
  target_price: number;
  condition: string;
  active: boolean;
  last_triggered_at: string | null;
}

export default function Home() {
  const { prices, isConnected, latestAlert } = usePrices();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const getBaseUrl = () => {
    const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return process.env.NEXT_PUBLIC_API_URL || `http://${defaultHost}:8000/api/v1`;
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/alerts?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) setAlerts(await res.json());
    } catch (e) {
      console.error("Failed to fetch alerts", e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAlerts(), new Promise(r => setTimeout(r, 500))]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "denied" && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (!latestAlert) return;
    const direction = latestAlert.condition === "above" ? "📈" : "📉";
    const msg = `🚨 ${direction} ${latestAlert.asset} went ${latestAlert.condition} $${latestAlert.target_price} (Current: $${latestAlert.current_price})`;
    setToastMessage(msg);
    fetchAlerts();
  }, [latestAlert]);

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              LIVE
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700">
              Connecting...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <Link
            href="/alerts"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            Create Alert
          </Link>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white dark:bg-gray-800 border-l-4 border-indigo-500 p-4 rounded shadow-lg flex items-center gap-3">
            <span className="text-gray-900 dark:text-white font-medium">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Gold (GC=F)</h3>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white flex items-baseline gap-2">
            {prices.gold ? `$${prices.gold.toFixed(2)}` : "---"}
            {prices.gold && <span className="text-sm font-normal text-gray-500">/oz</span>}
          </p>
          <div className="mt-3 flex gap-4 text-xs font-medium text-gray-500">
            <div><span className="text-gray-400">High:</span> <span className="text-green-600 dark:text-green-400">{prices.gold_high ? `$${prices.gold_high.toFixed(2)}` : "---"}</span></div>
            <div><span className="text-gray-400">Low:</span> <span className="text-red-600 dark:text-red-400">{prices.gold_low ? `$${prices.gold_low.toFixed(2)}` : "---"}</span></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Silver (SI=F)</h3>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white flex items-baseline gap-2">
            {prices.silver ? `$${prices.silver.toFixed(2)}` : "---"}
            {prices.silver && <span className="text-sm font-normal text-gray-500">/oz</span>}
          </p>
          <div className="mt-3 flex gap-4 text-xs font-medium text-gray-500">
            <div><span className="text-gray-400">High:</span> <span className="text-green-600 dark:text-green-400">{prices.silver_high ? `$${prices.silver_high.toFixed(2)}` : "---"}</span></div>
            <div><span className="text-gray-400">Low:</span> <span className="text-red-600 dark:text-red-400">{prices.silver_low ? `$${prices.silver_low.toFixed(2)}` : "---"}</span></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">USD/INR</h3>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white flex items-baseline gap-2">
            {prices.usdinr ? `₹${prices.usdinr.toFixed(2)}` : "---"}
            {prices.usdinr && <span className="text-sm font-normal text-gray-500">/USD</span>}
          </p>
          <div className="mt-3 flex gap-4 text-xs font-medium text-gray-500">
            <div><span className="text-gray-400">High:</span> <span className="text-green-600 dark:text-green-400">{prices.usdinr_high ? `₹${prices.usdinr_high.toFixed(2)}` : "---"}</span></div>
            <div><span className="text-gray-400">Low:</span> <span className="text-red-600 dark:text-red-400">{prices.usdinr_low ? `₹${prices.usdinr_low.toFixed(2)}` : "---"}</span></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Alerts</h3>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{alerts.filter(a => a.active).length}</p>
        </div>
      </div>

      {prices.gold && prices.silver && prices.usdinr && (() => {
        const TROY_OZ_TO_GRAM = 31.1035;
        const KG_IN_TROY_OZ = 32.1507;
        const IMPORT_DUTY = 0.15;
        const goldPerGram = (prices.gold! / TROY_OZ_TO_GRAM) * prices.usdinr!;
        const goldPerGramWithDuty = goldPerGram * (1 + IMPORT_DUTY);
        const silverPerKg = (prices.silver! * KG_IN_TROY_OZ) * prices.usdinr!;
        const silverPerKgWithDuty = silverPerKg * (1 + IMPORT_DUTY);
        const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mt-2">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">INR Conversion</h3>
              <span className="text-xs text-gray-400">(@ ₹{prices.usdinr!.toFixed(2)}/USD)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-700 dark:text-yellow-400 font-bold text-xs">Au</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Gold — per gram</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/40 rounded-lg px-4 py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Without Import Duty</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(goldPerGram)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3 border border-amber-200 dark:border-amber-800">
                    <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">With 15% Import Duty</span>
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{fmt(goldPerGramWithDuty)}</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-xs">Ag</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Silver — per kg</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/40 rounded-lg px-4 py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Without Import Duty</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(silverPerKg)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3 border border-blue-200 dark:border-blue-800">
                    <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">With 15% Import Duty</span>
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{fmt(silverPerKgWithDuty)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
