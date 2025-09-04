// apps/web/src/api/client.ts
import { useContext } from "react";
import { TelegramCtx } from "@/providers/TelegramProvider";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

class ApiClient {
  private initData: string | null = null;

  setInitData(initData: string | null) {
    this.initData = initData;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.initData) {
      headers["X-Telegram-Init-Data"] = this.initData;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Network error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Wallet endpoints
  async getWalletBalance() {
    return this.request("/wallet/balance");
  }

  async adjustWallet(delta: number, reason?: string) {
    return this.request("/wallet/adjust", {
      method: "POST",
      body: JSON.stringify({ delta, reason }),
    });
  }

  // Game endpoints
  async getLevel() {
    return this.request("/game/level");
  }

  async submitGameSession(levelId: string, seed: string, moves: any[]) {
    return this.request("/game/session", {
      method: "POST",
      body: JSON.stringify({ levelId, seed, moves }),
    });
  }

  // Rewards endpoints
  async getRewardsCatalog() {
    return this.request("/rewards/catalog");
  }

  async getRewardsHistory() {
    return this.request("/rewards/history");
  }

  async claimReward(rewardId: string) {
    return this.request("/rewards/claim", {
      method: "POST",
      body: JSON.stringify({ rewardId }),
    });
  }
}

export const apiClient = new ApiClient();

// Custom hook to use API with Telegram context
export function useApi() {
  const { initData } = useContext(TelegramCtx);
  
  // Update initData whenever it changes
  if (initData !== (apiClient as any)['initData']) {
    apiClient.setInitData(initData);
  }
  
  return apiClient;
}
