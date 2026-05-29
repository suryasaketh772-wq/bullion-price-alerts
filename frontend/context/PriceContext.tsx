"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { fireAlertNotification } from "@/services/alertSound";
import { WebSocketManager, WebSocketState } from "@/services/websocket";

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
  connectionState: WebSocketState;
  isPaused: boolean;
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
  const [connectionState, setConnectionState] = useState<WebSocketState>("OFFLINE");
  const [isPaused, setIsPaused] = useState(false);
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
    
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    
    // Automatically translate "localhost" in build-time environment variable to current browser host
    if (baseUrl && baseUrl.includes("localhost") && defaultHost !== "localhost" && defaultHost !== "127.0.0.1") {
      baseUrl = baseUrl.replace("localhost", defaultHost);
    }
    
    if (!baseUrl) {
      baseUrl = `http://${defaultHost}:8000/api/v1`;
    }

    fetch(`${baseUrl}/prices?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPrices(data); })
      .catch(() => {});

    const wsManager = WebSocketManager.getInstance();

    // Subscribe to connection state changes
    const unsubState = wsManager.subscribeToState((state) => {
      setIsConnected(state === "ONLINE");
      setConnectionState(state);
    });

    // Subscribe to stream pause/resume events
    const unsubPause = wsManager.subscribeToPause((paused) => {
      setIsPaused(paused);
    });

    // Subscribe to realtime price streams
    const unsubPrices = wsManager.subscribeToPrices((data) => {
      pendingPrices.current = data;
    });

    // Subscribe to DB alerts trigger notifications
    const unsubAlerts = wsManager.subscribeToAlerts((a) => {
      const direction = a.condition === "above" ? "📈" : "📉";
      const msg = `🚨 ${direction} ${a.asset} went ${a.condition} $${a.target_price} (Current: $${a.current_price})`;
      fireAlertNotification(a.id, msg, a.condition, notifEnabledRef.current, soundEnabledRef.current);
      setLatestAlert({ ...a, timestamp: Date.now() });
    });

    // Trigger Connection Handshake
    wsManager.connect();

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
      unsubState();
      unsubPause();
      unsubPrices();
      unsubAlerts();
      clearInterval(flushInterval);
      wsManager.disconnect();
    };
  }, []);

  return (
    <PriceContext.Provider value={{ prices, isConnected, connectionState, isPaused, latestAlert }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices() {
  const ctx = useContext(PriceContext);
  if (!ctx) throw new Error("usePrices must be used within PriceProvider");
  return ctx;
}
