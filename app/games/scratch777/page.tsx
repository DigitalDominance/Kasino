"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ShieldCheck, Info } from "lucide-react"
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
import type { JSX } from "react"

// Font & Constants
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] })
const MIN_BET = 1
const MAX_BET = 1000
const messages = ["Verifying transaction", "Hashing game seed", "Generating scratch ticket"]
const RESULT_POPUP_DELAY = 2000 // 2 second delay for result popup

// API base
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

// Scratch ticket interface
interface ScratchTicket {
  symbols: string[]
  revealed: boolean[]
  scratchedCount: number
}

// Symbol mapping for display
const SYMBOL_EMOJIS: { [key: string]: string | JSX.Element } = {
  // Special 777 symbols with different colors/gradients
  SYM1: <span className="text-yellow-500 font-bold">777</span>,
  SYM2: <span className="text-red-500 font-bold">777</span>,
  SYM3: <span className="text-blue-500 font-bold">777</span>,
  SYM4: <span className="text-purple-500 font-bold">777</span>,
  SYM5: <span className="text-green-500 font-bold">777</span>,
  SYM6: (
    <span className="bg-gradient-to-r from-yellow-400 to-red-500 text-transparent bg-clip-text font-bold">777</span>
  ),
  SYM7: (
    <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text font-bold">777</span>
  ),
  SYM8: (
    <span className="bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text font-bold">777</span>
  ),
  // Regular fruit/object symbols
  SYM9: "🍒",
  SYM10: "🍋",
  SYM11: "🍊",
  SYM12: "🍇",
  SYM13: "🍓",
  SYM14: "🥝",
  SYM15: "🍑",
  SYM16: "🍍",
  SYM17: "🥭",
  SYM18: "🍌",
  SYM19: "🍎",
  SYM20: "🍐",
  SYM21: "🥥",
  SYM22: "🍈",
  SYM23: "🍉",
  SYM24: "🍅",
  SYM25: "🥑",
  SYM26: "🌶️",
  SYM27: "🌽",
  SYM28: "🥕",
  SYM29: "🧄",
  SYM30: "🧅",
  SYM31: "🥔",
  SYM32: "🍠",
  SYM33: "🥜",
  SYM34: "🌰",
  SYM35: "🍄",
  SYM36: "🥦",
  SYM37: "💎",
  SYM38: "⭐",
  SYM39: "🔔",
  SYM40: "🎰",
  SYM41: "🃏",
  SYM42: "🎲",
  SYM43: "🎯",
  SYM44: "🏆",
  SYM45: "💰",
  SYM46: "💵",
  SYM47: "🎁",
  SYM48: "🎪",
  SYM49: "🎨",
  SYM50: "🎭",
  SYM51: "🎤",
  SYM52: "🎧",
  SYM53: "🎸",
  SYM54: "🎹",
  SYM55: "🎺",
  SYM56: "🎻",
  SYM57: "🎬",
  SYM58: "🎮",
  SYM59: "🎯",
  SYM60: "🎱",
  SYM61: "🎳",
  SYM62: "🎾",
  SYM63: "🏀",
  SYM64: "🏈",
}

// Main Page
export default function Scratch777Page() {
  return <Scratch777Content />
}

