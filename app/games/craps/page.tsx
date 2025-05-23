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
const messages = ["Verifying transaction", "Hashing game seed", "Preparing dice"]

// API base
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

// Dice interface
interface DiceRoll {
  die1: number
  die2: number
  total: number
}

// Main Page
export default function CrapsPage() {
  return <CrapsContent />
}

function CrapsContent() {
  const { isConnected, balance } = useWallet()

  // Game state
  const [pregame, setPregame] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [betAmount, setBetAmount] = useState("1")
  const [gamePhase, setGamePhase] = useState<"betting" | "come-out" | "point" | "complete">("betting")
  const [point, setPoint] = useState<number | null>(null)
  const [rolls, setRolls] = useState<number[]>([])
  const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [showRules, setShowRules] = useState(false)

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
    clientSeed: string | null
    serverSeedHash: string | null
    finalRoll?: number
  } | null>(null)

  // Dice rolling sound
  const diceRollSoundRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      diceRollSoundRef.current = new Audio("/dice-roll.mp3")
    }
  }, [])

  const playDiceRollSound = () => {
    if (diceRollSoundRef.current) {
      diceRollSoundRef.current.currentTime = 0
      diceRollSoundRef.current.play().catch((err) => console.error("Error playing sound:", err))
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

  // Start game - come-out roll
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
        gameName: "craps",
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

      setGameId(data._id || data.game._id)
      setServerSeedHash(data.serverSeedHash || data.game.serverSeedHash)

      // Set initial game state
      setPregame(false)
      setIsPlaying(true)
      setGamePhase("come-out")
      setIsRolling(true)

      // Extract come-out roll
      const comeOutRoll = data.comeOutRoll || data.game.comeOutRoll
      const point = data.point || data.game.point

      // Simulate dice rolling animation
      setTimeout(() => {
        playDiceRollSound()

        // Start the rolling animation first
        setIsRolling(true)

        // After 2.5 seconds of rolling animation, show the actual result
        setTimeout(() => {
          // Calculate individual dice values that add up to the come-out roll
          const comeOutRoll = data.comeOutRoll || data.game.comeOutRoll
          const die1 = Math.floor(Math.random() * 6) + 1
          const die2 = comeOutRoll - die1

          // If die2 is invalid, adjust the dice values
          let finalDie1 = die1
          let finalDie2 = die2

          if (die2 < 1 || die2 > 6) {
            // Redistribute the total across two valid dice
            finalDie1 = Math.min(6, Math.max(1, Math.floor(comeOutRoll / 2)))
            finalDie2 = comeOutRoll - finalDie1

            // Final adjustment if still invalid
            if (finalDie2 < 1) {
              finalDie1 = 1
              finalDie2 = comeOutRoll - 1
            } else if (finalDie2 > 6) {
              finalDie1 = comeOutRoll - 6
              finalDie2 = 6
            }
          }

          setCurrentRoll({
            die1: finalDie1,
            die2: finalDie2,
            total: comeOutRoll,
          })

          setRolls([comeOutRoll])
          setIsRolling(false)

          // Check immediate win/loss or establish point after dice settle
          setTimeout(() => {
            if ([7, 11].includes(comeOutRoll)) {
              // Win on 7 or 11
              setGamePhase("complete")
              setTimeout(() => {
                setResult({
                  gameResult: "win",
                  winAmount: Number(betAmount) * 2,
                  clientSeed,
                  serverSeedHash: data.serverSeedHash || data.game.serverSeedHash,
                  finalRoll: comeOutRoll,
                })
              }, 1500)
            } else if ([2, 3, 12].includes(comeOutRoll)) {
              // Lose on 2, 3, or 12
              setGamePhase("complete")
              setTimeout(() => {
                setResult({
                  gameResult: "lose",
                  winAmount: 0,
                  clientSeed,
                  serverSeedHash: data.serverSeedHash || data.game.serverSeedHash,
                  finalRoll: comeOutRoll,
                })
              }, 1500)
            } else {
              // Establish point
              setPoint(comeOutRoll)
              setGamePhase("point")
            }
          }, 500)
        }, 2500)
      }, 1000)

      setLoading(false)
    } catch (error) {
      console.error("Error starting game:", error)
      alert("Failed to start game. Please try again.")
      setLoading(false)
    }
  }

  // Roll dice during point phase
  const handleRoll = async () => {
    if (gamePhase !== "point") return

    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "roll",
      })

      if (!data.success) {
        alert("Roll action failed")
        return
      }

      // Start rolling animation
      setIsRolling(true)
      playDiceRollSound()

      // After 2.5 seconds of rolling animation, show the actual result
      setTimeout(() => {
        const roll = data.roll
        const gameResult = data.gameResult

        // Calculate individual dice values that add up to the roll
        const die1 = Math.floor(Math.random() * 6) + 1
        const die2 = roll - die1

        // If die2 is invalid, adjust the dice values
        let finalDie1 = die1
        let finalDie2 = die2

        if (die2 < 1 || die2 > 6) {
          // Redistribute the total across two valid dice
          finalDie1 = Math.min(6, Math.max(1, Math.floor(roll / 2)))
          finalDie2 = roll - finalDie1

          // Final adjustment if still invalid
          if (finalDie2 < 1) {
            finalDie1 = 1
            finalDie2 = roll - 1
          } else if (finalDie2 > 6) {
            finalDie1 = roll - 6
            finalDie2 = 6
          }
        }

        setCurrentRoll({
          die1: finalDie1,
          die2: finalDie2,
          total: roll,
        })

        setRolls((prevRolls) => [...prevRolls, roll])
        setIsRolling(false)

        // Check win/loss or continue after dice settle
        setTimeout(() => {
          if (gameResult === "win") {
            setGamePhase("complete")
            setTimeout(() => {
              setResult({
                gameResult: "win",
                winAmount: data.winAmount,
                clientSeed,
                serverSeedHash,
                finalRoll: roll,
              })
            }, 1500)
          } else if (gameResult === "lose") {
            setGamePhase("complete")
            setTimeout(() => {
              setResult({
                gameResult: "lose",
                winAmount: 0,
                clientSeed,
                serverSeedHash,
                finalRoll: roll,
              })
            }, 1500)
          }
          // If gameResult is "continue", we stay in point phase
        }, 500)
      }, 2500)
    } catch (error) {
      console.error("Error rolling:", error)
      alert("Failed to roll. Please try again.")
      setIsRolling(false)
    }
  }

  // Reset game
  const resetGame = () => {
    setPregame(true)
    setIsPlaying(false)
    setGamePhase("betting")
    setPoint(null)
    setRolls([])
    setCurrentRoll(null)
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
                <h2 className="text-2xl font-bold text-[#49EACB]">Craps</h2>
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
                <CrapsTable
                  currentRoll={currentRoll}
                  point={point}
                  gamePhase={gamePhase}
                  onRoll={handleRoll}
                  isRolling={isRolling}
                  rolls={rolls}
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
                  {!isConnected ? "Connect Wallet" : isPlaying ? "Game in Progress" : "Roll Dice"}
                </Button>
              </div>
            </Card>

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
              <h2 className="text-2xl font-bold text-[#49EACB] mb-4">Craps Rules</h2>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-lg font-semibold text-white mb-2">Come-Out Roll</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-300">
                    <li>
                      <span className="text-[#49EACB] font-bold">Win:</span> If you roll a 7 or 11
                    </li>
                    <li>
                      <span className="text-red-400 font-bold">Lose:</span> If you roll a 2, 3, or 12 (called "Craps")
                    </li>
                    <li>
                      <span className="text-yellow-400 font-bold">Point:</span> If you roll 4, 5, 6, 8, 9, or 10, this
                      number becomes your "Point"
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-lg font-semibold text-white mb-2">Point Phase</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-300">
                    <li>
                      <span className="text-[#49EACB] font-bold">Win:</span> If you roll your Point number again before
                      rolling a 7
                    </li>
                    <li>
                      <span className="text-red-400 font-bold">Lose:</span> If you roll a 7 before rolling your Point
                      number
                    </li>
                    <li>Any other number has no effect, and you continue rolling</li>
                  </ul>
                </div>

                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-lg font-semibold text-white mb-2">Payouts</h3>
                  <p className="text-gray-300">
                    Win: <span className="text-[#49EACB] font-bold">2x</span> your bet (Pass Line bet)
                  </p>
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
              <h2 className="text-4xl font-bold mb-2 text-black">
                {result.gameResult === "win" ? "You Win!" : "You Lose!"}
              </h2>
              {result.finalRoll && (
                <p className="text-xl mb-4 text-black font-semibold">
                  Final Roll: {result.finalRoll}
                  {point && result.gameResult === "win" && ` (Your Point: ${point})`}
                  {point && result.gameResult === "lose" && result.finalRoll === 7 && " (Seven Out)"}
                </p>
              )}
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
          Craps
        </motion.h1>
        <motion.p
          className="text-xl tracking-wider mb-8"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#ffffff" }}
        >
          ROLL THE DICE AND WIN
        </motion.p>

        {/* Dice images in a nice arrangement */}
        <div className="relative w-full max-w-3xl h-64 mb-8">
          <motion.div
            className="absolute left-[30%] top-[10%]"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <Die value={5} size={120} />
          </motion.div>
          <motion.div
            className="absolute left-[50%] top-[20%]"
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.5 }}
          >
            <Die value={2} size={120} />
          </motion.div>
        </div>

        <div className="bg-black/50 backdrop-blur-sm p-6 rounded-lg max-w-lg text-center mb-8">
          <h3 className="text-xl font-bold text-[#49EACB] mb-2">How to Play</h3>
          <ol className="text-left text-gray-200 space-y-2">
            <li>1. Place your bet and roll the dice (Come-Out Roll)</li>
            <li>2. Win immediately with 7 or 11, lose with 2, 3, or 12</li>
            <li>3. Any other number (4, 5, 6, 8, 9, 10) becomes your "Point"</li>
            <li>4. Keep rolling until you hit your Point (win) or 7 (lose)</li>
          </ol>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="mt-2">
          <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" onClick={onStart} disabled={!isConnected}>
            {!isConnected ? "Connect Wallet to Play" : "Roll Dice"}
          </Button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#004d40] z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#003c32] z-20"></div>
    </div>
  )
}

