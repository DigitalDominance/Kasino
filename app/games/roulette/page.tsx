"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { RouletteControls } from "./roulette-controls";
import { RouletteGame } from "./roulette-game";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import "./styles.css";

export default function RoulettePage() {
  const { isConnected, connectWallet, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [gameResult, setGameResult] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [selectedBet, setSelectedBet] = useState<{ type: string; amount: number } | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    // Additional wallet checks if needed.
  }, []);

  const handleSpinRoulette = () => {
    if (!selectedBet) return;
    const bet = selectedBet.amount;
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    setGameResult(null);
    setWinAmount(null);
    setIsPlaying(true);
    setShowOverlay(false);
  };

  const handleGameEnd = (result: number, winAmt: number) => {
    setGameResult(result);
    setWinAmount(winAmt);
    setIsPlaying(false);
    setSelectedBet(null);
    // Show modal popup with result.
    setShowResultModal(true);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinAmount(null);
    setSelectedBet(null);
    setBetAmount("0.00");
    setShowOverlay(true);
    setShowResultModal(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-grow p-6">
        <div className="space-y-6">
          {/* Header */}
          <motion.div className="flex items-center justify-between mb-6">
            <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Link>
            <WalletConnection onConnect={connectWallet} isConnected={isConnected} />
          </motion.div>

          {/* Game Area */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div
              className="relative bg-[#49EACB]/5 border border-[#49EACB]/20 backdrop-blur-lg rounded-lg overflow-hidden"
              style={{ height: "700px" }}
            >
              {showOverlay && !isPlaying && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4">
                  <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 backdrop-blur-lg rounded-lg p-6 text-center">
                    <h2 className="text-4xl font-bold text-[#49EACB] mb-4">Roulette</h2>
                    <p className="text-lg text-white mb-6 max-w-md">
                      Place your bet, choose your bet type, and spin the wheel. The wheel will complete exactly three rotations to land on the winning number.
                    </p>
                    <p className="text-xl text-[#49EACB]">Place Bet to Start</p>
                  </div>
                </div>
              )}
              <div className="p-6 flex flex-col h-full">
                <div className="flex-grow flex items-center justify-center">
                  <RouletteGame
                    isPlaying={isPlaying}
                    betAmount={Number(betAmount)}
                    selectedBet={selectedBet}
                    onGameEnd={handleGameEnd}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <RouletteControls
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                isPlaying={isPlaying}
                isWalletConnected={isConnected}
                balance={balance}
                onSpinRoulette={handleSpinRoulette}
                gameResult={gameResult}
                winAmount={winAmount}
                selectedBet={selectedBet}
                setSelectedBet={setSelectedBet}
              />
              <LiveChat textColor="#49EACB" />
              <LiveWins textColor="#49EACB" />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* Result Modal Popup */}
      <AnimatePresence>
        {showResultModal && !isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
          >
            <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 backdrop-blur-lg rounded-lg p-6 text-center">
              {winAmount && winAmount > 0 ? (
                <h3 className="text-3xl font-bold text-green-500 mb-4">
                  You won {winAmount.toFixed(2)} KAS!
                </h3>
              ) : (
                <h3 className="text-3xl font-bold text-red-500 mb-4">
                  You lost your bet.
                </h3>
              )}
              <Button onClick={resetGame} className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
                Play Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
