"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

interface CoinFlipGameProps {
  isPlaying: boolean
  onGameEnd: (result: string, winAmount: number) => void
  betAmount: number
  selectedMultiplier: number
  selectedSymbol: "sun" | "moon"
}

export function CoinFlipGame({
  isPlaying,
  onGameEnd,
  betAmount,
  selectedMultiplier,
  selectedSymbol,
}: CoinFlipGameProps) {
  const [userCoin, setUserCoin] = useState<"sun" | "moon">("sun")
  const [houseCoin, setHouseCoin] = useState<"sun" | "moon">("sun")
  const [flipping, setFlipping] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [gameResult, setGameResult] = useState<string | null>(null)

  useEffect(() => {
    if (isPlaying) {
      flipCoins()
    }
  }, [isPlaying])

  const flipCoins = () => {
    setFlipping(true)
    setShowResult(false)
    const flipInterval = setInterval(() => {
      setUserCoin(Math.random() < 0.5 ? "sun" : "moon")
      setHouseCoin(Math.random() < 0.5 ? "sun" : "moon")
    }, 100)

    setTimeout(() => {
      clearInterval(flipInterval)
      setFlipping(false)

      // Implement house edge based on selected multiplier
      const houseEdge = selectedMultiplier === 2 ? 0.6 : selectedMultiplier === 5 ? 0.9 : 0.95
      const shouldHouseWin = Math.random() < houseEdge

      let finalUserCoin: "sun" | "moon"
      let finalHouseCoin: "sun" | "moon"

      if (shouldHouseWin) {
        finalUserCoin = selectedSymbol === "sun" ? "moon" : "sun"
        finalHouseCoin = selectedSymbol
      } else {
        finalUserCoin = selectedSymbol
        finalHouseCoin = selectedSymbol === "sun" ? "moon" : "sun"
      }

      setUserCoin(finalUserCoin)
      setHouseCoin(finalHouseCoin)

      const result = finalUserCoin === selectedSymbol ? "You Win" : "House Wins"
      const winAmount = result === "You Win" ? betAmount * selectedMultiplier : 0

      setGameResult(result)
      setShowResult(true)
      onGameEnd(result, winAmount)
    }, 2000)
  }

  const renderCoin = (side: "sun" | "moon", isFlipping: boolean, isWinner: boolean) => (
    <motion.div
      className={`w-40 h-40 rounded-full ${
        isWinner ? "bg-green-500" : "bg-[#49EACB]"
      } flex items-center justify-center ${isFlipping ? "animate-flip" : ""}`}
      animate={isFlipping ? { rotateY: 720 } : {}}
      transition={{ duration: 0.5, repeat: isFlipping ? Number.POSITIVE_INFINITY : 0 }}
    >
      {side === "sun" ? <Sun className="w-24 h-24 text-black" /> : <Moon className="w-24 h-24 text-black" />}
    </motion.div>
  )

  if (!isPlaying && !flipping && !showResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl text-[#49EACB]">
          Place your bet, select a multiplier, choose your symbol, and flip the coin!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <AnimatePresence>
        {(isPlaying || flipping || showResult) && (
          <>
            <div className="flex justify-center w-full mb-8 space-x-16">
              {/* User Coin */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <p className="text-[#49EACB] mb-4 text-2xl">Your Coin</p>
                {renderCoin(userCoin, flipping, showResult && gameResult === "You Win")}
              </motion.div>

              {/* House Coin */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <p className="text-[#49EACB] mb-4 text-2xl">House Coin</p>
                {renderCoin(houseCoin, flipping, showResult && gameResult === "House Wins")}
              </motion.div>
            </div>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8 text-center"
              >
                <h3 className="text-3xl font-bold text-[#49EACB] mb-4">{gameResult}</h3>
                <p className="text-xl text-[#49EACB] mb-4">
                  Winning Symbol: {selectedSymbol === "sun" ? "Sun" : "Moon"}
                </p>
                <Button
                  onClick={() => {
                    setShowResult(false)
                    setGameResult(null)
                  }}
                  className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 text-xl px-8 py-3"
                >
                  Play Again
                </Button>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

