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
const messages = ["Verifying transaction", "Hashing game seed", "Generating bingo card"]
const RESULT_POPUP_DELAY = 2000 // 2 second delay for result popup

// API base
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

// Bingo card type
interface BingoCardType {
  [key: number]: (number | string)[]
}

// Main Page
export default function BingoPage() {
  return <BingoContent />
}

function BingoContent() {
  const { isConnected, balance } = useWallet()

  // Game state
  const [pregame, setPregame] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [betAmount, setBetAmount] = useState("1")
  const [bingoCard, setBingoCard] = useState<BingoCardType>({})
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
  const [drawnBombs, setDrawnBombs] = useState<Set<number>>(new Set())
  const [currentBall, setCurrentBall] = useState<number | null>(null)
  const [currentBallIsBomb, setCurrentBallIsBomb] = useState(false)
  const [markedNumbers, setMarkedNumbers] = useState<Set<number>>(new Set())
  const [gameStatus, setGameStatus] = useState<"betting" | "playing" | "complete">("betting")
  const [potentialWin, setPotentialWin] = useState(0)

  // Animations
  const [isDrawing, setIsDrawing] = useState(false)
  const [isCalling, setIsCalling] = useState(false) // new: track "Processing bingo..."

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
    patterns?: number
    isBomb?: boolean
  } | null>(null)

  // Ball drawing sound
  const ballSoundRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      ballSoundRef.current = new Audio("/dice-roll.mp3")
    }
  }, [])

  const playBallSound = () => {
    if (ballSoundRef.current) {
      ballSoundRef.current.currentTime = 0
      ballSoundRef.current.play().catch((err) => console.error("Error playing sound:", err))
    }
  }

  // Calculate potential win - show minimum (2× ante)
  useEffect(() => {
    const bet = Number(betAmount)
    if (!isNaN(bet)) {
      setPotentialWin(bet * 2) // Minimum win (1 pattern = 2×)
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
        gameName: "bingo",
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
      setBingoCard(data.card)

      // Set initial game state
      setPregame(false)
      setIsPlaying(true)
      setGameStatus("playing")
      setDrawnNumbers([])
      setDrawnBombs(new Set())
      setMarkedNumbers(new Set())
      setCurrentBall(null)
      setCurrentBallIsBomb(false)

      setLoading(false)
    } catch (error) {
      console.error("Error starting game:", error)
      alert("Failed to start game. Please try again.")
      setLoading(false)
    }
  }

  // Draw a ball
  const handleDrawBall = async () => {
    if (!gameId || isDrawing || gameStatus === "complete") return

    setIsDrawing(true)
    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "draw",
      })

      if (!data.success) {
        alert("Draw action failed")
        setIsDrawing(false)
        return
      }

      // Set the new ball
      setCurrentBall(data.number)
      setDrawnNumbers((prev) => [...prev, data.number])
      playBallSound()

      // Check if this is a bomb
      if (data.gameResult === "lose" && data.reason === "bomb") {
        setCurrentBallIsBomb(true)
        setDrawnBombs((prev) => new Set([...prev, data.number]))
        setGameStatus("complete")

        // Show bomb result immediately
        setTimeout(() => {
          setResult({
            gameResult: "lose",
            winAmount: 0,
            clientSeed,
            serverSeedHash,
            isBomb: true,
          })
        }, 1000) // Short delay to show the bomb first
      } else if (data.gameResult === "continue") {
        setCurrentBallIsBomb(false)

        // Check if this number is on our card
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 5; col++) {
            const cell = bingoCard[row] && bingoCard[row][col]
            if (cell === data.number) {
              setMarkedNumbers((prev) => new Set([...prev, data.number]))
              break
            }
          }
        }
      }

      setIsDrawing(false)
    } catch (error) {
      console.error("Error drawing ball:", error)
      alert("Failed to draw ball. Please try again.")
      setIsDrawing(false)
    }
  }

  // Call bingo
  const handleCallBingo = async () => {
    if (!gameId) return

    setIsCalling(true) // show "Processing bingo..." typewriter

    try {
      const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        action: "call",
      })

      if (!data.success) {
        alert("Call bingo action failed")
        setIsCalling(false)
        return
      }

      // Show result after delay
      setTimeout(() => {
        setResult({
          gameResult: data.gameResult,
          winAmount: data.winAmount || 0,
          clientSeed,
          serverSeedHash,
          patterns: data.patterns || 0,
        })
        setGameStatus("complete")
        setIsCalling(false)
      }, RESULT_POPUP_DELAY)
    } catch (error) {
      console.error("Error calling bingo:", error)
      alert("Failed to call bingo. Please try again.")
      setIsCalling(false)
    }
  }

  // Reset game
  const resetGame = () => {
    setPregame(true)
    setIsPlaying(false)
    setBingoCard({})
    setDrawnNumbers([])
    setDrawnBombs(new Set())
    setMarkedNumbers(new Set())
    setCurrentBall(null)
    setCurrentBallIsBomb(false)
    setGameStatus("betting")
    setResult(null)
    setClientSeed(null)
    setServerSeedHash(null)
    setGameId(null)
    setIsCalling(false)
  }

  // Check if there's a potential winning pattern (for enabling “Call Bingo” button)
  const checkForWinningPattern = () => {
    if (!bingoCard || Object.keys(bingoCard).length === 0) return false

    // Check rows
    for (let row = 0; row < 5; row++) {
      if (
        bingoCard[row] &&
        bingoCard[row].every(
          (cell) => (cell === 0) || markedNumbers.has(cell as number)
        )
      ) {
        return true
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      let columnComplete = true
      for (let row = 0; row < 5; row++) {
        const cell = bingoCard[row] && bingoCard[row][col]
        if (cell !== 0 && !markedNumbers.has(cell as number)) {
          columnComplete = false
          break
        }
      }
      if (columnComplete) return true
    }

    // Check diagonals
    let diagonal1 = true,
      diagonal2 = true
    for (let i = 0; i < 5; i++) {
      const cell1 = bingoCard[i] && bingoCard[i][i]
      const cell2 = bingoCard[i] && bingoCard[i][4 - i]

      if (cell1 !== 0 && !markedNumbers.has(cell1 as number)) {
        diagonal1 = false
      }
      if (cell2 !== 0 && !markedNumbers.has(cell2 as number)) {
        diagonal2 = false
      }
    }

    return diagonal1 || diagonal2
  }

  // Get ball color based on number
  const getBallColor = (number: number) => {
    if (number >= 1 && number <= 15) return "bg-blue-500 text-white"
    if (number >= 16 && number <= 30) return "bg-red-500 text-white"
    if (number >= 31 && number <= 45) return "bg-white text-black"
    if (number >= 46 && number <= 60) return "bg-green-500 text-white"
    if (number >= 61 && number <= 75) return "bg-yellow-500 text-black"
    return "bg-gray-500 text-white"
  }

  // Get column letter color
  const getColumnColor = (col: number) => {
    const colors = [
      "text-blue-500", // B
      "text-red-500", // I
      "text-white", // N
      "text-green-500", // G
      "text-yellow-500", // O
    ]
    return colors[col]
  }

  // Get column letter
  const getColumnLetter = (col: number) => {
    return ["B", "I", "N", "G", "O"][col]
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
                <h2 className="text-2xl font-bold text-[#49EACB]">Explosive Bingo</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <PreGameScreen onStart={handleStartGame} isConnected={isConnected} />
              ) : (
                <BingoGameScreen
                  bingoCard={bingoCard}
                  drawnNumbers={drawnNumbers}
                  drawnBombs={drawnBombs}
                  currentBall={currentBall}
                  currentBallIsBomb={currentBallIsBomb}
                  markedNumbers={markedNumbers}
                  onDrawBall={handleDrawBall}
                  onCallBingo={handleCallBingo}
                  isDrawing={isDrawing}
                  canCallBingo={checkForWinningPattern()}
                  gameStatus={gameStatus}
                  isCalling={isCalling}
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
                    Potential Win: {potentialWin.toFixed(2)}+ KAS (2×–13× based on patterns)
                  </div>
                  <Button
                    className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                    onClick={handleStartGame}
                    disabled={isPlaying || !isConnected}
                  >
                    {!isConnected ? "Connect Wallet" : isPlaying ? "Game in Progress" : "Start Explosive Bingo"}
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
            <Card
              className={`${result.isBomb ? "bg-red-600" : "bg-[#49EACB]"} p-8 rounded-2xl shadow-2xl text-center max-w-md w-full`}
            >
              {result.isBomb ? (
                <>
                  <div className="flex justify-center mb-4">
                    <Image src="/bingobomb.webp" alt="Bomb" width={80} height={80} />
                  </div>
                  <h2 className="text-4xl font-bold mb-6 text-white">BOOM!</h2>
                  <p className="text-2xl mb-4 text-white">You drew a bomb! Game over!</p>
                </>
              ) : (
                <>
                  <h2 className="text-4xl font-bold mb-6 text-black">
                    {result.gameResult === "win" ? "BINGO!" : "No Bingo"}
                  </h2>
                  {result.gameResult === "win" ? (
                    <div className="mb-6">
                      <p className="text-4xl animate-pulse uppercase mb-2 text-black">
                        You won <strong>{result.winAmount.toFixed(2)}</strong> KAS!
                      </p>
                      <p className="text-lg text-black">
                        {result.patterns} pattern{result.patterns !== 1 ? "s" : ""} completed!
                      </p>
                    </div>
                  ) : (
                    <p className="text-2xl mb-4 text-black">No winning patterns found!</p>
                  )}
                </>
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
          Explosive Bingo
        </motion.h1>
        <motion.p
          className="text-xl tracking-wider mb-8"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          style={{ color: "#ffffff" }}
        >
          AVOID THE BOMBS AND GET BINGO TO WIN!
        </motion.p>

        {/* Game rules in the center */}
        <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg max-w-lg mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-[#49EACB] mb-2">How to Play</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Place your bet and get a card</li>
                <li>• Draw balls one by one</li>
                <li>• Draw a bomb and you lose!</li>
                <li>• Call "Bingo" when you complete a pattern</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#49EACB] mb-2">Winning & Bombs</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Complete rows, columns, or diagonals</li>
                <li>• More patterns = higher payout (2×–13×)</li>
                <li>• 3 hidden bombs within the 75 balls can end your game</li>
                <li>• Risk vs reward - when to call bingo?</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Animated bingo balls and bombs on left and right */}
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 space-y-4">
          <motion.div
            className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            B-7
          </motion.div>
          <motion.div
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-lg shadow-lg"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
          >
            I-23
          </motion.div>
          <motion.div
            className="w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.6 }}
          >
            <Image src="/bingobomb.webp" alt="Bomb" width={42} height={42} />
          </motion.div>
        </div>

        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 space-y-4">
          <motion.div
            className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg shadow-lg"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.2 }}
          >
            G-55
          </motion.div>
          <motion.div
            className="w-16 h-16 rounded-full bg-yellow-500 text-black flex items-center justify-center font-bold text-lg shadow-lg"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1.9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.5 }}
          >
            O-68
          </motion.div>
          <motion.div
            className="w-16 h-16 rounded-full bg-black flex items-center justify-center shadow-lg"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.8 }}
          >
            <Image src="/bingobomb.webp" alt="Bomb" width={42} height={42} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute bottom-[35px] left-1/2 transform -translate-x-1/2"
        >
          <Button
            className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8 py-6 text-lg"
            onClick={onStart}
            disabled={!isConnected}
          >
            {!isConnected ? "Connect Wallet to Play" : "Start Explosive Bingo"}
          </Button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#004d40] z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#003c32] z-20"></div>
    </div>
  )
}

