"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";
import Image from "next/image";

interface Win {
  username: string;
  amount: number;
  game: string;
  timestamp: string;
}

interface LiveWinsProps {
  textColor?: string;
}

export function LiveWins({ textColor = "#FFFFFF" }: LiveWinsProps) {
  const [wins, setWins] = useState<Win[]>([]);
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  // If username looks like a wallet address, attempt to resolve it.
  const resolveUsername = async (win: Win): Promise<Win> => {
    if (win.username.startsWith("kaspa:")) {
      try {
        const res = await axios.get(
          `/api/user?walletAddress=${encodeURIComponent(win.username)}`
        );
        if (res.data && res.data.username) {
          return { ...win, username: res.data.username };
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

  // Scale helper: the longer the string, the smaller the scale.
  const getScale = (str: string) => {
    const minScale = 0.6;
    const baseLength = 10;
    if (str.length <= baseLength) return 1;
    const scale = 1 - (str.length - baseLength) * 0.02;
    return Math.max(minScale, scale);
  };

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
      <div className="p-3">
        <h3 className="text-base font-semibold text-[#49EACB] mb-2">
          Live Wins
        </h3>
        <ScrollArea className="h-[200px]">
          {wins.map((win, index) => {
            const scale = getScale(win.username);
            return (
              <div
                key={index}
                className="mb-2 flex items-center justify-between space-x-2 text-xs"
              >
                <div className="flex items-center space-x-1 flex-grow">
                  {/* Display wins XP badge if username appears to be a wallet */}
                  {win.username.startsWith("kaspa:") && (
                    <WinsXPBadge walletAddress={win.username} scale={scale} />
                  )}
                  <span
                    className="font-bold truncate"
                    style={{
                      fontSize: `${16 * scale}px`,
                      background: "linear-gradient(90deg, #49EACB, #B6B6B6)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      maxWidth: "120px",
                    }}
                  >
                    {win.username}
                  </span>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <span
                    className="truncate"
                    style={{
                      color: textColor,
                      fontSize: `${14 * scale}px`,
                    }}
                  >
                    {win.amount.toFixed(2)}
                  </span>
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                    alt="KAS"
                    width={14 * scale}
                    height={14 * scale}
                    className="ml-1"
                  />
                </div>
                <span
                  className="truncate"
                  style={{
                    color: `${textColor}80`,
                    fontSize: `${12 * scale}px`,
                    maxWidth: "80px",
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
 * Similar to ChatXPDisplay, this component fetches and displays the XP level for a given wallet address.
 * It renders a circular badge with a background image (xpimage.webp) and responsive sizing.
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
