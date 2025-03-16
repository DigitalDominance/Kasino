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

/* 
--------------------------------------------------------------------------------
FONT & CONSTANTS
--------------------------------------------------------------------------------
*/
const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// Bet limits
const MIN_BET = 1;
const MAX_BET = 1000;

/**
 * We have 15 pin rows (row indices 0..14):
 *   - Row 0 → 4 pins
 *   - Row 1 → 5 pins
 *   - ...
 *   - Row 14 → 18 pins
 *
 * Then row 15 is the final row showing 18 multiplier boxes.
 * (The ball’s random path is length 15, so final slot is 0..15.)
 */
const PIN_ROW_COUNT = 15; // rows 0..14
function pinsForRow(i: number): number {
  return 4 + i; // row 0: 4 pins; row 14: 18 pins
}

// Final row: 18 multiplier boxes
const FINAL_SLOT_COUNT = 18;
const FINAL_SLOT_MULTIPLIERS = [
  110, 41, 10, 5, 3, 1.5, 1, 0.5,
  0.3, 0.3,
  0.5, 1, 1.5, 3, 5, 10, 41, 110,
];

// Geometry settings
const PIN_SIZE = 10;        // diameter for pins (in px)
const BOX_SIZE = 28;        // slightly larger multiplier boxes
const ROW_SPACING = 50;     // vertical spacing between rows
const PIN_SPACING = 40;     // horizontal spacing between pins
const DROP_DELAY = 300;     // ms delay per row step

// Remove any vertical offset so the top row is at y=0
const TOP_OFFSET = 0;

/*
--------------------------------------------------------------------------------
HELPER FUNCTIONS
--------------------------------------------------------------------------------
*/
// Generate a random path of length 15 (one boolean per row)
function generateRandomPath() {
  const path: boolean[] = [];
  for (let i = 0; i < PIN_ROW_COUNT; i++) {
    path.push(Math.random() < 0.5);
  }
  return path;
}

// The final slot is the sum of "true" (right moves) in the path (0..15)
function getFinalSlot(path: boolean[]) {
  return path.reduce((sum, stepRight) => sum + (stepRight ? 1 : 0), 0);
}

