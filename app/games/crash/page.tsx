"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Info, X } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { CrashGame } from "./crash-game";
import { CrashControls } from "./crash-controls";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
// Import XPDisplay the same way as in other games
import { XPDisplay } from "@/app/page";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Montserrat } from "next/font/google";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./styles.css";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

function CrashContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  // New states for deposit TXID and backend general game ID
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [generalGameId, setGeneralGameId] = useState<string | null>(null);
  // State to control the overlay; default to true.
  const [showOverlay, setShowOverlay] = useState(true);

  // API URL for backend calls
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  // Treasury wallet addresses from public env variables (addresses only)
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Helper: Retrieve the connected wallet address via kasware.
  const getConnectedAddress = useCallback(async () => {
    try {
      const accounts = await window.kasware.getAccounts();
      return accounts[0];
    } catch (err) {
      console.error("Error fetching connected account:", err);
      return null;
    }
  }, []);

  // Handle placing a bet and starting the Crash game.
  const handlePlaceBet = async () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }
    try {
      // Generate a unique game identifier.
      const uniqueHash = uuidv4();
      // Retrieve connected wallet address.
      const currentWalletAddress = await getConnectedAddress();
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      // Randomly select one treasury address.
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      // Send deposit transaction.
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
        gameName: "crash",
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
      // Start the Crash game.
      setShowHowToPlay(false);
      setModalVisible(false);
      setGameOver(false);
      setCrashPoint(null);
      setWinAmount(0);
      setIsPlaying(true);
      console.log("Bet placed, starting game");
    } catch (error: any) {
      console.error("Error starting game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Handle cash out.
  const handleCashout = () => {
    if (isPlaying) {
      const m = currentMultiplier;
      const amount = Number(betAmount) * m;
      setWinAmount(amount);
      setCrashPoint(m);
      setIsPlaying(false);
      setGameOver(true);
      setModalVisible(true);
      // End the game on backend.
      if (generalGameId) {
        axios.post(`${apiUrl}/game/end`, {
          gameId: generalGameId,
          result: "win",
          winAmount: amount,
        }).catch((error) => console.error("Error ending game on backend:", error));
      }
    }
  };

  // Handle game end (if auto-crash, etc.).
  const handleGameEnd = (result: number, winAmt: number) => {
    console.log("Game ended with result:", result, "and win amount:", winAmt);
    setCrashPoint(result);
    setWinAmount(winAmt);
    setIsPlaying(false);
    setGameOver(true);
    setModalVisible(true);
    // End game on backend.
    if (generalGameId) {
      axios.post(`${apiUrl}/game/end`, {
        gameId: generalGameId,
        result: winAmt > 0 ? "win" : "lose",
        winAmount: winAmt || 0,
      }).catch((error) => console.error("Error ending game on backend:", error));
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setCrashPoint(null);
    setWinAmount(0);
    setModalVisible(false);
    setCurrentMultiplier(1);
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

          {/* Display deposit TXID */}
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
              className="relative bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden"
              style={{ height: "700px" }}
            >
              {showOverlay && !isPlaying && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/50 backdrop-blur-3xl">
                  <div className="bg-[#49EACB] bg-opacity-70 border border-[#49EACB] rounded-lg p-6 text-center shadow-xl">
                    <h2 className="text-4xl font-bold text-black mb-4">Crash</h2>
                    <p className="text-lg text-black mb-6 max-w-md">
                      Place your bet. The game will run until you cash out but if you wait too long, you lose your bet.
                    </p>
                    <p className="text-xl font-semibold text-black">Place Bet to Start</p>
                  </div>
                </div>
              )}
              <div className="p-6 flex flex-col h-full">
                <div className="flex-grow relative bg-transparent rounded-lg mb-6">
                  <CrashGame
                    isPlaying={isPlaying}
                    betAmount={Number(betAmount)}
                    onGameEnd={handleGameEnd}
                    onCashoutSuccess={handleCashout}
                    onManualCashout={handleCashout}
                    onMultiplierChange={setCurrentMultiplier}
                  />
                </div>
              </div>
            </div>

            {/* Right-side Panel */}
            <div className="space-y-6">
              <CrashControls
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                isPlaying={isPlaying}
                isWalletConnected={isConnected}
                balance={balance}
                onPlaceBet={handlePlaceBet}
                onCashout={handleCashout}
                resetGame={resetGame}
                gameOver={gameOver}
                crashPoint={crashPoint ?? 0}
                winAmount={winAmount}
                hideModal={true}
                currentMultiplier={currentMultiplier}
              />
              <LiveChat textColor="#B6B6B6" />
              <LiveWins textColor="#49EACB" />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* How to Play Modal */}
      <AnimatePresence>
        {showHowToPlay && !isPlaying && !gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-3xl"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#49EACB] bg-opacity-100 border border-[#49EACB] rounded-lg p-6 max-w-md w-full z-50"
            >
              <HowToPlay onClose={() => setShowHowToPlay(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal Popup */}
      <AnimatePresence>
        {modalVisible && !isPlaying && (
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

export default function CrashPage() {
  return <CrashContent />;
}
