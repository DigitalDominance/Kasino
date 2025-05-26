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
const RESULT_POPUP_DELAY = 2000 // 2 second delay for result popup

// API base
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

// Card types
interface CardType {
  suit: string
  rank: string
  image?: string
  flipped?: boolean
}

// Hand ranking helper functions
const getCardValue = (rank: string): number => {
  if (rank === "A") return 14
  if (rank === "K") return 13
  if (rank === "Q") return 12
  if (rank === "J") return 11
  return Number(rank)
}

const evaluateHand = (hand: CardType[]): { rank: number; name: string } => {
  // Sort cards by value (high to low)
  const sortedCards = [...hand].sort((a, b) => getCardValue(b.rank) - getCardValue(a.rank))

  // Check for flush (all same suit)
  const isFlush = hand.every((card) => card.suit === hand[0].suit)

  // Get card values
  const values = sortedCards.map((card) => getCardValue(card.rank))

  // Check for straight
  const isStraight =
    (values[0] - values[1] === 1 && values[1] - values[2] === 1) ||
    // Special case: A-2-3 straight
    (values[0] === 14 && values[1] === 3 && values[2] === 2)

  // Count occurrences of each value
  const valueCounts: Record<number, number> = {}
  values.forEach((value) => {
    valueCounts[value] = (valueCounts[value] || 0) + 1
  })

  // Check for three of a kind
  const isThreeOfAKind = Object.values(valueCounts).includes(3)

  // Check for pair
  const isPair = Object.values(valueCounts).includes(2)

  // Determine hand rank
  if (isStraight && isFlush) return { rank: 6, name: "Straight Flush" }
  if (isThreeOfAKind) return { rank: 5, name: "Three of a Kind" }
  if (isFlush) return { rank: 4, name: "Flush" }
  if (isStraight) return { rank: 3, name: "Straight" }
  if (isPair) return { rank: 2, name: "Pair" }
  return { rank: 1, name: "High Card" }
}

// Main Page
export default function ThreeCardPokerPage() {
  return <ThreeCardPokerContent />
}

