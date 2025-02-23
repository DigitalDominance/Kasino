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

  useEffect(() => {
    const fetchWins = async () => {
      try {
        const res = await axios.get("/api/latest-wins");
        if (res.data.success) {
          setWins(res.data.wins);
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
  }, []);

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-[#49EACB] mb-2">Live Wins</h3>
        <ScrollArea className="h-[200px]">
          {wins.map((win, index) => (
            <div key={index} className="mb-2 flex justify-between items-center">
              <span className="font-bold" style={{ color: textColor }}>
                {win.username}
              </span>
              <span style={{ color: textColor, display: "flex", alignItems: "center" }}>
                {win.amount.toFixed(2)}{" "}
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                  alt="KAS"
                  width={16}
                  height={16}
                  className="ml-1"
                />
              </span>
              <span className="text-sm" style={{ color: `${textColor}80` }}>
                {win.game}
              </span>
            </div>
          ))}
        </ScrollArea>
      </div>
    </Card>
  );
}
