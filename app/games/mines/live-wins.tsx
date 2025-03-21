"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";
import Image from "next/image";

interface Win {
  username: string;
  walletAddress?: string;
  amount: number;
  game: string;
  timestamp: string;
}

interface LiveWinsProps {
  textColor?: string;
}

/**
 * Computes a single scale factor for an entire row based on
 * the combined length of the username, amount, and game name.
 * If it's too long, we shrink the entire row so it won't overflow.
 */
function computeRowScale(win: Win): number {
  // The sum of lengths of username, game, and the string of the amount
  const amountStr = win.amount.toFixed(2);
  const totalLength = win.username.length + win.game.length + amountStr.length;

  const baseLength = 25; // Adjust as needed
  const minScale = 0.5;

  if (totalLength <= baseLength) return 1;

  // For each character over baseLength, shrink ~2%
  const scale = 1 - (totalLength - baseLength) * 0.02;
  return Math.max(minScale, scale);
}

export function LiveWins({ textColor = "#FFFFFF" }: LiveWinsProps) {
  const [wins, setWins] = useState<Win[]>([]);
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  // Resolve username if it appears to be a wallet address (and store that wallet).
  const resolveUsername = async (win: Win): Promise<Win> => {
    // If the API returns a "username" for this wallet,
    // we store that in win.username and keep the original wallet in walletAddress.
    if (!win.walletAddress && win.username.includes("kaspa:")) {
      try {
        const res = await axios.get(
          `/api/user?walletAddress=${encodeURIComponent(win.username)}`
        );
        if (res.data && res.data.username) {
          return {
            ...win,
            username: res.data.username,
            walletAddress: win.username,
          };
        }
      } catch (err) {
        console.error("Error resolving username for wallet", win.username, err);
      }
    }
    return win;
  };

  useEffect(() => {
    const fetchWins = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/latest-wins`);
        if (res.data.success) {
          const resolvedWins = await Promise.all(
            res.data.wins.map(resolveUsername)
          );
          setWins(resolvedWins);
        }
      } catch (error) {
        console.error("Error fetching latest wins:", error);
      }
    };

    fetchWins();
    const interval = setInterval(fetchWins, 8000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
      <div className="p-3">
        <h3 className="text-base font-semibold text-[#49EACB] mb-2">
          Live Wins
        </h3>
        <ScrollArea className="h-[200px]">
          {wins.map((win, index) => {
            const rowScale = computeRowScale(win);

            return (
              // Scale the entire row to prevent right-side cutoff
              <div
                key={index}
                className="mb-2 w-full overflow-hidden"
                style={{
                  transform: `scale(${rowScale})`,
                  transformOrigin: "left center",
                }}
              >
                <div className="flex items-center justify-between space-x-2 text-xs w-full">
                  <div className="flex items-center space-x-1">
                    {/* Render XP badge if walletAddress is available */}
                    {win.walletAddress && (
                      <WinsXPBadge walletAddress={win.walletAddress} />
                    )}
                    <span
                      className="font-bold"
                      style={{
                        fontSize: "16px",
                        background: "linear-gradient(90deg, #49EACB, #B6B6B6)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {win.username}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span
                      style={{
                        color: textColor,
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {win.amount.toFixed(2)}
                    </span>
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                      alt="KAS"
                      width={14}
                      height={14}
                    />
                  </div>
                  <span
                    style={{
                      color: `${textColor}80`,
                      fontSize: "12px",
                    }}
                  >
                    {win.game.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </div>
    </Card>
  );
}

/**
 * WinsXPBadge Component
 *
 * A simplified version of your ChatXPDisplay for LiveWins.
 * We do NOT scale it here (the entire row is scaled in the parent),
 * so this badge can stay at a fixed size or small variant.
 */
function WinsXPBadge({ walletAddress }: { walletAddress: string }) {
  const [userData, setUserData] = useState({ totalXp: 0, level: 0 });
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  useEffect(() => {
    const fetchXP = async () => {
      try {
        const res = await axios.get(
          `${apiUrl}/api/user?walletAddress=${encodeURIComponent(walletAddress)}`
        );
        if (res.data.success && res.data.user) {
          setUserData({
            totalXp: res.data.user.totalXp || 0,
            level: res.data.user.level || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching XP for wallet", walletAddress, err);
      }
    };

    fetchXP();
  }, [walletAddress, apiUrl]);

  // Determine border styling based on level.
  let borderColorClass = "";
  if (userData.level < 25) {
    borderColorClass = "border-[#49EACB] text-[#49EACB]";
  } else if (userData.level < 50) {
    borderColorClass = "border-yellow-400 text-yellow-400";
  } else if (userData.level < 75) {
    borderColorClass = "border-orange-500 text-orange-500";
  } else {
    borderColorClass = "border-red-500 text-red-500";
  }

  // Fixed size since we scale the entire row container
  const size = 32;
  let fontSize = 12;
  if (userData.level >= 100) {
    fontSize *= 0.85; // slightly smaller font for 3-digit numbers
  }

  return (
    <div
      className={`relative rounded-full border-2 flex-shrink-0 ${borderColorClass}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        marginRight: "0.25rem",
        overflow: "hidden",
      }}
    >
      {/* Background image clipped to the circle */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/xpimage.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />
      {/* XP level text on top */}
      <span
        className="relative flex items-center justify-center h-full w-full"
        style={{
          fontSize: `${fontSize}px`,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {userData.level}
      </span>
    </div>
  );
}
