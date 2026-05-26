"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { fireAlertNotification } from "@/services/alertSound";

export interface Prices {
  gold: number | null;
  silver: number | null;
  gold_high: number | null;
  gold_low: number | null;
  silver_high: number | null;
  silver_low: number | null;
  usdinr: number | null;
  usdinr_high: number | null;
  usdinr_low: number | null;
}

export interface AlertEvent {
  id: number;
  asset: string;
  condition: string;
  target_price: number;
  current_price: number;
  timestamp: number;
}

interface PriceContextType {
  prices: Prices;
  isConnected: boolean;
  latestAlert: AlertEvent | null;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Prices>({
    gold: null, silver: null,
    gold_high: null, gold_low: null,
    silver_high: null, silver_low: null,
    usdinr: null, usdinr_high: null, usdinr_low: null,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [latestAlert, setLatestAlert] = useState<AlertEvent | null>(null);

  const notifEnabledRef = useRef(true);
  const soundEnabledRef = useRef(true);
  const pendingPrices = useRef<Prices | null>(null);

  useEffect(() => {
    const n = localStorage.getItem("notificationsEnabled");
    const s = localStorage.getItem("soundEnabled");
    if (n !== null) notifEnabledRef.current = n === "true";
    if (s !== null) soundEnabledRef.current = s === "true";

    const onStorage = (e: StorageEvent) => {
      if (e.key === "notificationsEnabled") notifEnabledRef.current = e.newValue === "true";
      if (e.key === "soundEnabled") soundEnabledRef.current = e.newValue === "true";
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${defaultHost}:8000/api/v1`;

    fetch(`${baseUrl}/prices?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPrices(data); })
      .catch(() => {});

    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;
    let attempt = 0;

    const connect = () => {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${host}:8000/ws/prices`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => { setIsConnected(true); attempt = 0; };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "price_update") {
          pendingPrices.current = data.data;
        } else if (data.type === "alert_triggered") {
          const a = data.data;
          const direction = a.condition === "above" ? "📈" : "📉";
          const msg = `🚨 ${direction} ${a.asset} went ${a.condition} $${a.target_price} (Current: $${a.current_price})`;
          fireAlertNotification(a.id, msg, a.condition, notifEnabledRef.current, soundEnabledRef.current);
          setLatestAlert({ ...a, timestamp: Date.now() });
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        reconnectTimer = setTimeout(() => { attempt++; connect(); }, delay);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    // On mobile, the WS goes stale when backgrounded (may still show OPEN but receives nothing).
    // Force-close and immediately reconnect whenever the page becomes visible again.
    const reconnectNow = () => {
      clearTimeout(reconnectTimer);
      attempt = 0;
      if (ws) {
        ws.onclose = null;  // prevent the backoff handler from firing
        ws.onerror = null;
        ws.close();
      }
      connect();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") reconnectNow();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", reconnectNow);

    const flushInterval = setInterval(() => {
      if (pendingPrices.current) {
        const d = pendingPrices.current;
        pendingPrices.current = null;
        setPrices(prev => ({
          gold:        d.gold        ?? prev.gold,
          silver:      d.silver      ?? prev.silver,
          usdinr:      d.usdinr      ?? prev.usdinr,
          gold_high:   d.gold_high   ?? prev.gold_high,
          gold_low:    d.gold_low    ?? prev.gold_low,
          silver_high: d.silver_high ?? prev.silver_high,
          silver_low:  d.silver_low  ?? prev.silver_low,
          usdinr_high: d.usdinr_high ?? prev.usdinr_high,
          usdinr_low:  d.usdinr_low  ?? prev.usdinr_low,
        }));
      }
    }, 500);

    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(flushInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", reconnectNow);
      if (ws) ws.close();
    };
  }, []);

  return (
    <PriceContext.Provider value={{ prices, isConnected, latestAlert }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices() {
  const ctx = useContext(PriceContext);
  if (!ctx) throw new Error("usePrices must be used within PriceProvider");
  return ctx;
}
