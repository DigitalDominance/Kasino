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

// Road/tile sizing
const ROAD_WIDTH = 160; // width of each road lane container
const ROAD_HEIGHT = 280; // height of each road lane container
const TILE_SIZE = 80;    // tile size (centered inside the lane)
const CHARACTER_SIZE = 100; // Kaspian is 25% bigger (was 80)
const CAR_SIZE = 128;    // Car on loss is 33% bigger (was 96px)

// Image assets
const KASPIAN_NORMAL = "/kaspian.webp";
const KASPIAN_JUMPING = "/kaspian.webp"; // Same image for normal/jump
const ROAD_LANE = "/kaspianroadlane.webp";
const ROAD_TILE = "/kaspiantile.webp";
const KASPIAN_CAR = "/kaspiancar.webp";
const KASPA_LOGO_PUBLIC = "/kaspa-kas-logo.webp"; // Big Kaspa logo
const KASPA_LOGO_FALLING =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp";

// Calculate win probability with house edge
function getWinProbability(currentMultiplier: number) {
  const rawProbability = 1 / currentMultiplier;
  return rawProbability * (1 - HOUSE_EDGE);
}

// Generate tiles with increasing difficulty
// Changed default count from 10 to 15.
function generateTiles(count = 15) {
  const tiles = [];

  // First tile: guaranteed 1.0x
  tiles.push({
    multiplier: 1.0,
    isWin: true,
    position: 1,
  });

  // Second tile: 1.2x
  const winProbabilityTile2 = getWinProbability(1.2);
  tiles.push({
    multiplier: 1.2,
    isWin: Math.random() < winProbabilityTile2,
    position: 2,
  });

  // Subsequent tiles
  let currentMultiplier = 1.7;
  while (tiles.length < count && currentMultiplier <= MAX_MULTIPLIER) {
    const winProbability = getWinProbability(currentMultiplier);
    tiles.push({
      multiplier: Number(currentMultiplier.toFixed(2)),
      isWin: Math.random() < winProbability,
      position: tiles.length + 1,
    });

    // Increase multiplier
    if (currentMultiplier < 5) {
      currentMultiplier += 0.5;
    } else if (currentMultiplier < 15) {
      currentMultiplier += 1;
    } else {
      currentMultiplier += 2;
    }
  }

  return tiles;
}

