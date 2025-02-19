"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import Image from "next/image"

interface DiceControlsProps {
  betAmount: string
  setBetAmount: (amount: string) => void
  isPlaying: boolean
  isWalletConnected: boolean
  balance: number
  onRollDice: () => void
  resetGame: () => void
  gameResult: string | null
  winAmount: number | null
  selectedMultiplier: number
  setSelectedMultiplier: (multiplier: number) => void
}

export function DiceControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onRollDice,
  resetGame,
  gameResult,
  winAmount,
  selectedMultiplier,
  setSelectedMultiplier,
}: DiceControlsProps) {
  const handleRollDice = () => {
    if (!isWalletConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (Number(betAmount) > balance) {
      alert("Insufficient balance")
      return
    }

    onRollDice()
  }

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm">
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-[#49EACB]">Bet Amount</label>
          <div className="relative">
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8"
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
              onClick={() => setBetAmount((Number(betAmount) / 2).toString())}
              disabled={isPlaying || !isWalletConnected}
            >
              ½
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount((Number(betAmount) * 2).toString())}
              disabled={isPlaying || !isWalletConnected}
            >
              2×
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount("0.00")}
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

        <div className="space-y-2">
          <label className="text-sm text-[#49EACB]">Multiplier</label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 5, 10].map((multiplier) => (
              <Button
                key={multiplier}
                variant={selectedMultiplier === multiplier ? "default" : "outline"}
                className={`border-[#49EACB]/10 ${
                  selectedMultiplier === multiplier ? "bg-[#49EACB] text-black" : "hover:bg-[#49EACB]/10"
                }`}
                onClick={() => setSelectedMultiplier(multiplier)}
                disabled={isPlaying || !isWalletConnected}
              >
                {multiplier}x
              </Button>
            ))}
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {gameResult !== null ? (
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-[#49EACB]">Result: {gameResult}</div>
              {winAmount !== null && winAmount > 0 ? (
                <div className="text-xl text-green-500">You won {winAmount.toFixed(8)} KAS!</div>
              ) : (
                <div className="text-xl text-red-500">You lost your bet.</div>
              )}
            </div>
          ) : null}
          {!isPlaying ? (
            <Button
              className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
              onClick={handleRollDice}
              disabled={!isWalletConnected}
            >
              {!isWalletConnected ? "Connect Wallet to Play" : "Roll Dice"}
            </Button>
          ) : (
            <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
              Rolling...
            </Button>
          )}
        </motion.div>
      </div>
    </Card>
  )
}

