"use client";

import { useState, useEffect, useMemo } from "react";
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
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
// Import XPDisplay to integrate the XP level display into the nav
import { XPDisplay } from "@/app/page";

// ---------------------------------------------------------
// Font & Constants
// ---------------------------------------------------------
const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// Fixed tower settings
const MIN_BET = 1;
const MAX_BET = 1000;
const NUM_COLS = 6;
const TOTAL_ROWS = 10; // fixed tower height (floors)
  
// Exponential multiplier: multiplier = 1.1^(# finished floors)
const getMultiplier = (floors: number) =>
  Number(Math.pow(1.1, floors).toFixed(2));

// Updated image asset paths
const PLACEHOLDER_IMG = "/kaspatowerclimbbrick.png";
const WIN_IMG = "/kaspatowerclimbwin.png";
const LOSE_IMG = "/kaspatowerclimbloss.png";

// ---------------------------------------------------------
// Row Pattern Generator for a given floor
// ---------------------------------------------------------
function generateRowPatternForFloor(floor: number) {
  const maxWinning = NUM_COLS - 1; // best chance on bottom floor
  const minWinning = 2; // hardest at the top
  const winningCount = Math.round(
    maxWinning - ((maxWinning - minWinning) * (floor - 1)) / (TOTAL_ROWS - 1)
  );
  const pattern = Array(NUM_COLS).fill(false);
  const indices = Array.from({ length: NUM_COLS }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let i = 0; i < winningCount; i++) {
    pattern[indices[i]] = true;
  }
  return pattern;
}

// ---------------------------------------------------------
// Tower Climb Game Component
// ---------------------------------------------------------
// We now include an optional "revealedIndices" array to track per-cube flipping.
interface TowerRow {
  pattern: boolean[]; // true = winning; false = losing
  revealed: boolean;
  revealedIndices?: boolean[];
}

interface TowerClimbGameProps {
  finishedRows: TowerRow[];
  activeRow: TowerRow | null;
  lockedRows: TowerRow[];
  onCubeClick: (cubeIndex: number) => void;
  flipBoard: boolean;
}