function ThreeCardPokerContent() {
  const { isConnected, balance } = useWallet()

  // Game state
  const [pregame, setPregame] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [betAmount, setBetAmount] = useState("1")
  const [playerCards, setPlayerCards] = useState<CardType[]>([])
  const [dealerCards, setDealerCards] = useState<CardType[]>([])
  const [playerHandRank, setPlayerHandRank] = useState<{ rank: number; name: string } | null>(null)
  const [dealerHandRank, setDealerHandRank] = useState<{ rank: number; name: string } | null>(null)
  const [gameStatus, setGameStatus] = useState<"betting" | "decision" | "dealer-reveal" | "complete">("betting")

  // Animations
  const [isDealing, setIsDealing] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)

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

  // Update hand rank when player cards change
  useEffect(() => {
    if (playerCards.length === 3) {
      setPlayerHandRank(evaluateHand(playerCards))
    } else {
      setPlayerHandRank(null)
    }
  }, [playerCards])

  // Update dealer hand rank when dealer cards change
  useEffect(() => {
    if (dealerCards.length === 3) {
      setDealerHandRank(evaluateHand(dealerCards))
    } else {
      setDealerHandRank(null)
    }
  }, [dealerCards])

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
        gameName: "threeCardPoker",
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

      // Set initial cards with flipped state
      const initialPlayerCardsData = data.playerHand.map((card: CardType) => ({
        ...card,
        flipped: false,
      }))

      // Set initial game state
      setPregame(false)
      setIsPlaying(true)
      setGameStatus("decision")
      setIsDealing(true)

      // First set empty arrays to clear the table
      setPlayerCards([])
      setDealerCards([])

      // Deal player cards with animation
      setTimeout(() => {
        // Deal all cards at once (back-facing)
        setPlayerCards(initialPlayerCardsData)
        playCardSound()

        // Flip cards with slight delays between them
        setTimeout(() => {
          // Flip first card
          const updatedCards1 = [
            { ...initialPlayerCardsData[0], flipped: true },
            initialPlayerCardsData[1],
            initialPlayerCardsData[2],
          ]
          setPlayerCards(updatedCards1)
          playCardSound()

          setTimeout(() => {
            // Flip second card
            const updatedCards2 = [
              updatedCards1[0],
              { ...initialPlayerCardsData[1], flipped: true },
              initialPlayerCardsData[2],
            ]
            setPlayerCards(updatedCards2)
            playCardSound()

            setTimeout(() => {
              // Flip third card
              const updatedCards3 = [
                updatedCards2[0],
                updatedCards2[1],
                { ...initialPlayerCardsData[2], flipped: true },
              ]
              setPlayerCards(updatedCards3)
              playCardSound()

              setIsDealing(false)
            }, 250)
          }, 250)
        }, 250)
      }, 300)

      setLoading(false)
    } catch (error) {
      console.error("Error starting game:", error)
      alert("Failed to start game. Please try again.")
      setLoading(false)
    }
  }

  // Handle Play decision
  const handlePlay = async () => {
    if (gameStatus !== "decision") return

    setIsRevealing(true)
    setGameStatus("dealer-reveal")

    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "play",
      })

      if (!data.success) {
        alert("Play action failed")
        setIsRevealing(false)
        setGameStatus("decision")
        return
      }

      // Create dealer cards with flipped state (all back-facing initially)
      const dealerCardsWithState = data.dealerHand.map((card: CardType) => ({
        ...card,
        flipped: false,
      }))

      // Set dealer cards (back-facing)
      setDealerCards(dealerCardsWithState)

      // Flip dealer cards with animation
      setTimeout(() => {
        // Flip first card
        const updatedCards1 = [
          { ...dealerCardsWithState[0], flipped: true },
          dealerCardsWithState[1],
          dealerCardsWithState[2],
        ]
        setDealerCards(updatedCards1)
        playCardSound()

        setTimeout(() => {
          // Flip second card
          const updatedCards2 = [
            updatedCards1[0],
            { ...dealerCardsWithState[1], flipped: true },
            dealerCardsWithState[2],
          ]
          setDealerCards(updatedCards2)
          playCardSound()

          setTimeout(() => {
            // Flip third card
            const updatedCards3 = [updatedCards2[0], updatedCards2[1], { ...dealerCardsWithState[2], flipped: true }]
            setDealerCards(updatedCards3)
            playCardSound()

            setIsRevealing(false)
            setGameStatus("complete")

            // Show result after all cards are revealed with a delay
            setTimeout(() => {
              setResult({
                gameResult: data.gameResult,
                winAmount: data.winAmount,
                clientSeed,
                serverSeedHash,
              })
            }, RESULT_POPUP_DELAY)
          }, 250)
        }, 250)
      }, 250)
    } catch (error) {
      console.error("Error playing:", error)
      alert("Failed to play. Please try again.")
      setIsRevealing(false)
      setGameStatus("decision")
    }
  }

  // Handle Fold decision
  const handleFold = async () => {
    if (gameStatus !== "decision") return

    setGameStatus("complete")

    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "fold",
      })

      if (!data.success) {
        alert("Fold action failed")
        setGameStatus("decision")
        return
      }

      // Show result with a delay
      setTimeout(() => {
        setResult({
          gameResult: data.gameResult,
          winAmount: data.winAmount,
          clientSeed,
          serverSeedHash,
        })
      }, RESULT_POPUP_DELAY)
    } catch (error) {
      console.error("Error folding:", error)
      alert("Failed to fold. Please try again.")
      setGameStatus("decision")
    }
  }

  // Reset game
  const resetGame = () => {
    setPregame(true)
    setIsPlaying(false)
    setPlayerCards([])
    setDealerCards([])
    setPlayerHandRank(null)
    setDealerHandRank(null)
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
                <h2 className="text-2xl font-bold text-[#49EACB]">Three Card Poker</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <PreGameScreen onStart={handleStartGame} isConnected={isConnected} />
              ) : (
                <PokerTable
                  playerCards={playerCards}
                  dealerCards={dealerCards}
                  playerHandRank={playerHandRank}
                  dealerHandRank={dealerHandRank}
                  onPlay={handlePlay}
                  onFold={handleFold}
                  gameStatus={gameStatus}
                  isDealing={isDealing}
                  isRevealing={isRevealing}
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
                  {!isConnected ? "Connect Wallet" : isPlaying ? "Game in Progress" : "Start Three Card Poker"}
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
          Three Card Poker
        </motion.h1>
        <motion.p
          className="text-xl tracking-wider mb-8"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#ffffff" }}
        >
          PLAY OR FOLD - BEAT THE DEALER
        </motion.p>

        {/* Card images in a nice arrangement */}
        <div className="relative w-full max-w-3xl h-64 mb-8">
          <motion.div
            className="absolute left-[30%] top-[10%]"
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <Image src="/blockscards/aspades.webp" alt="Ace of Spades" width={120} height={180} className="shadow-lg" />
          </motion.div>
          <motion.div
            className="absolute left-[45%] top-[15%]"
            animate={{ rotate: [0, -3, 0] }}
            transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.5 }}
          >
            <Image
              src="/blockscards/khearts.webp"
              alt="King of Hearts"
              width={120}
              height={180}
              className="shadow-lg"
            />
          </motion.div>
          <motion.div
            className="absolute left-[60%] top-[10%]"
            animate={{ rotate: [0, 7, 0] }}
            transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
          >
            <Image
              src="/blockscards/qdiamonds.webp"
              alt="Queen of Diamonds"
              width={120}
              height={180}
              className="shadow-lg"
            />
          </motion.div>
        </div>

        <div className="bg-black/60 p-6 rounded-lg max-w-2xl text-center mb-8">
          <h3 className="text-[#49EACB] text-xl font-bold mb-3">How to Play</h3>
          <ul className="text-white text-left space-y-2">
            <li>• Place your ante bet</li>
            <li>• Receive three cards</li>
            <li>• Choose to Play (place additional bet equal to ante) or Fold (forfeit ante)</li>
            <li>• Dealer needs Queen high or better to qualify</li>
            <li>• If dealer doesn't qualify, ante pays 1:1 and play bet is returned</li>
            <li>• If dealer qualifies and you win, both ante and play pay 1:1</li>
          </ul>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="mt-6">
          <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" onClick={onStart} disabled={!isConnected}>
            {!isConnected ? "Connect Wallet to Play" : "Start Three Card Poker"}
          </Button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#004d40] z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#003c32] z-20"></div>
    </div>
  )
}

