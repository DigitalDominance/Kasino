"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ShieldCheck, Trophy, Clock, Percent } from "lucide-react"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { WalletConnection } from "@/components/wallet-connection"
import { Montserrat } from "next/font/google"
import axios from "axios"
import Image from "next/image"
import { useWallet } from "@/contexts/WalletContext"
import { LiveChat } from "../mines/live-chat"
import { LiveWins } from "../mines/live-wins"
import { XPDisplay } from "@/components/xp-display"

// Font & Constants
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] })
const MIN_BET = 1
const MAX_BET = 1000
const messages = ["Verifying transaction", "Hashing game seed", "Preparing horses"]

// API base
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

// Types
interface Horse {
  id: number
  multiplier: number
  winChance?: number
}

// Main Page
export default function HorseRacePage() {
  return <HorseRaceContent />
}

function HorseRaceContent() {
  const { isConnected, balance } = useWallet()
  const raceTrackRef = useRef<HTMLDivElement>(null)

  // Game state
  const [pregame, setPregame] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [betAmount, setBetAmount] = useState("1")
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null)
  const [horses, setHorses] = useState<Horse[]>([])
  const [isRacing, setIsRacing] = useState(false)
  const [raceFinished, setRaceFinished] = useState(false)
  const [winningHorse, setWinningHorse] = useState<number | null>(null)

  // Provably-fair & results
  const [clientSeed, setClientSeed] = useState<string | null>(null)
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null)
  const [gameId, setGameId] = useState<string | null>(null)

  // Loading overlay + typewriter
  const [loading, setLoading] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)
  const [msgText, setMsgText] = useState("")

  useEffect(() => {
    if (!loading) return
    setMsgIndex(0)
    setMsgText("")
  }, [loading])

  useEffect(() => {
    if (!loading) return
    const curr = messages[msgIndex]
    if (msgText.length < curr.length) {
      const t = setTimeout(() => setMsgText(curr.slice(0, msgText.length + 1)), 40)
      return () => clearTimeout(t)
    }
    const t2 = setTimeout(() => {
      if (msgIndex < messages.length - 1) {
        setMsgIndex((i) => i + 1)
        setMsgText("")
      }
    }, 2000)
    return () => clearTimeout(t2)
  }, [loading, msgText, msgIndex])

  // Result popup
  const [result, setResult] = useState<{
    gameResult: "win" | "lose"
    winAmount: number
    clientSeed: string | null
    serverSeedHash: string | null
    winningHorse: number
  } | null>(null)

  // Start game
  const handleStartGame = async () => {
    if (!isConnected) {
      alert("Connect your wallet first")
      return
    }

    const bet = Number(betAmount)
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      alert(`Bet between ${MIN_BET} and ${MAX_BET}, within your balance.`)
      return
    }

    // 1) generate clientSeed + hash
    const arr = crypto.getRandomValues(new Uint8Array(32))
    const rawSeed = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    const buf = await crypto.subtle.digest("SHA-256", arr)
    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    setClientSeed(rawSeed)

    // 2) send deposit on-chain
    const [addr] = await window.kasware.getAccounts()
    const treasury =
      Math.random() < 0.5 ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1! : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!
    const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, {
      priorityFee: 10000,
    })
    const txid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id

    // 3) call play API
    setLoading(true)
    try {
      const { data } = await axios.post(`${API_BASE}/api/game/play`, {
        gameName: "horseRace",
        clientSeed: rawSeed,
        clientSeedHash: hash,
        nonce: 0,
        walletAddress: addr,
        betAmount: bet,
        txid,
      })

      if (!data.success) {
        alert("Play API failed")
        return
      }

      setGameId(data.game._id)
      setServerSeedHash(data.game.serverSeedHash)
      setHorses(data.game.horses)
      setPregame(false)
      setIsPlaying(true)
      setSelectedHorse(null)
    } catch (error) {
      console.error("Error starting game:", error)
      alert("Failed to start game. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Select horse and start race
  const handleSelectHorse = async (horseId: number) => {
    if (!isPlaying || selectedHorse !== null) return

    setSelectedHorse(horseId)

    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        selectedHorse: horseId,
      })

      if (!data.success) {
        alert("Settle API failed")
        return
      }

      setIsRacing(true)

      // Wait for animation to complete before showing result
      setTimeout(() => {
        setWinningHorse(data.winningHorse)
        setRaceFinished(true)

        setTimeout(() => {
          setResult({
            gameResult: data.gameResult,
            winAmount: data.winAmount,
            clientSeed,
            serverSeedHash,
            winningHorse: data.winningHorse,
          })
        }, 2000)
      }, 8000) // Race animation duration
    } catch (error) {
      console.error("Error settling game:", error)
      alert("Failed to complete race. Please try again.")
    }
  }

  // Reset game
  const resetGame = () => {
    setPregame(true)
    setIsPlaying(false)
    setIsRacing(false)
    setRaceFinished(false)
    setResult(null)
    setClientSeed(null)
    setServerSeedHash(null)
    setHorses([])
    setSelectedHorse(null)
    setWinningHorse(null)
    setGameId(null)
  }

  // Calculate win chance percentage
  const calculateWinChance = (multiplier: number) => {
    // Simple inverse relationship with house edge
    const HOUSE_EDGE = 0.05
    const rawChance = 1 / multiplier
    const totalRawChance = horses.reduce((sum, horse) => sum + 1 / horse.multiplier, 0)
    const adjustedChance = (rawChance * (1 - HOUSE_EDGE)) / totalRawChance
    return (adjustedChance * 100).toFixed(2)
  }

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-[#49EACB] font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center">
              {msgText}
              <motion.span
                className="ml-2 text-xs"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8 }}
              >
                ●
              </motion.span>
              <motion.span
                className="ml-0.5 text-xs"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, delay: 0.2 }}
              >
                ●
              </motion.span>
              <motion.span
                className="ml-0.5 text-xs"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, delay: 0.4 }}
              >
                ●
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-grow p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
          </Link>
          <div className="flex items-center gap-4">
            <XPDisplay />
            <WalletConnection />
          </div>
        </header>

        {/* Layout */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Horse Racing</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <PreGameScreen onStart={handleStartGame} isConnected={isConnected} />
              ) : isPlaying && !isRacing ? (
                <HorseSelectionScreen
                  horses={horses}
                  onSelectHorse={handleSelectHorse}
                  selectedHorse={selectedHorse}
                  calculateWinChance={calculateWinChance}
                />
              ) : (
                <RaceTrack
                  ref={raceTrackRef}
                  horses={horses}
                  isRacing={isRacing}
                  raceFinished={raceFinished}
                  selectedHorse={selectedHorse}
                  winningHorse={winningHorse}
                />
              )}
            </div>
          </Card>

          {/* Controls */}
          <div className="space-y-6">
            <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6">
              <div className="space-y-4">
                <label className="text-sm text-[#49EACB]">Bet Amount (KAS)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8"
                    disabled={isPlaying}
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                      alt="KAS"
                      width={16}
                      height={16}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                    onClick={() => setBetAmount(String(Math.max(MIN_BET, Number(betAmount) / 2)))}
                    disabled={isPlaying}
                  >
                    ½
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                    onClick={() => setBetAmount(String(Math.min(MAX_BET, Number(betAmount) * 2)))}
                    disabled={isPlaying}
                  >
                    2×
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                    onClick={() => setBetAmount(String(MIN_BET))}
                    disabled={isPlaying}
                  >
                    Min
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                    onClick={() => setBetAmount(String(Math.min(MAX_BET, balance)))}
                    disabled={isPlaying}
                  >
                    Max
                  </Button>
                </div>
                <Button
                  className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                  onClick={handleStartGame}
                  disabled={isPlaying || !isConnected}
                >
                  {!isConnected ? "Connect Wallet" : isPlaying ? "Game in Progress" : "Start Horse Race"}
                </Button>
              </div>
            </Card>
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </div>

      <SiteFooter />

      {/* Result Popup */}
      <AnimatePresence>
        {result && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
            <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-4xl font-bold mb-6 text-black">
                {result.gameResult === "win" ? "You Win!" : "You Lose!"}
              </h2>
              {result.gameResult === "win" ? (
                <p className="text-4xl animate-pulse uppercase mb-4 text-black">
                  You won <strong>{result.winAmount.toFixed(2)}</strong> KAS!
                </p>
              ) : (
                <p className="text-2xl mb-4 text-black">Horse #{result.winningHorse} won the race!</p>
              )}
              <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2" />
                  <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                </div>
                <p className="text-sm text-white break-all">Client Seed: {result.clientSeed}</p>
                <p className="text-sm text-white break-all">Server Hash: {result.serverSeedHash}</p>
              </div>
              <Button onClick={resetGame} className="px-8 py-3 bg-black text-white hover:bg-black/80">
                Play Again
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Pre-game welcome screen
function PreGameScreen({ onStart, isConnected }: { onStart: () => void; isConnected: boolean }) {
  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a]">
      <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
        <motion.h1
          className="text-5xl font-bold mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#49EACB" }}
        >
          Horse Racing
        </motion.h1>
        <motion.p
          className="text-xl tracking-wider mb-4"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#ffffff" }}
        >
          PLACE YOUR BETS AND WIN BIG
        </motion.p>
        <div className="mt-10 mb-10">
          <Image src="/placeholder-pgy3p.png" alt="Horse Racing" width={150} height={150} />
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="mt-6">
          <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" onClick={onStart} disabled={!isConnected}>
            {!isConnected ? "Connect Wallet to Play" : "Start Horse Race"}
          </Button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#2e7d32] z-10"></div>
      <div className="absolute bottom-20 left-0 right-0 h-1 bg-white z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#1b5e20] z-20"></div>
    </div>
  )
}

