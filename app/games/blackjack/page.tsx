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
  const [canDouble, setCanDouble] = useState(false)
  const [canSplit, setCanSplit] = useState(false)
  const [isSplit, setIsSplit] = useState(false)
  const [splitHands, setSplitHands] = useState<CardType[][]>([])
  const [activeSplitHand, setActiveSplitHand] = useState(0)
  const [splitHandValues, setSplitHandValues] = useState<number[]>([])

  // Animations
  const [isDealing, setIsDealing] = useState(false)
  const [isHitting, setIsHitting] = useState(false)
  const [isStanding, setIsStanding] = useState(false)
  const [isDoubling, setIsDoubling] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [dealerDrawing, setDealerDrawing] = useState(false)
  const [revealingDealerCards, setRevealingDealerCards] = useState(false)

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

  // Update split hand values
  useEffect(() => {
    if (splitHands.length > 0) {
      const values = splitHands.map((hand) => calculateHandValue(hand))
      setSplitHandValues(values)
    }
  }, [splitHands])

  // Check if player can double or split
  useEffect(() => {
    if (playerCards.length === 2 && gameStatus === "player-turn" && !isSplit) {
      setCanDouble(true)
      // Can only split if both cards have the same rank
      setCanSplit(playerCards[0].rank === playerCards[1].rank)
    } else {
      setCanDouble(false)
      setCanSplit(false)
    }
  }, [playerCards, gameStatus, isSplit])

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

      // Set initial cards with flipped state
      const initialPlayerCardsData = data.game.playerCards.map((card: CardType) => ({
        ...card,
        flipped: false,
      }))

      const initialDealerCardsData = [
        {
          ...data.game.dealerUpCard,
          flipped: false,
        },
      ]

      // Set initial game state
      setPregame(false)
      setIsPlaying(true)
      setGameStatus("player-turn")
      setIsDealing(true)

      // Create initial cards with flipped state (all back-facing initially)
      const initialPlayerCards = data.game.playerCards.map((card: CardType) => ({
        ...card,
        flipped: false,
      }))

      const initialDealerCards = [
        {
          ...data.game.dealerUpCard,
          flipped: false,
        },
      ]

      // First set empty arrays to clear the table
      setPlayerCards([])
      setDealerCards([])

      // Deal all cards at once (back-facing)
      setTimeout(() => {
        setPlayerCards(initialPlayerCards)
        setDealerCards(initialDealerCards)
        playCardSound()

        // Flip all cards with slight delays between them
        setTimeout(() => {
          // Flip first player card
          const updatedPlayerCards1 = [{ ...initialPlayerCards[0], flipped: true }, initialPlayerCards[1]]
          setPlayerCards(updatedPlayerCards1)
          playCardSound()

          setTimeout(() => {
            // Flip dealer card
            const updatedDealerCards = [{ ...initialDealerCards[0], flipped: true }]
            setDealerCards(updatedDealerCards)
            playCardSound()

            setTimeout(() => {
              // Flip second player card
              const updatedPlayerCards2 = [updatedPlayerCards1[0], { ...initialPlayerCards[1], flipped: true }]
              setPlayerCards(updatedPlayerCards2)
              playCardSound()

              setIsDealing(false)
            }, 250)
          }, 250)
        }, 300)
      }, 300)

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

      // Get the new card (last card in the updated array)
      const newCard = data.playerCards[data.playerCards.length - 1]

      // Create updated cards array with all previous cards flipped and the new one not flipped
      const updatedCards = [...playerCards.map((card) => ({ ...card, flipped: true })), { ...newCard, flipped: false }]

      // Update player cards with the new card (back facing)
      setPlayerCards(updatedCards)

      // Play sound after a short delay
      setTimeout(() => {
        playCardSound()

        // Flip the new card after a short delay
        setTimeout(() => {
          const flippedCards = updatedCards.map((card, idx) => ({
            ...card,
            flipped: true,
          }))

          setPlayerCards(flippedCards)

          // Check if player busted or got exactly 21 with auto-stand
          if (data.gameResult === "lose" || data.gameResult === "win" || data.gameResult === "push") {
            // Player either busted or hit exactly 21 (auto-stand)
            setGameStatus("complete")

            // If we have dealer cards in the response, it means player hit 21 and dealer played
            if (data.dealerCards && data.dealerCards.length > 1) {
              // Show dealer's full hand
              setDealerUpCardOnly(false)

              // Create dealer cards with flipped state
              const dealerCardsWithState = data.dealerCards.map((card: CardType) => ({
                ...card,
                flipped: true,
              }))

              // Reveal dealer's cards with animation
              setRevealingDealerCards(true)

              // First set just the first card (already visible)
              const firstDealerCard = dealerCards[0]

              // Then add all dealer cards with animation
              setTimeout(() => {
                setDealerCards(dealerCardsWithState)
                playCardSound()

                setTimeout(() => {
                  setRevealingDealerCards(false)

                  // Show final result after delay
                  setTimeout(() => {
                    setResult({
                      gameResult: data.gameResult,
                      winAmount: data.winAmount || 0,
                      clientSeed,
                      serverSeedHash,
                    })
                  }, RESULT_POPUP_DELAY)
                }, 600)
              }, 600)
            } else {
              // Regular bust case
              setTimeout(() => {
                setResult({
                  gameResult: data.gameResult,
                  winAmount: data.winAmount || 0,
                  clientSeed,
                  serverSeedHash,
                })
              }, RESULT_POPUP_DELAY)
            }
          }

          setIsHitting(false)
        }, 600)
      }, 200)
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

      // First reveal dealer's hole card with flip animation
      setRevealingDealerCards(true)

      // If there's a second card to reveal (hole card)
      if (data.dealerCards.length > 1) {
        // Add the dealer's hidden card first (as back-facing)
        const updatedDealerCards = [
          ...dealerCards.map((card) => ({ ...card, flipped: true })),
          { ...data.dealerCards[1], flipped: false },
        ]

        setDealerCards(updatedDealerCards)

        // Play sound and flip the hole card
        setTimeout(() => {
          playCardSound()

          // Flip the hole card
          const flippedCards = updatedDealerCards.map((card) => ({
            ...card,
            flipped: true,
          }))

          setDealerCards(flippedCards)

          // Now add any additional dealer cards one by one
          let currentIndex = 2

          const revealNextCard = () => {
            if (currentIndex < data.dealerCards.length) {
              // Add the next card as back-facing
              const nextCard = data.dealerCards[currentIndex]
              const updatedCards = [...flippedCards, { ...nextCard, flipped: false }]

              setDealerCards(updatedCards)

              // Play sound and flip the card after a delay
              setTimeout(() => {
                playCardSound()

                const finalCards = updatedCards.map((card) => ({
                  ...card,
                  flipped: true,
                }))

                setDealerCards(finalCards)

                // Move to the next card
                currentIndex++
                setTimeout(revealNextCard, 600)
              }, 400)
            } else {
              // All cards revealed
              setRevealingDealerCards(false)
              setDealerUpCardOnly(false)
              setGameStatus("complete")

              // Show result after delay
              setTimeout(() => {
                setResult({
                  gameResult: data.gameResult,
                  winAmount: data.winAmount,
                  clientSeed,
                  serverSeedHash,
                })
              }, RESULT_POPUP_DELAY)
            }
          }

          // Start revealing additional cards after a delay
          setTimeout(revealNextCard, 600)
        }, 600)
      } else {
        // No additional dealer cards
        setDealerUpCardOnly(false)
        setRevealingDealerCards(false)
        setGameStatus("complete")

        setTimeout(() => {
          setResult({
            gameResult: data.gameResult,
            winAmount: data.winAmount,
            clientSeed,
            serverSeedHash,
          })
        }, RESULT_POPUP_DELAY)
      }

      setIsStanding(false)
    } catch (error) {
      console.error("Error standing:", error)
      alert("Failed to stand. Please try again.")
      setIsStanding(false)
      setGameStatus("player-turn")
    }
  }

  // Double Down - double bet and receive one card
  const handleDouble = async () => {
    if (!canDouble || gameStatus !== "player-turn") return

    setIsDoubling(true)

    try {
      // Send additional bet transaction
      const [addr] = await window.kasware.getAccounts()
      const treasury =
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!
      const dep = await window.kasware.sendKaspa(treasury, Number(betAmount) * 1e8, {
        priorityFee: 10000,
      })
      const extraTxid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id

      // Call settle API with double action
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "double",
        extraTxid,
      })

      if (!data.success) {
        alert("Double down failed")
        setIsDoubling(false)
        return
      }

      // Get the new card (last card in the updated array)
      const newCard = data.playerCards[data.playerCards.length - 1]

      // Create updated cards array
      const updatedCards = [...playerCards.map((card) => ({ ...card, flipped: true })), { ...newCard, flipped: false }]

      // Update player cards with the new card (back facing)
      setPlayerCards(updatedCards)

      // Play sound and flip the new card
      setTimeout(() => {
        playCardSound()

        setTimeout(() => {
          const flippedCards = updatedCards.map((card) => ({
            ...card,
            flipped: true,
          }))

          setPlayerCards(flippedCards)

          // Now reveal dealer cards
          setGameStatus("dealer-turn")
          setRevealingDealerCards(true)

          // Reveal dealer cards one by one
          if (data.dealerCards.length > 1) {
            // Add the dealer's hidden card first (as back-facing)
            const updatedDealerCards = [
              ...dealerCards.map((card) => ({ ...card, flipped: true })),
              { ...data.dealerCards[1], flipped: false },
            ]

            setDealerCards(updatedDealerCards)

            setTimeout(() => {
              playCardSound()

              // Flip the hole card
              const flippedDealerCards = updatedDealerCards.map((card) => ({
                ...card,
                flipped: true,
              }))

              setDealerCards(flippedDealerCards)

              // Add any additional dealer cards
              let currentIndex = 2

              const revealNextCard = () => {
                if (currentIndex < data.dealerCards.length) {
                  const nextCard = data.dealerCards[currentIndex]
                  const updatedCards = [...flippedDealerCards, { ...nextCard, flipped: false }]

                  setDealerCards(updatedCards)

                  setTimeout(() => {
                    playCardSound()

                    const finalCards = updatedCards.map((card) => ({
                      ...card,
                      flipped: true,
                    }))

                    setDealerCards(finalCards)

                    currentIndex++
                    setTimeout(revealNextCard, 600)
                  }, 400)
                } else {
                  // All cards revealed
                  setRevealingDealerCards(false)
                  setDealerUpCardOnly(false)
                  setGameStatus("complete")

                  // Show result after delay
                  setTimeout(() => {
                    setResult({
                      gameResult: data.gameResult,
                      winAmount: data.winAmount,
                      clientSeed,
                      serverSeedHash,
                    })
                  }, RESULT_POPUP_DELAY)
                }
              }

              setTimeout(revealNextCard, 600)
            }, 600)
          }

          setIsDoubling(false)
        }, 600)
      }, 200)
    } catch (error) {
      console.error("Error doubling down:", error)
      alert("Failed to double down. Please try again.")
      setIsDoubling(false)
    }
  }

  // Split - split identical cards into two hands
  const handleSplit = async () => {
    if (!canSplit || gameStatus !== "player-turn") return

    setIsSplitting(true)

    try {
      // Send additional bet transaction
      const [addr] = await window.kasware.getAccounts()
      const treasury =
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!
      const dep = await window.kasware.sendKaspa(treasury, Number(betAmount) * 1e8, {
        priorityFee: 10000,
      })
      const extraTxid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id

      // Call settle API with split action
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "split",
        extraTxid,
      })

      if (!data.success) {
        alert("Split failed")
        setIsSplitting(false)
        return
      }

      // Set split mode
      setIsSplit(true)
      setGameStatus("dealer-turn")

      // Create split hands with flipped state
      const splitHandsWithState = data.splitHands.map((hand: CardType[]) =>
        hand.map((card) => ({ ...card, flipped: true })),
      )

      // Animate the split
      setSplitHands(splitHandsWithState)

      // Now reveal dealer cards
      setRevealingDealerCards(true)

      // Reveal dealer cards one by one
      if (data.dealerCards.length > 1) {
        // Add the dealer's hidden card first (as back-facing)
        const updatedDealerCards = [
          ...dealerCards.map((card) => ({ ...card, flipped: true })),
          { ...data.dealerCards[1], flipped: false },
        ]

        setDealerCards(updatedDealerCards)

        setTimeout(() => {
          playCardSound()

          // Flip the hole card
          const flippedDealerCards = updatedDealerCards.map((card) => ({
            ...card,
            flipped: true,
          }))

          setDealerCards(flippedDealerCards)

          // Add any additional dealer cards
          let currentIndex = 2

          const revealNextCard = () => {
            if (currentIndex < data.dealerCards.length) {
              const nextCard = data.dealerCards[currentIndex]
              const updatedCards = [...flippedDealerCards, { ...nextCard, flipped: false }]

              setDealerCards(updatedCards)

              setTimeout(() => {
                playCardSound()

                const finalCards = updatedCards.map((card) => ({
                  ...card,
                  flipped: true,
                }))

                setDealerCards(finalCards)

                currentIndex++
                setTimeout(revealNextCard, 600)
              }, 400)
            } else {
              // All cards revealed
              setRevealingDealerCards(false)
              setDealerUpCardOnly(false)
              setGameStatus("complete")

              // Show result after delay
              setTimeout(() => {
                setResult({
                  gameResult: data.gameResult,
                  winAmount: data.winAmount,
                  clientSeed,
                  serverSeedHash,
                })
              }, RESULT_POPUP_DELAY)
            }
          }

          setTimeout(revealNextCard, 600)
        }, 600)
      }

      setIsSplitting(false)
    } catch (error) {
      console.error("Error splitting:", error)
      alert("Failed to split. Please try again.")
      setIsSplitting(false)
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
    setRevealingDealerCards(false)
    setCanDouble(false)
    setCanSplit(false)
    setIsSplit(false)
    setSplitHands([])
    setActiveSplitHand(0)
    setSplitHandValues([])
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
                  onDouble={handleDouble}
                  onSplit={handleSplit}
                  gameStatus={gameStatus}
                  isDealing={isDealing}
                  isHitting={isHitting}
                  isStanding={isStanding}
                  isDoubling={isDoubling}
                  isSplitting={isSplitting}
                  dealerDrawing={dealerDrawing}
                  revealingDealerCards={revealingDealerCards}
                  canDouble={canDouble}
                  canSplit={canSplit}
                  isSplit={isSplit}
                  splitHands={splitHands}
                  splitHandValues={splitHandValues}
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
            <Image src="/blockscards/aspades.webp" alt="Ace of Spades" width={120} height={180} className="shadow-lg" />
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
            <Image
              src="/blockscards/kspades.webp"
              alt="King of Spades"
              width={120}
              height={180}
              className="shadow-lg"
            />
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
  onDouble,
  onSplit,
  gameStatus,
  isDealing,
  isHitting,
  isStanding,
  isDoubling,
  isSplitting,
  dealerDrawing,
  revealingDealerCards,
  canDouble,
  canSplit,
  isSplit,
  splitHands,
  splitHandValues,
}: {
  playerCards: CardType[]
  dealerCards: CardType[]
  dealerUpCardOnly: boolean
  playerValue: number
  dealerValue: number
  onHit: () => void
  onStand: () => void
  onDouble: () => void
  onSplit: () => void
  gameStatus: string
  isDealing: boolean
  isHitting: boolean
  isStanding: boolean
  isDoubling: boolean
  isSplitting: boolean
  dealerDrawing: boolean
  revealingDealerCards: boolean
  canDouble: boolean
  canSplit: boolean
  isSplit: boolean
  splitHands: CardType[][]
  splitHandValues: number[]
}) {
  return (
    <div className="relative w-full h-[700px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a]">
      {/* Dealer area */}
      <div className="absolute top-0 left-0 right-0 h-1/2 flex flex-col items-center justify-center p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#49EACB] mb-2">Dealer ({dealerValue})</h3>
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
                delay: index * 0.2 + (isDealing ? 0.5 : 0),
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
        {!isSplit ? (
          // Regular hand display
          <>
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
                        <Image
                          src="/blockscards/cardback.webp"
                          alt="Card back"
                          fill
                          className="rounded-lg object-cover"
                        />
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#49EACB] mb-2">Your Hand ({playerValue})</h3>
            </div>
          </>
        ) : (
          // Split hands display
          <div className="flex gap-8 mb-8">
            {splitHands.map((hand, handIndex) => (
              <div key={`split-hand-${handIndex}`} className="flex flex-col items-center">
                <div className="flex justify-center items-center h-40 relative mb-2">
                  {hand.map((card, cardIndex) => (
                    <motion.div
                      key={`split-${handIndex}-${cardIndex}`}
                      className="absolute"
                      initial={{ x: 0, y: 0 }}
                      animate={{
                        x: (cardIndex - (hand.length - 1) / 2) * 50,
                        y: 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <div className="relative w-[100px] h-[150px] shadow-xl rounded-lg">
                        <Image
                          src={`/blockscards/${card.rank.toLowerCase()}${card.suit}.webp`}
                          alt={`${card.rank} of ${card.suit}`}
                          fill
                          className="rounded-lg object-cover"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
                <h4 className="text-sm font-bold text-[#49EACB]">
                  Hand {handIndex + 1} ({splitHandValues[handIndex] || 0})
                </h4>
              </div>
            ))}
          </div>
        )}

        {/* Game controls */}
        {gameStatus === "player-turn" && !isSplit && (
          <div className="flex space-x-4">
            <Button
              className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8"
              onClick={onHit}
              disabled={isHitting || isStanding || isDoubling || isSplitting}
            >
              Hit
            </Button>
            <Button
              className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8"
              onClick={onStand}
              disabled={isHitting || isStanding || isDoubling || isSplitting}
            >
              Stand
            </Button>
            {canDouble && (
              <Button
                className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8"
                onClick={onDouble}
                disabled={isHitting || isStanding || isDoubling || isSplitting}
              >
                Double
              </Button>
            )}
            {canSplit && (
              <Button
                className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8"
                onClick={onSplit}
                disabled={isHitting || isStanding || isDoubling || isSplitting}
              >
                Split
              </Button>
            )}
          </div>
        )}

        {/* Game status */}
        {gameStatus === "dealer-turn" && (
          <div className="text-center">
            <p className="text-lg text-[#49EACB] animate-pulse">Dealer's turn...</p>
          </div>
        )}

        {/* Blackjack notification */}
        {playerValue === 21 && playerCards.length === 2 && !isSplit && (
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
        {playerValue > 21 && !isSplit && (
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
