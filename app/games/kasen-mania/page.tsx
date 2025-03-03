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
import "./styles.css";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

/* ------------------------------------------------------------------ */
/*                          Main Page                                 */
/* ------------------------------------------------------------------ */

export default function KasenManiaSlotsPage() {
  return <SlotsContent />;
}

function SlotsContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

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
      const uniqueHash = uuidv4();
      const accounts = await window.kasware.getAccounts();
      const currentWalletAddress = accounts[0];
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "Kasen Mania",
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
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
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

        {/* Main Game & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">KASEN MANIA</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#49EACB]"
                  onClick={() => setShowHowToPlay(true)}
                >
                  How to Play
                </Button>
              </div>
              <div className="relative h-[70vh] bg-gradient-to-b from-[#600000] to-black rounded-lg mb-6 overflow-hidden border border-gray-600 shadow-2xl p-0">
                <SlotsGame
                  isPlaying={isPlaying}
                  onGameEnd={handleGameEnd}
                  betAmount={Number(betAmount)}
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
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        {/* Kasen Promo Card */}
        <Card className="mt-6 w-full bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #600000, #FF0000, #FF7373)",
              backgroundSize: "200% 200%",
            }}
          >
            KASEN Mania
          </motion.h2>
          <img src="/kasenpromo.png" alt="Kasen Collab" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            KASEN MANIA is an electrifying online slot machine game set in the adventurous world of
            KASEN! As a pioneer in the NFT space on Kaspa, KASEN brings you a thrilling experience
            where every spin uncovers legendary treasures, rare artifacts, and powerful rewards.
            Join Valen, Vira, and Ghost as they unlock hidden bonuses and chase massive wins. Will
            you strike gold or unleash chaos? Play now and let the adventure begin!
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a
              href="https://x.com/KasenOnKaspa"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              <FaTwitter />
            </motion.a>
            <motion.a
              href="https://t.co/W4YDM1cUpY"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              <FaTelegramPlane />
            </motion.a>
            <motion.a
              href="https://kasenonkas.com"
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

      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Kasen Mania</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount and click "Spin Kasen Mania" to play.</li>
              <li>The reels (5 columns by 5 rows) will spin as each column scrolls vertically.</li>
              <li>
                Outcomes are determined fairly:
                <ul className="list-disc list-inside ml-4">
                  <li>40% chance for a modest win (1.1× payout)</li>
                  <li>20% chance for a 2× win</li>
                  <li>10% chance for a 3× win</li>
                  <li>30% chance to lose</li>
                </ul>
              </li>
              <li>
                <strong>Winning Patterns (Examples):</strong>
                <div className="mt-2">
                  <p className="mb-1">Center Horizontal (1.1× win):</p>
                  <div className="flex space-x-1">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <Image key={i} src="/placeholder.svg" alt="Symbol" width={40} height={40} />
                      ))}
                    <span className="ml-2 text-sm">1.1× win</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="mb-1">Diagonal (2× win):</p>
                  <div className="flex space-x-1">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <Image
                          key={i}
                          src="/placeholder2.svg"
                          alt="Symbol"
                          width={40}
                          height={40}
                        />
                      ))}
                    <span className="ml-2 text-sm">2× win</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="mb-1">Top Horizontal (3× win):</p>
                  <div className="flex space-x-1">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <Image
                          key={i}
                          src="/placeholder3.svg"
                          alt="Symbol"
                          width={40}
                          height={40}
                        />
                      ))}
                    <span className="ml-2 text-sm">3× win</span>
                  </div>
                </div>
              </li>
            </ol>
            <p className="mt-4 text-white">Good luck and may the reels favor you!</p>
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

/* ------------------------------------------------------------------ */
/*                           Slots Game                               */
/* ------------------------------------------------------------------ */

interface SlotsGameProps {
  isPlaying: boolean;
  onGameEnd: (result: string, winAmt: number) => void;
  betAmount: number;
}

