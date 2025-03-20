"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { RouletteControls } from "./roulette-controls";
import { RouletteGame } from "./roulette-game";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Montserrat } from "next/font/google";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./styles.css";
// Import XPDisplay to integrate the XP level display into the nav
import { XPDisplay } from "@/app/page";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

function RouletteContent() {
  const { isConnected, balance, walletAddress } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [gameResult, setGameResult] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [selectedBet, setSelectedBet] = useState<{ type: string; amount: number } | null>(null);
  // New states for deposit TXID and backend game ID
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [generalGameId, setGeneralGameId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  // API URL for backend calls
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  // Treasury wallet addresses (for deposit) set as public env variables (addresses only)
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // When the user clicks to spin the roulette, we initiate a deposit transaction and start the game.
  const handleSpinRoulette = async () => {
    if (!selectedBet) return;
    const bet = selectedBet.amount;
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    // Reset previous game result and deposit txid.
    setGameResult(null);
    setWinAmount(null);
    try {
      // Generate a unique game hash.
      const uniqueHash = uuidv4();
      // Get the connected wallet address via kasware.
      const accounts = await window.kasware.getAccounts();
      const currentWalletAddress = accounts[0];
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      // Randomly pick one of the two treasury addresses for deposit.
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      // Send the deposit transaction.
      const depositTx = await window.kasware.sendKaspa(
        chosenTreasury,
        bet * 1e8,
        { priorityFee: 10000 }
      );
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Call backend API to start the general game.
      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "roulette",
        uniqueHash,
        walletAddress: currentWalletAddress,
        betAmount: bet,
        txid: txidString,
      });
      if (startRes.data.success) {
        setGeneralGameId(startRes.data.gameId);
      } else {
        alert("Failed to start game on backend");
        return;
      }
      // Start the roulette game.
      setIsPlaying(true);
      setShowOverlay(false);
    } catch (error: any) {
      console.error("Error starting game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  const handleGameEnd = async (result: number, winAmt: number) => {
    setGameResult(result);
    setWinAmount(winAmt);
    setIsPlaying(false);
    setSelectedBet(null);
    setShowResultModal(true);
    // Call backend API to end the game.
    if (generalGameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId: generalGameId,
          result: winAmt > 0 ? "win" : "lose",
          winAmount: winAmt || 0,
        });
      } catch (error) {
        console.error("Error ending game on backend:", error);
      }
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinAmount(null);
    setSelectedBet(null);
    setBetAmount("0.00");
    setShowOverlay(true);
    setShowResultModal(false);
    setDepositTxid(null);
    setGeneralGameId(null);
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        <div className="space-y-6">
          {/* Header */}
          <motion.div className="flex items-center justify-between mb-6">
            <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Link>
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* XPDisplay integrated into the nav */}
              <XPDisplay />
              <WalletConnection />
            </motion.div>
          </motion.div>

          {/* Display deposit TXID so the user can monitor their transaction */}
          {depositTxid && (
            <p className="mb-4 text-sm" style={{ color: "#B6B6B6" }}>
              Deposit TXID:{" "}
              <a
                className="txid-link"
                style={{
                  background: "linear-gradient(90deg, #B6B6B6, #49EACB)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                href={`https://kas.fyi/transaction/${depositTxid}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {depositTxid}
              </a>
            </p>
          )}

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

export default function RoulettePage() {
  return <RouletteContent />;
}
