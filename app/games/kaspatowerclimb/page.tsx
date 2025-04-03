"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useWallet } from "@/contexts/WalletContext";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import { XPDisplay } from "@/app/page";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

const MIN_BET = 1;
const MAX_BET = 1000;
const MAX_MULTIPLIER = 50;

// Calculate multiplier based on floor number.
// We use an exponential growth of 1.1^floor (floors start at 0 for the ground level),
// then cap it at 50x.
function calculateMultiplier(floor: number) {
  const mult = Math.pow(1.1, floor);
  return Math.min(Number(mult.toFixed(2)), MAX_MULTIPLIER);
}

// The success probability for a jump is set so that expected payout is reduced by a 7.5% house edge.
// For the next jump (floor + 1), probability = 0.925 / (multiplier for next floor) (clamped at 1).
function getSuccessProbability(currentFloor: number) {
  const nextMult = calculateMultiplier(currentFloor + 1);
  let prob = 0.925 / nextMult;
  return prob > 1 ? 1 : prob;
}

export default function GhostJumpPage() {
  return <GhostJumpGame />;
}

function GhostJumpGame() {
  const { isConnected, balance } = useWallet();
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [currentFloor, setCurrentFloor] = useState(0); // ground floor
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [jumping, setJumping] = useState(false);
  const [falling, setFalling] = useState(false);
  const [cashoutClicked, setCashoutClicked] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Decorative elements for the pregame screen
  const decorativeElements = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      top: Math.random() * 80 + "%",
      left: Math.random() * 80 + "%",
    }));
  }, []);

  // Start the game: validate the bet, deduct funds, and notify the backend.
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
      setCurrentFloor(0);
      setIsPlaying(true);
      setPregame(false);
      setGameResult(null);
    } catch (error: any) {
      console.error("Error starting Ghost Jump:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Handle the jump attempt. When the user clicks the active tile,
  // we determine success based on getSuccessProbability.
  const handleJump = () => {
    if (jumping || falling) return; // avoid multiple clicks during animations
    const nextFloor = currentFloor + 1;
    const successProb = getSuccessProbability(currentFloor);
    const outcome = Math.random() < successProb;
    setJumping(true);
    // Animate the jump (simulate a 1-second jump)
    setTimeout(() => {
      if (outcome) {
        // Win: ghost jumps up to the next floor
        setCurrentFloor(nextFloor);
        setJumping(false);
        // Auto cash out if max multiplier is reached
        if (calculateMultiplier(nextFloor) >= MAX_MULTIPLIER) {
          handleCashOut();
        }
      } else {
        // Loss: animate falling
        setJumping(false);
        setFalling(true);
        setTimeout(() => {
          setGameResult("Game Over");
          setIsPlaying(false);
          setFalling(false);
          if (gameId) {
            axios.post(`${apiUrl}/game/end`, {
              gameId,
              result: "lose",
              winAmount: 0,
            });
          }
        }, 1000);
      }
    }, 1000);
  };

  // Handle cash out manually.
  const handleCashOut = async () => {
    if (cashoutClicked) return;
    setCashoutClicked(true);
    const bet = Number(betAmount);
    const multiplier = calculateMultiplier(currentFloor);
    const payout = bet * multiplier;
    setGameResult("Cashed Out");
    setIsPlaying(false);
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
    setCurrentFloor(0);
    setCashoutClicked(false);
    setJumping(false);
    setFalling(false);
  };

  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown]);

  // Display a column of floors.
  // The bottom floor (index 0) is active and clickable.
  // A few upcoming floors are shown as a preview with multiplier overlays.
  const floorsToShow = 5;
  const floors = [];
  for (let i = 0; i < floorsToShow; i++) {
    const floorIndex = currentFloor + i;
    const multiplier = calculateMultiplier(floorIndex);
    floors.push({ floorIndex, multiplier });
  }

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6 relative">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
            </Link>
          </motion.div>
          <motion.div className="flex items-center gap-4">
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

        {/* Pregame Screen */}
        {pregame ? (
          <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-gray-900 to-black bg-opacity-80">
            {decorativeElements.map((pos, index) => (
              <motion.div
                key={index}
                className="absolute"
                style={{ top: pos.top, left: pos.left, opacity: 0.3 }}
                whileHover={{ scale: 1.2 }}
              >
                <Image src="/ghosticon.png" alt="Ghost Icon" width={30} height={30} />
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
                <Image src="/ghosticon.png" alt="Ghost Icon" width={96} height={96} />
              </div>
              <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                  Place Your Bet
                </Button>
              </motion.div>
            </div>
          </div>
        ) : (
          // Main Game Board
          <div className="relative w-full max-w-sm mx-auto">
            {/* Mansion background using placeholder.svg */}
            <div className="absolute inset-0">
              <Image src="/placeholder.svg" alt="Mansion" layout="fill" objectFit="cover" />
            </div>
            {/* Floors column */}
            <div className="relative z-10 flex flex-col-reverse items-center space-y-4">
              {floors.map((floor, index) => (
                <div key={index} className="relative flex items-center justify-center">
                  {index === 0 ? (
                    <motion.div
                      className="cursor-pointer"
                      onClick={handleJump}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Jump tile image using placeholder3.svg */}
                      <Image src="/placeholder3.svg" alt="Jump Tile" width={100} height={60} />
                      {/* Overlay multiplier */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-yellow-300">
                          {calculateMultiplier(currentFloor)}
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="relative">
                      <Image src="/placeholder3.svg" alt="Upcoming Tile" width={100} height={60} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-yellow-300">
                          {calculateMultiplier(currentFloor + index)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Ghost character always visible.
                When jumping, we use ghostkasperjumping.webp;
                otherwise ghostkasper.webp. The character’s vertical position is animated based on currentFloor.
            */}
            <motion.div
              className="absolute left-1/2 transform -translate-x-1/2"
              initial={{ bottom: "5%" }}
              animate={{
                bottom: falling ? "5%" : `${5 + currentFloor * 70}px`,
              }}
              transition={{ type: "spring", stiffness: 100 }}
            >
              <Image
                src={jumping ? "/ghostkasperjumping.webp" : "/ghostkasper.webp"}
                alt="Ghost Kasper"
                width={80}
                height={80}
              />
            </motion.div>
            {/* Cash Out Button */}
            {isPlaying && currentFloor > 0 && (
              <motion.div className="mt-4 text-center">
                <Button
                  onClick={handleCashOut}
                  disabled={cashoutClicked}
                  className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                >
                  Cash Out (Payout: {Number(betAmount) * calculateMultiplier(currentFloor)} KAS)
                </Button>
              </motion.div>
            )}
          </div>
        )}

        {/* Bet Controls */}
        <div className="mt-6">
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
        </div>
      </div>
      <SiteFooter />

      {/* Cash Out Popup */}
      <AnimatePresence>
        {gameResult === "Cashed Out" && (
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
                You cashed out for {Number(betAmount) * calculateMultiplier(currentFloor)} KAS
              </p>
              <Button className="bg-black text-[#49EACB] hover:bg-black/80" onClick={resetGame}>
                Reset Game
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loss Popup */}
      <AnimatePresence>
        {gameResult === "Game Over" && (
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
              <Button className="bg-black text-red-700 hover:bg-black/80" onClick={resetGame}>
                Reset Game
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface GhostJumpControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  gameResult: string | null;
  cooldown: number;
}

function GhostJumpControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  gameResult,
  cooldown,
}: GhostJumpControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

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
          </div>
          <Button
            className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
            onClick={handleStartClick}
            disabled={!isWalletConnected || isPlaying || cooldown > 0}
          >
            {!isWalletConnected
              ? "Connect Wallet to Play"
              : cooldown > 0
              ? `Start Game (${cooldown}s)`
              : "Start Ghost Jump"}
          </Button>
          {gameResult && (
            <div className="text-center">
              <div className="text-2xl font-bold text-[#49EACB]">Result: {gameResult}</div>
            </div>
          )}
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
