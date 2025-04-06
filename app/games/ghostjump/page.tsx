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
import { XPDisplay } from "@/app/page";

// Font & Constants
const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

const MIN_BET = 1;
const MAX_BET = 1000;
const MAX_MULTIPLIER = 50;
const HOUSE_EDGE = 0.075; // 7.5% house edge

// Image assets
const GHOST_NORMAL = "/ghostkasper.webp";
const GHOST_JUMPING = "/ghostkasperjumping.webp";
const SPACE_TILE = "/ghosttile.webp";
const JUMP_TILE = "/ghosttile3.webp";

// Calculate win probability with house edge
const getWinProbability = (currentMultiplier: number) => {
  const rawProbability = 1 / currentMultiplier;
  return rawProbability * (1 - HOUSE_EDGE);
};

// Generate a sequence of tiles with increasing difficulty
const generateTiles = () => {
  const tiles = [];

  // First tile: guaranteed 1.0x tile (position 1)
  tiles.push({
    multiplier: 1.0,
    isWin: true,
    position: tiles.length + 1,
  });

  // Second tile: 1.2x tile (position 2)
  const winProbabilityTile2 = getWinProbability(1.2);
  tiles.push({
    multiplier: 1.2,
    isWin: Math.random() < winProbabilityTile2,
    position: tiles.length + 1,
  });

  // Continue with 1.7x and beyond
  let currentMultiplier = 1.7;
  while (currentMultiplier <= MAX_MULTIPLIER) {
    const winProbability = getWinProbability(currentMultiplier);
    tiles.push({
      multiplier: Number(currentMultiplier.toFixed(2)),
      isWin: Math.random() < winProbability,
      position: tiles.length + 1,
    });

    // Increase multiplier more aggressively
    if (currentMultiplier < 5) {
      currentMultiplier += 0.5;
    } else if (currentMultiplier < 15) {
      currentMultiplier += 1;
    } else {
      currentMultiplier += 2;
    }
  }

  return tiles;
};