// Poker Table Component
function PokerTable({
  playerCards,
  dealerCards,
  playerHandRank,
  dealerHandRank,
  onPlay,
  onFold,
  gameStatus,
  isDealing,
  isRevealing,
  betAmount,
}: {
  playerCards: CardType[]
  dealerCards: CardType[]
  playerHandRank: { rank: number; name: string } | null
  dealerHandRank: { rank: number; name: string } | null
  onPlay: () => void
  onFold: () => void
  gameStatus: string
  isDealing: boolean
  isRevealing: boolean
  betAmount: number
}) {
  return (
    <div className="relative w-full h-[700px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a]">
      {/* Dealer area */}
      <div className="absolute top-0 left-0 right-0 h-1/2 flex flex-col items-center justify-center p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#49EACB] mb-2">Dealer</h3>
          {dealerHandRank && (
            <div className="text-center">
              <span className="bg-[#49EACB]/20 text-[#49EACB] px-3 py-1 rounded-full text-sm">
                {dealerHandRank.name}
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-center items-center h-40 relative">
          {dealerCards.map((card, index) => (
            <motion.div
              key={`dealer-${index}`}
              className="absolute"
              initial={{
                x: index === 0 ? -300 : 300,
                y: -100,
                zIndex: index,
              }}
              animate={{
                x: (index - (dealerCards.length - 1) / 2) * 60,
                y: 0,
                zIndex: index,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: index * 0.2,
              }}
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
              </div>
            </motion.div>
          ))}
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
                delay: index * 0.2,
              }}
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
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#49EACB] mb-2">Your Hand</h3>
          {playerHandRank && (
            <div className="text-center">
              <span className="bg-[#49EACB]/20 text-[#49EACB] px-3 py-1 rounded-full text-sm">
                {playerHandRank.name}
              </span>
            </div>
          )}
        </div>

        {/* Game controls */}
        {gameStatus === "decision" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-4">
              <Button
                className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8"
                onClick={onPlay}
                disabled={isDealing}
              >
                Play ({betAmount} KAS)
              </Button>
              <Button className="bg-red-500 text-white hover:bg-red-600 px-8" onClick={onFold} disabled={isDealing}>
                Fold
              </Button>
            </div>
            <div className="text-sm text-gray-300">Playing will place an additional bet equal to your ante.</div>
          </div>
        )}

        {/* Game status */}
        {gameStatus === "dealer-reveal" && (
          <div className="text-center">
            <p className="text-lg text-[#49EACB] animate-pulse">Revealing dealer's cards...</p>
          </div>
        )}

        {/* Bet display */}
        <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg p-2 flex items-center space-x-2">
          <span className="text-[#49EACB] text-sm">Ante:</span>
          <span className="text-white text-sm">{betAmount} KAS</span>
        </div>
      </div>
    </div>
  )
}
