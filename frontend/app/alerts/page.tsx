"use client";

import { useState, useEffect } from "react";
import AlertForm from "@/components/AlertForm";
import { usePrices } from "@/context/PriceContext";

interface Alert {
  id: number;
  asset: string;
  target_price: number;
  condition: string;
  active: boolean;
  last_triggered_at: string | null;
  name?: string;
}

export default function AlertsPage() {
  const { isConnected, latestAlert } = usePrices();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const getBaseUrl = () => {
    const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return process.env.NEXT_PUBLIC_API_URL || `http://${defaultHost}:8000/api/v1`;
  };

  useEffect(() => {
    const notif = localStorage.getItem("notificationsEnabled");
    const sound = localStorage.getItem("soundEnabled");
    if (notif !== null) setNotificationsEnabled(notif === "true");
    if (sound !== null) setSoundEnabled(sound === "true");
  }, []);

  const toggleNotifications = (val: boolean) => {
    setNotificationsEnabled(val);
    localStorage.setItem("notificationsEnabled", String(val));
    if (val && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "denied" && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }
  };

  const toggleSound = (val: boolean) => {
    setSoundEnabled(val);
    localStorage.setItem("soundEnabled", String(val));
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/alerts?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) setAlerts(await res.json());
    } catch (e) {
      console.error("Failed to fetch alerts", e);
    }
  };

  const toggleAlert = async (id: number) => {
    try {
      await fetch(`${getBaseUrl()}/alerts/${id}/toggle`, { method: "PATCH" });
      fetchAlerts();
    } catch (e) {
      console.error("Failed to toggle alert", e);
    }
  };

  const toggleAllAlerts = async (active: boolean) => {
    try {
      await fetch(`${getBaseUrl()}/alerts/toggle-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      fetchAlerts();
    } catch (e) {
      console.error("Failed to toggle all alerts", e);
    }
  };

  const deleteAllAlerts = async () => {
    if (!confirm("Clear all alerts? This cannot be undone.")) return;
    try {
      await fetch(`${getBaseUrl()}/alerts`, { method: "DELETE" });
      fetchAlerts();
    } catch (e) {
      console.error("Failed to delete all alerts", e);
    }
  };

  const deleteAlert = async (id: number) => {
    try {
      await fetch(`${getBaseUrl()}/alerts/${id}`, { method: "DELETE" });
      fetchAlerts();
    } catch (e) {
      console.error("Failed to delete alert", e);
    }
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

  const GoldIcon = () => (
    <div className="w-10 h-10 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center">
      <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );

  const SilverIcon = () => (
    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
      <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            Alerts ({alerts.length}/20)
          </h2>
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              LIVE
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 shrink-0">
              Connecting...
            </span>
          )}
        </div>
        <button
          onClick={() => { if (alerts.length < 20) { setEditingAlert(null); setShowForm(!showForm); } }}
          disabled={alerts.length >= 20}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
          title={alerts.length >= 20 ? "Maximum 20 alerts reached" : "Create alert"}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {alerts.length >= 20 ? "Limit Reached" : "Create Alert"}
        </button>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-indigo-500 p-4 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-gray-900 dark:text-white font-medium text-sm">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600 ml-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Alert Form */}
      {(showForm || editingAlert) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-sm max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingAlert ? "Edit Alert" : "New Alert"}
          </h3>
          <AlertForm
            key={editingAlert?.id || "new"}
            initialData={editingAlert}
            onCancel={() => { setShowForm(false); setEditingAlert(null); }}
            onAlertCreated={() => { fetchAlerts(); setShowForm(false); setEditingAlert(null); }}
          />
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Allow Local Notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Trigger system alerts when prices cross targets</p>
              </div>
            </div>
            <button
              onClick={() => toggleNotifications(!notificationsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${notificationsEnabled ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notificationsEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3-9l-3 3 3 3m6-6l3 3-3 3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Alert Sounds</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Play high/low custom ringtones on triggers</p>
              </div>
            </div>
            <button
              onClick={() => toggleSound(!soundEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${soundEnabled ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${soundEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => toggleAllAlerts(true)}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-bold border border-green-500 text-green-600 hover:bg-green-50 transition-colors tracking-wide"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            ACTIVATE ALL
          </button>
          <button
            onClick={() => toggleAllAlerts(false)}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-bold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors tracking-wide"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            MUTE ALL
          </button>
          <button
            onClick={deleteAllAlerts}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-bold border border-red-400 text-red-600 hover:bg-red-50 transition-colors tracking-wide"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            CLEAR ALL
          </button>
        </div>
      )}

      {/* Alert List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        {alerts.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-white font-semibold">No alerts set</p>
            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Create an alert to get notified when prices hit your target.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {alerts.map(alert => (
              <li key={alert.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {alert.asset === "Gold" ? <GoldIcon /> : <SilverIcon />}
                  <div className="min-w-0">
                    {alert.name && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-0.5 truncate">{alert.name}</p>
                    )}
                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">
                      {alert.asset} {alert.condition === "above" ? "Goes Above" : "Drops Below"}{" "}
                      <span className={alert.asset === "Gold" ? "text-yellow-600" : "text-indigo-600"}>
                        ${alert.target_price.toLocaleString()}
                      </span>
                    </p>
                    {alert.last_triggered_at ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Triggered:{" "}
                        {new Date(alert.last_triggered_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Not triggered yet</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    title={alert.active ? "Deactivate" : "Activate"}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${alert.active ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${alert.active ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <button
                    onClick={() => { setEditingAlert(alert); setShowForm(true); }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