/*
--------------------------------------------------------------------------------
PIN & BOX LAYOUT
--------------------------------------------------------------------------------
*/
function PlinkoPinsAndBoxes({ opacity }: { opacity: number }) {
  // Generate pin coordinates for rows 0..14
  const pins = useMemo(() => {
    const coords: { x: number; y: number }[] = [];
    for (let row = 0; row < PIN_ROW_COUNT; row++) {
      const count = pinsForRow(row);
      const center = (count - 1) / 2;
      const y = row * ROW_SPACING + TOP_OFFSET;
      for (let col = 0; col < count; col++) {
        const x = (col - center) * PIN_SPACING;
        coords.push({ x, y });
      }
    }
    return coords;
  }, []);

  // Final row (row 15) for multiplier boxes
  const finalRowY = PIN_ROW_COUNT * ROW_SPACING + TOP_OFFSET;
  const centerBoxes = (FINAL_SLOT_COUNT - 1) / 2;

  return (
    <div
      className="relative w-full"
      style={{ height: (PIN_ROW_COUNT + 1) * ROW_SPACING }}
    >
      {/* Render pins */}
      {pins.map((p, idx) => (
        <div
          key={`pin-${idx}`}
          className="absolute rounded-full bg-[#49EACB]"
          style={{
            width: PIN_SIZE,
            height: PIN_SIZE,
            left: "50%",
            top: 0,
            transform: `translate(${p.x - PIN_SIZE / 2}px, ${p.y - PIN_SIZE / 2}px)`,
            opacity,
          }}
        />
      ))}

      {/* Render final multiplier boxes */}
      {Array.from({ length: FINAL_SLOT_COUNT }).map((_, slot) => {
        const x = (slot - centerBoxes) * PIN_SPACING;
        const mult = FINAL_SLOT_MULTIPLIERS[slot];
        return (
          <div
            key={`box-${slot}`}
            className="absolute flex items-center justify-center 
                       bg-black/30 border border-[#49EACB] text-[#49EACB] text-xs
                       font-bold rounded-md shadow-[0_0_8px_#49EACB]"
            style={{
              width: BOX_SIZE,
              height: BOX_SIZE,
              left: "50%",
              top: 0,
              transform: `translate(${x - BOX_SIZE / 2}px, ${finalRowY}px)`,
              opacity,
            }}
          >
            {mult}x
          </div>
        );
      })}
    </div>
  );
}

/*
--------------------------------------------------------------------------------
BALL ANIMATION
--------------------------------------------------------------------------------
This component computes target positions for each row (0..14) based on the random path.
The ball starts at row 0 (the top) and steps down one row at a time.
*/
interface PlinkoBoardProps {
  path: boolean[] | null;
  dropping: boolean;
  onBallLanded: (finalSlot: number) => void;
}

function PlinkoBoard({ path, dropping, onBallLanded }: PlinkoBoardProps) {
  const [currentRow, setCurrentRow] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: TOP_OFFSET });

  // Precompute target positions for each row 0..(PIN_ROW_COUNT - 1)
  const rowPositions = useMemo(() => {
    if (!path) return [];
    const positions: { x: number; y: number }[] = [];
    let col = 0;
    for (let i = 0; i < PIN_ROW_COUNT; i++) {
      const count = pinsForRow(i);
      const center = (count - 1) / 2;
      const x = (col - center) * PIN_SPACING;
      const y = i * ROW_SPACING + TOP_OFFSET;
      positions.push({ x, y });
      if (path[i]) col++;
    }
    return positions;
  }, [path]);

  // Step through each row position with a delay
  useEffect(() => {
    if (!dropping || !path || rowPositions.length === 0) {
      setCurrentRow(0);
      setPos({ x: 0, y: TOP_OFFSET });
      return;
    }
    if (currentRow < rowPositions.length) {
      const target = rowPositions[currentRow];
      setPos(target);
      const timer = setTimeout(() => {
        setCurrentRow((r) => r + 1);
      }, DROP_DELAY);
      return () => clearTimeout(timer);
    } else {
      // Finished all rows; determine final slot
      const finalSlot = getFinalSlot(path);
      onBallLanded(finalSlot);
    }
  }, [currentRow, dropping, path, rowPositions, onBallLanded]);

  return (
    <div className="relative w-full" style={{ height: PIN_ROW_COUNT * ROW_SPACING + 100 }}>
      <motion.div
        className="absolute left-1/2"
        animate={{ x: pos.x, y: pos.y }}
        transition={{ type: "spring", stiffness: 140, damping: 14 }}
        style={{ width: 28, height: 28, marginLeft: -14 }}
      >
        <Image
          src="/kaspagameicon.png"
          alt="Kaspa Ball"
          width={28}
          height={28}
          className="rounded-full"
        />
      </motion.div>
    </div>
  );
}

/*
--------------------------------------------------------------------------------
MAIN PLINKO PAGE
--------------------------------------------------------------------------------
*/
export default function PlinkoPage() {
  return <PlinkoContent />;
}