// Craps Table Component
function CrapsTable({
  currentRoll,
  point,
  gamePhase,
  onRoll,
  isRolling,
  rolls,
  betAmount,
}: {
  currentRoll: DiceRoll | null
  point: number | null
  gamePhase: string
  onRoll: () => void
  isRolling: boolean
  rolls: number[]
  betAmount: number
}) {
  return (
    <div className="relative w-full h-[700px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#004d40] to-[#00251a]">
      {/* Point display */}
      <div className="absolute top-6 left-0 right-0 flex justify-center">
        {point !== null && (gamePhase === "point" || gamePhase === "complete") && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-[#49EACB]/20 backdrop-blur-md px-6 py-3 rounded-lg border-2 border-[#49EACB] text-center"
          >
            <h2 className="text-2xl font-bold text-[#49EACB]">Point: {point}</h2>
          </motion.div>
        )}
      </div>

      {/* Craps table */}
      <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex flex-col items-center justify-center p-6">
        {/* Dice area */}
        <div className="relative w-full max-w-md h-64 mb-8">
          {currentRoll ? (
            <motion.div
              className="flex justify-center items-center gap-8"
              initial={{ y: -300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <motion.div
                animate={
                  isRolling
                    ? {
                        rotateX: [0, 180, 360, 540, 720, 900, 1080],
                        rotateY: [0, 270, 540, 810, 1080, 1350, 1620],
                        rotateZ: [0, 90, 180, 270, 360, 450, 540],
                        x: [-30, 30, -20, 20, -10, 10, 0],
                        y: [-40, 20, -30, 15, -20, 10, 0],
                        scale: [1, 1.1, 0.9, 1.05, 0.95, 1.02, 1],
                      }
                    : {
                        rotateX: 0,
                        rotateY: 0,
                        rotateZ: 0,
                        x: 0,
                        y: 0,
                        scale: 1,
                      }
                }
                transition={{
                  duration: isRolling ? 2.5 : 0.5,
                  ease: isRolling ? "easeOut" : "easeInOut",
                  times: isRolling ? [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1] : undefined,
                }}
              >
                <Die value={isRolling ? Math.floor(Math.random() * 6) + 1 : currentRoll.die1} size={100} />
              </motion.div>
              <motion.div
                animate={
                  isRolling
                    ? {
                        rotateX: [0, -180, -360, -540, -720, -900, -1080],
                        rotateY: [0, -270, -540, -810, -1080, -1350, -1620],
                        rotateZ: [0, -90, -180, -270, -360, -450, -540],
                        x: [30, -30, 20, -20, 10, -10, 0],
                        y: [-20, 30, -25, 20, -15, 12, 0],
                        scale: [1, 0.9, 1.1, 0.95, 1.05, 0.98, 1],
                      }
                    : {
                        rotateX: 0,
                        rotateY: 0,
                        rotateZ: 0,
                        x: 0,
                        y: 0,
                        scale: 1,
                      }
                }
                transition={{
                  duration: isRolling ? 2.5 : 0.5,
                  ease: isRolling ? "easeOut" : "easeInOut",
                  times: isRolling ? [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1] : undefined,
                }}
              >
                <Die value={isRolling ? Math.floor(Math.random() * 6) + 1 : currentRoll.die2} size={100} />
              </motion.div>
            </motion.div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-400 text-lg">Roll the dice to start</p>
            </div>
          )}
        </div>

        {/* Roll total display */}
        {currentRoll && !isRolling && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
            className="mb-8"
          >
            <div className="bg-[#49EACB]/20 backdrop-blur-md px-8 py-4 rounded-lg border border-[#49EACB]/50">
              <h3 className="text-3xl font-bold text-[#49EACB]">Roll: {currentRoll.total}</h3>
            </div>
          </motion.div>
        )}

        {/* Game controls */}
        {gamePhase === "point" && !isRolling && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Button
              className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8 py-6 text-lg"
              onClick={onRoll}
              disabled={isRolling}
            >
              ROLL AGAIN
            </Button>
          </motion.div>
        )}

        {/* Game instructions */}
        {gamePhase === "point" && !isRolling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-center text-gray-300"
          >
            <p>
              Roll <span className="text-[#49EACB] font-bold">{point}</span> again to win, or{" "}
              <span className="text-red-400 font-bold">7</span> to lose
            </p>
          </motion.div>
        )}

        {/* Rolling status */}
        {isRolling && (
          <div className="text-center mt-4">
            <p className="text-lg text-[#49EACB] animate-pulse">Rolling dice...</p>
          </div>
        )}

        {/* Previous rolls */}
        {rolls.length > 0 && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <div className="bg-black/30 backdrop-blur-sm px-6 py-2 rounded-lg border border-[#49EACB]/30">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-300 text-sm">Bet:</span>{" "}
                  <span className="text-[#49EACB] font-bold">{betAmount} KAS</span>
                </div>
                <div>
                  <span className="text-gray-300 text-sm">Rolls:</span>{" "}
                  <span className="text-[#49EACB]">
                    {rolls.map((roll, index) => (
                      <span
                        key={index}
                        className={`${
                          index === 0
                            ? [7, 11].includes(roll)
                              ? "text-green-400"
                              : [2, 3, 12].includes(roll)
                                ? "text-red-400"
                                : "text-yellow-400"
                            : roll === point
                              ? "text-green-400"
                              : roll === 7
                                ? "text-red-400"
                                : ""
                        } font-bold`}
                      >
                        {roll}
                        {index < rolls.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 3D Die Component
function Die({ value, size }: { value: number; size: number }) {
  // Define the positions of dots for each face
  const dotPositions = {
    1: [{ top: "50%", left: "50%" }],
    2: [
      { top: "25%", left: "25%" },
      { top: "75%", left: "75%" },
    ],
    3: [
      { top: "25%", left: "25%" },
      { top: "50%", left: "50%" },
      { top: "75%", left: "75%" },
    ],
    4: [
      { top: "25%", left: "25%" },
      { top: "25%", left: "75%" },
      { top: "75%", left: "25%" },
      { top: "75%", left: "75%" },
    ],
    5: [
      { top: "25%", left: "25%" },
      { top: "25%", left: "75%" },
      { top: "50%", left: "50%" },
      { top: "75%", left: "25%" },
      { top: "75%", left: "75%" },
    ],
    6: [
      { top: "25%", left: "25%" },
      { top: "25%", left: "50%" },
      { top: "25%", left: "75%" },
      { top: "75%", left: "25%" },
      { top: "75%", left: "50%" },
      { top: "75%", left: "75%" },
    ],
  }

  return (
    <div
      className="relative bg-white rounded-lg shadow-xl"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Dots */}
      {dotPositions[value].map((position, index) => (
        <div
          key={index}
          className="absolute bg-black rounded-full"
          style={{
            width: `${size * 0.15}px`,
            height: `${size * 0.15}px`,
            top: position.top,
            left: position.left,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  )
}
