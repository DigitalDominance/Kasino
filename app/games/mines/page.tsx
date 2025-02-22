"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Info, X } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "./live-chat";
import { LiveWins } from "./live-wins";
import { HowToPlay } from "./how-to-play";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet, WalletProvider } from "@/contexts/WalletContext";
import { useRouter } from "next/navigation";
import type { MinesGame, MinesTile } from "./mines-game";
import { initializeMinesGame, revealTile, calculatePayout } from "./mines-logic";
import { Bomb, Diamond } from "./icons";
import "./styles.css";
import Image from "next/image";
import { MinesControls } from "./mines-controls";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

function MinesContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [selectedMultiplier, setSelectedMultiplier] = useState(2);
  const [game, setGame] = useState<MinesGame | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // WalletContext handles wallet connection.
  }, []);

  const handleTileClick = async (index: number) => {
    if (!isConnected || isLoading || !game || game.isGameOver) {
      return;
    }
    setIsLoading(true);
    try {
      const updatedGame = await revealTile(game, index);
      const response = await fetch("/api/mines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateGame",
          gameData: updatedGame,
        }),
      });
      if (response.ok) {
        setGame(updatedGame);
        if (updatedGame.isGameOver) {
          setShowGameOver(true);
          await endGame(updatedGame);
        }
      } else {
        throw new Error("Failed to update game");
      }
    } catch (error) {
      console.error("Error revealing tile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewGame = async () => {
    const bet = Number.parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    try {
      const betInRawUnits = bet * Math.pow(10, 8);
      const newGame = initializeMinesGame(5, betInRawUnits);
      const response = await fetch("/api/mines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "startGame",
          gameData: newGame,
        }),
      });
      if (response.ok) {
        setGame(newGame);
        setIsPlaying(true);
        setShowGameOver(false);
      } else {
        throw new Error("Failed to start game");
      }
    } catch (error) {
      console.error("Failed to start new game:", error);
      setGame(null);
    }
  };

  const cashOut = async () => {
    if (!game) return;
    try {
      const payout = calculatePayout(game);
      const response = await fetch("/api/mines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "endGame",
          gameData: { ...game, isGameOver: true },
        }),
      });
      if (response.ok) {
        setGame(null);
        setGameResult("win");
        setWinAmount(payout);
        setShowGameOver(true);
      } else {
        throw new Error("Failed to cash out");
      }
    } catch (error) {
      console.error("Error cashing out:", error);
    }
  };

  const endGame = async (gameData: MinesGame) => {
    try {
      await fetch("/api/mines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "endGame",
          gameData,
        }),
      });
    } catch (error) {
      console.error("Error ending game:", error);
    }
  };

  const resetGameState = () => {
    setGame(null);
    setShowGameOver(false);
    setBetAmount("0.00");
    setGameResult(null);
    setWinAmount(null);
    setIsPlaying(false);
    router.refresh();
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        <div className="space-y-6">
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Games
              </Link>
            </motion.div>
            <WalletConnection />
          </header>

          {/* Game Area */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-[#49EACB]">Mines Game</h2>
                  <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                    <Info className="w-4 h-4 mr-2" />
                    How to Play
                  </Button>
                </div>
                {game ? (
                  <>
                    <div className="mb-4 flex justify-between items-center">
                      <span>Bet: {(game.betAmount / Math.pow(10, 8)).toFixed(8)} KAS</span>
                      <span>Multiplier: {game.currentMultiplier.toFixed(2)}x</span>
                      <Button onClick={cashOut} disabled={game.isGameOver}>
                        Cash Out ({game.currentMultiplier.toFixed(2)}x)
                      </Button>
                    </div>
                    <div className="grid grid-cols-5 gap-4 flex-grow">
                      {game.tiles.map((tile: MinesTile, index: number) => (
                        <Button
                          key={index}
                          onClick={() => handleTileClick(index)}
                          disabled={tile.revealed || isLoading || game.isGameOver}
                          className={`aspect-[2/1.5] w-full min-h-[160px] ${
                            tile.revealed
                              ? tile.type === "mine"
                                ? "bg-red-500"
                                : "bg-green-500"
                              : isLoading
                              ? "bg-[#003B2D]"
                              : "bg-[#003B2D] hover:bg-[#004D3B]"
                          }`}
                        >
                          {tile.revealed ? (
                            tile.type === "mine" ? (
                              <Bomb className="w-16 h-16" />
                            ) : (
                              <Diamond className="w-16 h-16" />
                            )
                          ) : isLoading ? (
                            <span className="animate-spin">⏳</span>
                          ) : null}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-2xl text-[#49EACB]">Place your bet and start a new game!</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Right-side Panel */}
            <div className="space-y-6">
              {!game && (
                <MinesControls
                  betAmount={betAmount}
                  setBetAmount={setBetAmount}
                  isPlaying={isPlaying}
                  isWalletConnected={isConnected}
                  balance={balance}
                  onStartGame={startNewGame}
                  selectedMultiplier={selectedMultiplier}
                  setSelectedMultiplier={setSelectedMultiplier}
                />
              )}
              <LiveChat textColor="#B6B6B6" />
              <LiveWins textColor="#49EACB" />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* Game Over Modal */}
      <AnimatePresence>
        {showGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full relative"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-[#49EACB] hover:bg-[#49EACB]/10"
                onClick={resetGameState}
              >
                <X className="h-4 w-4" />
              </Button>
              <h3 className="text-2xl font-bold text-[#49EACB] mb-4">Game Over</h3>
              <p className="mb-4 flex items-center justify-center text-white">
                {gameResult === "win" ? (
                  <>
                    <span className="text-xl">You won {winAmount?.toFixed(2)}</span>
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                      alt="KAS"
                      width={20}
                      height={20}
                      className="rounded-full ml-2"
                    />
                  </>
                ) : (
                  "You hit a mine! Better luck next time."
                )}
              </p>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={betAmount}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      setBetAmount(val.toString());
                    }}
                    placeholder="Enter bet amount"
                    className="bg-[#003B2D] border-[#49EACB]/10 text-white w-full rounded-md py-2 pl-10 pr-3"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                      alt="KAS"
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  </div>
                </div>
                <Button
                  onClick={startNewGame}
                  className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80 py-3"
                >
                  Play Again
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How to Play Modal */}
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full"
            >
              <HowToPlay onClose={() => setShowHowToPlay(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MinesPage() {
  return (
    <WalletProvider>
      <MinesContent />
    </WalletProvider>
  );
}
