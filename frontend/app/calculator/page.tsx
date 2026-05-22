"use client";

import { useState, useEffect } from "react";

interface Prices {
  gold: number | null;
  silver: number | null;
  usdinr: number | null;
}

export default function Calculator() {
  const [prices, setPrices] = useState<Prices>({
    gold: null,
    silver: null,
    usdinr: null,
  });
  const [goldSpot, setGoldSpot] = useState<number | string>("");
  const [silverSpot, setSilverSpot] = useState<number | string>("");
  const [usdInr, setUsdInr] = useState<number | string>("");
  const [importDuty, setImportDuty] = useState<string>("");
  const [goldPrice, setGoldPrice] = useState<number | null>(null);
  const [silverPrice, setSilverPrice] = useState<number | null>(null);

  const fetchPrices = async () => {
    try {
      const defaultHost =
        typeof window !== "undefined" ? window.location.hostname : "localhost";
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || `http://${defaultHost}:8000/api/v1`;
      const res = await fetch(`${baseUrl}/prices?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
        if (data.gold) setGoldSpot(data.gold);
        if (data.silver) setSilverSpot(data.silver);
        if (data.usdinr) setUsdInr(data.usdinr);
      }
    } catch (e) {
      console.error("Failed to fetch prices", e);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const TROY_OZ_TO_GRAM = 31.1035;
  const KG_IN_TROY_OZ = 32.1507;

  const calculatePrices = () => {
    const gold = Number(goldSpot);
    const silver = Number(silverSpot);
    const usd = Number(usdInr);
    const duty = Number(importDuty) || 0;

    if (gold > 0 && usd > 0) {
      const goldPer10g = (gold / TROY_OZ_TO_GRAM) * 10 * usd * (1 + duty / 100);
      setGoldPrice(Number(goldPer10g.toFixed(2)));
    }

    if (silver > 0 && usd > 0) {
      const silverPerKg = silver * KG_IN_TROY_OZ * usd * (1 + duty / 100);
      setSilverPrice(Number(silverPerKg.toFixed(2)));
    }
  };

  useEffect(() => {
    calculatePrices();
  }, [goldSpot, silverSpot, usdInr, importDuty]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Price Calculator
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gold Spot Price (USD/oz)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={goldSpot}
                  onChange={(e) => setGoldSpot(e.target.value)}
                  placeholder="e.g., 2050"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              {prices.gold && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Live: ${prices.gold}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Silver Spot Price (USD/oz)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={silverSpot}
                  onChange={(e) => setSilverSpot(e.target.value)}
                  placeholder="e.g., 25"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              {prices.silver && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Live: ${prices.silver}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                USD/INR Exchange Rate
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  value={usdInr}
                  onChange={(e) => setUsdInr(e.target.value)}
                  placeholder="e.g., 83.50"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              {prices.usdinr && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Live: {prices.usdinr}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Import Duty (%)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">
                  %
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={importDuty}
                  onChange={(e) => setImportDuty(e.target.value)}
                  placeholder="e.g., 15"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Gold Price per 10g (INR)</p>
              <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
                {goldPrice !== null ? `₹${goldPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Enter values above"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Silver Price per 1kg (INR)</p>
              <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
                {silverPrice !== null ? `₹${silverPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Enter values above"}
              </p>
            </div>
          </div>

          <button
            onClick={fetchPrices}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Refresh Live Prices
          </button>
        </div>
      </div>

    </div>
  );
}
