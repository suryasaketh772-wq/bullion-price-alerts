"use client";

import { useState } from "react";

interface Alert {
  id: number;
  asset: string;
  target_price: number;
  condition: string;
}

interface AlertFormProps {
  onAlertCreated: () => void;
  initialData?: Alert | null;
  onCancel?: () => void;
}

export default function AlertForm({ onAlertCreated, initialData, onCancel }: AlertFormProps) {
  const [asset, setAsset] = useState(initialData?.asset || "Gold");
  const [targetPrice, setTargetPrice] = useState(initialData?.target_price ? String(initialData.target_price) : "");
  const [condition, setCondition] = useState(initialData?.condition || "above");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const defaultHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${defaultHost}:8000/api/v1`;
      const url = initialData
        ? `${baseUrl}/alerts/${initialData.id}`
        : `${baseUrl}/alerts`;

      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          target_price: parseFloat(targetPrice),
          condition,
          cooldown_minutes: 60,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed to ${initialData ? "update" : "create"} alert`);
      }

      if (!initialData) {
        setTargetPrice("");
      }
      onAlertCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Asset</label>
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="Gold">Gold</option>
          <option value="Silver">Silver</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Condition</label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="above">Goes Above</option>
          <option value="below">Drops Below</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Target Price</label>
        <input
          type="number"
          step="0.01"
          required
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder="e.g. 2000"
          className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50"
        >
          {loading ? "Saving..." : (initialData ? "Update Alert" : "Create Alert")}
        </button>
      </div>
    </form>
  );
}
