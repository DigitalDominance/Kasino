"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ShieldCheck } from "lucide-react"
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
}

// Helper function to calculate hand value
const calculateHandValue = (cards: CardType[]) => {
  let value = 0
  let aces = 0

  for (const card of cards) {
    if (card.rank === "A") {
      aces++
      value += 11
    } else if (["J", "Q", "K"].includes(card.rank)) {
      value += 10
    } else {
      value += Number.parseInt(card.rank)
    }
  }

  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }

  return value
}

// Main Page
export default function BlackjackPage() {
  return <BlackjackContent />
}

function BlackjackContent() {
  const { isConnected, balance } = useWallet()

  // Game state
  const [pregame, setPregame] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [betAmount, setBetAmount] = useState("1")
  const [playerCards, setPlayerCards] = useState<CardType[]>([])
  const [dealerCards, setDealerCards] = useState<CardType[]>([])
  const [dealerUpCardOnly, setDealerUpCardOnly] = useState(true)
  const [playerValue, setPlayerValue] = useState(0)
  const [dealerValue, setDealerValue] = useState(0)
  const [gameStatus, setGameStatus] = useState<"betting" | "player-turn" | "dealer-turn" | "complete">("betting")

  // Animations
  const [isDealing, setIsDealing] = useState(false)
  const [isHitting, setIsHitting] = useState(false)
  const [isStanding, setIsStanding] = useState(false)
  const [dealerDrawing, setDealerDrawing] = useState(false)

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
    gameResult: "win" | "lose" | "push"
    winAmount: number
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

  // Update hand values when cards change
  useEffect(() => {
    if (playerCards.length > 0) {
      setPlayerValue(calculateHandValue(playerCards))
    }
  }, [playerCards])

  useEffect(() => {
    if (dealerCards.length > 0) {
      if (dealerUpCardOnly) {
        // Only calculate value of the first card
        setDealerValue(calculateHandValue([dealerCards[0]]))
      } else {
        setDealerValue(calculateHandValue(dealerCards))
      }
    }
  }, [dealerCards, dealerUpCardOnly])

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

  // Get card image path
  const getCardImagePath = (card: CardType) => {
    if (!card) return "/blockscards/cardback.webp"
    return `/blockscards/${card.rank.toLowerCase()}${card.suit}.webp`
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

    // Preload card images
    preloadCardImages()

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
        gameName: "blackjack",
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

      setGameId(data.game._id)
      setServerSeedHash(data.game.serverSeedHash)

      // Set initial cards
      setPregame(false)
      setIsPlaying(true)
      setGameStatus("player-turn")
      setIsDealing(true)

      // Delay to simulate dealing animation
      setTimeout(() => {
        playCardSound()
        setPlayerCards(data.game.playerCards)
        setDealerCards([data.game.dealerUpCard])
        setDealerUpCardOnly(true)
        setIsDealing(false)
      }, 1000)

      setLoading(false)
    } catch (error) {
      console.error("Error starting game:", error)
      alert("Failed to start game. Please try again.")
      setLoading(false)
    }
  }

  // Hit - draw another card
  const handleHit = async () => {
    if (gameStatus !== "player-turn") return

    setIsHitting(true)
    playCardSound()

    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "hit",
      })

      if (!data.success) {
        alert("Hit action failed")
        setIsHitting(false)
        return
      }

      // Update player cards
      setPlayerCards(data.playerCards)

      // Check if player busted
      if (data.gameResult === "lose") {
        setGameStatus("complete")
        setTimeout(() => {
          setResult({
            gameResult: "lose",
            winAmount: 0,
            clientSeed,
            serverSeedHash,
          })
        }, 2000) // Increased delay to 2 seconds
      }

      setIsHitting(false)
    } catch (error) {
      console.error("Error hitting:", error)
      alert("Failed to hit. Please try again.")
      setIsHitting(false)
    }
  }

  // Stand - end player turn
  const handleStand = async () => {
    if (gameStatus !== "player-turn") return

    setIsStanding(true)
    setGameStatus("dealer-turn")

    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "stand",
      })

      if (!data.success) {
        alert("Stand action failed")
        setIsStanding(false)
        setGameStatus("player-turn")
        return
      }

      // Reveal dealer's hole card first
      setDealerUpCardOnly(false)
      playCardSound()

      // Animate dealer drawing cards
      setDealerDrawing(true)

      // Delay to show dealer drawing cards
      setTimeout(() => {
        setDealerCards(data.dealerCards)
        setDealerDrawing(false)
        setGameStatus("complete")

        // Show result after 2 seconds
        setTimeout(() => {
          setResult({
            gameResult: data.gameResult,
            winAmount: data.winAmount,
            clientSeed,
            serverSeedHash,
          })
        }, 2000) // Increased delay to 2 seconds
      }, 1500)

      setIsStanding(false)
    } catch (error) {
      console.error("Error standing:", error)
      alert("Failed to stand. Please try again.")
      setIsStanding(false)
      setGameStatus("player-turn")
    }
  }

  // Reset game
  const resetGame = () => {
    setPregame(true)
    setIsPlaying(false)
    setPlayerCards([])
    setDealerCards([])
    setDealerUpCardOnly(true)
    setPlayerValue(0)
    setDealerValue(0)
    setGameStatus("betting")
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
                <h2 className="text-2xl font-bold text-[#49EACB]">Blackjack</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <PreGameScreen onStart={handleStartGame} isConnected={isConnected} />
              ) : (
                <BlackjackTable
                  playerCards={playerCards}
                  dealerCards={dealerCards}
                  dealerUpCardOnly={dealerUpCardOnly}
                  playerValue={playerValue}
                  dealerValue={dealerValue}
                  onHit={handleHit}
                  onStand={handleStand}
                  gameStatus={gameStatus}
                  isDealing={isDealing}
                  isHitting={isHitting}
                  isStanding={isStanding}
                  dealerDrawing={dealerDrawing}
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
                  {!isConnected ? "Connect Wallet" : isPlaying ? "Game in Progress" : "Start Blackjack"}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          >
            <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-4xl font-bold mb-6 text-black">
                {result.gameResult === "win" ? "You Win!" : result.gameResult === "push" ? "Push!" : "You Lose!"}
              </h2>
              {result.gameResult === "win" ? (
                <p className="text-4xl animate-pulse uppercase mb-4 text-black">
                  You won <strong>{result.winAmount.toFixed(2)}</strong> KAS!
                </p>
              ) : result.gameResult === "push" ? (
                <p className="text-2xl mb-4 text-black">Your bet has been returned.</p>
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
          Blackjack
        </motion.h1>
        <motion.p
          className="text-xl tracking-wider mb-8"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#ffffff" }}
        >
          BEAT THE DEALER TO 21
        </motion.p>

        {/* Card images in a nice arrangement */}
        <div className="relative w-full max-w-3xl h-64 mb-8">
          <motion.div
            className="absolute left-[30%] top-[10%]"
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <Image src="/blockscards/aspade.webp" alt="Ace of Spades" width={120} height={180} className="shadow-lg" />
          </motion.div>
          <motion.div
            className="absolute left-[45%] top-[15%]"
            animate={{ rotate: [0, -3, 0] }}
            transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.5 }}
          >
            <Image src="/blockscards/cardback.webp" alt="Card Back" width={120} height={180} className="shadow-lg" />
          </motion.div>
          <motion.div
            className="absolute left-[60%] top-[10%]"
            animate={{ rotate: [0, 7, 0] }}
            transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
          >
            <Image src="/blockscards/kspade.webp" alt="King of Spades" width={120} height={180} className="shadow-lg" />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="mt-6">
          <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" onClick={onStart} disabled={!isConnected}>
            {!isConnected ? "Connect Wallet to Play" : "Start Blackjack"}
          </Button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#004d40] z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#003c32] z-20"></div>
    </div>
  )
}

