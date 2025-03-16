"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// ---------------------------------------------------------
// Constants & Asset Paths
// ---------------------------------------------------------
const MIN_BET = 1;
const MAX_BET = 1000;
const WIN_PROBABILITY = 0.30; // 30% chance per level (house advantage of ~10% vs fair)
const PLACEHOLDER_IMG = "/placeholder.svg";
const WIN_IMG = "/kaspa-token-logo.svg";
const LOSE_IMG = "/red-x-icon.svg";

// Total rows to display in the tower view (finished + active + locked)
const TOTAL_ROWS = 10;

// ---------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------
export default function KaspaTowerClimbPage() {
  return <TowerClimbContent />;
}

function TowerClimbContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [levels, setLevels] = useState<
    { chosenIndex: number; outcome: "win" | "lose" }[]
  >([]);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Start the game by deducting the chosen bet and calling your backend.
  const handleStartGame = async () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }
    try {
      const uniqueHash = uuidv4();
      const accounts = await window.kasware.getAccounts();
      const currentWalletAddress = accounts[0];
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      const chosenTreasury =
        Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      const depositTx = await window.kasware.sendKaspa(
        chosenTreasury,
        bet * 1e8,
        { priorityFee: 10000 }
      );
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Start game on backend with gameName "Kaspa Tower Climb"
      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "Kaspa Tower Climb",
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
      setLevels([]); // reset tower
      setGameResult(null);
    } catch (error: any) {
      console.error("Error starting Kaspa Tower Climb:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Handle a block click on the active row.
  const handleBlockClick = (blockIndex: number) => {
    if (!isPlaying) return;

    // Determine outcome using win probability.
    const outcome = Math.random() < WIN_PROBABILITY ? "win" : "lose";
    setLevels((prev) => [...prev, { chosenIndex: blockIndex, outcome }]);

    // If the player loses, end the game.
    if (outcome === "lose") {
      setGameResult("Game Over");
      if (gameId) {
        axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: "lose",
          winAmount: 0,
        });
      }
      setIsPlaying(false);
    }
  };

  // Allow the player to cash out (claim winnings) based on levels reached.
  const handleCashOut = async () => {
    const bet = Number(betAmount);
    const levelCount = levels.length;
    // For example, payout multiplier = 1 + (number of levels won)
    const payout = bet * (1 + levelCount);
    setGameResult("Cashed Out");
    if (gameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: "win",
          winAmount: payout,
        });
      } catch (error) {
        console.error("Error ending game on backend:", error);
      }
    }
    setIsPlaying(false);
  };

  // Reset the game.
  const resetGame = () => {
    setIsPlaying(false);
    setLevels([]);
    setGameResult(null);
    setGameId(null);
    setDepositTxid(null);
  };

  // Cooldown timer for starting a new game.
  useEffect(() => {
    if (cooldown > 0) {
      const intervalId = setInterval(
        () => setCooldown((prev) => prev - 1),
        1000
      );
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <WalletConnection />
          </motion.div>
        </header>

        {/* Deposit TXID */}
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

        {/* Main Game & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspa Tower Climb</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>
              <div className="w-full max-w-md mx-auto">
                <KaspaTowerClimbGame
                  levels={levels}
                  onBlockClick={handleBlockClick}
                  isActive={isPlaying && gameResult === null}
                />
              </div>
              {levels.length > 0 && isPlaying && (
                <motion.div className="mt-4">
                  <Button
                    onClick={handleCashOut}
                    className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                  >
                    Cash Out (Payout: {Number(betAmount) * (1 + levels.length)} KAS)
                  </Button>
                </motion.div>
              )}
            </div>
          </Card>

          <KaspaTowerClimbControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            isPlaying={isPlaying}
            isWalletConnected={isConnected}
            balance={balance}
            onStartGame={() => {
              handleStartGame();
              setCooldown(10);
            }}
            gameResult={gameResult}
            cooldown={cooldown}
          />
        </div>

        {/* Promo / Info Card */}
        <Card className="mt-6 w-full bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #49EACB, #00FFFF, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Kaspa Tower Climb
          </motion.h2>
          <img src="/towerpromo.png" alt="Tower Climb Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Climb the tower one level at a time. Each successful level increases your payout,
            but one wrong move ends the climb!
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a
              href="https://x.com/KasenOnKaspa"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#49EACB] hover:text-[#49EACB]/80"
            >
              <FaTwitter />
            </motion.a>
            <motion.a
              href="https://t.co/W4YDM1cUpY"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#49EACB] hover:text-[#49EACB]/80"
            >
              <FaTelegramPlane />
            </motion.a>
            <motion.a
              href="https://kasenonkas.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#49EACB] hover:text-[#49EACB]/80"
            >
              <FaGlobe />
            </motion.a>
          </div>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}

// ---------------------------------------------------------
// Kaspa Tower Climb Game Component
// ---------------------------------------------------------
//
// The tower is rendered as a vertical stack (from bottom up). The finished rows (levels) are
// displayed at full opacity, the active row (at the bottom) is interactive,
// and the rows above (locked) are shown with reduced opacity.
interface KaspaTowerClimbGameProps {
  levels: { chosenIndex: number; outcome: "win" | "lose" }[];
  onBlockClick: (blockIndex: number) => void;
  isActive: boolean;
}

function KaspaTowerClimbGame({ levels, onBlockClick, isActive }: KaspaTowerClimbGameProps) {
  // Calculate the number of locked (unvisited) rows.
  const finishedCount = levels.length;
  const activeRow = isActive ? 1 : 0;
  const lockedCount = TOTAL_ROWS - finishedCount - activeRow;

  // Build rows: finished levels, then active row, then locked rows.
  // We display them bottom-up so the active row is at the bottom.
  const finishedRows = levels; // each finished row holds its chosen outcome.
  const activeRowPlaceholder = null; // null indicates active (clickable) row.
  const lockedRows = Array.from({ length: lockedCount }, () => "locked");

  // Combine rows so that the bottom row is active.
  const allRows = [...finishedRows, activeRowPlaceholder, ...lockedRows];

  // When rendering, we use flex-col-reverse so the bottom row is at the bottom.
  return (
    <div className="flex flex-col-reverse gap-2">
      {allRows.map((row, index) => {
        // Determine row type: finished, active, or locked.
        let rowType: "finished" | "active" | "locked";
        if (index < finishedRows.length) {
          rowType = "finished";
        } else if (index === finishedRows.length && isActive) {
          rowType = "active";
        } else {
          rowType = "locked";
        }
        return (
          <div key={index} className={`flex justify-center gap-2 transition-opacity duration-500 ${
            rowType === "locked" ? "opacity-40" : "opacity-100"
          }`}>
            {Array.from({ length: 3 }).map((_, colIndex) => {
              let imgSrc = PLACEHOLDER_IMG;
              let clickable = rowType === "active";
              // For finished rows, reveal the chosen block's outcome.
              if (rowType === "finished" && row !== null) {
                if (colIndex === row.chosenIndex) {
                  imgSrc = row.outcome === "win" ? WIN_IMG : LOSE_IMG;
                }
              }
              return (
                <motion.div
                  key={colIndex}
                  className="w-20 h-20 cursor-pointer border border-gray-700 rounded-md overflow-hidden"
                  whileTap={{ scale: clickable ? 0.9 : 1 }}
                  onClick={() => {
                    if (clickable) {
                      onBlockClick(colIndex);
                    }
                  }}
                >
                  <Image src={imgSrc} alt="block" width={80} height={80} />
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------
// Kaspa Tower Climb Controls Component
// ---------------------------------------------------------
interface KaspaTowerClimbControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  gameResult: string | null;
  cooldown: number;
}

function KaspaTowerClimbControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  gameResult,
  cooldown,
}: KaspaTowerClimbControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (cooldown > 0) {
      const intervalId = setInterval(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  const showError = (msg: string) => setErrorMessage(msg);

  const handleStartClick = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      showError(`Bet must be between ${MIN_BET} and ${MAX_BET}`);
      return;
    }
    if (bet > balance) {
      showError("Insufficient balance");
      return;
    }
    onStartGame();
  };

  return (
    <>
      <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Bet Amount (KAS)</label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (isNaN(value)) value = MIN_BET;
                  value = Math.max(MIN_BET, Math.min(MAX_BET, value));
                  setBetAmount(value.toString());
                }}
                className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8 w-full"
                placeholder="0.00"
                disabled={isPlaying || !isWalletConnected}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                  alt="KAS"
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => {
                  let current = Number(betAmount);
                  if (isNaN(current)) current = MIN_BET;
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
                  if (isNaN(current)) current = MIN_BET;
                  setBetAmount((current * 2).toString());
                }}
                disabled={isPlaying || !isWalletConnected}
              >
                2×
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(MIN_BET.toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Min
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(Math.min(MAX_BET, balance).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Max
              </Button>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult !== null && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">
                  Result: {gameResult}
                </div>
              </div>
            )}
            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleStartClick}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Start Game (${cooldown}s)`
                  : "Start Kaspa Tower Climb"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                Game in Progress...
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
