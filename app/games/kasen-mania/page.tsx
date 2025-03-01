"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
//import "./styles.css";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

/* ---------------------------- Main Game Content --------------------------- */

function SlotsContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [selectedMultiplier, setSelectedMultiplier] = useState(2);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  // API URL and treasury addresses (set via env vars)
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  const handleRollSlots = async () => {
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
      // Generate a unique game hash
      const uniqueHash = uuidv4();
      // Get connected wallet address
      const accounts = await window.kasware.getAccounts();
      const currentWalletAddress = accounts[0];
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      // Randomly choose one treasury address
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      // Send deposit tx via Kasware
      const depositTx = await window.kasware.sendKaspa(
        chosenTreasury,
        bet * 1e8,
        { priorityFee: 10000 }
      );
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Call backend API to start the game (using gameName "slots")
      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "slots",
        uniqueHash,
        walletAddress: currentWalletAddress,
        betAmount: bet,
        txid: txidString,
      });
      if (startRes.data.success) {
        setGameId(startRes.data.gameId);
      } else {
        alert("Failed to start game on backend");
        return;
      }
      setIsPlaying(true);
    } catch (error: any) {
      console.error("Error starting game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  const handleGameEnd = async (result: string, winAmt: number) => {
    setGameResult(result);
    setWinAmount(winAmt);
    setIsPlaying(false);
    // End the game on backend and disperse prize if applicable
    if (gameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: result === "You Win" ? "win" : "lose",
          winAmount: winAmt,
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
    setGameId(null);
    setDepositTxid(null);
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <WalletConnection />
          </motion.div>
        </header>

        {/* Display deposit TXID for user monitoring */}
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
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">KASEN MANIA</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                  How to Play
                </Button>
              </div>
              <div className="relative aspect-[16/9] bg-[#49EACB]/5 rounded-lg mb-6 overflow-hidden p-4">
                <SlotsGame
                  isPlaying={isPlaying}
                  onGameEnd={handleGameEnd}
                  betAmount={Number(betAmount)}
                  selectedMultiplier={selectedMultiplier}
                />
              </div>
            </div>
          </Card>
          <div className="space-y-6">
            <SlotsControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              balance={balance}
              onRollSlots={handleRollSlots}
              resetGame={resetGame}
              gameResult={gameResult}
              winAmount={winAmount}
              selectedMultiplier={selectedMultiplier}
              setSelectedMultiplier={setSelectedMultiplier}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        {/* Kasen Collab Promo & How To Play Cards */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
            <motion.h2
              className="text-2xl font-bold mb-4 text-transparent bg-clip-text"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              style={{
                backgroundImage: "linear-gradient(270deg, #600000, #FF0000, #FF7373)",
                backgroundSize: "200% 200%",
              }}
            >
              KASEN Mania
            </motion.h2>
            <img src="/placeholder.svg" alt="Kasen Collab" className="w-1/2 h-auto mb-4" />
            <p className="text-sm text-white mb-4">
              This game is a collaborative effort with KASEN, a pioneer in KRC721 & KRC20. Their creative vision and innovative approach have added extra fun to our casino experience.
            </p>
            <div className="flex justify-center space-x-4 text-xl">
              {/* Social icons can be added here */}
            </div>
          </Card>

          <Card className="bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-4">
            <h2 className="text-xl font-bold text-[#49EACB] mb-2">How to Play</h2>
            <ol className="list-decimal list-inside text-sm text-white space-y-1">
              <li>Connect your wallet.</li>
              <li>Deposit credits with Kasware.</li>
              <li>Place your bet and select a multiplier.</li>
              <li>Spin the slots and win if the middle row symbols match.</li>
            </ol>
          </Card>
        </div>
      </div>
      <SiteFooter />

      {/* How To Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Slots</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount.</li>
              <li>Select a multiplier (2x, 5x, or 10x).</li>
              <li>Click "Spin Slots" to start the game.</li>
              <li>The reels will spin and display random symbols.</li>
              <li>If all symbols in the middle row match, you win!</li>
            </ol>
            <p className="mt-4 text-white">Good luck and may the reels favor you!</p>
            <Button onClick={() => setShowHowToPlay(false)} className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Slots Game ------------------------------ */

interface SlotsGameProps {
  isPlaying: boolean;
  onGameEnd: (result: string, winAmt: number) => void;
  betAmount: number;
  selectedMultiplier: number;
}

export function SlotsGame({ isPlaying, onGameEnd, betAmount, selectedMultiplier }: SlotsGameProps) {
  // A 3x5 grid representing the slot machine. Each cell is a number (0–7) representing one of 8 features.
  const [grid, setGrid] = useState<number[][]>([ [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0] ]);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    let spinInterval: NodeJS.Timeout;
    if (isPlaying) {
      setSpinning(true);
      setShowResult(false);
      // Start updating the grid every 100ms to simulate spinning
      spinInterval = setInterval(() => {
        setGrid(
          Array.from({ length: 3 }, () =>
            Array.from({ length: 5 }, () => Math.floor(Math.random() * 8))
          )
        );
      }, 100);

      // Stop spinning after 3 seconds and set final grid
      setTimeout(() => {
        clearInterval(spinInterval);
        const finalGrid = Array.from({ length: 3 }, () =>
          Array.from({ length: 5 }, () => Math.floor(Math.random() * 8))
        );
        setGrid(finalGrid);
        setSpinning(false);
        // Check win condition: if all symbols in the middle row match
        const middleRow = finalGrid[1];
        const win = middleRow.every(symbol => symbol === middleRow[0]);
        const result = win ? "You Win" : "House Wins";
        const winAmt = win ? betAmount * selectedMultiplier : 0;
        setShowResult(true);
        onGameEnd(result, winAmt);
      }, 3000);
    }
    return () => clearInterval(spinInterval);
  }, [isPlaying]);

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      {/* Girl image placeholder at the top */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Image src="/placeholder.svg" alt="Girl Placeholder" width={100} height={100} />
      </div>
      {/* "KASEN MANIA" title above the reels */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
        <h2 className="text-3xl font-bold text-[#49EACB]">KASEN MANIA</h2>
      </div>
      {/* The slots grid: 3 rows x 5 columns */}
      <div className="mt-20 grid grid-cols-5 grid-rows-3 gap-2">
        {grid.flat().map((symbol, idx) => (
          <div key={idx} className="w-16 h-16 bg-[#49EACB]/20 flex items-center justify-center rounded">
            <Image src="/placeholder.svg" alt={`Symbol ${symbol}`} width={40} height={40} />
          </div>
        ))}
      </div>
      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          {/* The result text is set via onGameEnd */}
          <h3 className="text-3xl font-bold text-[#49EACB] mb-4">{/* Result displayed in controls */}</h3>
          <Button
            onClick={() => {
              setShowResult(false);
            }}
            className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 text-xl px-8 py-3"
          >
            Play Again
          </Button>
        </motion.div>
      )}
    </div>
  );
}

/* ---------------------------- Slots Controls ---------------------------- */

interface SlotsControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onRollSlots: () => void;
  resetGame: () => void;
  gameResult: string | null;
  winAmount: number | null;
  selectedMultiplier: number;
  setSelectedMultiplier: (multiplier: number) => void;
}

export function SlotsControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onRollSlots,
  resetGame,
  gameResult,
  winAmount,
  selectedMultiplier,
  setSelectedMultiplier,
}: SlotsControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Auto-dismiss error alert after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const intervalId = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  const showError = (msg: string) => {
    setErrorMessage(msg);
  };

  const handleSpinSlots = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet)) {
      showError("Invalid bet amount");
      return;
    }
    if (bet < 1 || bet > 1000) {
      showError("Bet amount must be between 1 and 1000");
      return;
    }
    if (bet > balance) {
      showError("Insufficient balance");
      return;
    }
    onRollSlots();
    setCooldown(10);
  };

  return (
    <>
      <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Bet Amount</label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (isNaN(value)) value = 1;
                  // Ensure bet is between 1 and 1000
                  value = Math.max(1, Math.min(1000, value));
                  setBetAmount(value.toString());
                }}
                className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8 w-full"
                placeholder="0.00"
                disabled={isPlaying || !isWalletConnected}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <Image src="/placeholder.svg" alt="KAS" width={16} height={16} className="rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => {
                  let current = Number(betAmount);
                  if (isNaN(current)) current = 1;
                  setBetAmount((current / 2).toString());
                }}
                disabled={isPlaying || !isWalletConnected}
              >
                ½
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => {
                  let current = Number(betAmount);
                  if (isNaN(current)) current = 1;
                  setBetAmount((current * 2).toString());
                }}
                disabled={isPlaying || !isWalletConnected}
              >
                2×
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount("1")}
                disabled={isPlaying || !isWalletConnected}
              >
                Min
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(Math.min(1000, balance).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Max
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Multiplier</label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 5, 10].map((multiplier) => (
                <Button
                  key={multiplier}
                  variant={selectedMultiplier === multiplier ? "default" : "outline"}
                  className={`border-[#49EACB]/10 ${
                    selectedMultiplier === multiplier
                      ? "bg-[#49EACB] text-black"
                      : "hover:bg-[#49EACB]/10"
                  }`}
                  onClick={() => setSelectedMultiplier(multiplier)}
                  disabled={isPlaying || !isWalletConnected}
                >
                  {multiplier}x
                </Button>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult !== null && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">
                  Result: {gameResult}
                </div>
                {winAmount !== null && winAmount > 0 ? (
                  <div className="text-xl text-green-500">
                    You won {winAmount.toFixed(8)} KAS!
                  </div>
                ) : (
                  <div className="text-xl text-red-500">You lost your bet.</div>
                )}
              </div>
            )}
            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleSpinSlots}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Spin Slots (${cooldown}s)`
                  : "Spin Slots"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                Spinning...
              </Button>
            )}
          </motion.div>
        </div>
      </Card>
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-4 left-4 bg-gradient-to-r from-red-700 to-black text-white px-4 py-2 rounded shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-4 font-bold text-white">
                X
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------ Main Page Export ------------------------ */

export default function KasenManiaSlotsPage() {
  return <SlotsContent />;
}