// Kaspian Cross Game Component
function KaspianCrossGame({
  tiles,
  currentPosition,
  onTileClick,
  isJumping,
  isFalling,
  hasLost,
  hasWon,
  addNewTile,
}: {
  tiles: { multiplier: number; isWin: boolean; position: number }[];
  currentPosition: number;
  onTileClick: () => void;
  isJumping: boolean;
  isFalling: boolean;
  hasLost: boolean;
  hasWon: boolean;
  addNewTile: () => void;
}) {
  // Use 15 tiles initially
  const [visibleTiles, setVisibleTiles] = useState(() => generateTiles(15));
  const [scrollOffset, setScrollOffset] = useState(0);

  // Whenever currentPosition changes, generate one new tile.
  useEffect(() => {
    addNewTile();
  }, [currentPosition]);

  // Whenever tiles update, update visibleTiles.
  useEffect(() => {
    setVisibleTiles(tiles);
  }, [tiles]);

  // Auto-scroll camera: shift so upcoming tiles become visible
  useEffect(() => {
    const maxVisibleBeforeScroll = 3;
    if (currentPosition > maxVisibleBeforeScroll) {
      setScrollOffset((currentPosition - maxVisibleBeforeScroll) * ROAD_WIDTH);
    } else {
      setScrollOffset(0);
    }
  }, [currentPosition]);

  // Position rows in a 600px container
  const mainRowTop = 160; // main row is fully visible at y=160
  const tileCenterY = mainRowTop + ROAD_HEIGHT / 2;

  // Character's horizontal offset
  const characterLeft =
    (currentPosition - 1) * ROAD_WIDTH + ROAD_WIDTH / 2 - CHARACTER_SIZE / 2;

  // Move Kaspian up so that about 60% of his body is above the tile center
  const characterTop = tileCenterY - CHARACTER_SIZE * 0.6;

  // Shift the car slightly left
  const lossCarLeft = characterLeft - CAR_SIZE * 0.1;

  return (
    // Outer container uses overflow-hidden to prevent scrollbars.
    <div className="relative h-[600px] w-full mx-auto overflow-hidden bg-gradient-to-b from-green-900 to-purple-900">
      {/* Camera container that scrolls horizontally */}
      <motion.div
        className="absolute inset-0"
        animate={{ x: -scrollOffset }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Top row (partially visible) */}
        <div
          className="absolute left-0 flex"
          style={{
            top: -120,
            height: ROAD_HEIGHT,
            gap: 0,
          }}
        >
          {visibleTiles.map((tile) => (
            <div
              key={"top" + tile.position}
              className="relative flex-shrink-0"
              style={{
                width: ROAD_WIDTH,
                height: ROAD_HEIGHT,
              }}
            >
              <Image
                src={ROAD_LANE}
                alt="Road lane top"
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Main row (fully visible) */}
        <div
          className="absolute left-0 flex"
          style={{
            top: mainRowTop,
            height: ROAD_HEIGHT,
            gap: 0,
          }}
        >
          {visibleTiles.map((tile) => {
            const isPast = tile.position < currentPosition;
            const isCurrent = tile.position === currentPosition;
            const isActive = tile.position === currentPosition + 1;

            return (
              <motion.div
                key={tile.position}
                className="relative flex-shrink-0"
                style={{
                  width: ROAD_WIDTH,
                  height: ROAD_HEIGHT,
                  opacity: isPast ? 0.5 : 1,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: isPast ? 0.5 : 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Middle lane background */}
                <Image
                  src={ROAD_LANE}
                  alt="Road lane"
                  fill
                  className="object-cover"
                />

                {/* Centered tile */}
                <div
                  className="absolute"
                  style={{
                    top: "50%",
                    left: "50%",
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <Image
                    src={ROAD_TILE}
                    alt="Road tile"
                    fill
                    className={`object-contain transition-transform duration-300 ${
                      isCurrent ? "scale-110" : ""
                    }`}
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-sm">
                    {tile.multiplier}x
                  </div>
                </div>

                {/* Clickable overlay for the next tile */}
                {isActive && !hasLost && !hasWon && (
                  <motion.div
                    className="absolute top-0 left-0 w-full h-full cursor-pointer z-20"
                    onClick={onTileClick}
                    whileHover={{ scale: 1.05 }}
                  />
                )}

                {/* Glow for current tile */}
                {isCurrent && (
                  <div className="absolute left-1/2 -bottom-3 -translate-x-1/2 w-12 h-2 bg-blue-500 rounded-full blur-sm" />
                )}
              </motion.div>
            );
          })}

          {/* Kaspian character */}
          <motion.div
            className="absolute z-10"
            style={{
              width: CHARACTER_SIZE,
              height: CHARACTER_SIZE,
              left: characterLeft,
              top: 0,
            }}
            animate={{
              y: isJumping ? [0, -20, 0] : isFalling ? [0, 100, 200] : 0,
              filter: isJumping
                ? "drop-shadow(0 0 12px rgba(73,234,203,0.8))"
                : "none",
            }}
            transition={{
              duration: isJumping ? 0.8 : isFalling ? 1.5 : 0.5,
              ease: isJumping ? "easeOut" : isFalling ? "easeIn" : "easeInOut",
            }}
          >
            <Image
              src={isJumping ? KASPIAN_JUMPING : KASPIAN_NORMAL}
              alt="Kaspian"
              fill
              className="object-contain"
              style={{
                position: "absolute",
                top: characterTop - mainRowTop,
                left: 0,
              }}
            />
          </motion.div>

          {/* Car on loss – high z-index so it stays on top */}
          {hasLost && (
            <motion.div
              className="absolute z-[9999]"
              style={{
                width: CAR_SIZE,
                height: CAR_SIZE,
                left: lossCarLeft,
                top: 0,
              }}
              initial={{ y: -600 }}
              animate={{ y: 600 }}
              transition={{ duration: 2, ease: "linear" }}
            >
              <Image
                src={KASPIAN_CAR}
                alt="Car"
                fill
                className="object-contain rotate-180"
              />
            </motion.div>
          )}
        </div>

        {/* Bottom row (partially visible) */}
        <div
          className="absolute left-0 flex"
          style={{
            top: 440,
            height: ROAD_HEIGHT,
            gap: 0,
          }}
        >
          {visibleTiles.map((tile) => (
            <div
              key={"bot" + tile.position}
              className="relative flex-shrink-0"
              style={{
                width: ROAD_WIDTH,
                height: ROAD_HEIGHT,
              }}
            >
              <Image
                src={ROAD_LANE}
                alt="Road lane bottom"
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// Main Page Component
export default function KaspianCrossPage() {
  return <KaspianCrossContent />;
}

function KaspianCrossContent() {
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

  // Tiles & positions
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

  // Initialize game with 15 starting tiles
  const initGame = () => {
    const generatedTiles = generateTiles(15);
    setTiles(generatedTiles);
    setCurrentPosition(1);
    setCurrentMultiplier(1);
    setHasLost(false);
    setHasWon(false);
    setIsJumping(false);
    setIsFalling(false);
    setCashoutClicked(false);
  };

  // Add a new tile (generated individually) after each jump
  const addNewTile = () => {
    const newTile = generateTiles(1)[0];
    setTiles((prev) => [...prev, { ...newTile, position: prev.length + 1 }]);
  };

  // Start game
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

      // Randomly choose between two treasury addresses
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
        gameName: "Kaspian Cross",
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
      console.error("Error starting Kaspian Cross:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Jump to next tile
  const handleJump = () => {
    if (isJumping || isFalling || hasLost || hasWon) return;

    setIsJumping(true);

    setTimeout(() => {
      setIsJumping(false);
      const nextTile = tiles.find((t) => t.position === currentPosition + 1);

      if (!nextTile) {
        // Reached the end – you win
        setHasWon(true);
        handleCashOut();
        return;
      }

      if (nextTile.isWin) {
        // Successful jump: move to the next tile and update multiplier
        setCurrentPosition((pos) => pos + 1);
        setCurrentMultiplier(nextTile.multiplier);
      } else {
        // Failed jump: trigger loss
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

  // Cash out
  const handleCashOut = async () => {
    if (cashoutClicked || hasLost) return;
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

  // Simple cooldown for the "Start Game" button
  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown]);

  // Pregame background animation elements
  const roadElements = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 80 + 10 + "%",
      size: Math.random() * 40 + 20,
      delay: Math.random() * 2,
      speed: Math.random() * 3 + 1,
    }));
  }, []);

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

        {/* Main Game & Controls */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Left Column: Game */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspian Cross</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {/* Pregame Screen */}
              {pregame ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-green-900 to-purple-900">
                  {roadElements.map((element) => {
                    const isCar = Math.random() > 0.5;
                    return (
                      <motion.div
                        key={element.id}
                        className="absolute"
                        style={{
                          left: element.left,
                          top: `${Math.random() * 80 + 10}%`,
                          width: `${element.size}px`,
                          height: `${element.size}px`,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: [0, 0.8, 0],
                          y: ["-50%", "150%"],
                        }}
                        transition={{
                          delay: element.delay,
                          duration: element.speed,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Image
                          src={isCar ? KASPIAN_CAR : KASPA_LOGO_FALLING}
                          alt="Falling object"
                          fill
                          className={`object-contain ${isCar ? "rotate-180" : ""}`}
                        />
                      </motion.div>
                    );
                  })}

                  <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
                    <motion.h1
                      className="text-5xl font-bold mb-4"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#49EACB" }}
                    >
                      Kaspian CROSS
                    </motion.h1>
                    <motion.p
                      className="text-xl tracking-wider mb-4"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#B19CD9" }}
                    >
                      CROSS THE ROAD
                    </motion.p>
                    <div className="mt-20">
                      <Image src={KASPIAN_NORMAL} alt="Kaspian Icon" width={96} height={96} />
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
                          : "Start Kaspian Cross"}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                // Actual Game Board
                <div className="w-full">
                  <KaspianCrossGame
                    tiles={tiles}
                    currentPosition={currentPosition}
                    onTileClick={handleJump}
                    isJumping={isJumping}
                    isFalling={isFalling}
                    hasLost={hasLost}
                    hasWon={hasWon}
                    addNewTile={addNewTile}
                  />

                  {isPlaying && currentPosition > 1 && (
                    <motion.div className="mt-4 text-center">
                      <div className="text-lg font-bold text-[#49EACB] mb-2">
                        Current Multiplier: {currentMultiplier}x
                      </div>
                      <Button
                        onClick={handleCashOut}
                        disabled={cashoutClicked || hasLost}
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

          {/* Right Column: Bet Controls, Live Chat, Live Wins */}
          <div className="space-y-6">
            <KaspianCrossControls
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
        <PromoCard />
      </div>
      <SiteFooter />

      {/* Cash Out Popup */}
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

      {/* Loss Popup */}
      <AnimatePresence>
        {losePopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-purple-700 p-6 rounded-lg shadow-2xl text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-3xl font-bold mb-4">Game Over</h2>
              <p className="text-xl mb-6">You got hit by a car!</p>
              <Button
                className="bg-black text-purple-400 hover:bg-black/80"
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

// Promo / Info Card
function PromoCard() {
  // Random “pop up” animation for each of the 3 images
  const randomDelay1 = useMemo(() => Math.random() * 3 + 0.5, []);
  const randomDelay2 = useMemo(() => Math.random() * 3 + 0.5, []);
  const randomDelay3 = useMemo(() => Math.random() * 3 + 0.5, []);

  return (
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
        Kaspian Cross
      </motion.h2>

      {/* Row with the 3 images: Logo (left), Kaspian (middle), Car (right) */}
      <div className="relative w-full h-48 mb-4 bg-gradient-to-b from-green-900 to-purple-900 rounded-lg overflow-hidden">
        <div className="relative w-full h-full grid grid-cols-3 items-center">
          {/* Kaspa Logo - pinned left, shift right by 15px */}
          <motion.div
            className="justify-self-start ml-[15px]"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              repeat: Infinity,
              repeatDelay: randomDelay1,
              duration: 0.8,
              ease: "easeInOut",
            }}
          >
            <Image
              src={KASPA_LOGO_PUBLIC}
              alt="Kaspa Logo"
              width={96}
              height={96}
              className="z-10"
            />
          </motion.div>

          {/* Kaspian - center */}
          <motion.div
            className="justify-self-center z-10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              repeat: Infinity,
              repeatDelay: randomDelay2,
              duration: 0.8,
              ease: "easeInOut",
            }}
          >
            <Image
              src={KASPIAN_NORMAL}
              alt="Kaspian"
              width={96}
              height={96}
            />
          </motion.div>

          {/* Car - pinned right, shift left by 5px */}
          <motion.div
            className="justify-self-end mr-[5px] z-10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              repeat: Infinity,
              repeatDelay: randomDelay3,
              duration: 0.8,
              ease: "easeInOut",
            }}
          >
            <Image
              src={KASPIAN_CAR}
              alt="Car"
              width={128}
              height={128}
              className="rotate-180"
            />
          </motion.div>
        </div>
      </div>

      <p className="text-lg text-white mb-4 px-4 leading-7">
        Cross the road one tile at a time and increase your payout. But beware, avoid the Solana
        cars that are waiting to hit you if you lose!
      </p>
    </Card>
  );
}

// Kaspian Cross Controls Component
function KaspianCrossControls({
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
                  src={KASPA_LOGO_FALLING}
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
                onClick={() =>
                  setBetAmount(Math.min(MAX_BET, balance).toString())
                }
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
                  : "Start Kaspian Cross"}
              </Button>
            ) : (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                disabled
              >
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
