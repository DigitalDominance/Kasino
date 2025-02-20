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
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import "./styles.css";

export default function CrashPage() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const handlePlaceBet = () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    // When starting a game, hide the How-to-Play and any win/loss modal.
    setShowHowToPlay(false);
    setModalVisible(false);
    setGameOver(false);
    setCrashPoint(null);
    setWinAmount(0);
    setIsPlaying(true);
    console.log("Bet placed, starting game");
  };

  const handleCashout = () => {
    if (isPlaying) {
      const multiplier = Number(autoCashout) || 1;
      const amount = Number(betAmount) * multiplier;
      setWinAmount(amount);
      setCrashPoint(multiplier);
      // Leave final frame visible.
      setIsPlaying(false);
      setGameOver(true);
      setModalVisible(true);
    }
  };

  const handleCashoutSuccess = (multiplier: number, amount: number) => {
    setCrashPoint(multiplier);
    setWinAmount(amount);
    setIsPlaying(false);
    setGameOver(true);
    setModalVisible(true);
  };

  const handleGameEnd = (result: number, winAmountParam: number) => {
    console.log("Game ended with result:", result, "and win amount:", winAmountParam);
    // When the game crashes, preserve the final (explosion) frame.
    setCrashPoint(result);
    setWinAmount(0);
    setIsPlaying(false);
    setGameOver(true);
    setModalVisible(true);
  };

  // We no longer auto-reset the game window on modal close.
  const hideModal = () => {
    setModalVisible(false);
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
            {/* Game Container – positioned relative so that the modal is centered within it */}
            <div
              className="relative bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden"
              style={{ height: "700px" }}
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-[#49EACB]">Crash Game</h2>
                  <button
                    className="text-[#49EACB] hover:underline"
                    onClick={() => setShowHowToPlay(true)}
                  >
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
              {/* Win/Loss Modal inside game container, offset 15% above center */}
              {modalVisible && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center z-50"
                  style={{ transform: "translateY(-15%)" }}
                >
                  <div className="bg-white/10 border border-white/20 backdrop-blur-lg p-6 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <img
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                        alt="KAS"
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span className="text-xl text-[#49EACB]">
                        {winAmount > 0
                          ? `You Won ${winAmount.toFixed(2)} KAS!`
                          : `You Lost ${Number(betAmount).toFixed(2)} KAS!`}
                      </span>
                    </div>
                    <Button
                      className="mt-4 w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                      onClick={hideModal}
                    >
                      Close
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Controls and other components – we pass hideModal to CrashControls to suppress its own modal */}
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
                resetGame={hideModal} // Not used to reset the game window here.
                gameOver={gameOver}
                crashPoint={crashPoint ?? 0}
                winAmount={winAmount}
                hideModal={true}
              />
              <LiveChat textColor="#49EACB" />
              <LiveWins textColor="#49EACB" />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* Full-page How-to-Play Modal – render only when no game is active */}
      {showHowToPlay && !isPlaying && !gameOver && (
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
            <Button
              onClick={() => setShowHowToPlay(false)}
              className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
            >
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
