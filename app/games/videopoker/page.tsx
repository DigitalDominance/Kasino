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

// Font & Constants
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] })
const MIN_BET = 1
const MAX_BET = 1000
const messages = ["Verifying transaction", "Hashing game seed", "Shuffling cards"]

// API base
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

// Card types
interface CardType {
  suit: string
  rank: string
  image?: string
  flipped?: boolean
}

// Updated paytable to match backend
const PAYTABLE = {
  royalFlush: 100,
  straightFlush: 50,
  fourKind: 25,
  fullHouse: 9,
  flush: 6,
  straight: 4,
  threeKind: 3,
  twoPair: 2,
  jacksOrBetter: 1,
}

// Hand rank display names
const HAND_RANK_NAMES = {
  royalFlush: "Royal Flush",
  straightFlush: "Straight Flush",
  fourKind: "Four of a Kind",
  fullHouse: "Full House",
  flush: "Flush",
  straight: "Straight",
  threeKind: "Three of a Kind",
  twoPair: "Two Pair",
  jacksOrBetter: "Jacks or Better",
}

// Main Page
export default function VideoPokerPage() {
  return <VideoPokerContent />
}

function VideoPokerContent() {
  const { isConnected, balance } = useWallet()

  // Game state
  const [pregame, setPregame] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [betAmount, setBetAmount] = useState("1")
  const [playerCards, setPlayerCards] = useState<CardType[]>([])
  const [holds, setHolds] = useState<boolean[]>([false, false, false, false, false])
  const [gamePhase, setGamePhase] = useState<"betting" | "hold" | "draw" | "complete">("betting")
  const [handRank, setHandRank] = useState<string | null>(null)
  const [showPaytable, setShowPaytable] = useState(false)

  // Animations
  const [isDealing, setIsDealing] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

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
    rank: string | null
    clientSeed: string | null
    serverSeedHash: string | null
  } | null>(null)

  // Card dealing sound
  const cardSoundRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      cardSoundRef.current = new Audio("/card-sound.mp3")
    }
  }, [])

  const playCardSound = () => {
    if (cardSoundRef.current) {
      cardSoundRef.current.currentTime = 0
      cardSoundRef.current.play().catch((err) => console.error("Error playing sound:", err))
    }
  }

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

  // Toggle hold for a card
  const toggleHold = (index: number) => {
    if (gamePhase !== "hold") return

    console.log(`Toggling hold for card ${index}`)

    const newHolds = [...holds]
    newHolds[index] = !newHolds[index]

    console.log("New holds array:", newHolds)

    setHolds(newHolds)
  }

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
        gameName: "videoPoker",
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

      // Ensure we're using all 5 cards from the API response
      console.log("Initial cards from API:", data.playerHand)

      // Set initial cards with flipped state
      const initialPlayerCards = data.playerHand.map((card: CardType) => ({
        ...card,
        flipped: false,
      }))

      // Set initial game state
      setPregame(false)
      setIsPlaying(true)
      setGamePhase("hold")
      setIsDealing(true)
      setHolds([false, false, false, false, false])

      // First set empty array to clear the table
      setPlayerCards([])

      // Deal all cards at once (back-facing)
      setTimeout(() => {
        setPlayerCards(initialPlayerCards)
        playCardSound()

        // Flip all cards with slight delays between them
        let delay = 300
        for (let i = 0; i < initialPlayerCards.length; i++) {
          setTimeout(() => {
            const updatedCards = [...initialPlayerCards]
            updatedCards[i] = { ...updatedCards[i], flipped: true }
            setPlayerCards(updatedCards)
            playCardSound()

            // After all cards are flipped
            if (i === initialPlayerCards.length - 1) {
              setTimeout(() => {
                setIsDealing(false)
              }, 300)
            }
          }, delay)
          delay += 250
        }
      }, 300)

      setLoading(false)
    } catch (error) {
      console.error("Error starting game:", error)
      alert("Failed to start game. Please try again.")
      setLoading(false)
    }
  }

  // Draw new cards
  const handleDraw = async () => {
    if (gamePhase !== "hold") return

    setGamePhase("draw")
    setIsDrawing(true)

    try {
      console.log("Sending holds to API:", holds)

      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        holds, // This should be the correct holds array with true/false values
      })

      if (!data.success) {
        alert("Draw action failed")
        setIsDrawing(false)
        setGamePhase("hold")
        return
      }

      console.log("Final hand from API:", data.finalHand)

      // Get the final hand
      const finalHand = data.finalHand

      // Create a map of current cards by position
      const currentCardMap = playerCards.reduce((map, card, index) => {
        map[index] = card
        return map
      }, {})

      // Create updated cards array with all held cards flipped and new ones not flipped
      const updatedCards = finalHand.map((card: CardType, index: number) => {
        if (holds[index]) {
          // Keep held cards as they are (already flipped)
          return { ...currentCardMap[index], flipped: true }
        } else {
          // New cards start face down
          return { ...card, flipped: false }
        }
      })

      // Update player cards with the new hand (some back facing)
      setPlayerCards(updatedCards)

      // Flip the new cards with slight delays
      let delay = 300
      for (let i = 0; i < updatedCards.length; i++) {
        if (!holds[i]) {
          setTimeout(() => {
            const flippedCards = [...updatedCards]
            flippedCards[i] = { ...flippedCards[i], flipped: true }
            setPlayerCards(flippedCards)
            playCardSound()

            // Check if this is the last card to flip
            const remainingToFlip = updatedCards.filter((_, idx) => !holds[idx] && idx >= i).length
            if (remainingToFlip === 1) {
              // After all new cards are flipped
              setTimeout(() => {
                setIsDrawing(false)
                setGamePhase("complete")
                setHandRank(data.rank)

                // Show result after a short delay
                setTimeout(() => {
                  setResult({
                    gameResult: data.gameResult,
                    winAmount: data.winAmount,
                    rank: data.rank,
                    clientSeed,
                    serverSeedHash,
                  })
                }, 1000)
              }, 500)
            }
          }, delay)
          delay += 250
        }
      }

      // If all cards were held, we still need to complete the game
      if (holds.every((hold) => hold)) {
        setTimeout(() => {
          setIsDrawing(false)
          setGamePhase("complete")
          setHandRank(data.rank)

          // Show result after a short delay
          setTimeout(() => {
            setResult({
              gameResult: data.gameResult,
              winAmount: data.winAmount,
              rank: data.rank,
              clientSeed,
              serverSeedHash,
            })
          }, 1000)
        }, 500)
      }
    } catch (error) {
      console.error("Error drawing:", error)
      alert("Failed to draw. Please try again.")
      setIsDrawing(false)
      setGamePhase("hold")
    }
  }

  // Reset game
  const resetGame = () => {
    setPregame(true)
    setIsPlaying(false)
    setPlayerCards([])
    setHolds([false, false, false, false, false])
    setGamePhase("betting")
    setHandRank(null)
    setResult(null)
    setClientSeed(null)
    setServerSeedHash(null)
    setGameId(null)
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
                <h2 className="text-2xl font-bold text-[#49EACB]">Video Poker</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#49EACB] border-[#49EACB]/30"
                    onClick={() => setShowPaytable(!showPaytable)}
                  >
                    <Info className="w-4 h-4 mr-1" /> Paytable
                  </Button>
                  <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                    Reset
                  </Button>
                </div>
              </div>

              {pregame ? (
                <PreGameScreen onStart={handleStartGame} isConnected={isConnected} />
              ) : (
                <VideoPokerTable
                  playerCards={playerCards}
                  holds={holds}
                  toggleHold={toggleHold}
                  gamePhase={gamePhase}
                  onDraw={handleDraw}
                  isDealing={isDealing}
                  isDrawing={isDrawing}
                  handRank={handRank}
                  betAmount={Number(betAmount)}
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
                  {!isConnected ? "Connect Wallet" : isPlaying ? "Game in Progress" : "Deal Cards"}
                </Button>
              </div>
            </Card>

            {/* Mini Paytable */}
            <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-4">
              <h3 className="text-lg font-bold text-[#49EACB] mb-2">Paytable (1 KAS)</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Royal Flush</span>
                  <span className="font-bold text-[#49EACB]">100x</span>
                </div>
                <div className="flex justify-between">
                  <span>Straight Flush</span>
                  <span className="font-bold text-[#49EACB]">50x</span>
                </div>
                <div className="flex justify-between">
                  <span>Four of a Kind</span>
                  <span className="font-bold text-[#49EACB]">25x</span>
                </div>
                <div className="flex justify-between">
                  <span>Full House</span>
                  <span className="font-bold text-[#49EACB]">9x</span>
                </div>
                <div className="flex justify-between">
                  <span>Flush</span>
                  <span className="font-bold text-[#49EACB]">6x</span>
                </div>
                <div className="flex justify-between">
                  <span>Straight</span>
                  <span className="font-bold text-[#49EACB]">4x</span>
                </div>
                <div className="flex justify-between">
                  <span>Three of a Kind</span>
                  <span className="font-bold text-[#49EACB]">3x</span>
                </div>
                <div className="flex justify-between">
                  <span>Two Pair</span>
                  <span className="font-bold text-[#49EACB]">2x</span>
                </div>
                <div className="flex justify-between">
                  <span>Jacks or Better</span>
                  <span className="font-bold text-[#49EACB]">1x</span>
                </div>
              </div>
            </Card>

            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </div>

      <SiteFooter />

      {/* Paytable Popup */}
      <AnimatePresence>
        {showPaytable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setShowPaytable(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-900 p-6 rounded-lg border border-[#49EACB] max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-[#49EACB] mb-4">Video Poker Paytable</h2>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Hand Rankings</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Royal Flush</p>
                      <p className="text-sm text-gray-300">A, K, Q, J, 10 of the same suit</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Straight Flush</p>
                      <p className="text-sm text-gray-300">Five sequential cards of the same suit</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Four of a Kind</p>
                      <p className="text-sm text-gray-300">Four cards of the same rank</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Full House</p>
                      <p className="text-sm text-gray-300">Three of a kind plus a pair</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Flush</p>
                      <p className="text-sm text-gray-300">Five cards of the same suit</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">More Hand Rankings</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Straight</p>
                      <p className="text-sm text-gray-300">Five sequential cards of any suit</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Three of a Kind</p>
                      <p className="text-sm text-gray-300">Three cards of the same rank</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Two Pair</p>
                      <p className="text-sm text-gray-300">Two different pairs</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="font-bold text-[#49EACB]">Jacks or Better</p>
                      <p className="text-sm text-gray-300">A pair of Jacks, Queens, Kings, or Aces</p>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">Payouts (per 1 KAS bet)</h3>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {Object.entries(PAYTABLE).map(([rank, payout]) => (
                  <div key={rank} className="bg-gray-800 p-2 rounded text-center">
                    <p className="text-sm text-gray-300">{HAND_RANK_NAMES[rank]}</p>
                    <p className="font-bold text-[#49EACB]">{payout}x</p>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button
                  className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                  onClick={() => setShowPaytable(false)}
                >
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
              <h2 className="text-4xl font-bold mb-2 text-black">
                {result.gameResult === "win" ? "You Win!" : "You Lose!"}
              </h2>
              {result.rank && <p className="text-xl mb-4 text-black font-semibold">{HAND_RANK_NAMES[result.rank]}</p>}
              {result.gameResult === "win" ? (
                <p className="text-4xl animate-pulse uppercase mb-4 text-black">
                  You won <strong>{result.winAmount.toFixed(2)}</strong> KAS!
                </p>
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
    <div className="relative w-full h-[700px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a]">
      <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
        <motion.h1
          className="text-5xl font-bold mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#49EACB" }}
        >
          Video Poker
        </motion.h1>
        <motion.p
          className="text-xl tracking-wider mb-8"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#ffffff" }}
        >
          JACKS OR BETTER
        </motion.p>

        {/* Card images in a nice arrangement */}
        <div className="relative w-full max-w-3xl h-64 mb-8">
          <motion.div
            className="absolute left-[20%] top-[10%]"
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <Image
              src="/blockscards/jhearts.webp"
              alt="Jack of Hearts"
              width={120}
              height={180}
              className="shadow-lg"
            />
          </motion.div>
          <motion.div
            className="absolute left-[35%] top-[5%]"
            animate={{ rotate: [0, -3, 0] }}
            transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.5 }}
          >
            <Image
              src="/blockscards/qdiamonds.webp"
              alt="Queen of Diamonds"
              width={120}
              height={180}
              className="shadow-lg"
            />
          </motion.div>
          <motion.div
            className="absolute left-[50%] top-[10%]"
            animate={{ rotate: [0, 7, 0] }}
            transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
          >
            <Image src="/blockscards/kclubs.webp" alt="King of Clubs" width={120} height={180} className="shadow-lg" />
          </motion.div>
          <motion.div
            className="absolute left-[65%] top-[5%]"
            animate={{ rotate: [0, -5, 0] }}
            transition={{ duration: 3.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.7 }}
          >
            <Image src="/blockscards/aspades.webp" alt="Ace of Spades" width={120} height={180} className="shadow-lg" />
          </motion.div>
        </div>

        <div className="bg-black/50 backdrop-blur-sm p-6 rounded-lg max-w-lg text-center mb-8">
          <h3 className="text-xl font-bold text-[#49EACB] mb-2">How to Play</h3>
          <ol className="text-left text-gray-200 space-y-2">
            <li>1. Place your bet and get dealt 5 cards</li>
            <li>2. Choose which cards to hold (keep)</li>
            <li>3. Draw new cards to replace the ones you didn't hold</li>
            <li>4. Win based on your final poker hand</li>
          </ol>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="mt-6">
          <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" onClick={onStart} disabled={!isConnected}>
            {!isConnected ? "Connect Wallet to Play" : "Deal Cards"}
          </Button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#004d40] z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#003c32] z-20"></div>
    </div>
  )
}

// Video Poker Table Component
function VideoPokerTable({
  playerCards,
  holds,
  toggleHold,
  gamePhase,
  onDraw,
  isDealing,
  isDrawing,
  handRank,
  betAmount,
}: {
  playerCards: CardType[]
  holds: boolean[]
  toggleHold: (index: number) => void
  gamePhase: string
  onDraw: () => void
  isDealing: boolean
  isDrawing: boolean
  handRank: string | null
  betAmount: number
}) {
  return (
    <div className="relative w-full h-[700px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a]">
      {/* Hand rank display */}
      <div className="absolute top-6 left-0 right-0 flex justify-center">
        {handRank && gamePhase === "complete" && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-[#49EACB]/20 backdrop-blur-md px-6 py-3 rounded-lg border-2 border-[#49EACB] text-center"
          >
            <h2 className="text-2xl font-bold text-[#49EACB]">
              {HAND_RANK_NAMES[handRank]} - {PAYTABLE[handRank] * betAmount} KAS
            </h2>
          </motion.div>
        )}
      </div>

      {/* Cards area */}
      <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex flex-col items-center justify-center p-6">
        <div className="flex justify-center items-center h-40 relative mb-16">
          {playerCards.map((card, index) => (
            <motion.div
              key={`card-${index}`}
              className="mx-2"
              initial={{ y: -300, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: holds[index] && gamePhase === "hold" ? 1.05 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: index * 0.1,
              }}
              onClick={() => toggleHold(index)}
              style={{ cursor: gamePhase === "hold" ? "pointer" : "default" }}
            >
              {/* Card container with 3D perspective */}
              <div className="relative w-[120px] h-[180px] shadow-xl rounded-lg" style={{ perspective: "1000px" }}>
                {/* Card inner container that will flip */}
                <motion.div
                  className="relative w-full h-full"
                  style={{ transformStyle: "preserve-3d" }}
                  initial={{ rotateY: 180 }}
                  animate={{ rotateY: card.flipped ? 0 : 180 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  {/* Card front */}
                  <div className="absolute w-full h-full backface-hidden" style={{ backfaceVisibility: "hidden" }}>
                    <Image
                      src={`/blockscards/${card.rank.toLowerCase()}${card.suit}.webp`}
                      alt={`${card.rank} of ${card.suit}`}
                      fill
                      className="rounded-lg object-cover"
                    />
                  </div>

                  {/* Card back */}
                  <div
                    className="absolute w-full h-full backface-hidden"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <Image src="/blockscards/cardback.webp" alt="Card back" fill className="rounded-lg object-cover" />
                  </div>
                </motion.div>

                {/* Hold indicator */}
                {holds[index] && gamePhase === "hold" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-0 right-0 text-center"
                  >
                    <span className="bg-[#49EACB] text-black px-3 py-1 rounded-md font-bold text-sm">HOLD</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Game controls */}
        {gamePhase === "hold" && !isDealing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Button
              className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8 py-6 text-lg"
              onClick={onDraw}
              disabled={isDrawing}
            >
              DRAW
            </Button>
          </motion.div>
        )}

        {/* Game instructions */}
        {gamePhase === "hold" && !isDealing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-center text-gray-300"
          >
            <p>Click on cards to HOLD them, then click DRAW to replace the others</p>
          </motion.div>
        )}

        {/* Dealing/Drawing status */}
        {(isDealing || isDrawing) && (
          <div className="text-center">
            <p className="text-lg text-[#49EACB] animate-pulse">
              {isDealing ? "Dealing cards..." : "Drawing cards..."}
            </p>
          </div>
        )}
      </div>

      {/* Bottom info area */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <div className="bg-black/30 backdrop-blur-sm px-6 py-2 rounded-lg border border-[#49EACB]/30">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-300 text-sm">Bet:</span>{" "}
              <span className="text-[#49EACB] font-bold">{betAmount} KAS</span>
            </div>
            <div>
              <span className="text-gray-300 text-sm">Max Win:</span>{" "}
              <span className="text-[#49EACB] font-bold">{betAmount * 100} KAS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
