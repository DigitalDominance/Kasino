"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  const [showHowToPlay, setShowHowToPlay] = useState(true);

  useEffect(() => {
    // Any additional wallet checks can be placed here.
  }, []);

  const handleSpinRoulette = () => {
    if (!selectedBet) return;
    const bet = selectedBet.amount;
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    // Deduct bet amount (or update after transaction).
    setGameResult(null);
    setWinAmount(null);
    setIsPlaying(true);
    // Hide the overlay once the game starts.
    setShowHowToPlay(false);
  };

  const handleGameEnd = (result: number, winAmount: number) => {
    setGameResult(result);
    setWinAmount(winAmount);
    setIsPlaying(false);
    if (winAmount > 0) {
      // Update balance if needed.
    }
    setSelectedBet(null);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinAmount(null);
    setSelectedBet(null);
    setBetAmount("0.00");
    // Optionally, show the How to Play overlay again.
    setShowHowToPlay(true);
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
            <div className="relative bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm rounded-lg overflow-hidden" style={{ height: "700px" }}>
              {showHowToPlay && !isPlaying && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 p-4">
                  <h2 className="text-4xl font-bold text-[#49EACB] mb-4">Roulette</h2>
                  <p className="text-lg text-white mb-6 text-center max-w-md">
                    Place your bet, choose your bet type, and spin the wheel. If the wheel lands on your selection, you win!
                  </p>
                  <Button
                    className="w-full max-w-xs bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                    onClick={handleSpinRoulette}
                    disabled={!isConnected || !selectedBet}
                  >
                    {isConnected ? "Place Bet to Start" : "Connect Wallet to Play"}
                  </Button>
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

      {/* Optionally, you can add a "How to Play" modal here if needed */}
    </div>
  );
}
