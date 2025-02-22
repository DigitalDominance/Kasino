"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import Image from "next/image"

interface MinesControlsProps {
  betAmount: string
  setBetAmount: (amount: string) => void
  isPlaying: boolean
  isWalletConnected: boolean
  balance: number
  onStartGame: () => void
}

export function MinesControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
}: MinesControlsProps) {
  const handleStartGame = () => {
    if (!isWalletConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (Number(betAmount) > balance) {
      alert("Insufficient balance")
      return
    }

    onStartGame()
  }

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm">
      <div className="p-6 space-y-4">
        {/* Bet Amount Input */}
        <div className="space-y-2">
          <label className="text-sm text-[#49EACB]">Bet Amount</label>
          <div className="relative">
            <Input
              type="number"
              min="1"
              value={betAmount}
              onChange={(e) => {
                // Enforce a minimum bet of 1
                const val = Math.max(1, Number(e.target.value))
                setBetAmount(val.toString())
              }}
              className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-10"
              placeholder="0.00"
              disabled={isPlaying || !isWalletConnected}
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                alt="KAS"
                width={16}
                height={16}
                className="rounded-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() =>
                setBetAmount((Math.max(1, Number(betAmount)) / 2).toString())
              }
              disabled={isPlaying || !isWalletConnected}
            >
              ½
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() =>
                setBetAmount((Math.max(1, Number(betAmount)) * 2).toString())
              }
              disabled={isPlaying || !isWalletConnected}
            >
              2×
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount("1")}
              disabled={isPlaying || !isWalletConnected}
            >
              Min
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount(balance.toString())}
              disabled={isPlaying || !isWalletConnected}
            >
              Max
            </Button>
          </div>
        </div>

        {/* Start Game Button */}
        <Button
          className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
          onClick={handleStartGame}
          disabled={!isWalletConnected || isPlaying}
        >
          {!isWalletConnected ? "Connect Wallet to Play" : "Start New Game"}
        </Button>
      </div>
    </Card>
  )
}
