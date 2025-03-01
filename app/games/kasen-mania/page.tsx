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
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";
//import "./styles.css";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

function SlotsContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
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
      // Generate a unique game hash and get the current wallet address.
      const uniqueHash = uuidv4();
      const accounts = await window.kasware.getAccounts();
      const currentWalletAddress = accounts[0];
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      // Randomly choose one treasury address.
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      // Send deposit transaction via Kasware.
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, { priorityFee: 10000 });
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Start the game on the backend.
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
    // End the game on the backend.
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
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <WalletConnection />
          </motion.div>
        </header>

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

        {/* Main Game and Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">KASEN MANIA</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                  How to Play
                </Button>
              </div>
              {/* Slot machine container with a deep‑red background */}
              <div className="relative h-[70vh] bg-gradient-to-b from-[#600000] to-[#FF0000] rounded-lg mb-6 overflow-hidden p-4 border border-gray-600 shadow-2xl">
                <SlotsGame isPlaying={isPlaying} onGameEnd={handleGameEnd} betAmount={Number(betAmount)} />
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
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        {/* Kasen Promo Card with Social Links (full width) */}
        <Card className="mt-6 w-full bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
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
            This game is a collaborative effort with KASEN, a pioneer in KRC721 &amp; KRC20. Their creative vision and innovative approach have added extra fun to our casino experience.
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              <FaTwitter />
            </motion.a>
            <motion.a
              href="https://telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              <FaTelegramPlane />
            </motion.a>
            <motion.a
              href="https://example.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              <FaGlobe />
            </motion.a>
          </div>
        </Card>
      </div>
      <SiteFooter />

      {/* How To Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Slots</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount.</li>
              <li>Click "Spin Slots" to start the game.</li>
              <li>The reels will spin as each column scrolls vertically.</li>
              <li>The game checks several paylines and awards payouts based on matching patterns.</li>
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

interface SlotsGameProps {
  isPlaying: boolean;
  onGameEnd: (result: string, winAmt: number) => void;
  betAmount: number;
}

export function SlotsGame({ isPlaying, onGameEnd, betAmount }: SlotsGameProps) {
  // We'll generate a final 5x5 grid outcome when the spin ends.
  const [finalGrid, setFinalGrid] = useState<number[][] | null>(null);
  const [spinning, setSpinning] = useState(false);

  // Define paylines for a 5×5 grid.
  const payLines = [
    { positions: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]], multiplier: 2 }, // Middle horizontal
    { positions: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], multiplier: 2 }, // Top horizontal
    { positions: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]], multiplier: 2 }, // Bottom horizontal
    { positions: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]], multiplier: 3 }, // Diagonal TL-BR
    { positions: [[4, 0], [3, 1], [2, 2], [1, 3], [0, 4]], multiplier: 3 }, // Diagonal BL-TR
    // Rare bonus: if the entire grid shows the same symbol.
    { positions: "all", multiplier: 20 }
  ];

  // Array of eight distinct symbol images.
  const symbolImages = [
    "/placeholder.svg",
    "/placeholder2.svg",
    "/placeholder3.svg",
    "/placeholder4.svg",
    "/placeholder5.svg",
    "/placeholder6.svg",
    "/placeholder7.svg",
    "/placeholder8.svg"
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      setSpinning(true);
      setFinalGrid(null);
      // After 3 seconds, generate the final outcome for the 5×5 grid.
      timer = setTimeout(() => {
        const grid = Array.from({ length: 5 }, () =>
          Array.from({ length: 5 }, () => Math.floor(Math.random() * 8))
        );
        setFinalGrid(grid);
        setSpinning(false);
        // Evaluate paylines.
        let totalMultiplier = 0;
        if (grid) {
          payLines.forEach((line) => {
            if (line.positions === "all") {
              const firstSymbol = grid[0][0];
              const allSame = grid.every((row) => row.every((cell) => cell === firstSymbol));
              if (allSame) totalMultiplier += line.multiplier;
            } else {
              const [firstRow, firstCol] = line.positions[0];
              const symbol = grid[firstRow][firstCol];
              const isWinningLine = line.positions.every(([r, c]) => grid[r][c] === symbol);
              if (isWinningLine) totalMultiplier += line.multiplier;
            }
          });
          // Additional bonus: if the center column (col 2) is uniform.
          const centerCol = grid.map(row => row[2]);
          if (centerCol.every(sym => sym === centerCol[0])) {
            totalMultiplier += 5;
          }
        }
        const result = totalMultiplier > 0 ? "You Win" : "House Wins";
        const winAmt = totalMultiplier > 0 ? betAmount * totalMultiplier : 0;
        onGameEnd(result, winAmt);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying]);

  // Reel component: each column spins as a unit.
  const Reel = ({ isSpinning, finalSymbols }: { isSpinning: boolean; finalSymbols?: number[] }) => {
    const cellHeight = 80; // each symbol cell height (in pixels)
    if (isSpinning) {
      // Generate a temporary reel array (simulate continuous scrolling).
      const reelArray = Array.from({ length: 20 }, () => Math.floor(Math.random() * 8));
      return (
        <div className="w-full h-full overflow-hidden relative">
          <motion.div
            className="w-full"
            animate={{ y: -cellHeight * reelArray.length }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            {reelArray.map((sym, i) => (
              <div key={i} style={{ height: cellHeight }} className="w-full flex items-center justify-center">
                <Image src={symbolImages[sym]} alt={`Symbol ${sym}`} width={80} height={80} />
              </div>
            ))}
          </motion.div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full overflow-hidden relative">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {finalSymbols && finalSymbols.map((sym, i) => (
              <div key={i} style={{ height: cellHeight }} className="w-full flex items-center justify-center">
                <Image src={symbolImages[sym]} alt={`Symbol ${sym}`} width={80} height={80} />
              </div>
            ))}
          </motion.div>
        </div>
      );
    }
  };

  return (
    <div className="w-full h-full relative flex justify-center items-center">
      {/* The visible area is 5 cells tall (5 * 80px) */}
      <div className="flex space-x-2" style={{ height: 5 * 80 }}>
        {Array.from({ length: 5 }, (_, colIndex) => (
          <div key={colIndex} className="w-24 h-full overflow-hidden">
            <Reel isSpinning={spinning} finalSymbols={finalGrid ? finalGrid.map(row => row[colIndex]) : undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}

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
}: SlotsControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (cooldown > 0) {
      const intervalId = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  const showError = (msg: string) => setErrorMessage(msg);

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
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult !== null && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">Result: {gameResult}</div>
                {winAmount !== null && winAmount > 0 ? (
                  <div className="text-xl text-green-500">You won {winAmount.toFixed(8)} KAS!</div>
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

export default function KasenManiaSlotsPage() {
  return <SlotsContent />;
}
