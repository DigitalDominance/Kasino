"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";
import Image from "next/image";

interface Win {
  username: string;
  walletAddress?: string; // New: wallet address if available
  amount: number;
  game: string;
  timestamp: string;
}

interface LiveWinsProps {
  textColor?: string;
}

// Helper: Returns a scale factor based on text length.
function getScale(text: string, baseLength: number = 10): number {
  const minScale = 0.6;
  if (text.length <= baseLength) return 1;
  const scale = 1 - (text.length - baseLength) * 0.02;
  return Math.max(minScale, scale);
}

// Helper: Checks if a string looks like a wallet address.
// (You can adjust this logic as needed.)
function isWallet(text: string): boolean {
  return text.includes("kaspa:"); // Example condition; adjust if needed.
}

export function LiveWins({ textColor = "#FFFFFF" }: LiveWinsProps) {
  const [wins, setWins] = useState<Win[]>([]);
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  // Resolve username if it appears to be a wallet address.
  const resolveUsername = async (win: Win): Promise<Win> => {
    // If there is no walletAddress and the username looks like a wallet,
    // then resolve the username.
    if (!win.walletAddress && isWallet(win.username)) {
      try {
        const res = await axios.get(
          `/api/user?walletAddress=${encodeURIComponent(win.username)}`
        );
        if (res.data && res.data.username) {
          return { 
            ...win, 
            username: res.data.username,
            walletAddress: win.username // Preserve the original wallet address.
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
            // Compute scale factors (different base lengths can be used).
            const usernameScale = getScale(win.username, 10);
            const gameScale = getScale(win.game, 8);

            return (
              <div
                key={index}
                className="mb-2 flex items-center justify-between space-x-2 text-xs"
              >
                <div className="flex items-center space-x-1 flex-grow">
                  {/* Render XP badge if walletAddress is available */}
                  {win.walletAddress && (
                    <WinsXPBadge
                      walletAddress={win.walletAddress}
                      scale={usernameScale}
                    />
                  )}
                  <span
                    className="font-bold break-words whitespace-normal"
                    style={{
                      fontSize: `${16 * usernameScale}px`,
                      background: "linear-gradient(90deg, #49EACB, #B6B6B6)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {win.username}
                  </span>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <span
                    className="whitespace-nowrap"
                    style={{
                      color: textColor,
                      fontSize: `${14 * usernameScale}px`,
                    }}
                  >
                    {win.amount.toFixed(2)}
                  </span>
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                    alt="KAS"
                    width={14 * usernameScale}
                    height={14 * usernameScale}
                    className="ml-1"
                  />
                </div>
                <span
                  className="whitespace-normal break-words"
                  style={{
                    color: `${textColor}80`,
                    fontSize: `${12 * gameScale}px`,
                  }}
                >
                  {win.game.toUpperCase()}
                </span>
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
 * This component is a direct adaptation of your ChatXPDisplay for LiveWins.
 * It fetches and displays the XP level for a given wallet address,
 * renders a circular badge with a background image (xpimage.webp),
 * and scales responsively.
 */
function WinsXPBadge({
  walletAddress,
  scale = 1,
}: {
  walletAddress: string;
  scale?: number;
}) {
  const [userData, setUserData] = useState({ totalXp: 0, level: 0 });
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  useEffect(() => {
    const fetchXP = async () => {
      try {
        const res = await axios.get(
          `${apiUrl}/api/user?walletAddress=${encodeURIComponent(
            walletAddress
          )}`
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

  // Determine border styling based on the user's level.
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

  const size = 32 * scale;
  let fontSize = 12 * scale;
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
