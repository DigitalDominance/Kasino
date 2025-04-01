"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { XPDisplay } from "@/app/page";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";

// -----------------------------------------
// CONSTANTS
// -----------------------------------------
const MIN_BET = 1;
const MAX_BET = 1000;
const MIN_MULTIPLIER = 1.1;
const MAX_MULTIPLIER = 25; // easily changeable max multiplier
const SLIDER_HEIGHT = 300; // height of the vertical slider

// -----------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------
function calculateMultiplier(dragY) {
  // dragY goes from 0 (top) to SLIDER_HEIGHT (bottom)
  // When at the bottom (dragY = SLIDER_HEIGHT) multiplier is MIN_MULTIPLIER,
  // and at the top (dragY = 0) it is MAX_MULTIPLIER.
  const normalized = 1 - dragY / SLIDER_HEIGHT;
  return MIN_MULTIPLIER + normalized * (MAX_MULTIPLIER - MIN_MULTIPLIER);
}

function calculateWinChance(multiplier) {
  // Fair chance would be 1/multiplier.
  // Subtract 5 percentage points so that for 2x: 1/2 - 0.05 = 0.45 (45% win chance).
  // Clamp to a minimum of 1% (0.01) so it never goes negative.
  return Math.max(1 / multiplier - 0.05, 0.01);
}

// -----------------------------------------
// UPGRADE SLIDER COMPONENT
// -----------------------------------------
function UpgradeSlider({ multiplier, setMultiplier }) {
  // Calculate the dragger's y-position based on current multiplier.
  const normalized = (multiplier - MIN_MULTIPLIER) / (MAX_MULTIPLIER - MIN_MULTIPLIER);
  const dragY = SLIDER_HEIGHT * (1 - normalized);

  return (
    <div className="relative w-20 h-[300px] bg-gray-800 rounded-full mx-auto">
      {/* Fill bar: fills upward from the bottom as the dragger is moved up */}
      <div
        className="absolute bottom-0 left-0 w-full bg-blue-500 rounded-full"
        style={{ height: `${SLIDER_HEIGHT - dragY}px` }}
      />
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: SLIDER_HEIGHT }}
        onDrag={(event, info) => {
          const containerTop = event.currentTarget.getBoundingClientRect().top;
          let newY = info.point.y - containerTop;
          newY = Math.max(0, Math.min(newY, SLIDER_HEIGHT));
          const newMultiplier = calculateMultiplier(newY);
          setMultiplier(newMultiplier);
        }}
        style={{ y: dragY }}
        className="absolute left-1/2 -translate-x-1/2"
      >
        <Image
          src="/draggerpoint.webp"
          alt="Dragger"
          width={40}
          height={40}
          className="cursor-pointer"
        />
      </motion.div>
    </div>
  );
}

// -----------------------------------------
// MAIN UPGRADE GAME PAGE
// -----------------------------------------
export default function UpgradePage() {
  return <UpgradeContent />;
}

function UpgradeContent() {
  const { isConnected, balance } = useWallet();
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [multiplier, setMultiplier] = useState(MIN_MULTIPLIER);
  const winChance = calculateWinChance(multiplier);
  const [gameResult, setGameResult] = useState<number | null>(null);
  const [resultPopup, setResultPopup] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  async function handleStartGame() {
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
        gameName: "Upgrade",
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

      // Simulate the game resolution after a short delay (e.g. 2 seconds)
      setTimeout(() => {
        const outcome = Math.random() < winChance;
        let payout = 0;
        if (outcome) {
          payout = bet * multiplier;
        }
        setGameResult(payout);
        setResultPopup(true);
        axios
          .post(`${apiUrl}/game/end`, {
            gameId,
            result: outcome ? "win" : "loss",
            winAmount: payout,
          })
          .catch((error) => {
            console.error("Error ending Upgrade game on backend:", error);
          });
        setIsPlaying(false);
      }, 2000);
    } catch (error: any) {
      console.error("Error starting Upgrade game:", error);
      alert("Error starting game: " + error.message);
    }
  }

  function resetGame() {
    setPregame(true);
    setIsPlaying(false);
    setGameResult(null);
    setResultPopup(false);
    setDepositTxid(null);
    setGameId(null);
    setMultiplier(MIN_MULTIPLIER);
  }

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  return (
    <div className="bg-black min-h-screen">
      <div className="p-6">
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
            <XPDisplay />
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
        {pregame && (
          <div className="mb-6 text-center">
            <motion.h1
              className="text-5xl font-bold mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ color: "#49EACB" }}
            >
              UPGRADE
            </motion.h1>
            <motion.p
              className="text-xl tracking-wider mb-4"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ color: "#00FFFF" }}
            >
              Drag the slider to set your multiplier and beat the odds!
            </motion.p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6">
            <div className="flex flex-col items-center">
              <UpgradeSlider multiplier={multiplier} setMultiplier={setMultiplier} />
              <div className="mt-4 text-white">
                <div>Multiplier: {multiplier.toFixed(2)}x</div>
                <div>Win Chance: {(winChance * 100).toFixed(1)}%</div>
              </div>
            </div>
          </Card>
          <div className="space-y-6">
            <UpgradeControls
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
        <Card className="w-full bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6 text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #49EACB, #00FFFF, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Upgrade
          </motion.h2>
          <img src="/upgrade-promo.png" alt="Upgrade Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Set your desired multiplier using the slider. Beat the odds and win big!
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
              <h2 className="text-3xl font-bold mb-4">
                {gameResult > 0 ? "You Won!" : "You Lost"}
              </h2>
              {gameResult > 0 ? (
                <p className="text-xl mb-6">
                  You won <strong>{gameResult.toFixed(2)}</strong> KAS!
                </p>
              ) : (
                <p className="text-xl mb-6">Better luck next time!</p>
              )}
              <Button
                className="bg-black text-[#49EACB] hover:bg-black/80"
                onClick={resetGame}
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

// -----------------------------------------
// UPGRADE CONTROLS COMPONENT
// -----------------------------------------
interface UpgradeControlsProps {
  betAmount: string;
  setBetAmount: (val: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  gameResult: number | null;
  cooldown: number;
}

function UpgradeControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  gameResult,
  cooldown,
}: UpgradeControlsProps) {
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
                  Last Win: {gameResult > 0 ? gameResult.toFixed(2) : "0.00"} KAS
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
                  : "Start Upgrade"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                Processing...
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
