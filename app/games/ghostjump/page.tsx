"use client";
import React, { useState, useEffect, useMemo } from "react";
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
import { XPDisplay } from "@/app/page";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// -----------------------------------------------------------------
// Game Constants & Helper Functions
// -----------------------------------------------------------------
const MIN_BET = 1;
const MAX_BET = 1000;
const FLOOR_HEIGHT = 80; // pixels per floor jump
const MAX_MULTIPLIER = 50;
const BASE_MULTIPLIER = 1.1; // each successful jump increases multiplier by 1.1×
// The win probability is determined to favor the house by 7.5% (i.e. EV = 92.5% of bet)
const HOUSE_EDGE_FACTOR = 0.925;

// Calculate current multiplier based on floors jumped (capped at 50×)
const getMultiplier = (floors) => {
  const mult = Math.pow(BASE_MULTIPLIER, floors);
  return mult > MAX_MULTIPLIER ? MAX_MULTIPLIER : Number(mult.toFixed(2));
};

// Calculate win probability given the current multiplier.
// For example, at floor 0 (multiplier 1×): winChance = 0.925/1 = 92.5%,
// and as the multiplier increases, win chance decreases.
const getWinProbability = (multiplier) => {
  const chance = HOUSE_EDGE_FACTOR / multiplier;
  return chance > 1 ? 1 : chance;
};

// -----------------------------------------------------------------
// Main Ghost Jump Component
// -----------------------------------------------------------------
export default function GhostJumpPage() {
  return <GhostJumpContent />;
}