// Blackjack Table Component
function BlackjackTable({
  playerCards,
  dealerCards,
  dealerUpCardOnly,
  playerValue,
  dealerValue,
  onHit,
  onStand,
  gameStatus,
  isDealing,
  isHitting,
  isStanding,
  dealerDrawing,
}: {
  playerCards: CardType[]
  dealerCards: CardType[]
  dealerUpCardOnly: boolean
  playerValue: number
  dealerValue: number
  onHit: () => void
  onStand: () => void
  gameStatus: string
  isDealing: boolean
  isHitting: boolean
  isStanding: boolean
  dealerDrawing: boolean
}) {
  return (
    <div className="relative w-full h-[700px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a]">
      {/* Dealer area */}
      <div className="absolute top-0 left-0 right-0 h-1/2 flex flex-col items-center justify-center p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#49EACB] mb-2">Dealer {dealerUpCardOnly ? "" : `(${dealerValue})`}</h3>
        </div>
        <div className="flex justify-center items-center h-40 relative">
          {dealerCards.map((card, index) => (
            <motion.div
              key={`dealer-${index}`}
              className="absolute"
              initial={{
                x: index === 0 ? -300 : 300,
                y: -100,
                rotateY: index === 0 || !dealerUpCardOnly ? 0 : 180,
                zIndex: index,
              }}
              animate={{
                x: (index - (dealerCards.length - 1) / 2) * 60,
                y: 0,
                rotateY: index === 0 || !dealerUpCardOnly ? 0 : 180,
                zIndex: index,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: index * 0.2 + (isDealing ? 0.5 : 0),
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="relative w-[120px] h-[180px] shadow-xl rounded-lg">
                <Image
                  src={
                    index === 0 || !dealerUpCardOnly
                      ? `/blockscards/${dealerCards[index].rank.toLowerCase()}${dealerCards[index].suit}.webp`
                      : "/blockscards/cardback.webp"
                  }
                  alt={
                    index === 0 || !dealerUpCardOnly
                      ? `${dealerCards[index].rank} of ${dealerCards[index].suit}`
                      : "Card back"
                  }
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
            </motion.div>
          ))}

          {/* Dealer drawing animation */}
          {dealerDrawing && (
            <motion.div
              className="absolute right-[-150px]"
              animate={{ x: [-150, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <div className="relative w-[120px] h-[180px] shadow-xl rounded-lg">
                <Image src="/blockscards/cardback.webp" alt="Drawing card" fill className="rounded-lg object-cover" />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Player area */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 flex flex-col items-center justify-center p-6">
        <div className="flex justify-center items-center h-40 relative mb-8">
          {playerCards.map((card, index) => (
            <motion.div
              key={`player-${index}`}
              className="absolute"
              initial={{ x: 300, y: 100, zIndex: index }}
              animate={{
                x: (index - (playerCards.length - 1) / 2) * 60,
                y: 0,
                zIndex: index,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: index < 2 ? index * 0.2 : 0,
              }}
            >
              <div className="relative w-[120px] h-[180px] shadow-xl rounded-lg">
                <Image
                  src={`/blockscards/${card.rank.toLowerCase()}${card.suit}.webp`}
                  alt={`${card.rank} of ${card.suit}`}
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
            </motion.div>
          ))}

          {/* Hit animation */}
          {isHitting && (
            <motion.div
              className="absolute right-[-150px]"
              animate={{ x: [-150, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <div className="relative w-[120px] h-[180px] shadow-xl rounded-lg">
                <Image src="/blockscards/cardback.webp" alt="Drawing card" fill className="rounded-lg object-cover" />
              </div>
            </motion.div>
          )}
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#49EACB] mb-2">Your Hand ({playerValue})</h3>
        </div>

        {/* Game controls */}
        {gameStatus === "player-turn" && (
          <div className="flex space-x-4">
            <Button
              className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8"
              onClick={onHit}
              disabled={isHitting || isStanding}
            >
              Hit
            </Button>
            <Button
              className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8"
              onClick={onStand}
              disabled={isHitting || isStanding}
            >
              Stand
            </Button>
          </div>
        )}

        {/* Game status */}
        {gameStatus === "dealer-turn" && (
          <div className="text-center">
            <p className="text-lg text-[#49EACB] animate-pulse">Dealer's turn...</p>
          </div>
        )}

        {/* Blackjack notification */}
        {playerValue === 21 && playerCards.length === 2 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#49EACB]/20 backdrop-blur-md p-4 rounded-lg border-2 border-[#49EACB] text-center z-50"
          >
            <h2 className="text-3xl font-bold text-[#49EACB] mb-2">Blackjack!</h2>
          </motion.div>
        )}

        {/* Bust notification - increased z-index to 50 */}
        {playerValue > 21 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500/20 backdrop-blur-md p-4 rounded-lg border-2 border-red-500 text-center z-50"
          >
            <h2 className="text-3xl font-bold text-red-500 mb-2">Bust!</h2>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Add this function to preload card images
const preloadCardImages = () => {
  const suits = ["heart", "diamond", "club", "spade"]
  const ranks = ["a", "2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k"]

  // Preload card back
  const cardBackImg = new Image()
  cardBackImg.src = "/blockscards/cardback.webp"

  // Preload all card images
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      const img = new Image()
      img.src = `/blockscards/${rank}${suit}.webp`
    })
  })
}
