"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Volume2, VolumeX } from "lucide-react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/contexts/WalletContext"
import { LiveChat } from "../mines/live-chat"
import { LiveWins } from "../mines/live-wins"

interface BingoCard {
  [key: number]: (number | string)[]
}

interface GameResult {
  success: boolean
  gameResult: string
  winAmount: number
  number?: number
}

export default function BingoGame() {
  const router = useRouter()
  const { isConnected } = useWallet()

  // Game state
  const [gameStarted, setGameStarted] = useState(false)
  const [gameId, setGameId] = useState("")
  const [serverSeedHash, setServerSeedHash] = useState("")
  const [bingoCard, setBingoCard] = useState<BingoCard>({})
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
  const [currentBall, setCurrentBall] = useState<number | null>(null)
  const [markedNumbers, setMarkedNumbers] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Betting state
  const [betAmount, setBetAmount] = useState(100)
  const [showInfo, setShowInfo] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

  // Sound effects
  const playSound = (soundName: string) => {
    if (!soundEnabled) return
    try {
      const audio = new Audio(`/${soundName}.mp3`)
      audio.volume = 0.3
      audio.play().catch(() => {})
    } catch (error) {
      console.log("Sound not available")
    }
  }

  const generateClientSeed = () => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }

  const handleStartGame = async () => {
    if (!isConnected) return

    setIsLoading(true)
    try {
      const clientSeed = generateClientSeed()
      const clientSeedHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientSeed))
      const hashArray = Array.from(new Uint8Array(clientSeedHash))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

      // Get wallet address and send transaction
      const accounts = await window.kasware.getAccounts()
      const walletAddress = accounts[0]

      const treasuryAddress =
        Math.random() > 0.5 ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1 : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2

      const txid = await window.kasware.sendKaspa({
        to: treasuryAddress,
        amount: Math.round(betAmount * 1e8),
      })

      // Show loading animation
      setIsLoading(true)

      // Call play API
      const response = await fetch(`${apiUrl}/api/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameName: "bingo",
          walletAddress,
          betAmount,
          clientSeed,
          clientSeedHash: hashHex,
          txid,
          nonce: Date.now(),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setGameId(data.gameId)
        setServerSeedHash(data.serverSeedHash)
        setBingoCard(data.card)
        setGameStarted(true)
        setDrawnNumbers([])
        setMarkedNumbers(new Set())
        setCurrentBall(null)
        playSound("card-sound")
      }
    } catch (error) {
      console.error("Error starting game:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrawBall = async () => {
    if (!gameId) return

    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          action: "draw",
        }),
      })

      const data = await response.json()
      if (data.success && data.number) {
        setCurrentBall(data.number)
        setDrawnNumbers((prev) => [...prev, data.number])

        // Check if this number is on our card
        let isOnCard = false
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 5; col++) {
            if (bingoCard[row] && bingoCard[row][col] === data.number) {
              setMarkedNumbers((prev) => new Set([...prev, data.number]))
              isOnCard = true
              break
            }
          }
        }

        playSound(isOnCard ? "win-sound" : "dice-roll")
      }
    } catch (error) {
      console.error("Error drawing ball:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCallBingo = async () => {
    if (!gameId) return

    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          action: "call",
        }),
      })

      const data = await response.json()
      if (data.success) {
        // 2 second delay before showing result
        setTimeout(() => {
          setResult({
            type: data.gameResult,
            amount: data.winAmount || 0,
            serverSeedHash,
            gameId,
          })
        }, 2000)

        if (data.gameResult === "win") {
          playSound("win-sound")
        } else {
          playSound("lose-sound")
        }
      }
    } catch (error) {
      console.error("Error calling bingo:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetGame = () => {
    setGameStarted(false)
    setGameId("")
    setServerSeedHash("")
    setBingoCard({})
    setDrawnNumbers([])
    setMarkedNumbers(new Set())
    setCurrentBall(null)
    setResult(null)
  }

  const checkForWinningPattern = () => {
    if (!bingoCard || Object.keys(bingoCard).length === 0) return false

    // Check rows
    for (let row = 0; row < 5; row++) {
      if (bingoCard[row] && bingoCard[row].every((cell) => cell === "FREE" || markedNumbers.has(cell as number))) {
        return true
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      let columnComplete = true
      for (let row = 0; row < 5; row++) {
        const cell = bingoCard[row] && bingoCard[row][col]
        if (cell !== "FREE" && !markedNumbers.has(cell as number)) {
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

      if (cell1 !== "FREE" && !markedNumbers.has(cell1 as number)) {
        diagonal1 = false
      }
      if (cell2 !== "FREE" && !markedNumbers.has(cell2 as number)) {
        diagonal2 = false
      }
    }

    return diagonal1 || diagonal2
  }

  const getBallColor = (number: number) => {
    if (number >= 1 && number <= 15) return "bg-blue-500"
    if (number >= 16 && number <= 30) return "bg-red-500"
    if (number >= 31 && number <= 45) return "bg-white text-black"
    if (number >= 46 && number <= 60) return "bg-green-500"
    if (number >= 61 && number <= 75) return "bg-yellow-500 text-black"
    return "bg-gray-500"
  }

  const getColumnLetter = (col: number) => {
    return ["B", "I", "N", "G", "O"][col]
  }

  if (isLoading && !gameStarted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Starting Bingo Game...</div>
          <div className="flex space-x-1 justify-center">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-[#49EACB] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/games")}
                className="text-[#49EACB] hover:bg-[#49EACB]/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Games
              </Button>
              <h1 className="text-3xl font-bold text-[#49EACB]">Bingo</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-[#49EACB] hover:bg-[#49EACB]/10"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Game Area */}
            <div className="lg:col-span-3">
              <Card className="bg-gradient-to-br from-[#49EACB]/10 to-[#49EACB]/5 border-[#49EACB]/20 p-8">
                {/* Pre-game Screen */}
                <div className="text-center">
                  <div className="mb-8">
                    <h2 className="text-4xl font-bold text-[#49EACB] mb-4">Welcome to Bingo!</h2>
                    <p className="text-xl text-gray-300 mb-6">Get a line, column, or diagonal to win 75x your bet!</p>
                  </div>

                  {/* Animated Bingo Balls */}
                  <div className="flex justify-center space-x-4 mb-8">
                    {[7, 23, 45, 52, 68].map((num, index) => (
                      <div
                        key={num}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${getBallColor(num)} animate-bounce shadow-lg`}
                        style={{ animationDelay: `${index * 0.2}s` }}
                      >
                        {num}
                      </div>
                    ))}
                  </div>

                  {/* Game Rules */}
                  <div className="bg-black/30 rounded-lg p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      <div>
                        <h3 className="text-lg font-semibold text-[#49EACB] mb-3">How to Play</h3>
                        <ul className="space-y-2 text-gray-300">
                          <li>• Place your bet and get a random Bingo card</li>
                          <li>• Draw balls one by one</li>
                          <li>• Mark matching numbers on your card</li>
                          <li>• Call "Bingo" when you complete a pattern</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#49EACB] mb-3">Winning Patterns</h3>
                        <ul className="space-y-2 text-gray-300">
                          <li>• Any complete row (5 in a row)</li>
                          <li>• Any complete column (5 in a column)</li>
                          <li>• Any complete diagonal (5 diagonally)</li>
                          <li>• Win 75x your bet amount!</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Bet Controls */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center space-x-4">
                      <Button
                        onClick={() => setBetAmount(Math.max(1, betAmount / 2))}
                        className="bg-[#49EACB]/20 text-[#49EACB] hover:bg-[#49EACB]/30"
                      >
                        ½
                      </Button>
                      <Button
                        onClick={() => setBetAmount(Math.max(1, betAmount - 10))}
                        className="bg-[#49EACB]/20 text-[#49EACB] hover:bg-[#49EACB]/30"
                      >
                        -10
                      </Button>
                      <div className="flex flex-col items-center">
                        <label className="text-sm text-gray-400 mb-1">Bet Amount</label>
                        <Input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(Math.max(1, Number.parseInt(e.target.value) || 1))}
                          className="w-32 text-center bg-black/50 border-[#49EACB]/30 text-white"
                          min="1"
                        />
                        <span className="text-xs text-gray-500 mt-1">KAS</span>
                      </div>
                      <Button
                        onClick={() => setBetAmount(betAmount + 10)}
                        className="bg-[#49EACB]/20 text-[#49EACB] hover:bg-[#49EACB]/30"
                      >
                        +10
                      </Button>
                      <Button
                        onClick={() => setBetAmount(betAmount * 2)}
                        className="bg-[#49EACB]/20 text-[#49EACB] hover:bg-[#49EACB]/30"
                      >
                        2×
                      </Button>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-2">
                        Potential Win: <span className="text-[#49EACB] font-bold">{betAmount * 75} KAS</span>
                      </div>
                      <Button
                        onClick={handleStartGame}
                        disabled={!isConnected || isLoading}
                        className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-8 py-3 text-lg font-bold"
                      >
                        {!isConnected ? "Connect Wallet to Play" : "Start Bingo Game"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <LiveChat />
              <LiveWins />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/games")}
              className="text-[#49EACB] hover:bg-[#49EACB]/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Games
            </Button>
            <h1 className="text-3xl font-bold text-[#49EACB]">Bingo</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Bet Amount</div>
              <div className="text-lg font-bold text-[#49EACB]">{betAmount} KAS</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-[#49EACB] hover:bg-[#49EACB]/10"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Game Area */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Bingo Card */}
              <div className="xl:col-span-2">
                <Card className="bg-gradient-to-br from-[#49EACB]/10 to-[#49EACB]/5 border-[#49EACB]/20 p-6">
                  <h3 className="text-xl font-bold text-[#49EACB] mb-4 text-center">Your Bingo Card</h3>

                  {/* Column Headers */}
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {["B", "I", "N", "G", "O"].map((letter) => (
                      <div key={letter} className="text-center font-bold text-[#49EACB] text-xl py-2">
                        {letter}
                      </div>
                    ))}
                  </div>

                  {/* Bingo Card Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }, (_, row) =>
                      Array.from({ length: 5 }, (_, col) => {
                        const cell = bingoCard[row] && bingoCard[row][col]
                        const isMarked = cell === "FREE" || markedNumbers.has(cell as number)
                        const isFree = cell === "FREE"

                        return (
                          <div
                            key={`${row}-${col}`}
                            className={`
                              aspect-square flex items-center justify-center rounded-lg border-2 text-lg font-bold relative
                              ${
                                isMarked
                                  ? "bg-[#49EACB]/20 border-[#49EACB] text-[#49EACB]"
                                  : "bg-black/50 border-gray-600 text-white"
                              }
                              ${isFree ? "bg-[#49EACB]/30" : ""}
                            `}
                          >
                            {isFree ? "FREE" : cell}
                            {isMarked && !isFree && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <img src="/kas-logo.png" alt="KAS" className="w-8 h-8 opacity-80" />
                              </div>
                            )}
                          </div>
                        )
                      }),
                    )}
                  </div>

                  {/* Game Controls */}
                  <div className="mt-6 flex justify-center space-x-4">
                    <Button
                      onClick={handleDrawBall}
                      disabled={isLoading}
                      className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 px-6 py-2"
                    >
                      {isLoading ? "Drawing..." : "Draw Ball"}
                    </Button>

                    {checkForWinningPattern() && (
                      <Button
                        onClick={handleCallBingo}
                        disabled={isLoading}
                        className="bg-yellow-500 text-black hover:bg-yellow-400 px-6 py-2 animate-pulse"
                      >
                        Call BINGO!
                      </Button>
                    )}
                  </div>
                </Card>
              </div>

              {/* Ball Display and History */}
              <div className="space-y-6">
                {/* Current Ball */}
                <Card className="bg-gradient-to-br from-[#49EACB]/10 to-[#49EACB]/5 border-[#49EACB]/20 p-6">
                  <h3 className="text-lg font-bold text-[#49EACB] mb-4 text-center">Current Ball</h3>
                  <div className="flex justify-center">
                    {currentBall ? (
                      <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl ${getBallColor(currentBall)} shadow-lg animate-bounce`}
                      >
                        {currentBall}
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-500">
                        ?
                      </div>
                    )}
                  </div>
                </Card>

                {/* Ball History */}
                <Card className="bg-gradient-to-br from-[#49EACB]/10 to-[#49EACB]/5 border-[#49EACB]/20 p-6">
                  <h3 className="text-lg font-bold text-[#49EACB] mb-4 text-center">
                    Called Numbers ({drawnNumbers.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {drawnNumbers.map((number, index) => (
                      <div
                        key={index}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getBallColor(number)}`}
                      >
                        {number}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <LiveChat />
            <LiveWins />
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="bg-gradient-to-br from-[#49EACB]/20 to-[#49EACB]/10 border-[#49EACB]/30 p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <h2 className={`text-3xl font-bold mb-4 ${result.type === "win" ? "text-[#49EACB]" : "text-red-400"}`}>
                {result.type === "win" ? "BINGO!" : "No Bingo"}
              </h2>

              {result.type === "win" ? (
                <div className="mb-6">
                  <div className="text-lg text-gray-300 mb-2">You won</div>
                  <div className="text-4xl font-bold text-[#49EACB]">{result.amount} KAS</div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="text-lg text-gray-300">Better luck next time!</div>
                </div>
              )}

              <div className="bg-black/30 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-400 mb-2">Provably Fair</div>
                <div className="text-xs text-gray-500 break-all">Game ID: {result.gameId}</div>
                <div className="text-xs text-gray-500 break-all">Server Seed Hash: {result.serverSeedHash}</div>
              </div>

              <Button onClick={resetGame} className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 w-full">
                Play Again
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
