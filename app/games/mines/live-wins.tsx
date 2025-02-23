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
  // Use full backend URL from env variable
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com";

  // Helper: For each win, if the username looks like a wallet address, try to resolve it.
  const resolveUsername = async (win: Win): Promise<Win> => {
    if (win.username.startsWith("kaspa:")) {
      try {
        const res = await axios.get(`/api/user?walletAddress=${encodeURIComponent(win.username)}`);
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
          const resolvedWins = await Promise.all(res.data.wins.map(resolveUsername));
          setWins(resolvedWins);
        }
      } catch (error) {
        console.error("Error fetching latest wins:", error);
      }
    };

    fetchWins();
    const interval = setInterval(() => {
      fetchWins();
    }, 8000);

    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
      <div className="p-3">
        <h3 className="text-base font-semibold text-[#49EACB] mb-2">Live Wins</h3>
        <ScrollArea className="h-[200px]">
          {wins.map((win, index) => (
            <div key={index} className="mb-2 flex justify-between items-center text-xs">
              {/* Username with gradient text */}
              <span
                className="font-bold"
                style={{
                  background: "linear-gradient(90deg, #49EACB, #B6B6B6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {win.username}
              </span>
              {/* Win amount with KAS logo */}
              <span style={{ display: "flex", alignItems: "center", color: textColor }}>
                {win.amount.toFixed(2)}
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                  alt="KAS"
                  width={14}
                  height={14}
                  className="ml-1"
                />
              </span>
              {/* Game name in all caps */}
              <span className="text-xs" style={{ color: `${textColor}80` }}>
                {win.game.toUpperCase()}
              </span>
            </div>
          ))}
        </ScrollArea>
      </div>
    </Card>
  );
}