function GhostJumpContent() {
  const { isConnected, balance } = useWallet();
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [currentFloor, setCurrentFloor] = useState(0);
  // ghostState: "idle" (waiting), "jumping" (in mid-jump), or "falling" (loss animation)
  const [ghostState, setGhostState] = useState("idle");
  const [gameResult, setGameResult] = useState(null);
  const [cashoutPopup, setCashoutPopup] = useState(false);
  const [losePopup, setLosePopup] = useState(false);
  const [cashoutClicked, setCashoutClicked] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [gameId, setGameId] = useState(null);
  const [depositTxid, setDepositTxid] = useState(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Decorative elements for the pregame screen (mansion walls/windows)
  const decorativeElements = useMemo(() => {
    return Array.from({ length: 20 }).map(() => ({
      top: Math.random() * 80 + "%",
      left: Math.random() * 80 + "%",
      type: Math.random() > 0.5 ? "mansion" : "window",
    }));
  }, []);

  // Initialize game state
  const initGame = () => {
    setCurrentFloor(0);
    setGhostState("idle");
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
        gameName: "Ghost Jump",
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
      initGame();
      setIsPlaying(true);
      setPregame(false);
      setGameResult(null);
    } catch (error) {
      console.error("Error starting Ghost Jump:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Handle a jump attempt: decide win or loss based on current win chance.
  const handleJump = () => {
    if (!isPlaying || ghostState !== "idle") return;
    const currentMult = getMultiplier(currentFloor);
    const winChance = getWinProbability(currentMult);
    setGhostState("jumping");
    // Simulate jump animation (800ms) then determine outcome.
    setTimeout(() => {
      if (Math.random() < winChance) {
        // Successful jump: move to the next floor.
        setCurrentFloor((prev) => prev + 1);
        setGhostState("idle");
        // Auto-cashout if the multiplier would reach/exceed the max.
        if (getMultiplier(currentFloor + 1) >= MAX_MULTIPLIER) {
          handleCashOut();
        }
      } else {
        // Jump failed: ghost falls.
        setGhostState("falling");
        setTimeout(() => {
          setGameResult("Game Over");
          setIsPlaying(false);
          if (gameId) {
            axios.post(`${apiUrl}/game/end`, {
              gameId,
              result: "lose",
              winAmount: 0,
            });
          }
          setLosePopup(true);
        }, 800);
      }
    }, 800);
  };

  // Handle cashing out: notify backend and display win popup.
  const handleCashOut = async () => {
    if (cashoutClicked) return;
    setCashoutClicked(true);
    const bet = Number(betAmount);
    const multiplier = getMultiplier(currentFloor);
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
      const interval = setInterval(() => setCooldown((c) => c - 1), 1000);
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

        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Left Column: Game Container */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden relative">
            <div className="p-6 flex flex-col h-full items-center justify-center relative">
              {pregame ? (
                // Pregame screen with spooky mansion imagery.
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-gray-900 to-black">
                  <Image src="/placeholder.svg" alt="Mansion" fill className="object-cover opacity-50" />
                  {decorativeElements.map((elem, index) => (
                    <motion.div
                      key={index}
                      className="absolute"
                      style={{
                        top: elem.top,
                        left: elem.left,
                        opacity: 0.7,
                      }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Image
                        src={elem.type === "mansion" ? "/placeholder.svg" : "/placeholder2.svg"}
                        alt={elem.type === "mansion" ? "Mansion" : "Window"}
                        width={50}
                        height={50}
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
                      GHOST JUMP
                    </motion.h1>
                    <motion.p
                      className="text-xl tracking-wider mb-4"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#00FFFF" }}
                    >
                      Dare to Climb the Haunted Mansion
                    </motion.p>
                    <div className="mt-20">
                      <Image src="/ghostkasper.webp" alt="Ghost Kasper" width={96} height={96} />
                    </div>
                    <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                      <Button className="bg-[#49EACB] text-black" disabled>
                        Place Your Bet
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                // Game board: a single lane with the jump tile and ghost character.
                <div className="w-full h-[500px] relative bg-cover bg-center" style={{ backgroundImage: "url('/placeholder.svg')" }}>
                  {/* Jump Tile (using placeholder3.svg) at the current target floor */}
                  <motion.div
                    className="absolute"
                    style={{
                      bottom: currentFloor * FLOOR_HEIGHT,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                    animate={{ bottom: currentFloor * FLOOR_HEIGHT }}
                    transition={{ duration: 0.8 }}
                  >
                    <Image src="/placeholder3.svg" alt="Jump Tile" width={80} height={80} />
                  </motion.div>
                  {/* Ghost character – switches image when jumping */}
                  <motion.div
                    className="absolute"
                    style={{
                      bottom: currentFloor * FLOOR_HEIGHT,
                      left: "30%",
                    }}
                    animate={{ bottom: currentFloor * FLOOR_HEIGHT }}
                    transition={{ duration: 0.8 }}
                  >
                    <Image
                      src={ghostState === "jumping" ? "/ghostkasperjumping.webp" : "/ghostkasper.webp"}
                      alt="Ghost Kasper"
                      width={80}
                      height={80}
                    />
                  </motion.div>
                  {/* Clickable area for jump */}
                  {isPlaying && ghostState === "idle" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button onClick={handleJump} className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
                        Jump
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {isPlaying && currentFloor > 0 && (
                <motion.div className="mt-4">
                  <Button onClick={handleCashOut} disabled={cashoutClicked} className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
                    Cash Out (Payout: {Number(betAmount) * getMultiplier(currentFloor)} KAS)
                  </Button>
                </motion.div>
              )}
              <div className="mt-2">
                <p>Current Multiplier: {getMultiplier(currentFloor)}x</p>
                <p>Win Chance: {(getWinProbability(getMultiplier(currentFloor)) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </Card>

          {/* Right Column: Bet Controls, LiveChat & LiveWins */}
          <div className="space-y-6">
            <GhostJumpControls
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
            Ghost Jump
          </motion.h2>
          <img src="/ghostpromo.png" alt="Ghost Jump Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Jump floor by floor in the haunted mansion. Each successful jump increases your multiplier,
            but one misstep and you'll fall!
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
                You cashed out for {Number(betAmount) * getMultiplier(currentFloor)} KAS
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

// -----------------------------------------------------------------
// Ghost Jump Controls Component (Bet Controls, etc.)
// -----------------------------------------------------------------
function GhostJumpControls({ betAmount, setBetAmount, isPlaying, isWalletConnected, balance, onStartGame, gameResult, cooldown }) {
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const showError = (msg) => setErrorMessage(msg);

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
                  : "Start Ghost Jump"}
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