const symbolImages = [
  "/kasen1.webp",
  "/kasen2.webp",
  "/kasen3.webp",
  "/kasen4.webp",
  "/kasen5.webp",
  "/kasen6.webp",
  "/kasen7.webp",
  "/kasen8.webp",
];

// Adjust as needed for your layout
const reelWidth = 720;
const reelHeight = 390;

function generateFinalGrid(multiplier: number, symbolCount: number): number[][] {
  const grid = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => Math.floor(Math.random() * symbolCount))
  );
  if (multiplier === 1.1) {
    const winSymbol = Math.floor(Math.random() * symbolCount);
    grid[2] = grid[2].map(() => winSymbol);
  } else if (multiplier === 2) {
    const winSymbol = Math.floor(Math.random() * symbolCount);
    for (let i = 0; i < 5; i++) {
      grid[i][i] = winSymbol;
    }
  } else if (multiplier === 3) {
    const winSymbol = Math.floor(Math.random() * symbolCount);
    grid[0] = grid[0].map(() => winSymbol);
  }
  return grid;
}

function generateLosingGrid(symbolCount: number): number[][] {
  let grid: number[][];
  do {
    grid = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => Math.floor(Math.random() * symbolCount))
    );
  } while (
    grid[2].every((val) => val === grid[2][0]) ||
    grid[0].every((val) => val === grid[0][0]) ||
    [0, 1, 2, 3, 4].every((i) => grid[i][i] === grid[0][0])
  );
  return grid;
}

