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
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { XPDisplay } from "@/app/page";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// ------------------------
// CONSTANTS & SETTINGS
// ------------------------
const MIN_BET = 1;
const MAX_BET = 1000;
const MIN_MULTIPLIER = 1.9; // updated minimum multiplier
const MAX_MULTIPLIER = 25;
const INITIAL_MULTIPLIER = MIN_MULTIPLIER;
const HOUSE_EDGE = 0.05; // house edge of 5% (i.e. EV = 0.95 × bet)

// Compute slider background based on multiplier value.
// Now the order is: green first, then blue, then violet.
const getSliderBackground = (multiplier: number) => {
  if (multiplier < 8) {
    return "#00FF00"; // green
  } else if (multiplier < 17) {
    return "linear-gradient(90deg, #00FF00, #007BFF)"; // green to blue
  } else {
    return "linear-gradient(90deg, #00FF00, #007BFF, #9400D3)"; // green, blue, violet
  }
};

// ------------------------
// UPGRADE GAME COMPONENT
// ------------------------
export default function UpgradeGame() {
  const { isConnected, balance } = useWallet();

  // Game state variables
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [multiplier, setMultiplier] = useState(INITIAL_MULTIPLIER);
  // winChance is (1 / multiplier) * 0.95
  const winChance = 0.95 / multiplier;
  const [countdown, setCountdown] = useState(3);
  const [gamePhase, setGamePhase] = useState<"pregame" | "countdown" | "result">("pregame");
  const [gameResult, setGameResult] = useState<number | null>(null);
  const [resultPopup, setResultPopup] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // ------------------------
  // START GAME FUNCTION
  // ------------------------
  async function handleStartGame() {
    const bet = Number(betAmount);
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
      // Send deposit (in satoshis)
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Notify backend
      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "Upgrade",
        uniqueHash,
        walletAddress: currentWalletAddress,
        betAmount: bet,
        multiplier,
        txid: txidString,
      });
      if (!startRes.data.success) {
        alert("Failed to start game on backend");
        return;
      }
      setGameId(startRes.data.gameId);

      // Transition to countdown
      setPregame(false);
      setIsPlaying(true);
      setGameResult(null);
      setCountdown(3);
      setGamePhase("countdown");
    } catch (error: any) {
      console.error("Error starting Upgrade:", error);
      alert("Error starting game: " + error.message);
    }
  }

  // ------------------------
  // COUNTDOWN & RESOLVE GAME
  // ------------------------
  useEffect(() => {
    if (gamePhase === "countdown") {
      if (countdown > 0) {
        const timer = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
      } else {
        resolveGame();
      }
    }
  }, [gamePhase, countdown]);

  async function resolveGame() {
    const bet = Number(betAmount);
    let payout = 0;
    const roll = Math.random();
    if (roll < winChance) {
      payout = bet * multiplier;
    }
    setGameResult(payout);
    setGamePhase("result");
    setResultPopup(true);

    try {
      await axios.post(`${apiUrl}/game/end`, {
        gameId,
        result: payout > 0 ? "win" : "lose",
        winAmount: payout,
      });
    } catch (error) {
      console.error("Error ending Upgrade game on backend:", error);
    }
    setIsPlaying(false);
  }

  // ------------------------
  // RESET GAME
  // ------------------------
  function resetGame() {
    setPregame(true);
    setGamePhase("pregame");
    setIsPlaying(false);
    setGameResult(null);
    setResultPopup(false);
    setDepositTxid(null);
    setGameId(null);
    setCountdown(3);
  }

  // ------------------------
  // HANDLE START BUTTON CLICK
  // ------------------------
  const handleStartClick = () => {
    if (!isConnected) {
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
    handleStartGame();
  };

  // ------------------------
  // COUNTDOWN STYLE
  // ------------------------
  const countdownStyle =
    countdown === 3
      ? { color: "#00FF00" }
      : countdown === 2
      ? {
          backgroundImage: "linear-gradient(90deg, #00FF00, #FFFF00)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }
      : countdown === 1
      ? {
          backgroundImage: "linear-gradient(90deg, #00FF00, #FF0000)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }
      : {};

  // ------------------------
  // ERROR MESSAGE AUTO CLEAR
  // ------------------------
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearInterval(timer);
    }
  }, [errorMessage]);

  return (
    <div className={`${montserrat.className} bg-black min-h-screen`}>
      <header className="w-full flex items-center justify-between p-6 mx-auto">
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
        <p className="px-6 text-sm text-center" style={{ color: "#B6B6B6" }}>
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

      {/* Main game row: 1fr for the game, 300px for chat/wins */}
      <div className="grid grid-cols-[1fr_300px] gap-6 p-6 w-full">
        {/* Left column: Game Card */}
        <div className="flex justify-center w-full px-4">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm w-full">
            {gamePhase === "pregame" && (
              <div className="p-6 flex flex-col items-center">
                <h1 className="text-5xl font-bold text-[#49EACB] mb-10">UPGRADE</h1>
                {/* Bet Amount Input */}
                <div className="w-full mb-10 flex flex-col items-center">
                  <label className="text-xl text-[#49EACB] mb-2">Bet Amount (KAS)</label>
                  <div className="relative w-full max-w-md">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (isNaN(val)) val = MIN_BET;
                        val = Math.max(MIN_BET, Math.min(MAX_BET, val));
                        setBetAmount(val.toString());
                      }}
                      className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-12 w-full p-4 text-2xl rounded"
                      placeholder="0.00"
                      disabled={isPlaying || !isConnected}
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                        alt="KAS"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Multiplier Display */}
                <div className="mb-10">
                  <span className="text-6xl font-bold text-[#49EACB]">
                    {multiplier.toFixed(2)}×
                  </span>
                </div>

                {/* Multiplier Slider */}
                <div className="w-full mb-6 flex flex-col items-center">
                  <label className="text-xl text-[#49EACB] mb-2">
                    Adjust Multiplier
                  </label>
                  <div className="w-full max-w-md">
                    <input
                      type="range"
                      min={MIN_MULTIPLIER}
                      max={MAX_MULTIPLIER}
                      step={0.01}
                      value={multiplier}
                      onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                      className="slider-custom"
                      disabled={isPlaying || !isConnected}
                      style={{ background: getSliderBackground(multiplier) }}
                    />
                  </div>
                  <div className="mt-4 text-2xl text-[#49EACB]">
                    Win Chance: {(winChance * 100).toFixed(1)}%
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-10">
                  <Button
                    style={{ background: "linear-gradient(90deg, #49EACB, #00FF00)", color: "black" }}
                    className="w-full start-upgrade-btn font-bold p-8 text-2xl rounded"
                    onClick={handleStartClick}
                    disabled={!isConnected || isPlaying}
                  >
                    {isPlaying ? "Game in Progress..." : "Start Upgrade"}
                  </Button>
                </motion.div>
              </div>
            )}

            {gamePhase === "countdown" && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                <motion.div className="text-9xl font-bold" style={countdownStyle}>
                  {countdown}
                </motion.div>
              </div>
            )}

            {gamePhase === "result" && (
              <div className="p-6 flex flex-col items-center">
                <h2 className="text-4xl font-bold mb-6">Your Upgrade Result</h2>
                {gameResult && gameResult > 0 ? (
                  <p className="text-4xl animate-pulse uppercase text-[#39FF14]">
                    YOU WIN <strong>{gameResult.toFixed(2)}</strong> KAS!
                  </p>
                ) : (
                  <p className="text-4xl animate-pulse uppercase text-red-500">
                    YOU LOST!
                  </p>
                )}
                <Button onClick={resetGame} className="mt-4">
                  Play Again
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right column: Additional Controls */}
        <div className="space-y-6">
          <LiveChat textColor="#49EACB" />
          <LiveWins textColor="#49EACB" />
        </div>
      </div>

      <Card className="w-full bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center m-6">
        <motion.h2
          className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          style={{
            backgroundImage:
              "linear-gradient(270deg, #49EACB, #00FFFF, #49EACB)",
            backgroundSize: "200% 200%",
          }}
        >
          Upgrade
        </motion.h2>
        <p className="text-sm text-white mb-4">
          Choose your multiplier and upgrade your bet. The win chance is calculated
          in real-time based on your selected multiplier.
        </p>
        <div className="flex justify-center space-x-4 text-xl">
          <motion.a
            href="https://x.com/KasenOnKaspa"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.2 }}
            className="text-[#49EACB] hover:text-[#49EACB]/80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 001.88-2.37 8.59 8.59 0 01-2.73 1.04 4.28 4.28 0 00-7.3 3.9A12.14 12.14 0 013 4.8a4.28 4.28 0 001.32 5.7 4.24 4.24 0 01-1.94-.54v.06a4.28 4.28 0 003.43 4.19 4.3 4.3 0 01-1.93.07 4.28 4.28 0 004 2.98A8.59 8.59 0 012 19.54a12.12 12.12 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19-.01-.38-.02-.57A8.67 8.67 0 0024 4.59a8.48 8.48 0 01-2.54.7z" />
            </svg>
          </motion.a>
          <motion.a
            href="https://t.co/W4YDM1cUpY"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.2 }}
            className="text-[#49EACB] hover:text-[#49EACB]/80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.7 16.2l-.4 4.3c.6 0 .9-.3 1.2-.6l3.1-3 6.5 4.8c1.2.7 2.1.3 2.4-1l4.3-19c.3-1.2-.4-1.8-1.3-1.8l-19 7.3c-1.1.4-1.1 1.1-.2 1.4l7.4 2.3-7.4 2.3c-1 .3-.9.9.2 1.4l19 7.3c.9.3 1.6-.2 1.3-1.4l-4.3-19c-.3-1.2-1.2-1.6-2.4-1l-6.5 4.8-3.1 3c-.3.3-.6.9-.6 1.5z" />
            </svg>
          </motion.a>
          <motion.a
            href="https://kasenonkas.com"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.2 }}
            className="text-[#49EACB] hover:text-[#49EACB]/80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm4.93 6h-3.88a25.931 25.931 0 00-.64-3.14A8.014 8.014 0 0116.93 8zm-9.86 0a8.014 8.014 0 013.44-5.14A25.931 25.931 0 009.95 8zm-3.04 2a25.931 25.931 0 010 4h3.88a21.89 21.89 0 000-4zm3.04 6a8.014 8.014 0 01-3.44-5.14 25.931 25.931 0 012.83 3.14zm6.89 0h3.88a8.014 8.014 0 01-3.44 5.14 25.931 25.931 0 01-.64-3.14zm-1.45-6h-3.88a21.89 21.89 0 000 4h3.88a25.931 25.931 0 010-4z" />
            </svg>
          </motion.a>
        </div>
      </Card>

      <SiteFooter />

      {/* Error popup */}
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

      {/* Result popup */}
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
              <h2 className="text-3xl font-bold mb-4">Your Upgrade Result</h2>
              {gameResult && gameResult > 0 ? (
                <p className="text-4xl animate-pulse uppercase text-[#39FF14]">
                  YOU WIN <strong>{gameResult.toFixed(2)}</strong> KAS!
                </p>
              ) : (
                <p className="text-4xl animate-pulse uppercase text-red-500">
                  YOU LOST!
                </p>
              )}
              <Button onClick={resetGame} className="mt-4">
                Play Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom slider styling */}
      <style jsx>{`
        .slider-custom {
          -webkit-appearance: none;
          width: 100%;
          height: 10px;
          outline: none;
          border-radius: 5px;
          margin: 10px 0;
        }
        .slider-custom::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 32px;
          height: 32px;
          background: url('/draggerpoint.webp') no-repeat center center;
          background-size: contain;
          cursor: pointer;
        }
        .slider-custom::-moz-range-thumb {
          width: 32px;
          height: 32px;
          background: url('/draggerpoint.webp') no-repeat center center;
          background-size: contain;
          cursor: pointer;
        }
        .start-upgrade-btn {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .start-upgrade-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </div>
  );
}