// Space Jump Game Component (tiles revert to original behavior)
function SpaceJumpGame({
  tiles,
  currentPosition,
  onTileClick,
  isJumping,
  isFalling,
  hasLost,
  hasWon,
}: {
  tiles: { multiplier: number; isWin: boolean; position: number }[];
  currentPosition: number;
  onTileClick: () => void;
  isJumping: boolean;
  isFalling: boolean;
  hasLost: boolean;
  hasWon: boolean;
}) {
  const visibleTiles = tiles.slice(
    Math.max(0, currentPosition - 2),
    Math.min(tiles.length, currentPosition + 3)
  );

  return (
    <div className="relative h-[600px] w-full mx-auto">
      {/* Space background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-blue-900 to-purple-900 rounded-lg overflow-hidden shadow-2xl">
        {/* Stars */}
        <div className="absolute top-0 left-0 w-full h-full opacity-80">
          {Array.from({ length: 100 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{
                duration: Math.random() * 5 + 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Moon in background */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-32 h-32 z-0">
          <Image
            src="/ghostmoon.webp"
            alt="Moon"
            width={128}
            height={128}
            className="object-contain"
          />
        </div>
      </div>

      {/* Platforms container (original layout) */}
      <div className="relative h-full flex flex-col-reverse justify-end pb-8">
        {visibleTiles.map((tile) => {
          const isActive = tile.position === currentPosition + 1;
          const isCurrent = tile.position === currentPosition;
          const isPast = tile.position < currentPosition;

          return (
            <motion.div
              key={tile.position}
              className={`w-32 h-24 mx-auto mb-8 relative transition-all duration-300 ${
                isPast ? "opacity-50" : "opacity-100"
              }`}
              initial={{ y: 100, opacity: 0 }}
              animate={{
                y: 0,
                opacity: isPast ? 0.5 : 1,
                scale: isCurrent ? 1.15 : 1,
              }}
              transition={{ duration: 0.5 }}
            >
              {/* Current platform glow */}
              {isCurrent && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-2 bg-blue-500 rounded-full blur-sm" />
              )}

              {/* Platform image */}
              <div className="relative w-full h-full">
                <Image
                  src={SPACE_TILE}
                  alt="Space platform"
                  fill
                  className={`object-contain transition-transform duration-300 ${
                    isCurrent ? "scale-110" : ""
                  }`}
                />
                {/* Multiplier display */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold text-sm">
                  {tile.multiplier}x
                </div>
              </div>

              {/* Next platform indicator */}
              {isActive && !hasLost && !hasWon && (
                <motion.div
                  className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-24 h-20 cursor-pointer z-20"
                  onClick={onTileClick}
                  whileHover={{ scale: 1.05 }}
                  animate={{
                    y: [0, -10, 0],
                    opacity: [1, 0.8, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={JUMP_TILE}
                      alt="Jump target"
                      fill
                      className="object-contain drop-shadow-[0_0_8px_rgba(73,234,203,0.5)]"
                    />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold text-sm">
                      {tile.multiplier}x
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Ghost character pinned in place (ghost stays at the original tile location) */}
      <motion.div
        className="absolute left-1/2 w-24 h-24 z-10"
        style={{
          bottom: "11rem",
          x: "-50%",
        }}
        animate={{
          y: isJumping
            ? [0, -60, 0]
            : isFalling
            ? [0, 200, 400]
            : 0,
          rotate: isFalling ? [0, 15, 45, 90] : 0,
          filter: isJumping ? "drop-shadow(0 0 12px rgba(73,234,203,0.8))" : "none",
        }}
        transition={{
          duration: isJumping ? 0.8 : isFalling ? 1.5 : 0,
          ease: isJumping ? "easeOut" : isFalling ? "easeIn" : "linear",
        }}
      >
        <Image
          src={isJumping ? GHOST_JUMPING : GHOST_NORMAL}
          alt="Ghost character"
          fill
          className="object-contain"
        />
      </motion.div>
    </div>
  );
}

// Main Page Component
export default function SpaceJumpPage() {
  return <SpaceJumpContent />;
}

function SpaceJumpContent() {
  const { isConnected, balance } = useWallet();
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [cashoutPopup, setCashoutPopup] = useState(false);
  const [losePopup, setLosePopup] = useState(false);
  const [cashoutClicked, setCashoutClicked] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [tiles, setTiles] = useState<{ multiplier: number; isWin: boolean; position: number }[]>([]);
  const [currentPosition, setCurrentPosition] = useState(1);
  const [isJumping, setIsJumping] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Generate decorative ghosts with random positions
  const decorativeGhosts = useMemo(() => {
    return Array.from({ length: 15 }).map(() => ({
      top: Math.random() * 80 + "%",
      left: Math.random() * 80 + "%",
      size: Math.random() * 30 + 20,
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, []);

  // Initialize game
  const initGame = () => {
    const generatedTiles = generateTiles();
    setTiles(generatedTiles);
    setCurrentPosition(1);
    setCurrentMultiplier(1);
    setHasLost(false);
    setHasWon(false);
    setIsJumping(false);
    setIsFalling(false);
    setCashoutClicked(false);
  };

  // Start game: deduct bet and notify backend
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

      initGame();
      setIsPlaying(true);
      setPregame(false);
      setGameResult(null);
    } catch (error: any) {
      console.error("Error starting Ghost Jump:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Handle jump to next tile
  const handleJump = () => {
    if (isJumping || isFalling || hasLost || hasWon) return;
    setIsJumping(true);

    setTimeout(() => {
      setIsJumping(false);
      const nextTile = tiles.find((t) => t.position === currentPosition + 1);

      if (!nextTile) {
        // Reached the top
        setHasWon(true);
        handleCashOut();
        return;
      }

      if (nextTile.isWin) {
        // Successful jump
        setCurrentPosition(currentPosition + 1);
        setCurrentMultiplier(nextTile.multiplier);
      } else {
        // Failed jump
        setHasLost(true);
        setIsFalling(true);
        setGameResult("Game Over");

        if (gameId) {
          axios.post(`${apiUrl}/game/end`, {
            gameId,
            result: "lose",
            winAmount: 0,
          });
        }

        setTimeout(() => {
          setIsPlaying(false);
          setLosePopup(true);
        }, 1500);
      }
    }, 800);
  };

  // Handle cash out
  const handleCashOut = async () => {
    if (cashoutClicked) return;
    setCashoutClicked(true);

    const bet = Number(betAmount);
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

        {/* Main Game & Right Column Controls */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Left Column: Game Container */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Ghost Jump</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {/* Pregame Screen */}
              {pregame ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-black to-blue-900 bg-opacity-80">
                  {decorativeGhosts.map((ghost, index) => (
                    <motion.div
                      key={index}
                      className="absolute"
                      style={{
                        top: ghost.top,
                        left: ghost.left,
                        width: `${ghost.size}px`,
                        height: `${ghost.size}px`,
                        opacity: ghost.opacity,
                      }}
                      animate={{
                        y: [0, -10, 0],
                        opacity: [ghost.opacity, ghost.opacity * 1.5, ghost.opacity],
                      }}
                      transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <Image
                        src={GHOST_NORMAL}
                        alt="Ghost"
                        fill
                        className="object-contain"
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
                      Ghost JUMP
                    </motion.h1>
                    <motion.p
                      className="text-xl tracking-wider mb-4"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#B19CD9" }}
                    >
                      CLIMB THROUGH SPACE
                    </motion.p>
                    <div className="mt-20">
                      <Image src={GHOST_NORMAL} alt="Ghost Icon" width={96} height={96} />
                    </div>
                    <motion.div
                      className="mt-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1 }}
                    >
                      <Button
                        className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                        onClick={handleStartGame}
                        disabled={!isConnected || cooldown > 0}
                      >
                        {!isConnected
                          ? "Connect Wallet to Play"
                          : cooldown > 0
                          ? `Start Game (${cooldown}s)`
                          : "Start Ghost Jump"}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                // Game Board
                <div className="w-full">
                  <SpaceJumpGame
                    tiles={tiles}
                    currentPosition={currentPosition}
                    onTileClick={handleJump}
                    isJumping={isJumping}
                    isFalling={isFalling}
                    hasLost={hasLost}
                    hasWon={hasWon}
                  />

                  {isPlaying && currentPosition > 1 && (
                    <motion.div className="mt-4 text-center">
                      <div className="text-lg font-bold text-[#49EACB] mb-2">
                        Current Multiplier: {currentMultiplier}x
                      </div>
                      <Button
                        onClick={handleCashOut}
                        disabled={cashoutClicked || isFalling || hasLost}
                        className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                      >
                        Cash Out (Payout: {Number(betAmount) * currentMultiplier} KAS)
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Right Column: Bet Controls, LiveChat & LiveWins */}
          <div className="space-y-6">
            <SpaceJumpControls
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
              backgroundImage: "linear-gradient(270deg, #49EACB, #B19CD9, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Ghost Jump
          </motion.h2>
          <div className="relative w-full h-48 mb-4 bg-gradient-to-b from-gray-900 to-blue-900 rounded-lg overflow-hidden">
            <Image
              src={GHOST_JUMPING}
              alt="Ghost Jump Promo"
              fill
              className="object-contain"
            />
          </div>
          <p className="text-lg text-white mb-4">
            Jump through space platforms one at a time. Each successful jump increases your payout,
            but one wrong step sends you falling into the void!
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
                You cashed out for {Number(betAmount) * currentMultiplier} KAS
              </p>
              <Button
                className="bg-black text-[#49EACB] hover:bg-black/80"
                onClick={() => {
                  setCashoutPopup(false);
                  resetGame();
                }}
              >
                Play Again
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
              className="bg-blue-700 p-6 rounded-lg shadow-2xl text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-3xl font-bold mb-4">Game Over</h2>
              <p className="text-xl mb-6">You fell into space!</p>
              <Button
                className="bg-black text-blue-400 hover:bg-black/80"
                onClick={() => {
                  setLosePopup(false);
                  resetGame();
                }}
              >
                Try Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Space Jump Controls Component
function SpaceJumpControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  gameResult,
  cooldown,
}: {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  gameResult: string | null;
  cooldown: number;
}) {
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
    if (isNaN(bet)) {
      showError("Please enter a valid bet amount");
      return;
    }
    if (bet < MIN_BET || bet > MAX_BET) {
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
            className="fixed bottom-4 left-4 bg-gradient-to-r from-blue-700 to-black text-white px-4 py-2 rounded shadow-lg"
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