export function SlotsGame({ isPlaying, onGameEnd, betAmount }: SlotsGameProps) {
  const [finalGrid, setFinalGrid] = useState<number[][] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [outcomeMultiplier, setOutcomeMultiplier] = useState<number | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      setSpinning(true);
      setFinalGrid(null);
      setOutcomeMultiplier(null);

      // Probability: 30% lose, 40% for 1.1×, 20% for 2×, 10% for 3×
      const r = Math.random();
      let multiplier = 0;
      if (r < 0.3) {
        multiplier = 0;
      } else if (r < 0.7) {
        multiplier = 1.1;
      } else if (r < 0.9) {
        multiplier = 2;
      } else {
        multiplier = 3;
      }
      setOutcomeMultiplier(multiplier);

      const grid =
        multiplier === 0
          ? generateLosingGrid(symbolImages.length)
          : generateFinalGrid(multiplier, symbolImages.length);

      timer = setTimeout(() => {
        setFinalGrid(grid);
        setSpinning(false);

        const result = multiplier > 0 ? "You Win" : "House Wins";
        const winAmt = multiplier > 0 ? betAmount * multiplier : 0;
        onGameEnd(result, winAmt);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, betAmount, onGameEnd]);

  let overlayElement = null;
  if (!spinning && finalGrid && outcomeMultiplier && outcomeMultiplier > 0) {
    if (outcomeMultiplier === 1.1) {
      // Middle row: same Y, but shorten right side
      overlayElement = (
        <div
          className="absolute bg-green-500"
          style={{
            top: reelHeight / 2 - 2,
            left: 0,
            width: reelWidth - 80, // shorten on right side
            height: 4,
          }}
        />
      );
    } else if (outcomeMultiplier === 3) {
      // Top row: move down by 15px, shorten on right side
      overlayElement = (
        <div
          className="absolute bg-green-500"
          style={{
            top: 15, // down 15px
            left: 0,
            width: reelWidth - 80, // shorten on right side
            height: 4,
          }}
        />
      );
    } else if (outcomeMultiplier === 2) {
      // Diagonal: start lower & end higher for more downward angle, also shorter
      const startX = 0;
      const startY = 40; // move down a bit
      const endX = reelWidth - 80; // shorten on right side
      const endY = reelHeight - 10; // end a bit above the bottom
      const xDiff = endX - startX;
      const yDiff = endY - startY;
      const length = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
      const angle = Math.atan2(yDiff, xDiff) * (180 / Math.PI);

      overlayElement = (
        <div
          className="absolute bg-green-500"
          style={{
            top: startY,
            left: startX,
            width: length,
            height: 4,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "0 0",
          }}
        />
      );
    }
  }

  const showPreviewOverlay = !isPlaying && !finalGrid;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* The slot machine image is the same */}
      <Image
        src="/slotmachine.webp"
        alt="Slot Machine Background"
        width={800}
        height={400}
        className="block object-cover object-center"
        style={{ marginLeft: "-5px" }}
      />

      <div
        className="absolute"
        style={{
          top: "-30px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Image src="/female_placeholder.svg" alt="Female Character" width={130} height={130} />
      </div>

      {/* Frosted preview overlay if not spinning */}
      {showPreviewOverlay && (
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 flex justify-center items-center">
            <div style={{ width: reelWidth, height: reelHeight, marginLeft: "150px" }}>
              <div className="flex space-x-5 h-full">
                {Array.from({ length: 5 }).map((_, colIndex) => (
                  <div key={colIndex} className="w-24 h-full overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        style={{ height: 75 }}
                        className="flex items-center justify-center"
                      >
                        <Image
                          src={symbolImages[Math.floor(Math.random() * symbolImages.length)]}
                          alt={`Symbol preview ${i}`}
                          width={65}
                          height={65}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 z-10"
            style={{
              background: "linear-gradient(270deg, #600000, #000000)",
              opacity: 0.6,
            }}
          />
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
            <motion.h1
              className="text-5xl font-bold mb-4 text-transparent bg-clip-text"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{
                backgroundImage: "linear-gradient(270deg, #600000, #FF0000, #FF7373)",
                backgroundSize: "200% 200%",
              }}
            >
              KASEN MANIA
            </motion.h1>
            <Card className="bg-white text-black p-4">
              <h3 className="text-xl font-bold">Place bet to spin</h3>
            </Card>
          </div>
        </div>
      )}

      {/* Actual reels */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ width: reelWidth, height: reelHeight, marginLeft: "150px" }} className="relative">
          <div className="w-full h-full flex space-x-5">
            {Array.from({ length: 5 }).map((_, colIndex) => (
              <Reel
                key={colIndex}
                isSpinning={spinning}
                finalSymbols={finalGrid ? finalGrid.map((row) => row[colIndex]) : undefined}
              />
            ))}
          </div>
          {overlayElement}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       Reel Subcomponent                            */
/* ------------------------------------------------------------------ */

function Reel({
  isSpinning,
  finalSymbols,
}: {
  isSpinning: boolean;
  finalSymbols?: number[];
}) {
  const cellHeight = 75;
  const imageSize = 65;

  if (isSpinning) {
    const reelArray = Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * symbolImages.length)
    );
    return (
      <div className="w-24 h-full overflow-hidden relative">
        <motion.div
          className="w-full"
          animate={{ y: -cellHeight * reelArray.length }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          {reelArray.map((sym, i) => (
            <div
              key={i}
              style={{ height: cellHeight }}
              className="flex items-center justify-center"
            >
              <Image src={symbolImages[sym]} alt={`Symbol ${sym}`} width={imageSize} height={imageSize} />
            </div>
          ))}
        </motion.div>
      </div>
    );
  }

  // If not spinning, show final symbols
  return (
    <div className="w-24 h-full overflow-hidden relative">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {finalSymbols?.map((sym, i) => (
          <div
            key={i}
            style={{ height: 75 }}
            className="flex items-center justify-center"
          >
            <Image src={symbolImages[sym]} alt={`Symbol ${sym}`} width={65} height={65} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                          Slots Controls                            */
/* ------------------------------------------------------------------ */

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
      const intervalId = setInterval(() => setCooldown((prev) => prev - 1), 1000);
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
      showError("Bet must be between 1 & 1000");
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
                  ? `Spin Kasen Mania (${cooldown}s)`
                  : "Spin Kasen Mania"}
              </Button>
            ) : (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                disabled
              >
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
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-4 font-bold text-white"
              >
                X
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
