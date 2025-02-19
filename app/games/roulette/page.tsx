"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Info } from "lucide-react"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { RouletteControls } from "./roulette-controls"
import { LiveChat } from "../mines/live-chat"
import { LiveWins } from "../mines/live-wins"
import { RouletteWheel } from "./roulette-wheel"
import "./styles.css"

export default function RoulettePage() {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [user, setUser] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [betAmount, setBetAmount] = useState("0.00")
  const [balance, setBalance] = useState(0)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [gameResult, setGameResult] = useState<number | null>(null)
  const [winAmount, setWinAmount] = useState<number | null>(null)
  const [selectedBet, setSelectedBet] = useState<{ type: string; amount: number } | null>(null)

  useEffect(() => {
    checkKaswareWallet()
  }, [])

  const checkKaswareWallet = async () => {
    const kasware = (window as any).kasware
    if (kasware) {
      const accounts = await kasware.getAccounts()
      if (accounts.length > 0) {
        setIsWalletConnected(true)
        setUser({ username: accounts[0] })
        await getBalance()
      }
    }
  }

  const connectWallet = async () => {
    try {
      const kasware = (window as any).kasware
      if (kasware) {
        const accounts = await kasware.requestAccounts()
        if (accounts.length > 0) {
          setIsWalletConnected(true)
          setUser({ username: accounts[0] })
          await getBalance()
        }
      } else {
        console.error("Kasware wallet not found")
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  const getBalance = async () => {
    try {
      const kasware = (window as any).kasware
      if (kasware) {
        const balanceData = await kasware.getBalance()
        setBalance(Number(balanceData.total) / Math.pow(10, 8))
      }
    } catch (error) {
      console.error("Failed to get balance:", error)
    }
  }

  const handleSpinRoulette = () => {
    if (!selectedBet) return
    const bet = selectedBet.amount
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount")
      return
    }
    setBalance((prevBalance) => prevBalance - bet)
    setIsPlaying(true)
  }

  const handleGameEnd = (result: number, winAmount: number) => {
    setGameResult(result)
    setWinAmount(winAmount)
    setIsPlaying(false)
    if (winAmount > 0) {
      setBalance((prevBalance) => prevBalance + winAmount)
    }
    setSelectedBet(null)
  }

  const resetGame = () => {
    setIsPlaying(false)
    setGameResult(null)
    setWinAmount(null)
    setSelectedBet(null)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-grow p-6">
        <div className="space-y-6">
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Games
              </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              {!isWalletConnected ? (
                <Button
                  className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold"
                  onClick={connectWallet}
                >
                  Connect Wallet
                </Button>
              ) : user ? (
                <div className="text-[#49EACB]">
                  <span>Welcome, {user.username}!</span>
                  <span className="ml-4">Balance: {balance.toFixed(8)} KAS</span>
                </div>
              ) : (
                <span className="text-[#49EACB]">Creating account...</span>
              )}
            </motion.div>
          </header>

          {/* Game Area */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-[#49EACB]">Roulette</h2>
                  <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                    <Info className="w-4 h-4 mr-2" />
                    How to Play
                  </Button>
                </div>
                <div className="flex-grow relative bg-[#49EACB]/5 rounded-lg mb-6 overflow-hidden p-4">
                  <RouletteWheel isPlaying={isPlaying} onGameEnd={handleGameEnd} selectedBet={selectedBet} />
                </div>
              </div>
            </Card>
            <div className="space-y-6">
              <RouletteControls
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                isPlaying={isPlaying}
                isWalletConnected={isWalletConnected}
                balance={balance}
                onSpinRoulette={handleSpinRoulette}
                resetGame={resetGame}
                gameResult={gameResult}
                winAmount={winAmount}
                selectedBet={selectedBet}
                setSelectedBet={setSelectedBet}
              />
              <LiveChat textColor="#49EACB" />
              <LiveWins textColor="#49EACB" />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Roulette</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount.</li>
              <li>Choose a bet type (e.g., Red, Black, Odd, Even, etc.).</li>
              <li>Click "Spin Roulette" to start the game.</li>
              <li>Watch the wheel spin and the ball drop.</li>
              <li>If the ball lands on your chosen bet type, you win!</li>
            </ol>
            <p className="mt-4 text-white">Payouts vary depending on the type of bet you place. Good luck!</p>
            <Button
              onClick={() => setShowHowToPlay(false)}
              className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
            >
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