function TowerClimbGame({
  finishedRows,
  activeRow,
  lockedRows,
  onCubeClick,
  flipBoard,
}: TowerClimbGameProps) {
  const allRows = [...finishedRows];
  if (activeRow) allRows.push(activeRow);
  allRows.push(...lockedRows);

  return (
    <div className="flex flex-col-reverse gap-2">
      {allRows.map((row, rowIndex) => {
        let rowType: "finished" | "active" | "locked";
        if (rowIndex < finishedRows.length) {
          rowType = "finished";
        } else if (activeRow && rowIndex === finishedRows.length) {
          rowType = "active";
        } else {
          rowType = "locked";
        }
        const opacityClass = rowType === "locked" ? "opacity-40" : "opacity-100";
        return (
          <div
            key={rowIndex}
            className={`flex justify-center gap-2 transition-opacity duration-500 ${opacityClass}`}
          >
            {row.pattern.map((cell, colIndex) => {
              const isRevealed =
                row.revealed || (row.revealedIndices && row.revealedIndices[colIndex]);
              const imgSrc = isRevealed ? (cell ? WIN_IMG : LOSE_IMG) : PLACEHOLDER_IMG;
              return (
                <motion.div
                  key={colIndex}
                  className="w-16 h-16 cursor-pointer border border-gray-700 rounded-md overflow-hidden"
                  onClick={() => {
                    if (rowType === "active" && !isRevealed) {
                      onCubeClick(colIndex);
                    }
                  }}
                  animate={{ rotateY: isRevealed || flipBoard ? 180 : 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <Image src={imgSrc} alt="cube" width={64} height={64} />
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
// Main Page Component
// ---------------------------------------------------------
export default function KaspaTowerClimbPage() {
  return <TowerClimbContent />;
}

function TowerClimbContent() {
  const { isConnected, balance } = useWallet();
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [finishedRows, setFinishedRows] = useState<TowerRow[]>([]);
  const [activeRow, setActiveRow] = useState<TowerRow | null>(null);
  const [lockedRows, setLockedRows] = useState<TowerRow[]>([]);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [cashoutPopup, setCashoutPopup] = useState(false);
  const [losePopup, setLosePopup] = useState(false);
  const [flipBoard, setFlipBoard] = useState(false);
  const [cashoutClicked, setCashoutClicked] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Generate 50 decorative logos with random positions
  const decorativeLogos = useMemo(() => {
    return Array.from({ length: 50 }).map(() => ({
      top: Math.random() * 80 + "%",
      left: Math.random() * 80 + "%",
    }));
  }, []);

  // Initialize tower board with fixed TOTAL_ROWS floors.
  const initTower = () => {
    setFinishedRows([]);
    setFlipBoard(false);
    setCashoutClicked(false);
    const newActive: TowerRow = {
      pattern: generateRowPatternForFloor(1),
      revealed: false,
      revealedIndices: Array(NUM_COLS).fill(false),
    };
    setActiveRow(newActive);
    const locked: TowerRow[] = [];
    for (let floor = 2; floor <= TOTAL_ROWS; floor++) {
      locked.push({ pattern: generateRowPatternForFloor(floor), revealed: false });
    }
    setLockedRows(locked);
  };

  // Start game: deduct bet and notify backend.
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
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

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
      initTower();
      setIsPlaying(true);
      setPregame(false);
      setGameResult(null);
    } catch (error: any) {
      console.error("Error starting Kaspa Tower Climb:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Handle cube click on the active row.
  const handleCubeClick = (cubeIndex: number) => {
    if (!activeRow || activeRow.revealed) return;
    // First, update the clicked cube only.
    const newRevealedIndices = activeRow.revealedIndices ? [...activeRow.revealedIndices] : Array(NUM_COLS).fill(false);
    newRevealedIndices[cubeIndex] = true;
    setActiveRow({ ...activeRow, revealedIndices: newRevealedIndices });

    // After 1 second, fully reveal the active row.
    setTimeout(() => {
      const fullyRevealedRow: TowerRow = {
        ...activeRow,
        revealed: true,
        revealedIndices: Array(NUM_COLS).fill(true),
      };
      setActiveRow(fullyRevealedRow);
      const outcome = activeRow.pattern[cubeIndex];
      if (outcome) {
        setTimeout(() => {
          const newFinished = [...finishedRows, fullyRevealedRow];
          setFinishedRows(newFinished);
          if (newFinished.length < TOTAL_ROWS) {
            const nextRow = lockedRows[0];
            setActiveRow({ ...nextRow, revealed: false, revealedIndices: Array(NUM_COLS).fill(false) });
            setLockedRows(prev => prev.slice(1));
          } else {
            handleCashOut();
          }
        }, 500);
      } else {
        setLockedRows(prev => prev.map(row => ({ ...row, revealed: true })));
        setFlipBoard(true);
        setGameResult("Game Over");
        if (gameId) {
          axios.post(`${apiUrl}/game/end`, {
            gameId,
            result: "lose",
            winAmount: 0,
          });
        }
        setIsPlaying(false);
        setLosePopup(true);
      }
    }, 1000);
  };

  // Handle cash out immediately on click.
  const handleCashOut = async () => {
    if (cashoutClicked) return;
    setCashoutClicked(true);
    const bet = Number(betAmount);
    const multiplier = getMultiplier(finishedRows.length);
    const payout = bet * multiplier;
    setGameResult("Cashed Out");
    setIsPlaying(false);
    setCashoutPopup(true);
    try {
      await axios.post(`${apiUrl}/game/end`, {
        gameId,
        result: "win",
        winAmount: payout,
      });
    } catch (error) {
      console.error("Error ending game on backend:", error);
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setGameId(null);
    setDepositTxid(null);
    setPregame(true);
  };

  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(interval);
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

        {/* Main Game & Right Column Controls */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Left Column: Game Container */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspa Tower Climb</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>
              {/* Pregame Screen (fills entire container) */}
              {pregame ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-black to-[#004225] bg-opacity-80">
                  {decorativeLogos.map((pos, index) => (
                    <motion.div
                      key={index}
                      className="absolute"
                      style={{ top: pos.top, left: pos.left, opacity: 0.5 }}
                      whileHover={{ scale: 1.2 }}
                    >
                      <Image
                        src="/kaspagameicon.png"
                        alt="Kaspa Logo"
                        width={30}
                        height={30}
                        style={{ border: "2px solid #004d00", borderRadius: "50%" }}
                      />
                    </motion.div>
                  ))}
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
                    <motion.h1
                      className="text-5xl font-bold mb-4"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#49EACB" }}
                    >
                      KASPA TOWER CLIMB
                    </motion.h1>
                    <motion.p
                      className="text-xl tracking-wider mb-4"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#00FFFF" }}
                    >
                      CLIMB TO WIN BIG
                    </motion.p>
                    <div className="mt-20">
                      <Image src="/kaspagameicon.png" alt="Kaspa Icon" width={96} height={96} />
                    </div>
                    <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                      <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                        Place Your Bet
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                // Game Board
                <div className="w-full max-w-md mx-auto">
                  <TowerClimbGame
                    finishedRows={finishedRows}
                    activeRow={activeRow}
                    lockedRows={lockedRows}
                    onCubeClick={handleCubeClick}
                    flipBoard={flipBoard}
                  />
                </div>
              )}
              {isPlaying && finishedRows.length > 0 && (
                <motion.div className="mt-4">
                  <Button
                    onClick={handleCashOut}
                    disabled={cashoutClicked}
                    className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                  >
                    Cash Out (Payout: {Number(betAmount) * getMultiplier(finishedRows.length)} KAS)
                  </Button>
                </motion.div>
              )}
            </div>
          </Card>

          {/* Right Column: Bet Controls, LiveChat & LiveWins */}
          <div className="space-y-6">
            <TowerClimbControls
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
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        {/* Promo / Info Card */}
        <Card className="w-full bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
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
            Climb the tower one floor at a time. Each successful floor increases your payout,
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

      {/* Animated Cash Out Popup */}
      <AnimatePresence>
        {cashoutPopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#49EACB] p-6 rounded-lg shadow-2xl text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
              <p className="text-xl mb-6">
                You cashed out for {Number(betAmount) * getMultiplier(finishedRows.length)} KAS
              </p>
              <Button
                className="bg-black text-[#49EACB] hover:bg-black/80"
                onClick={() => {
                  setCashoutPopup(false);
                  resetGame();
                }}
              >
                Reset Game
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Loss Popup */}
      <AnimatePresence>
        {losePopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-red-700 p-6 rounded-lg shadow-2xl text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-3xl font-bold mb-4">Game Over</h2>
              <p className="text-xl mb-6">You lost your bet.</p>
              <Button
                className="bg-black text-red-700 hover:bg-black/80"
                onClick={() => {
                  setLosePopup(false);
                  resetGame();
                }}
              >
                Reset Game
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------
// Tower Climb Controls Component
// ---------------------------------------------------------
interface TowerClimbControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  gameResult: string | null;
  cooldown: number;
}

function TowerClimbControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  gameResult,
  cooldown,
}: TowerClimbControlsProps) {
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
            {gameResult && (
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
