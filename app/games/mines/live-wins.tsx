"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Win {
  username: string
  amount: number
  game: string
  timestamp: Date
}

interface LiveWinsProps {
  textColor?: string
}

export function LiveWins({ textColor = "#FFFFFF" }: LiveWinsProps) {
  const [wins, setWins] = useState<Win[]>([])

  useEffect(() => {
    // Simulated wins
    const simulatedWins: Win[] = [
      { username: "LuckyPlayer", amount: 100, game: "Mines", timestamp: new Date() },
      { username: "CryptoKing", amount: 500, game: "Crash", timestamp: new Date() },
      { username: "MinesExpert", amount: 250, game: "Mines", timestamp: new Date() },
    ]
    setWins(simulatedWins)

    // Simulated new wins every 8 seconds
    const interval = setInterval(() => {
      const newSimulatedWin: Win = {
        username: `Player${Math.floor(Math.random() * 100)}`,
        amount: Math.floor(Math.random() * 1000),
        game: Math.random() > 0.5 ? "Mines" : "Crash",
        timestamp: new Date(),
      }
      setWins((prevWins) => [...prevWins.slice(-9), newSimulatedWin])
    }, 8000)

    return () => clearInterval(interval)
  }, [])

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
              <span style={{ color: textColor }}>{win.amount.toFixed(2)} KAS</span>
              <span className="text-sm" style={{ color: `${textColor}80` }}>
                {win.game}
              </span>
            </div>
          ))}
        </ScrollArea>
      </div>
    </Card>
  )
}

