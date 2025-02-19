"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface DiceGameProps {
  isPlaying: boolean
  onGameEnd: (result: string, winAmount: number) => void
  betAmount: number
  selectedMultiplier: number
}

export function DiceGame({ isPlaying, onGameEnd, betAmount, selectedMultiplier }: DiceGameProps) {
  const [houseDice1, setHouseDice1] = useState(1)
  const [houseDice2, setHouseDice2] = useState(1)
  const [userDice1, setUserDice1] = useState(1)
  const [userDice2, setUserDice2] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [gameResult, setGameResult] = useState<string | null>(null)

  useEffect(() => {
    if (isPlaying) {
      rollDice()
    }
  }, [isPlaying])

  const rollDice = () => {
    setRolling(true)
    setShowResult(false)
    const rollInterval = setInterval(() => {
      setHouseDice1(Math.floor(Math.random() * 6) + 1)
      setHouseDice2(Math.floor(Math.random() * 6) + 1)
      setUserDice1(Math.floor(Math.random() * 6) + 1)
      setUserDice2(Math.floor(Math.random() * 6) + 1)
    }, 50)

    setTimeout(() => {
      clearInterval(rollInterval)
      setRolling(false)

      // Implement house edge based on selected multiplier
      const houseEdge = selectedMultiplier === 2 ? 0.6 : selectedMultiplier === 5 ? 0.9 : 0.95
      const shouldHouseWin = Math.random() < houseEdge

      let finalUserDice1: number, finalUserDice2: number, finalHouseDice1: number, finalHouseDice2: number

      if (shouldHouseWin) {
        // House should win - ensure house total is higher
        do {
          finalUserDice1 = Math.floor(Math.random() * 6) + 1
          finalUserDice2 = Math.floor(Math.random() * 6) + 1
          finalHouseDice1 = Math.floor(Math.random() * 6) + 1
          finalHouseDice2 = Math.floor(Math.random() * 6) + 1
        } while (finalUserDice1 + finalUserDice2 >= finalHouseDice1 + finalHouseDice2)
      } else {
        // Player should win - ensure player total is higher
        do {
          finalUserDice1 = Math.floor(Math.random() * 6) + 1
          finalUserDice2 = Math.floor(Math.random() * 6) + 1
          finalHouseDice1 = Math.floor(Math.random() * 6) + 1
          finalHouseDice2 = Math.floor(Math.random() * 6) + 1
        } while (finalUserDice1 + finalUserDice2 <= finalHouseDice1 + finalHouseDice2)
      }

      setHouseDice1(finalHouseDice1)
      setHouseDice2(finalHouseDice2)
      setUserDice1(finalUserDice1)
      setUserDice2(finalUserDice2)

      const houseSum = finalHouseDice1 + finalHouseDice2
      const userSum = finalUserDice1 + finalUserDice2

      const result = userSum > houseSum ? "You Win" : "House Wins"
      const winAmount = result === "You Win" ? betAmount * selectedMultiplier : 0

      setGameResult(result)
      setShowResult(true)
      onGameEnd(result, winAmount)
    }, 2000)
  }

  const renderDice = (value: number) => {
    // Standard dice patterns
    const patterns = {
      1: [[1, 1]], // Center
      2: [
        [0, 0],
        [2, 2],
      ], // Top-left and bottom-right
      3: [
        [0, 0],
        [1, 1],
        [2, 2],
      ], // Diagonal
      4: [
        [0, 0],
        [0, 2],
        [2, 0],
        [2, 2],
      ], // Corners
      5: [
        [0, 0],
        [0, 2],
        [1, 1],
        [2, 0],
        [2, 2],
      ], // Corners + center
      6: [
        [0, 0],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 2],
      ], // Left and right columns
    }

    return patterns[value as keyof typeof patterns].map(([row, col], i) => (
      <div
        key={i}
        className="flex items-center justify-center"
        style={{
          gridRow: row + 1,
          gridColumn: col + 1,
        }}
      >
        <div className="w-4 h-4 bg-black rounded-full"></div>
      </div>
    ))
  }

  if (!isPlaying && !rolling && !showResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl text-[#49EACB]">Place your bet, select a multiplier, and roll the dice!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <AnimatePresence>
        {(isPlaying || rolling || showResult) && (
          <>
            <div className="flex justify-center w-full mb-8 space-x-16">
              {/* User Dice */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <p className="text-[#49EACB] mb-4 text-2xl">Your Dice</p>
                <div className="flex space-x-4">
                  <motion.div
                    animate={rolling ? { rotate: 360 } : {}}
                    transition={{ duration: 0.5, repeat: rolling ? Number.POSITIVE_INFINITY : 0 }}
                    className="w-28 h-28 bg-[#49EACB] rounded-lg flex items-center justify-center"
                  >
                    <div className="grid grid-rows-3 grid-cols-2 gap-2 p-4 h-full w-full">{renderDice(userDice1)}</div>
                  </motion.div>
                  <motion.div
                    animate={rolling ? { rotate: -360 } : {}}
                    transition={{ duration: 0.5, repeat: rolling ? Number.POSITIVE_INFINITY : 0 }}
                    className="w-28 h-28 bg-[#49EACB] rounded-lg flex items-center justify-center"
                  >
                    <div className="grid grid-rows-3 grid-cols-2 gap-2 p-4 h-full w-full">{renderDice(userDice2)}</div>
                  </motion.div>
                </div>
                {!rolling && <p className="text-[#49EACB] mt-2 text-xl">Total: {userDice1 + userDice2}</p>}
              </motion.div>

              {/* House Dice */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <p className="text-[#49EACB] mb-4 text-2xl">House Dice</p>
                <div className="flex space-x-4">
                  <motion.div
                    animate={rolling ? { rotate: 360 } : {}}
                    transition={{ duration: 0.5, repeat: rolling ? Number.POSITIVE_INFINITY : 0 }}
                    className="w-28 h-28 bg-[#49EACB] rounded-lg flex items-center justify-center"
                  >
                    <div className="grid grid-rows-3 grid-cols-2 gap-2 p-4 h-full w-full">{renderDice(houseDice1)}</div>
                  </motion.div>
                  <motion.div
                    animate={rolling ? { rotate: -360 } : {}}
                    transition={{ duration: 0.5, repeat: rolling ? Number.POSITIVE_INFINITY : 0 }}
                    className="w-28 h-28 bg-[#49EACB] rounded-lg flex items-center justify-center"
                  >
                    <div className="grid grid-rows-3 grid-cols-2 gap-2 p-4 h-full w-full">{renderDice(houseDice2)}</div>
                  </motion.div>
                </div>
                {!rolling && <p className="text-[#49EACB] mt-2 text-xl">Total: {houseDice1 + houseDice2}</p>}
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

