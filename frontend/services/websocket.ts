"use client";

export type WebSocketState = "CONNECTING" | "ONLINE" | "OFFLINE";

export interface PricesPayload {
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

export interface AlertTriggeredPayload {
  id: number;
  asset: string;
  condition: string;
  target_price: number;
  current_price: number;
}

export type StateListener = (state: WebSocketState) => void;
export type PriceListener = (prices: PricesPayload) => void;
export type AlertListener = (alert: AlertTriggeredPayload) => void;

export class WebSocketManager {
  private static instance: WebSocketManager | null = null;

  private ws: WebSocket | null = null;
  private clientId: string = "";
  private platform: string = "web";
  private connectionState: WebSocketState = "OFFLINE";
  
  private reconnectAttempt: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  
  // Track latency
  private lastPingSentTime: number = 0;
  private currentLatencyMs: number = 0;

  // Listeners
  private stateListeners: Set<StateListener> = new Set();
  private priceListeners: Set<PriceListener> = new Set();
  private alertListeners: Set<AlertListener> = new Set();
  private pauseListeners: Set<(isPaused: boolean) => void> = new Set();

  private constructor() {
    if (typeof window !== "undefined") {
      this.clientId = this.getOrCreateClientId();
      
      // Clean up connection cleanly on tab close
      window.addEventListener("beforeunload", () => {
        this.cleanupAndClose(1001, "Tab Closed");
      });

      // Visbility API reconnect handling to be robust on mobile screens
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          console.log("[WebSocketManager] Page became visible. Re-evaluating channel...");
          if (this.connectionState === "OFFLINE" || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.reconnectImmediately();
          }
        }
      });
    }
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private getOrCreateClientId(): string {
    let id = localStorage.getItem("bullion_ws_client_id");
    if (!id) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        id = crypto.randomUUID();
      } else {
        id = "web_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem("bullion_ws_client_id", id);
    }
    return id;
  }

  public connect(): void {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log("[WebSocketManager] Connection already active or in progress.");
      return;
    }

    this.clearTimers();
    this.updateState(this.reconnectAttempt > 0 ? "OFFLINE" : "CONNECTING");

    const host = window.location.hostname;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    let baseUrl = process.env.NEXT_PUBLIC_WS_URL || "";
    
    // Automatically translate "localhost" in build-time environment variable to current browser host
    if (baseUrl && baseUrl.includes("localhost") && host !== "localhost" && host !== "127.0.0.1") {
      baseUrl = baseUrl.replace("localhost", host);
    }
    
    if (!baseUrl) {
      baseUrl = `${protocol}//${host}:8000/api/v1/ws`;
    }
    
    // Construct dynamic url with unique credentials query params
    const wsUrl = `${baseUrl}?client_id=${this.clientId}&platform=${this.platform}`;
    console.log(`[WebSocketManager] Connecting to WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[WebSocketManager] WebSocket opened.");
        this.updateState("ONLINE");
        this.notifyPause(false);
        this.reconnectAttempt = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        console.warn(`[WebSocketManager] WebSocket closed. Code: ${event.code}`);
        this.updateState("OFFLINE");
        
        // Stop pinging backend
        this.stopHeartbeat();
        
        // Auto reconnect if not a deliberate close (code 1000/1001)
        if (event.code !== 1000 && event.code !== 1001) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error("[WebSocketManager] WebSocket error:", err);
        // let onclose do the reconnect heavy-lifting
        if (this.ws) {
          this.ws.close();
        }
      };

    } catch (e) {
      console.error("[WebSocketManager] Failed to create WebSocket instance:", e);
      this.updateState("OFFLINE");
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    console.log("[WebSocketManager] Disconnecting voluntarily...");
    this.cleanupAndClose(1000, "Voluntary Disconnect");
  }

  private cleanupAndClose(code: number = 1000, reason?: string): void {
    this.clearTimers();
    if (this.ws) {
      // Unbind standard onclose listener so we don't trigger the auto-reconnect logic
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close(code, reason);
      } catch (e) {
        console.error("[WebSocketManager] Error closing socket:", e);
      }
      this.ws = null;
    }
    this.updateState("OFFLINE");
  }

  private reconnectImmediately(): void {
    console.log("[WebSocketManager] Reconnecting immediately...");
    this.cleanupAndClose(4000, "Immediate Reconnect");
    this.connect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempt++;
    // Exponential backoff: 1s, 2s, 4s, 8s... up to 30s with 0-500ms randomized jitter
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt - 1), 30000);
    const jitter = Math.floor(Math.random() * 500);
    const totalDelay = delay + jitter;

    console.log(`[WebSocketManager] Scheduling reconnect attempt #${this.reconnectAttempt} in ${totalDelay}ms...`);
    this.updateState("OFFLINE");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, totalDelay);
  }

  // Heartbeat monitoring
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    // Heartbeat every 15 seconds to calculate real latency
    this.heartbeatInterval = setInterval(() => {
      this.sendPing();
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  private sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      this.lastPingSentTime = Date.now();
      this.ws.send("ping");

      // Set timeout in case backend is unresponsive (dead socket detector)
      this.pingTimeout = setTimeout(() => {
        console.warn("[WebSocketManager] Ping timeout. Backend missed heartbeat. Closing...");
        this.reconnectImmediately();
      }, 5000);

    } catch (e) {
      console.error("[WebSocketManager] Failed to send ping:", e);
    }
  }

  private handleMessage(rawData: string): void {
    // 1. Check for heartbeat pong response
    if (rawData === "pong" || rawData === "ping") {
      if (rawData === "pong") {
        if (this.pingTimeout) {
          clearTimeout(this.pingTimeout);
          this.pingTimeout = null;
        }
        this.currentLatencyMs = Date.now() - this.lastPingSentTime;
      } else {
        // Backend pinged us, respond pong instantly
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send("pong");
        }
      }
      return;
    }

    // 2. Standard JSON Payload Parsing
    try {
      const payload = JSON.parse(rawData);
      
      if (payload.type === "price_update" && payload.data) {
        this.notifyPrices(payload.data);
      } else if (payload.type === "alert_triggered" && payload.data) {
        this.notifyAlerts(payload.data);
      } else if (payload.type === "stream_paused") {
        this.notifyPause(true);
      } else if (payload.type === "stream_resumed") {
        this.notifyPause(false);
      }
    } catch (e) {
      console.error("[WebSocketManager] Error parsing JSON message payload:", e);
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
  }

  private updateState(newState: WebSocketState): void {
    if (this.connectionState === newState) return;
    this.connectionState = newState;
    this.stateListeners.forEach((listener) => {
      try {
        listener(newState);
      } catch (e) {
        console.error("[WebSocketManager] State listener error:", e);
      }
    });
  }

  // Observers Subscriptions
  public subscribeToState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState); // Notify current state immediately
    return () => this.stateListeners.delete(listener);
  }

  public subscribeToPrices(listener: PriceListener): () => void {
    this.priceListeners.add(listener);
    return () => this.priceListeners.delete(listener);
  }

  public subscribeToAlerts(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public subscribeToPause(listener: (isPaused: boolean) => void): () => void {
    this.pauseListeners.add(listener);
    return () => this.pauseListeners.delete(listener);
  }

  private notifyPause(isPaused: boolean): void {
    this.pauseListeners.forEach((listener) => {
      try {
        listener(isPaused);
      } catch (e) {
        console.error("[WebSocketManager] Pause listener error:", e);
      }
    });
  }

  private notifyPrices(data: PricesPayload): void {
    this.priceListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error("[WebSocketManager] Price listener error:", e);
      }
    });
  }

  private notifyAlerts(data: AlertTriggeredPayload): void {
    this.alertListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error("[WebSocketManager] Alert listener error:", e);
      }
    });
  }

  // Telemetry properties
  public getClientId(): string {
    return this.clientId;
  }

  public getLatency(): number {
    return this.currentLatencyMs;
  }

  public getPlatform(): string {
    return this.platform;
  }

  public getState(): WebSocketState {
    return this.connectionState;
  }
}