// Horse selection screen
function HorseSelectionScreen({
  horses,
  onSelectHorse,
  selectedHorse,
  calculateWinChance,
}: {
  horses: Horse[]
  onSelectHorse: (id: number) => void
  selectedHorse: number | null
  calculateWinChance: (multiplier: number) => string
}) {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a] p-6">
      <h3 className="text-2xl font-bold text-center text-white mb-6">Choose Your Horse</h3>

      <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
        {horses.map((horse) => (
          <motion.div
            key={horse.id}
            className={`relative p-4 rounded-lg cursor-pointer transition-all duration-300 ${
              selectedHorse === horse.id
                ? "bg-[#49EACB]/30 border-2 border-[#49EACB]"
                : "bg-black/30 border border-gray-600 hover:bg-[#49EACB]/10"
            }`}
            onClick={() => onSelectHorse(horse.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={selectedHorse !== null}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 relative mr-4">
                <Image
                  src={`/placeholder-fpr5k.png?height=64&width=64&query=cartoon racing horse ${horse.id}`}
                  alt={`Horse ${horse.id}`}
                  width={64}
                  height={64}
                />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white">Horse #{horse.id}</h4>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center">
                    <Trophy className="h-4 w-4 text-[#49EACB] mr-1" />
                    <span className="text-sm text-white">
                      Multiplier: <span className="text-[#49EACB] font-bold">{horse.multiplier}x</span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Percent className="h-4 w-4 text-[#49EACB] mr-1" />
                    <span className="text-sm text-white">
                      Win Chance:{" "}
                      <span className="text-[#49EACB] font-bold">{calculateWinChance(horse.multiplier)}%</span>
                    </span>
                  </div>
                </div>
              </div>
              <Button
                className={`ml-4 ${
                  selectedHorse === horse.id
                    ? "bg-[#49EACB] text-black"
                    : "bg-[#49EACB]/20 text-[#49EACB] hover:bg-[#49EACB]/30"
                }`}
                disabled={selectedHorse !== null}
              >
                {selectedHorse === horse.id ? "Selected" : "Select"}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedHorse !== null && (
        <div className="text-center mt-6">
          <p className="text-lg text-[#49EACB] animate-pulse">Race starting soon...</p>
        </div>
      )}
    </div>
  )
}

// Race track component
const RaceTrack = React.forwardRef<
  HTMLDivElement,
  {
    horses: Horse[]
    isRacing: boolean
    raceFinished: boolean
    selectedHorse: number | null
    winningHorse: number | null
  }
>(({ horses, isRacing, raceFinished, selectedHorse, winningHorse }, ref) => {
  // Generate random speeds for each horse
  const horseSpeeds = useRef(
    horses.map((horse) => ({
      baseSpeed: Math.random() * 0.3 + 0.7,
      variability: Math.random() * 0.2,
    })),
  )

  // Ensure winning horse is fastest in the end
  useEffect(() => {
    if (winningHorse !== null && isRacing) {
      const winningIndex = winningHorse - 1
      horseSpeeds.current[winningIndex].baseSpeed = 1.2 // Make winning horse faster
    }
  }, [winningHorse, isRacing])

  return (
    <div
      ref={ref}
      className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a] relative"
    >
      {/* Race track background */}
      <div className="absolute inset-0">
        {/* Finish line */}
        <div className="absolute top-0 right-12 bottom-0 w-4 bg-white/20 z-10 flex flex-col">
          <div className="flex-1 bg-black/30"></div>
          <div className="flex-1 bg-white/30"></div>
          <div className="flex-1 bg-black/30"></div>
          <div className="flex-1 bg-white/30"></div>
          <div className="flex-1 bg-black/30"></div>
          <div className="flex-1 bg-white/30"></div>
          <div className="flex-1 bg-black/30"></div>
          <div className="flex-1 bg-white/30"></div>
          <div className="flex-1 bg-black/30"></div>
          <div className="flex-1 bg-white/30"></div>
        </div>

        {/* Track lanes */}
        {horses.map((horse, index) => (
          <div
            key={horse.id}
            className={`absolute left-0 right-0 h-[100px] border-t-2 border-b-2 border-dashed border-white/20 ${
              selectedHorse === horse.id ? "bg-[#49EACB]/10" : ""
            }`}
            style={{ top: `${index * 120}px` }}
          >
            {/* Lane number */}
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold">
              {horse.id}
            </div>

            {/* Horse */}
            <motion.div
              className="absolute top-1/2 transform -translate-y-1/2 w-16 h-16"
              initial={{ x: 20 }}
              animate={
                isRacing
                  ? {
                      x:
                        winningHorse === horse.id
                          ? "calc(100% - 80px)"
                          : [
                              "20%",
                              "40%",
                              "60%",
                              winningHorse === horse.id ? "calc(100% - 80px)" : "calc(100% - 120px)",
                            ],
                    }
                  : { x: 20 }
              }
              transition={{
                duration: isRacing ? 8 : 0,
                ease: "easeInOut",
                times: winningHorse === horse.id ? [0, 0.3, 0.6, 1] : [0, 0.4, 0.7, 1],
              }}
            >
              <div className="relative w-full h-full">
                <Image
                  src={`/placeholder-fpr5k.png?height=64&width=64&query=cartoon racing horse ${horse.id}`}
                  alt={`Horse ${horse.id}`}
                  width={64}
                  height={64}
                />
                {selectedHorse === horse.id && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-[#49EACB] text-black text-xs px-2 py-1 rounded-full">
                    Your Pick
                  </div>
                )}
                {raceFinished && winningHorse === horse.id && (
                  <motion.div
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
                  >
                    Winner!
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        ))}

        {/* Track base */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#2e7d32] z-0"></div>
      </div>

      {/* Race status */}
      {isRacing && !raceFinished && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-[#49EACB] px-4 py-2 rounded-full flex items-center">
          <Clock className="w-4 h-4 mr-2 animate-pulse" />
          <span>Race in progress...</span>
        </div>
      )}

      {raceFinished && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-[#49EACB] px-4 py-2 rounded-full flex items-center">
          <Trophy className="w-4 h-4 mr-2" />
          <span>Horse #{winningHorse} wins!</span>
        </div>
      )}
    </div>
  )
})

RaceTrack.displayName = "RaceTrack"
