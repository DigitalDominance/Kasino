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
import { Montserrat } from "next/font/google";
import { useWallet } from "@/contexts/WalletContext";
import { XPDisplay } from "@/app/page";
import { SiteFooter } from "@/components/site-footer";

// ---------------------------------------------------------
// Font & Constants
// ---------------------------------------------------------
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

const MIN_BET = 1;
const MAX_BET = 1000;
const FLOOR_HEIGHT = 80; // pixel height per floor for positioning the ghost

// Multiplier function: exponential growth with cap at 50x.
// The multiplier for a given floor is calculated as Math.pow(1.1, floor)
// and capped at 50.
const getMultiplier = (floor: number) =>
  Math.min(Number(Math.pow(1.1, floor).toFixed(2)), 50);

// ---------------------------------------------------------
// Ghost Jump Page Component
// ---------------------------------------------------------
export default function GhostJumpPage() {
  return <GhostJumpContent />;
}

function GhostJumpContent() {
  const { isConnected, balance } = useWallet();
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [currentFloor, setCurrentFloor] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [cashoutPopup, setCashoutPopup] = useState(false);
  const [losePopup, setLosePopup] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Create some spooky decorative elements for the pregame screen.
  const decorativeElements = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      top: Math.random() * 80 + "%",
      left: Math.random() * 80 + "%",
    }));
  }, []);

  // Reset game state.
  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setGameId(null);
    setDepositTxid(null);
    setPregame(true);
    setCurrentFloor(0);
    setIsJumping(false);
  };

  // Start game: deduct bet and notify the backend.
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
      setPregame(false);
      setIsPlaying(true);
      setGameResult(null);
      setCurrentFloor(0);
      setIsJumping(false);
    } catch (error: any) {
      console.error("Error starting Ghost Jump:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Handle a jump attempt.
  const handleJump = () => {
    if (isJumping || !isPlaying) return;
    // Determine the multiplier for the next floor.
    const nextMultiplier = getMultiplier(currentFloor + 1);
    // Calculate the win probability to favor the house by 7.5%.
    // (For a fair game, you'd use p = 1/nextMultiplier; here we use 0.925/nextMultiplier.)
    const winProbability = Math.min(0.925 / nextMultiplier, 1);
    setIsJumping(true);

    // Simulate the jump animation (800ms) then decide win or loss.
    setTimeout(() => {
      const outcome = Math.random() < winProbability;
      if (outcome) {
        // Successful jump: update floor and check for max multiplier.
        setCurrentFloor((prev) => prev + 1);
        setIsJumping(false);
        if (nextMultiplier === 50) {
          handleCashOut();
        }
      } else {
        // Failed jump: animate falling and end game.
        setGameResult("Game Over");
        setIsPlaying(false);
        if (gameId) {
          axios.post(`${apiUrl}/game/end`, {
            gameId,
            result: "lose",
            winAmount: 0,
          });
        }
        setTimeout(() => {
          setIsJumping(false);
          setLosePopup(true);
        }, 500);
      }
    }, 800);
  };

  // Cash out the game.
  const handleCashOut = async () => {
    if (!isPlaying) return;
    const bet = Number(betAmount);
    const currentMultiplier = getMultiplier(currentFloor);
    const payout = bet * currentMultiplier;
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
            <Button variant="ghost" className="text-[#49EACB]">
              <span>Wallet</span>
            </Button>
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
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Left Column: Game Container */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden relative">
            {pregame ? (
              <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-black to-purple-900 bg-opacity-80">
                {decorativeElements.map((pos, index) => (
                  <motion.div
                    key={index}
                    className="absolute"
                    style={{ top: pos.top, left: pos.left, opacity: 0.5 }}
                    whileHover={{ scale: 1.2 }}
                  >
                    <Image
                      src="/ghosticon.png" // placeholder ghost icon for decoration
                      alt="Ghost Icon"
                      width={30}
                      height={30}
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
                  <motion.div
                    className="mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  >
                    <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                      Place Your Bet
                    </Button>
                  </motion.div>
                </div>
              </div>
            ) : (
              // Game Board: Spooky mansion scene with a single lane.
              <div
                className="relative w-full h-[600px] bg-cover bg-center"
                style={{ backgroundImage: "url('/placeholder.svg')" }}
              >
                {/* Add window decorations */}
                <div className="absolute top-10 left-10">
                  <Image src="/placeholder2.svg" alt="Mansion Window" width={100} height={100} />
                </div>
                <div className="absolute top-20 right-10">
                  <Image src="/placeholder2.svg" alt="Mansion Window" width={100} height={100} />
                </div>
                {/* Jump Tile for the next floor */}
                <div
                  className="absolute left-1/2 transform -translate-x-1/2"
                  style={{ bottom: (currentFloor + 1) * FLOOR_HEIGHT }}
                >
                  <Image src="/placeholder3.svg" alt="Jump Tile" width={80} height={20} />
                </div>
                {/* Ghost Character */}
                <motion.div
                  className="absolute left-1/2 transform -translate-x-1/2"
                  animate={{
                    bottom: isJumping
                      ? (currentFloor + 1) * FLOOR_HEIGHT
                      : currentFloor * FLOOR_HEIGHT,
                  }}
                  transition={{ duration: 0.8 }}
                >
                  <Image
                    src={isJumping ? "/ghostkasperjumping.webp" : "/ghostkasper.webp"}
                    alt="Ghost Kasper"
                    width={60}
                    height={60}
                  />
                </motion.div>
              </div>
            )}
            {/* Jump and Cash Out Buttons */}
            {!pregame && (
              <div className="p-4 flex justify-between">
                {isPlaying && (
                  <>
                    <Button
                      onClick={handleJump}
                      disabled={isJumping}
                      className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                    >
                      Jump (Multiplier: {getMultiplier(currentFloor + 1)}×)
                    </Button>
                    <Button
                      onClick={handleCashOut}
                      className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                    >
                      Cash Out (Payout: {Number(betAmount) * getMultiplier(currentFloor)} KAS)
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Right Column: Bet Controls */}
          <GhostJumpControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            isPlaying={isPlaying}
            isWalletConnected={isConnected}
            balance={balance}
            onStartGame={handleStartGame}
            gameResult={gameResult}
          />
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
          <img src="/ghostjumppromo.png" alt="Ghost Jump Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Take a leap of faith in the haunted mansion. Each successful jump increases your multiplier,
            but one misstep and you fall!
          </p>
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

// ---------------------------------------------------------
// Ghost Jump Controls Component
// ---------------------------------------------------------
interface GhostJumpControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  gameResult: string | null;
}

function GhostJumpControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  gameResult,
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
                disabled={!isWalletConnected}
              >
                {!isWalletConnected ? "Connect Wallet to Play" : "Start Ghost Jump"}
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
