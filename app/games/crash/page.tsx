"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { CrashGame } from "./crash-game";
import { CrashControls } from "./crash-controls";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/contexts/walletContext";
import "./styles.css";

export default function CrashPage() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);

  const handlePlaceBet = () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    setGameOver(false);
    setCrashPoint(null);
    setIsPlaying(true);
    console.log("Bet placed, starting game");
  };

  const handleCashout = () => {
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  const handleCashoutSuccess = (multiplier: number, amount: number) => {
    setGameOver(true);
    setCrashPoint(multiplier);
    setIsPlaying(false);
  };

  const handleGameEnd = (result: number, winAmount: number) => {
    console.log("Game ended with result:", result, "and win amount:", winAmount);
    setIsPlaying(false);
    setGameOver(true);
    setCrashPoint(result);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setCrashPoint(null);
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
            <WalletConnection />
          </motion.div>

          {/* Game Area */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden" style={{ height: "700px" }}>
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-[#49EACB]">Crash Game</h2>
                  <button className="text-[#49EACB] hover:underline" onClick={() => setShowHowToPlay(true)}>
                    <Info className="w-4 h-4 mr-2" />
                    How to Play
                  </button>
                </div>
                <div className="flex-grow relative bg-transparent rounded-lg mb-6" style={{ height: "100%" }}>
                  <CrashGame
                    isPlaying={isPlaying}
                    betAmount={Number(betAmount)}
                    autoCashOut={Number(autoCashout)}
                    onGameEnd={handleGameEnd}
                    onCashoutSuccess={handleCashoutSuccess}
                    onManualCashout={handleCashout}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <CrashControls
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                autoCashout={autoCashout}
                setAutoCashout={setAutoCashout}
                isPlaying={isPlaying}
                isWalletConnected={isConnected}
                balance={balance}
                onPlaceBet={handlePlaceBet}
                onCashout={handleCashout}
                resetGame={resetGame}
                gameOver={gameOver}
                crashPoint={crashPoint ?? 0}
              />
              <LiveChat textColor="#49EACB" />
              <LiveWins textColor="#49EACB" />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Crash</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount and optional auto-cashout multiplier.</li>
              <li>Click "Place Bet" to start the game.</li>
              <li>Watch the multiplier increase as the rocket flies higher.</li>
              <li>Click "Cash Out" to secure your winnings before the rocket crashes.</li>
              <li>If you don't cash out before the crash, you lose your bet.</li>
            </ol>
            <p className="mt-4 text-white">
              The longer you wait, the higher the potential payout, but also the higher the risk!
            </p>
            <Button onClick={() => setShowHowToPlay(false)} className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
