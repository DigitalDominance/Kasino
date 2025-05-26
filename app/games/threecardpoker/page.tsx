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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Font & Constants
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] })
const MIN_BET = 1
const MAX_BET = 1000
const messages = ["Verifying transaction", "Hashing game seed", "Shuffling cards"]
const RESULT_POPUP_DELAY = 2000 // 2 second delay for result popup

// Pair Plus paytable
const PAIR_PLUS_PAYTABLE = {
  "Straight Flush": 40,
  "Three of a Kind": 30,
  Straight: 6,
  Flush: 4,
  Pair: 1,
  "High Card": 0,
}

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
  const [pairPlusBet, setPairPlusBet] = useState("0")
  const [playerCards, setPlayerCards] = useState<CardType[]>([])
  const [dealerCards, setDealerCards] = useState<CardType[]>([])
  const [playerHandRank, setPlayerHandRank] = useState<{ rank: number; name: string } | null>(null)
  const [dealerHandRank, setDealerHandRank] = useState<{ rank: number; name: string } | null>(null)
  const [gameStatus, setGameStatus] = useState<"betting" | "decision" | "dealer-reveal" | "complete">("betting")
  const [showPaytable, setShowPaytable] = useState(false)

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
    pairPlusWin?: number
    mainGameWin?: number
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

  // Calculate potential Pair Plus win based on current bet
  const calculatePotentialPairPlusWin = (handRank: { rank: number; name: string } | null, bet: number) => {
    if (!handRank) return 0
    const multiplier = PAIR_PLUS_PAYTABLE[handRank.name as keyof typeof PAIR_PLUS_PAYTABLE] || 0
    return bet * multiplier
  }

  // Start game
  const handleStartGame = async () => {
    if (!isConnected) {
      alert("Connect your wallet first")
      return
    }

    const bet = Number(betAmount)
    const ppBet = Number(pairPlusBet)

    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      alert(`Bet between ${MIN_BET} and ${MAX_BET}, within your balance.`)
      return
    }

    if (isNaN(ppBet) || ppBet < 0 || ppBet > MAX_BET || bet + ppBet > balance) {
      alert(`Pair Plus bet must be between 0 and ${MAX_BET}, and total bet must be within your balance.`)
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

      // 2) send deposit on-chain (combined ante + pair plus)
      const [addr] = await window.kasware.getAccounts()
      const treasury =
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!

      const totalBet = bet + ppBet
      const dep = await window.kasware.sendKaspa(treasury, totalBet * 1e8, {
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
        pairPlusBet: ppBet,
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

      // Set dealer cards as back-facing initially
      const initialDealerCards = [
        { suit: "hidden", rank: "hidden", flipped: false },
        { suit: "hidden", rank: "hidden", flipped: false },
        { suit: "hidden", rank: "hidden", flipped: false },
      ]

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

      // Show dealer cards as back-facing
      setTimeout(() => {
        setDealerCards(initialDealerCards)
      }, 100)

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

    try {
      // Make the additional "play" bet (equal to ante)
      const bet = Number(betAmount)
      const ppBet = Number(pairPlusBet)
      const totalBet = bet // Only sending the ante amount as the play bet

      const [addr] = await window.kasware.getAccounts()
      const treasury =
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!

      // Send the play bet
      const playDep = await window.kasware.sendKaspa(treasury, totalBet * 1e8, {
        priorityFee: 10000,
      })
      const playTxid = typeof playDep === "string" ? JSON.parse(playDep).id : (playDep as any).id

      setIsRevealing(true)
      setGameStatus("dealer-reveal")

      // Call settle with play action and playTxid
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "play",
        playTxid,
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

      // Replace the placeholder dealer cards with actual cards (still back-facing)
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

            // Calculate potential Pair Plus win
            const ppBetNum = Number(pairPlusBet)
            const pairPlusWin = playerHandRank ? calculatePotentialPairPlusWin(playerHandRank, ppBetNum) : 0

            // Calculate main game win (total win - pair plus win)
            const mainGameWin = data.winAmount - pairPlusWin

            // Show result after all cards are revealed with a delay
            setTimeout(() => {
              setResult({
                gameResult: data.gameResult,
                winAmount: data.winAmount,
                clientSeed,
                serverSeedHash,
                pairPlusWin,
                mainGameWin,
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

      // Calculate potential Pair Plus win
      const ppBetNum = Number(pairPlusBet)
      const pairPlusWin = playerHandRank ? calculatePotentialPairPlusWin(playerHandRank, ppBetNum) : 0

      // Show result with a delay
      setTimeout(() => {
        setResult({
          gameResult: data.gameResult,
          winAmount: data.winAmount,
          clientSeed,
          serverSeedHash,
          pairPlusWin,
          mainGameWin: 0, // Main game is lost when folding
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
    setShowPaytable(false)
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

      {/* Pair Plus Paytable Modal */}
      <AnimatePresence>
        {showPaytable && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPaytable(false)}
          >
            <motion.div
              className="bg-[#004d40] p-6 rounded-lg max-w-md w-full shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-[#49EACB]">Pair Plus Paytable</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#49EACB] hover:bg-[#49EACB]/10"
                  onClick={() => setShowPaytable(false)}
                >
                  Close
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-white text-sm mb-4">
                  Pair Plus is a side bet that pays based on the poker value of your hand, regardless of the dealer's
                  hand.
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#49EACB]/30">
                      <th className="text-left py-2 text-[#49EACB]">Hand</th>
                      <th className="text-right py-2 text-[#49EACB]">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PAIR_PLUS_PAYTABLE).map(([hand, payout]) => (
                      <tr key={hand} className="border-b border-[#49EACB]/10">
                        <td className="py-2 text-white">{hand}</td>
                        <td className="py-2 text-right text-white">{payout > 0 ? `${payout}:1` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[#49EACB]/70 text-xs mt-4">
                  Note: Pair Plus pays even if you fold or lose to the dealer.
                </p>
              </div>
            </motion.div>
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
                  pairPlusBet={Number(pairPlusBet)}
                />
              )}
            </div>
          </Card>

          {/* Controls */}
          <div className="space-y-6">
            <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6">
              <div className="space-y-4">
                {/* Ante Bet */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-[#49EACB]">Ante Bet (KAS)</label>
                  </div>
                  <div className="relative mt-1">
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
                </div>

                {/* Pair Plus Bet */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-[#49EACB]">Pair Plus Bet (KAS)</label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-[#49EACB]"
                            onClick={() => setShowPaytable(true)}
                          >
                            <Info className="h-4 w-4" />
                            <span className="sr-only">Pair Plus Info</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Pair Plus paytable</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      value={pairPlusBet}
                      onChange={(e) => setPairPlusBet(e.target.value)}
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
                </div>

                {/* Total Bet Display */}
                <div className="bg-[#49EACB]/10 p-2 rounded-md flex justify-between">
                  <span className="text-sm text-[#49EACB]">Total Bet:</span>
                  <span className="text-sm text-white font-bold">
                    {(Number(betAmount) + Number(pairPlusBet)).toFixed(2)} KAS
                  </span>
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

              {/* Main Game Result */}
              {result.mainGameWin !== undefined && (
                <div className="mb-2">
                  <p className="text-lg text-black">
                    <span className="font-semibold">Main Game:</span>{" "}
                    {result.gameResult === "win"
                      ? `+${result.mainGameWin.toFixed(2)} KAS`
                      : result.gameResult === "push"
                        ? "Bets Returned"
                        : "Ante Lost"}
                  </p>
                </div>
              )}

              {/* Pair Plus Result */}
              {result.pairPlusWin !== undefined && result.pairPlusWin > 0 && (
                <div className="mb-4">
                  <p className="text-lg text-black">
                    <span className="font-semibold">Pair Plus:</span> +{result.pairPlusWin.toFixed(2)} KAS
                  </p>
                </div>
              )}

              {/* Total Win */}
              {result.winAmount > 0 ? (
                <p className="text-4xl animate-pulse uppercase mb-6 text-black">
                  Total Win: <strong>{result.winAmount.toFixed(2)}</strong> KAS!
                </p>
              ) : result.gameResult === "push" ? (
                <p className="text-2xl mb-6 text-black">Your bet has been returned.</p>
              ) : (
                <p className="text-2xl mb-6 text-black">Better luck next time!</p>
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

        {/* New layout with cards on both sides of the instructions */}
        <div className="flex justify-between items-center w-full px-8 mb-8">
          {/* Left side cards */}
          <div className="relative w-[200px] h-[200px]">
            <motion.div
              className="absolute left-[10%] top-[10%]"
              animate={{ rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Image
                src="/blockscards/aspades.webp"
                alt="Ace of Spades"
                width={100}
                height={150}
                className="shadow-lg"
              />
            </motion.div>
            <motion.div
              className="absolute left-[40%] top-[30%]"
              animate={{ rotate: [0, -3, 0] }}
              transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.5 }}
            >
              <Image
                src="/blockscards/jclubs.webp"
                alt="Jack of Clubs"
                width={100}
                height={150}
                className="shadow-lg"
              />
            </motion.div>
            <motion.div
              className="absolute left-[70%] top-[50%]"
              animate={{ rotate: [0, 7, 0] }}
              transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
            >
              <Image
                src="/blockscards/10hearts.webp"
                alt="10 of Hearts"
                width={100}
                height={150}
                className="shadow-lg"
              />
            </motion.div>
          </div>

          {/* Center instructions */}
          <div className="bg-black/60 p-6 rounded-lg max-w-xl text-center">
            <h3 className="text-[#49EACB] text-xl font-bold mb-3">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-[#49EACB] font-bold mb-2">Main Game</h4>
                <ul className="text-white text-left space-y-2">
                  <li>• Place your ante bet</li>
                  <li>• Receive three cards</li>
                  <li>• Choose to Play (place additional bet equal to ante) or Fold (forfeit ante)</li>
                  <li>• Dealer needs Queen high or better to qualify</li>
                  <li>• If dealer doesn't qualify, ante pays 1:1 and play bet is returned</li>
                  <li>• If dealer qualifies and you win, both ante and play pay 1:1</li>
                </ul>
              </div>
              <div>
                <h4 className="text-[#49EACB] font-bold mb-2">Pair Plus</h4>
                <ul className="text-white text-left space-y-2">
                  <li>• Optional side bet</li>
                  <li>• Pays based on your hand strength</li>
                  <li>• Straight Flush: 40:1</li>
                  <li>• Three of a Kind: 30:1</li>
                  <li>• Straight: 6:1</li>
                  <li>• Flush: 4:1</li>
                  <li>• Pair: 1:1</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right side cards */}
          <div className="relative w-[200px] h-[200px]">
            <motion.div
              className="absolute left-[10%] top-[50%]"
              animate={{ rotate: [0, -4, 0] }}
              transition={{ duration: 3.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Image
                src="/blockscards/qdiamonds.webp"
                alt="Queen of Diamonds"
                width={100}
                height={150}
                className="shadow-lg"
              />
            </motion.div>
            <motion.div
              className="absolute left-[40%] top-[30%]"
              animate={{ rotate: [0, 6, 0] }}
              transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.2 }}
            >
              <Image
                src="/blockscards/khearts.webp"
                alt="King of Hearts"
                width={100}
                height={150}
                className="shadow-lg"
              />
            </motion.div>
            <motion.div
              className="absolute left-[70%] top-[10%]"
              animate={{ rotate: [0, -5, 0] }}
              transition={{ duration: 3.7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.7 }}
            >
              <Image
                src="/blockscards/adiamonds.webp"
                alt="Ace of Diamonds"
                width={100}
                height={150}
                className="shadow-lg"
              />
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute bottom-[35px]"
        >
          <Button
            className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8 py-2 text-lg"
            onClick={onStart}
            disabled={!isConnected}
          >
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
  pairPlusBet,
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
  pairPlusBet: number
}) {
  // Calculate potential Pair Plus win
  const potentialPairPlusWin = playerHandRank
    ? (PAIR_PLUS_PAYTABLE[playerHandRank.name as keyof typeof PAIR_PLUS_PAYTABLE] || 0) * pairPlusBet
    : 0

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
                      src={
                        card.suit === "hidden"
                          ? "/blockscards/cardback.webp"
                          : `/blockscards/${card.rank.toLowerCase()}${card.suit}.webp`
                      }
                      alt={card.suit === "hidden" ? "Card back" : `${card.rank} of ${card.suit}`}
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
        <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg p-2 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[#49EACB] text-sm">Ante:</span>
            <span className="text-white text-sm">{betAmount} KAS</span>
          </div>
          {pairPlusBet > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-[#49EACB] text-sm">Pair Plus:</span>
              <span className="text-white text-sm">{pairPlusBet} KAS</span>
            </div>
          )}
        </div>

        {/* Pair Plus potential win display */}
        {pairPlusBet > 0 && playerHandRank && potentialPairPlusWin > 0 && (
          <div className="absolute bottom-4 right-4 bg-[#49EACB]/20 rounded-lg p-2">
            <div className="flex items-center space-x-2">
              <span className="text-[#49EACB] text-sm">Pair Plus Win:</span>
              <span className="text-white text-sm font-bold">{potentialPairPlusWin} KAS</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
