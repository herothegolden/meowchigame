import React, { useState, useEffect } from "react";
import { useApi } from "@/api/client";

interface Reward {
  id: string;
  kind: "digital" | "irl";
  title: string;
  description?: string;
  costPoints?: number;
  costStars?: number;
}

interface WalletBalance {
  balance: number;
}

export default function Rewards() {
  const [tab, setTab] = useState<"digital" | "irl">("digital");
  const [rewards, setRewards] = useState<{ digital: Reward[]; irl: Reward[] }>({ digital: [], irl: [] });
  const [wallet, setWallet] = useState<WalletBalance>({ balance: 0 });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  
  const api = useApi();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catalogData, walletData] = await Promise.all([
        api.getRewardsCatalog(),
        api.getWalletBalance().catch(() => ({ balance: 0 })) // Handle case where wallet doesn't exist yet
      ]);
      
      setRewards(catalogData);
      setWallet(walletData);
    } catch (error) {
      console.error("Failed to load rewards data:", error);
      // Fallback to demo data if API fails
      setRewards({
        digital: [
          { id: "1", kind: "digital", title: "Extra Life", costStars: 150 },
          { id: "2", kind: "digital", title: "Power-Up Pack", costStars: 200 },
          { id: "3", kind: "digital", title: "Avatar Frame", costStars: 300 },
        ],
        irl: [
          { id: "4", kind: "irl", title: "Free Delivery", costPoints: 300 },
          { id: "5", kind: "irl", title: "10% Discount", costPoints: 500 },
          { id: "6", kind: "irl", title: "Buy 2 Get 1", costPoints: 800 },
          { id: "7", kind: "irl", title: "Limited Flavor", costPoints: 1000 },
        ]
      });
      setWallet({ balance: 1250 }); // Demo balance
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (reward: Reward) => {
    if (claiming) return;
    
    setClaiming(reward.id);
    try {
      await api.claimReward(reward.id);
      // Refresh data after successful claim
      await loadData();
      // Could show success message here
    } catch (error) {
      console.error("Failed to claim reward:", error);
      // Could show error message here
      alert("Failed to claim reward. Please try again.");
    } finally {
      setClaiming(null);
    }
  };

  const canAfford = (reward: Reward): boolean => {
    if (reward.costPoints) return wallet.balance >= reward.costPoints;
    if (reward.costStars) return true; // For now, assume user can afford stars
    return false;
  };

  if (loading) {
    return (
      <div className="container grid">
        <section className="card">
          <div>Loading rewards...</div>
        </section>
      </div>
    );
  }

  return (
    <div className="container grid">
      <section className="card row" style={{ justifyContent: "space-between" }}>
        <div className="h2">🍪 {wallet.balance.toLocaleString()} Points</div>
        <div className="h2">⭐ 60 Stars</div>
      </section>

      <section className="card">
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <button 
            className="badge" 
            onClick={() => setTab("digital")}
            style={{ 
              background: tab === "digital" ? "#2a2f3b" : undefined,
              border: "none",
              cursor: "pointer"
            }}
          >
            Digital
          </button>
          <button 
            className="badge" 
            onClick={() => setTab("irl")}
            style={{ 
              background: tab === "irl" ? "#2a2f3b" : undefined,
              border: "none", 
              cursor: "pointer"
            }}
          >
            In-Store
          </button>
        </div>

        <div className="grid grid-2">
          {rewards[tab].map((reward) => (
            <div key={reward.id} className="card" style={{ opacity: canAfford(reward) ? 1 : 0.6 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: "bold" }}>{reward.title}</div>
                {reward.description && (
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>{reward.description}</div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {reward.costPoints ? `${reward.costPoints}🍪` : `${reward.costStars}⭐`}
                </span>
                <button 
                  className="badge"
                  onClick={() => handleClaim(reward)}
                  disabled={!canAfford(reward) || claiming === reward.id}
                  style={{ 
                    border: "none", 
                    cursor: canAfford(reward) ? "pointer" : "not-allowed",
                    opacity: claiming === reward.id ? 0.5 : 1
                  }}
                >
                  {claiming === reward.id ? "..." : "Claim"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="h2">📜 Claim History</div>
        <div>- 10% Discount (Redeemed ✅)</div>
        <div>- Wallpaper Pack (Active ✅)</div>
      </section>
    </div>
  );
}