function PlinkoContent() {
  const { isConnected, balance } = useWallet();

  // UI & game states
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [cooldown, setCooldown] = useState(0);
  const [ballPath, setBallPath] = useState<boolean[] | null>(null);
  const [dropping, setDropping] = useState(false);
  const [gameResult, setGameResult] = useState<number | null>(null);
  const [resultPopup, setResultPopup] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  const handleStartGame = async () => {
    const bet = Number(betAmount);
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      alert(`Bet must be between ${MIN_BET} and ${MAX_BET}`);
      return;
    }
    if (bet > balance) {
      alert("Insufficient balance");
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
        gameName: "Plinko",
        uniqueHash,
        walletAddress: currentWalletAddress,
        betAmount: bet,
        txid: txidString,
      });
      if (!startRes.data.success) {
        alert("Failed to start game on backend");
        return;
      }
      setGameId(startRes.data.gameId);
      setPregame(false);
      setIsPlaying(true);
      setGameResult(null);
      setCooldown(10);
      const path = generateRandomPath();
      setBallPath(path);
      setDropping(true);
    } catch (error: any) {
      console.error("Error starting Plinko:", error);
      alert("Error starting game: " + error.message);
    }
  };

  const handleBallLanded = async (finalSlot: number) => {
    setDropping(false);
    const bet = Number(betAmount);
    const multiplier = FINAL_SLOT_MULTIPLIERS[finalSlot] ?? 1;
    const payout = bet * multiplier;
    setGameResult(payout);
    setResultPopup(true);
    try {
      await axios.post(`${apiUrl}/game/end`, {
        gameId,
        result: "win",
        winAmount: payout,
      });
    } catch (error) {
      console.error("Error ending Plinko game on backend:", error);
    }
    setIsPlaying(false);
  };

  const resetGame = () => {
    setPregame(true);
    setIsPlaying(false);
    setGameResult(null);
    setResultPopup(false);
    setBallPath(null);
    setDropping(false);
    setDepositTxid(null);
    setGameId(null);
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
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
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center justify-center relative">
              {pregame ? (
                <>
                  <PlinkoPinsAndBoxes opacity={0.5} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.h1
                      className="text-5xl font-bold mb-4"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#49EACB" }}
                    >
                      KASPA PLINKO
                    </motion.h1>
                    <motion.p
                      className="text-xl tracking-wider mb-4"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#00FFFF" }}
                    >
                      Drop the Ball and Win Big!
                    </motion.p>
                    <Image src="/kaspagameicon.png" alt="Kaspa Icon" width={96} height={96} />
                  </div>
                </>
              ) : (
                <>
                  <PlinkoPinsAndBoxes opacity={1} />
                  <PlinkoBoard path={ballPath} dropping={dropping} onBallLanded={handleBallLanded} />
                </>
              )}
            </div>
          </Card>
          <div className="space-y-6">
            <PlinkoControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              balance={balance}
              onStartGame={handleStartGame}
              gameResult={gameResult}
              cooldown={cooldown}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
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
            Kaspa Plinko
          </motion.h2>
          <img src="/plinko-promo.png" alt="Plinko Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Drop the Kaspa ball from 4 pins at the top to 18 pins at row 14.
            Enjoy the step-by-step animation with bigger pins and larger multiplier boxes!
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
      <AnimatePresence>
        {resultPopup && gameResult !== null && (
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
              <h2 className="text-3xl font-bold mb-4">Your Plinko Result</h2>
              <p className="text-xl mb-6">
                You won <strong>{gameResult?.toFixed(2)}</strong> KAS!
              </p>
              <Button
                className="bg-black text-[#49EACB] hover:bg-black/80"
                onClick={() => {
                  setResultPopup(false);
                  resetGame();
                }}
              >
                Play Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/*
--------------------------------------------------------------------------------
PLINKO CONTROLS COMPONENT
--------------------------------------------------------------------------------
*/
interface PlinkoControlsProps {
  betAmount: string;
  setBetAmount: (val: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  gameResult: number | null;
  cooldown: number;
}

function PlinkoControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  gameResult,
  cooldown,
}: PlinkoControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartClick = () => {
    if (!isWalletConnected) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      setErrorMessage(`Bet must be between ${MIN_BET} and ${MAX_BET}`);
      return;
    }
    if (bet > balance) {
      setErrorMessage("Insufficient balance");
      return;
    }
    onStartGame();
  };

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

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
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = MIN_BET;
                  val = Math.max(MIN_BET, Math.min(MAX_BET, val));
                  setBetAmount(val.toString());
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
                  Last Win: {gameResult.toFixed(2)} KAS
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
                  : "Start Plinko"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                Ball Dropping...
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