function Scratch777Content() {
  const { isConnected, balance } = useWallet()

  // Game state
  const [pregame, setPregame] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [betAmount, setBetAmount] = useState("1")
  const [scratchTicket, setScratchTicket] = useState<ScratchTicket>({
    symbols: Array(16).fill("?"),
    revealed: Array(16).fill(false),
    scratchedCount: 0,
  })
  const [gameStatus, setGameStatus] = useState<"betting" | "playing" | "complete">("betting")
  const [showRules, setShowRules] = useState(false)
  const [potentialWin, setPotentialWin] = useState(0)

  // Animations
  const [isScratching, setIsScratching] = useState(false)
  const [scratchingIndex, setScratchingIndex] = useState<number | null>(null)

  // Provably-fair & results
  const [clientSeed, setClientSeed] = useState<string | null>(null)
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null)
  const [gameId, setGameId] = useState<string | null>(null)

  // Loading overlay + typewriter
  const [loading, setLoading] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)
  const [msgText, setMsgText] = useState("")

  // Result popup
  const [result, setResult] = useState<{
    gameResult: "win" | "lose"
    winAmount: number
    multiplier: number
    clientSeed: string | null
    serverSeedHash: string | null
  } | null>(null)

  // Scratch sound
  const scratchSoundRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      scratchSoundRef.current = new Audio("/dice-roll.mp3")
    }
  }, [])

  const playScratchSound = () => {
    if (scratchSoundRef.current) {
      scratchSoundRef.current.currentTime = 0
      scratchSoundRef.current.play().catch((err) => console.error("Error playing sound:", err))
    }
  }

  // Calculate potential win
  useEffect(() => {
    const bet = Number(betAmount)
    if (!isNaN(bet)) {
      setPotentialWin(bet * 10) // Maximum win (10x multiplier)
    }
  }, [betAmount])

  // Typewriter effect for loading messages
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

    try {
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
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!
      const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, {
        priorityFee: 10000,
      })
      const txid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id

      // 3) call play API
      setLoading(true)
      const { data } = await axios.post(`${API_BASE}/api/game/play`, {
        gameName: "scratch777",
        clientSeed: rawSeed,
        clientSeedHash: hash,
        nonce: 0,
        walletAddress: addr,
        betAmount: bet,
        txid,
      })

      if (!data.success) {
        alert("Play API failed")
        setLoading(false)
        return
      }

      setGameId(data.gameId)
      setServerSeedHash(data.serverSeedHash)

      // Set initial game state
      setPregame(false)
      setIsPlaying(true)
      setGameStatus("playing")
      setScratchTicket({
        symbols: data.masked, // Array of "?" initially
        revealed: Array(16).fill(false),
        scratchedCount: 0,
      })

      setLoading(false)
    } catch (error) {
      console.error("Error starting game:", error)
      alert("Failed to start game. Please try again.")
      setLoading(false)
    }
  }

  // Scratch a square
  const handleScratch = async (index: number) => {
    if (!gameId || isScratching || gameStatus === "complete" || scratchTicket.revealed[index]) return

    setIsScratching(true)
    setScratchingIndex(index)
    playScratchSound()

    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "scratch",
        index,
      })

      if (!data.success) {
        alert("Scratch action failed")
        setIsScratching(false)
        setScratchingIndex(null)
        return
      }

      // Update the revealed symbol
      setScratchTicket((prev) => {
        const newSymbols = [...prev.symbols]
        const newRevealed = [...prev.revealed]
        newSymbols[index] = data.symbol
        newRevealed[index] = true
        return {
          symbols: newSymbols,
          revealed: newRevealed,
          scratchedCount: data.scratchedCount,
        }
      })

      // Check if game is complete
      if (data.gameResult !== "continue") {
        setGameStatus("complete")

        // Show result after delay
        setTimeout(() => {
          setResult({
            gameResult: data.gameResult,
            winAmount: data.winAmount || 0,
            multiplier: data.multiplier || 0,
            clientSeed,
            serverSeedHash,
          })
        }, RESULT_POPUP_DELAY)
      }

      setIsScratching(false)
      setScratchingIndex(null)
    } catch (error) {
      console.error("Error scratching:", error)
      alert("Failed to scratch. Please try again.")
      setIsScratching(false)
      setScratchingIndex(null)
    }
  }

  // Auto-reveal all remaining squares
  const handleRevealAll = async () => {
    if (!gameId || isScratching || gameStatus === "complete") return

    for (let i = 0; i < 16; i++) {
      if (!scratchTicket.revealed[i]) {
        await new Promise((resolve) => setTimeout(resolve, 200)) // Small delay between reveals
        await handleScratch(i)
      }
    }
  }

  // Reset game
  const resetGame = () => {
    setPregame(true)
    setIsPlaying(false)
    setScratchTicket({
      symbols: Array(16).fill("?"),
      revealed: Array(16).fill(false),
      scratchedCount: 0,
    })
    setGameStatus("betting")
    setResult(null)
    setClientSeed(null)
    setServerSeedHash(null)
    setGameId(null)
    setScratchingIndex(null)
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
                <h2 className="text-2xl font-bold text-[#49EACB]">777 Scratch-Off</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#49EACB] border-[#49EACB]/30"
                    onClick={() => setShowRules(!showRules)}
                  >
                    <Info className="w-4 h-4 mr-1" /> Rules
                  </Button>
                  <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                    Reset
                  </Button>
                </div>
              </div>

              {pregame ? (
                <PreGameScreen onStart={handleStartGame} isConnected={isConnected} />
              ) : (
                <ScratchGameScreen
                  scratchTicket={scratchTicket}
                  onScratch={handleScratch}
                  onRevealAll={handleRevealAll}
                  isScratching={isScratching}
                  scratchingIndex={scratchingIndex}
                  gameStatus={gameStatus}
                />
              )}
            </div>
          </Card>

          {/* Controls */}
          <div className="space-y-6">
            {pregame && (
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
                  <div className="text-center text-sm text-[#49EACB] mb-2">
                    Max Win: {potentialWin.toFixed(2)} KAS (10x multiplier)
                  </div>
                  <Button
                    className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                    onClick={handleStartGame}
                    disabled={isPlaying || !isConnected}
                  >
                    {!isConnected ? "Connect Wallet" : isPlaying ? "Game in Progress" : "Buy Scratch Ticket"}
                  </Button>
                </div>
              </Card>
            )}
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </div>

      <SiteFooter />

      {/* Rules Popup */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setShowRules(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-900 p-6 rounded-lg border border-[#49EACB] max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-[#49EACB] mb-4">777 Scratch-Off Rules</h2>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-lg font-semibold text-white mb-2">How to Play</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-300">
                    <li>Purchase a scratch ticket with your bet amount</li>
                    <li>Scratch squares one by one to reveal hidden symbols</li>
                    <li>Match 3 or more identical symbols to win</li>
                    <li>Use "Reveal All" to instantly scratch all remaining squares</li>
                  </ul>
                </div>

                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-lg font-semibold text-white mb-2">Winning & Payouts</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-300">
                    <li>
                      <span className="text-[#49EACB] font-bold">3 matches:</span> 2x your bet
                    </li>
                    <li>
                      <span className="text-[#49EACB] font-bold">4 matches:</span> 3x your bet
                    </li>
                    <li>
                      <span className="text-[#49EACB] font-bold">5 matches:</span> 4x your bet
                    </li>
                    <li>
                      <span className="text-[#49EACB] font-bold">6+ matches:</span> Up to 10x your bet
                    </li>
                    <li>No matches = no win</li>
                  </ul>
                </div>

                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-lg font-semibold text-white mb-2">Strategy Tips</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-300">
                    <li>Scratch squares strategically to find patterns</li>
                    <li>Use "Reveal All" when you're confident about your matches</li>
                    <li>Higher bets = higher potential winnings</li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" onClick={() => setShowRules(false)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Popup */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          >
            <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-4xl font-bold mb-6 text-black">
                {result.gameResult === "win" ? "You Win!" : "No Match"}
              </h2>
              {result.gameResult === "win" ? (
                <div className="mb-6">
                  <p className="text-4xl animate-pulse uppercase mb-2 text-black">
                    You won <strong>{result.winAmount.toFixed(2)}</strong> KAS!
                  </p>
                  <p className="text-lg text-black">{result.multiplier}x multiplier!</p>
                </div>
              ) : (
                <p className="text-2xl mb-4 text-black">Better luck next time!</p>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Pre-game welcome screen
function PreGameScreen({ onStart, isConnected }: { onStart: () => void; isConnected: boolean }) {
  return (
    <div className="relative w-full h-[800px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a]">
      <div className="absolute inset-0 flex flex-col items-center justify-start pt-16 z-40">
        <motion.h1
          className="text-5xl font-bold mb-6"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#49EACB" }}
        >
          777 Scratch-Off
        </motion.h1>
        <motion.p
          className="text-xl tracking-wider mb-12"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#ffffff" }}
        >
          SCRATCH TO REVEAL AND WIN BIG!
        </motion.p>

        {/* Animated scratch ticket preview */}
        <div className="relative mb-12">
          <motion.div
            className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-6 shadow-2xl border-4 border-yellow-300"
            animate={{ rotateY: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-black">SCRATCH TICKET</h3>
              <p className="text-black font-semibold">Match 3+ to Win!</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }, (_, i) => (
                <motion.div
                  key={i}
                  className="w-12 h-12 bg-silver rounded flex items-center justify-center text-2xl"
                  style={{ backgroundColor: "#C0C0C0" }}
                  animate={{
                    backgroundColor: i % 4 === Math.floor(Date.now() / 1000) % 4 ? "#FFD700" : "#C0C0C0",
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {i % 4 === Math.floor(Date.now() / 1000) % 4 ? (
                    <span className="bg-gradient-to-r from-yellow-400 to-red-500 text-transparent bg-clip-text font-bold">
                      777
                    </span>
                  ) : (
                    "?"
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Game rules */}
        <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg max-w-lg mb-12 mx-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-[#49EACB] mb-2">How to Play</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Buy a scratch ticket</li>
                <li>• Click squares to scratch</li>
                <li>• Reveal hidden symbols</li>
                <li>• Match 3+ identical symbols</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#49EACB] mb-2">Payouts</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• 3 matches = 2x bet</li>
                <li>• 4 matches = 3x bet</li>
                <li>• 5+ matches = up to 10x bet</li>
                <li>• No matches = no win</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Floating symbols */}
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 space-y-4">
          {["🍒", "🍋", "🍊", "🍇"].map((symbol, index) => (
            <motion.div
              key={symbol}
              className="text-4xl"
              animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 2 + index * 0.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: index * 0.3,
              }}
            >
              {symbol}
            </motion.div>
          ))}
        </div>

        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 space-y-4">
          {[
            <span
              key="777-1"
              className="bg-gradient-to-r from-yellow-400 to-red-500 text-transparent bg-clip-text font-bold text-4xl"
            >
              777
            </span>,
            <span
              key="777-2"
              className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text font-bold text-4xl"
            >
              777
            </span>,
            <span
              key="777-3"
              className="bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text font-bold text-4xl"
            >
              777
            </span>,
            <span key="777-4" className="text-yellow-500 font-bold text-4xl">
              777
            </span>,
          ].map((symbol, index) => (
            <motion.div
              key={`symbol-${index}`}
              animate={{ y: [0, -10, 0], rotate: [0, -5, 5, 0] }}
              transition={{
                duration: 2.2 + index * 0.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: index * 0.4,
              }}
            >
              {symbol}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <Button
            className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8 py-6 text-lg"
            onClick={onStart}
            disabled={!isConnected}
          >
            {!isConnected ? "Connect Wallet to Play" : "Buy Scratch Ticket"}
          </Button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#004d40] z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#003c32] z-20"></div>
    </div>
  )
}

// Scratch Game Screen Component
function ScratchGameScreen({
  scratchTicket,
  onScratch,
  onRevealAll,
  isScratching,
  scratchingIndex,
  gameStatus,
}: {
  scratchTicket: ScratchTicket
  onScratch: (index: number) => void
  onRevealAll: () => void
  isScratching: boolean
  scratchingIndex: number | null
  gameStatus: string
}) {
  return (
    <div className="w-full h-full flex flex-col items-center">
      {/* Scratch Ticket */}
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-6 shadow-2xl border-4 border-yellow-300 mb-6">
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-black">777 SCRATCH TICKET</h3>
          <p className="text-black font-semibold">Match 3 or more symbols to win!</p>
        </div>

        {/* 4x4 Grid */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 16 }, (_, index) => {
            const isRevealed = scratchTicket.revealed[index]
            const symbol = scratchTicket.symbols[index]
            const isCurrentlyScratching = scratchingIndex === index

            return (
              <motion.div
                key={index}
                className={`
                  w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold cursor-pointer
                  ${
                    isRevealed
                      ? "bg-white text-black border-2 border-gray-300"
                      : "bg-silver hover:bg-gray-300 border-2 border-gray-400"
                  }
                  ${isCurrentlyScratching ? "animate-pulse" : ""}
                `}
                style={{ backgroundColor: isRevealed ? "#FFFFFF" : "#C0C0C0" }}
                onClick={() => !isRevealed && onScratch(index)}
                whileHover={!isRevealed ? { scale: 1.05 } : {}}
                whileTap={!isRevealed ? { scale: 0.95 } : {}}
                animate={
                  isCurrentlyScratching
                    ? {
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }
                    : {}
                }
                transition={{ duration: 0.3 }}
              >
                {isRevealed ? SYMBOL_EMOJIS[symbol] || symbol : "?"}
              </motion.div>
            )
          })}
        </div>

        {/* Progress */}
        <div className="mt-4 text-center">
          <p className="text-black font-semibold">Scratched: {scratchTicket.scratchedCount}/16</p>
          <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-[#49EACB] to-[#4AEAFF] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(scratchTicket.scratchedCount / 16) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game Controls */}
      <div className="flex flex-col items-center gap-4">
        {gameStatus === "playing" && (
          <div className="text-center text-[#49EACB]">
            <p className="text-sm mb-3">Click squares to scratch and reveal symbols!</p>
          </div>
        )}

        {scratchTicket.scratchedCount < 16 && gameStatus === "playing" && (
          <Button
            onClick={onRevealAll}
            disabled={isScratching}
            className="bg-yellow-500 text-black hover:bg-yellow-400 px-6 py-2"
          >
            Reveal All
          </Button>
        )}
      </div>
    </div>
  )
}
