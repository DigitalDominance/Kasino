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

export function LiveWins({ textColor = "#FFFFFF" }: LiveWinsProps) {
  const [wins, setWins] = useState<Win[]>([]);
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  // Resolve username if it appears to be a wallet address (and store that wallet).
  const resolveUsername = async (win: Win): Promise<Win> => {
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
        <ScrollArea className="h-[200px] pr-2">
          {wins.map((win, index) => (
            <div key={index} className="mb-1 w-full">
              {/* 
                One horizontal row, tight spacing, smaller text.
                The username is truncated; the game name is fully shown.
              */}
              <div className="flex items-center space-x-1 w-full min-w-0 overflow-hidden whitespace-nowrap">
                {win.walletAddress && <WinsXPBadge walletAddress={win.walletAddress} size={18} />}
                {/* Username */}
                <span
                  className="font-bold truncate"
                  style={{
                    fontSize: "8px",
                    maxWidth: "6rem", // limit how wide the username can grow
                    background: "linear-gradient(90deg, #49EACB, #B6B6B6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {win.username}
                </span>
                {/* Amount */}
                <span
                  style={{
                    fontSize: "10px",
                    color: textColor,
                  }}
                >
                  {win.amount.toFixed(2)}
                </span>
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                  alt="KAS"
                  width={10}
                  height={10}
                />
                {/* Game name */}
                <span
                  style={{
                    fontSize: "8px",
                    color: textColor + "80",
                  }}
                >
                  {win.game.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    </Card>
  );
}

function WinsXPBadge({
  walletAddress,
  size = 24,
}: {
  walletAddress: string;
  size?: number;
}) {
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

  // Slightly smaller badge
  let fontSize = Math.floor(size * 0.4);
  if (userData.level >= 100) {
    fontSize *= 0.85; // smaller for 3-digit levels
  }

  return (
    <div
      className={`relative rounded-full border flex-shrink-0 ${borderColorClass}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        overflow: "hidden",
      }}
    >
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