// Bingo Game Screen Component
function BingoGameScreen({
  bingoCard,
  drawnNumbers,
  drawnBombs,
  currentBall,
  currentBallIsBomb,
  markedNumbers,
  onDrawBall,
  onCallBingo,
  isDrawing,
  canCallBingo,
  gameStatus,
  isCalling,
}: {
  bingoCard: BingoCardType
  drawnNumbers: number[]
  drawnBombs: Set<number>
  currentBall: number | null
  currentBallIsBomb: boolean
  markedNumbers: Set<number>
  onDrawBall: () => void
  onCallBingo: () => void
  isDrawing: boolean
  canCallBingo: boolean
  gameStatus: string
  isCalling: boolean
}) {
  // Get ball color based on number
  const getBallColor = (number: number) => {
    if (number >= 1 && number <= 15) return "bg-blue-500 text-white"
    if (number >= 16 && number <= 30) return "bg-red-500 text-white"
    if (number >= 31 && number <= 45) return "bg-white text-black"
    if (number >= 46 && number <= 60) return "bg-green-500 text-white"
    if (number >= 61 && number <= 75) return "bg-yellow-500 text-black"
    return "bg-gray-500 text-white"
  }

  // Get column letter color
  const getColumnColor = (col: number) => {
    const colors = [
      "text-blue-500", // B
      "text-red-500", // I
      "text-white", // N
      "text-green-500", // G
      "text-yellow-500", // O
    ]
    return colors[col]
  }

  // Get column letter
  const getColumnLetter = (col: number) => {
    return ["B", "I", "N", "G", "O"][col]
  }

  // Typewriter state for "Processing bingo..."
  const [callText, setCallText] = useState("")
  const processingMessage = "Processing bingo..."

  useEffect(() => {
    if (!isCalling) return
    setCallText("")
    let idx = 0
    const interval = setInterval(() => {
      setCallText(processingMessage.slice(0, idx + 1))
      idx++
      if (idx >= processingMessage.length) {
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [isCalling])

  return (
    <div className="w-full h-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bingo Card (takes 2 columns on medium+ screens) */}
        <div className="md:col-span-2">
          <div className="bg-[#004d40]/50 rounded-lg p-4">
            <h3 className="text-xl font-bold text-[#49EACB] mb-4 text-center">Your Bingo Card</h3>

            {/* Column Headers with colors */}
            <div className="grid grid-cols-5 gap-1 max-w-md mx-auto mb-2">
              {["B", "I", "N", "G", "O"].map((letter, index) => (
                <div key={letter} className={`text-center font-bold text-xl py-2 ${getColumnColor(index)}`}>
                  {letter}
                </div>
              ))}
            </div>

            {/* Bingo Card Grid */}
            <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
              {Array.from({ length: 5 }, (_, row) =>
                Array.from({ length: 5 }, (_, col) => {
                  const cell = bingoCard[row] && bingoCard[row][col]
                  const isFree = cell === 0
                  const isMarked = isFree || (typeof cell === "number" && markedNumbers.has(cell as number))

                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`
                        w-20 h-20 flex items-center justify-center rounded-lg border-2 text-lg font-bold relative
                        ${isMarked ? "bg-[#49EACB]/20 border-[#49EACB] text-[#49EACB]" : "bg-black/50 border-gray-600 text-white"}
                        ${isFree ? "bg-[#49EACB]/30" : ""}
                      `}
                    >
                      {isFree ? "FREE" : cell}
                      {isMarked && !isFree && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                            alt="KAS"
                            width={24}
                            height={24}
                            className="opacity-80"
                          />
                        </div>
                      )}
                    </div>
                  )
                }),
              )}
            </div>

            {/* Game Controls */}
            <div className="mt-6 flex justify-center space-x-4">
              {isCalling ? (
                <div className="text-lg font-bold text-[#49EACB]">{callText}</div>
              ) : (
                <>
                  <Button
                    onClick={onDrawBall}
                    disabled={isDrawing || gameStatus === "complete" || isCalling}
                    className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-6 py-2"
                  >
                    {isDrawing ? "Drawing..." : "Draw Ball"}
                  </Button>

                  {canCallBingo && gameStatus === "playing" && (
                    <Button
                      onClick={onCallBingo}
                      disabled={gameStatus === "complete" || isCalling}
                      className="bg-yellow-500 text-black hover:bg-yellow-400 px-6 py-2 animate-pulse"
                    >
                      Call BINGO!
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ball Display and History */}
        <div className="space-y-6">
          {/* Current Ball */}
          <div className="bg-[#004d40]/50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-[#49EACB] mb-4 text-center">Current Ball</h3>
            <div className="flex justify-center">
              {currentBall ? (
                <motion.div
                  className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg ${
                    currentBallIsBomb ? "bg-black" : getBallColor(currentBall)
                  }`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  {currentBallIsBomb ? (
                    <Image src="/bingobomb.webp" alt="Bomb" width={52} height={52} />
                  ) : (
                    `${getColumnLetter(Math.floor((currentBall - 1) / 15))}-${currentBall}`
                  )}
                </motion.div>
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-500">
                  ?
                </div>
              )}
            </div>
          </div>

          {/* Ball History */}
          <div className="bg-[#004d40]/50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-[#49EACB] mb-4 text-center">
              Called Numbers ({drawnNumbers.length})
            </h3>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {drawnNumbers.map((number, index) => (
                <div
                  key={index}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                    drawnBombs.has(number) ? "bg-black" : getBallColor(number)
                  }`}
                >
                  {drawnBombs.has(number) ? <Image src="/bingobomb.webp" alt="Bomb" width={20} height={20} /> : number}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

