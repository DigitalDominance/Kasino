"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import axios from "axios";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { XPDisplay } from "@/app/page";

// Font & Constants
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });
const MIN_BET = 1;
const MAX_BET = 1000;
const HOUSE_EDGE = 0.075; // 7.5% house edge

// Placeholder multipliers – must match your backend CROSS_MULTIPLIERS
const CROSS_MULTIPLIERS = [2, 3, 5, 10, 20, 50];

// Road/tile sizing
const ROAD_WIDTH = 160;
const ROAD_HEIGHT = 280;
const TILE_SIZE = 80;
const CHARACTER_SIZE = 100;
const CAR_SIZE = 128;

// Loading messages
const messages = [
  "Verifying transaction",
  "Hashing game seed",
  "Building lanes",
];

// Kaspian Cross Game Component
function KaspianCrossGame({
  tiles,
  currentPosition,
  onTileClick,
  isJumping,
  isFalling,
  hasLost,
}) {
  // Auto-scroll logic
  const [scrollOffset, setScrollOffset] = useState(0);
  useEffect(() => {
    const maxVisibleBeforeScroll = 3;
    if (currentPosition > maxVisibleBeforeScroll) {
      setScrollOffset((currentPosition - maxVisibleBeforeScroll) * ROAD_WIDTH);
    } else {
      setScrollOffset(0);
    }
  }, [currentPosition]);

  const mainRowTop = 160;
  const tileCenterY = mainRowTop + ROAD_HEIGHT / 2;
  const characterLeft =
    (currentPosition - 1) * ROAD_WIDTH + ROAD_WIDTH / 2 - CHARACTER_SIZE / 2;
  const characterTop = tileCenterY - CHARACTER_SIZE * 0.6;
  const lossCarLeft = characterLeft - CAR_SIZE * 0.1;

  return (
    <div className="relative h-[600px] w-full mx-auto overflow-hidden bg-gradient-to-b from-green-900 to-purple-900">
      <motion.div
        className="absolute inset-0"
        animate={{ x: -scrollOffset }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Top row */}
        <div
          className="absolute left-0 flex"
          style={{ top: -120, height: ROAD_HEIGHT }}
        >
          {tiles.map((tile) => (
            <div
              key={`top${tile.position}`}
              className="relative flex-shrink-0"
              style={{ width: ROAD_WIDTH, height: ROAD_HEIGHT }}
            >
              <Image
                src="/kaspianroadlane.webp"
                alt="lane"
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Main row */}
        <div
          className="absolute left-0 flex"
          style={{ top: mainRowTop, height: ROAD_HEIGHT }}
        >
          {tiles.map((tile) => {
            const isPast = tile.position < currentPosition;
            const isCurrent = tile.position === currentPosition;
            const isActive =
              tile.position === currentPosition + 1 && !hasLost;
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
                <Image
                  src="/kaspianroadlane.webp"
                  alt="lane"
                  fill
                  className="object-cover"
                />
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
                    src="/kaspiantile.webp"
                    alt="tile"
                    fill
                    className={`object-contain transition-transform duration-300 ${
                      isCurrent ? "scale-110" : ""
                    }`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                    {tile.multiplier}×
                  </div>
                </div>
                {isActive && (
                  <motion.div
                    className="absolute inset-0 cursor-pointer z-20"
                    onClick={onTileClick}
                    whileHover={{ scale: 1.05 }}
                  />
                )}
                {isCurrent && (
                  <div className="absolute left-1/2 -bottom-3 -translate-x-1/2 w-12 h-2 bg-blue-500 rounded-full blur-sm" />
                )}
              </motion.div>
            );
          })}

          {/* Character */}
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
              src="/kaspian.webp"
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

          {/* Car on loss */}
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
                src="/kaspiancar.webp"
                alt="Car"
                fill
                className="object-contain rotate-180"
              />
            </motion.div>
          )}
        </div>

        {/* Bottom row */}
        <div
          className="absolute left-0 flex"
          style={{ top: 440, height: ROAD_HEIGHT }}
        >
          {tiles.map((tile) => (
            <div
              key={`bot${tile.position}`}
              className="relative flex-shrink-0"
              style={{ width: ROAD_WIDTH, height: ROAD_HEIGHT }}
            >
              <Image
                src="/kaspianroadlane.webp"
                alt="lane"
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

// Controls Component
function KaspianCrossControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  result,
  cooldown,
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(t);
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
                onChange={(e) => setBetAmount(e.target.value)}
                className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8 w-full"
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
                onClick={() =>
                  setBetAmount((n) => (Number(n) / 2).toString())
                }
                disabled={isPlaying || !isWalletConnected}
              >
                ½
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setBetAmount((n) => (Number(n) * 2).toString())
                }
                disabled={isPlaying || !isWalletConnected}
              >
                2×
              </Button>
              <Button
                variant="outline"
                onClick={() => setBetAmount(MIN_BET.toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Min
              </Button>
              <Button
                variant="outline"
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
            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleStartClick}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet"
                  : cooldown > 0
                  ? `Start (${cooldown}s)`
                  : "Start Kaspian Cross"}
              </Button>
            ) : (
              <Button disabled className="w-full">
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
            <div className="flex justify-between items-center">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-4 font-bold">
                X
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Main Page Component
export default function KaspianCrossPage() {
  const { isConnected, balance } = useWallet();

  // state
  const [pregame, setPregame] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgText, setMsgText] = useState("");
  const [tiles, setTiles] = useState(
    CROSS_MULTIPLIERS.map((m, i) => ({ multiplier: m, position: i + 1 }))
  );
  const [currentPosition, setCurrentPosition] = useState(1);
  const [isJumping, setIsJumping] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [result, setResult] = useState<{
    gameResult: "win" | "lose";
    winAmount: number;
    clientSeed: string;
    serverSeedHash: string;
  } | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState("");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [betAmount, setBetAmount] = useState("1");
  const [cooldown, setCooldown] = useState(0);

  // loading typewriter
  useEffect(() => {
    if (!loading) return;
    setMsgIndex(0);
    setMsgText("");
  }, [loading]);
  useEffect(() => {
    if (!loading) return;
    const curr = messages[msgIndex];
    if (msgText.length < curr.length) {
      const t = setTimeout(
        () => setMsgText(curr.slice(0, msgText.length + 1)),
        40
      );
      return () => clearTimeout(t);
    }
    const t2 = setTimeout(() => {
      if (msgIndex < messages.length - 1) {
        setMsgIndex((i) => i + 1);
        setMsgText("");
      }
    }, 1500);
    return () => clearTimeout(t2);
  }, [loading, msgText, msgIndex]);

  const loadingOverlay = loading && (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-green-300 font-mono"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div>
        {msgText}
        <motion.span
          className="ml-1"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          ●
        </motion.span>
      </div>
    </motion.div>
  );

  const API_BASE = "https://kasino-backend-4818b4b69870.herokuapp.com";

  const handleStartGame = async () => {
    if (!isConnected) {
      return alert("Connect wallet first");
    }
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      return alert(`Bet ${MIN_BET}-${MAX_BET} within your balance`);
    }

    // seeds
    const arr = crypto.getRandomValues(new Uint8Array(32));
    const raw = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    const hashBuf = await crypto.subtle.digest("SHA-256", arr);
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setClientSeed(raw);
    setServerSeedHash("");

    // deposit
    const [addr] = await window.kasware.getAccounts();
    const treasury =
      Math.random() < 0.5
        ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
        : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;
    const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, {
      priorityFee: 10000,
    });
    const txid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;

    // call play
    setLoading(true);
    let data;
    try {
      ({ data } = await axios.post(`${API_BASE}/api/game/play`, {
        gameName: "Kaspian Cross",
        clientSeed: raw,
        clientSeedHash: hash,
        nonce: 0,
        walletAddress: addr,
        betAmount: bet,
        txid,
      }));
    } catch (err) {
      setLoading(false);
      return alert("Play API failed");
    }
    setLoading(false);

    if (!data.success) {
      return alert("Play API error");
    }

    setGameId(data.game._id);
    setServerSeedHash(data.game.serverSeedHash);
    // reset board
    setTiles(
      CROSS_MULTIPLIERS.map((m, i) => ({ multiplier: m, position: i + 1 }))
    );
    setCurrentPosition(1);
    setIsJumping(false);
    setIsFalling(false);
    setHasLost(false);
    setResult(null);
    setCooldown(10);
    setPregame(false);
  };

  const handleJump = () => {
    if (isJumping || isFalling || hasLost || result) return;
    setIsJumping(true);
    setTimeout(async () => {
      setIsJumping(false);
      // ask backend to settle this step
      try {
        const { data } = await axios.post(`${API_BASE}/api/game/settle`, {
          gameId,
          floorsReached: currentPosition,
        });
        if (data.success && data.gameResult === "continue") {
          setCurrentPosition((p) => p + 1);
        } else {
          setHasLost(data.gameResult === "lose");
          setIsFalling(true);
          setResult({
            gameResult: data.gameResult,
            winAmount: data.winAmount,
            clientSeed,
            serverSeedHash,
          });
        }
      } catch {
        alert("Settle error");
      }
    }, 800);
  };

  const handleCashOut = async () => {
    if (!gameId) return;
    // client‐side popup
    const multiplier = tiles[currentPosition - 1].multiplier;
    const payout = multiplier * Number(betAmount);
    setResult({
      gameResult: "win",
      winAmount: payout,
      clientSeed,
      serverSeedHash,
    });
    // backend settle
    try {
      await axios.post(`${API_BASE}/api/game/settle`, {
        gameId,
        floorsReached: currentPosition,
      });
    } catch {
      console.error("Settle error");
    }
  };

  const resetGame = () => {
    setPregame(true);
    setLoading(false);
    setCurrentPosition(1);
    setIsJumping(false);
    setIsFalling(false);
    setHasLost(false);
    setResult(null);
    setClientSeed("");
    setServerSeedHash("");
    setGameId(null);
  };

  useEffect(() => {
    if (cooldown > 0) {
      const iv = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(iv);
    }
  }, [cooldown]);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <AnimatePresence>{loadingOverlay}</AnimatePresence>
      <div className="flex-grow p-6">
        {/* Header */}
        <header className="flex justify-between mb-6">
          <Link href="/" className="flex items-center text-[#49EACB] hover:underline">
            <ArrowLeft className="mr-2" /> Back
          </Link>
          <div className="flex gap-4">
            <XPDisplay />
            <WalletConnection />
          </div>
        </header>

        {/* Game & Controls */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspian Cross</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-green-900 to-purple-900">
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
                    <h1 className="text-5xl font-bold mb-4" style={{ color: "#49EACB" }}>
                      Kaspian CROSS
                    </h1>
                    <p className="text-xl tracking-wider mb-4" style={{ color: "#B19CD9" }}>
                      CROSS THE ROAD
                    </p>
                    <Image src="/kaspian.webp" alt="Kaspian" width={96} height={96} />
                    <Button
                      className="mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                      onClick={handleStartGame}
                      disabled={!isConnected || cooldown > 0}
                    >
                      {!isConnected
                        ? "Connect Wallet"
                        : cooldown > 0
                        ? `Start (${cooldown}s)`
                        : "Start Kaspian Cross"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <KaspianCrossGame
                    tiles={tiles}
                    currentPosition={currentPosition}
                    onTileClick={handleJump}
                    isJumping={isJumping}
                    isFalling={isFalling}
                    hasLost={hasLost}
                  />
                  {currentPosition > 1 && !hasLost && !result && (
                    <div className="mt-4 text-center">
                      <div className="text-lg font-bold text-[#49EACB] mb-2">
                        Current Multiplier: {tiles[currentPosition - 1].multiplier}×
                      </div>
                      <Button
                        onClick={handleCashOut}
                        className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                      >
                        Cash Out (
                        {(Number(betAmount) * tiles[currentPosition - 1].multiplier).toFixed(2)} KAS)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <KaspianCrossControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              isPlaying={!pregame}
              isWalletConnected={isConnected}
              balance={balance}
              onStartGame={handleStartGame}
              result={result?.gameResult || null}
              cooldown={cooldown}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        <PromoCard />
      </div>
      <SiteFooter />

      {/* Result Popup */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="bg-green-300 text-black p-8 rounded-xl text-center">
              <h2 className="text-3xl font-bold mb-4">
                {result.gameResult === "win" ? "You Win!" : "Game Over"}
              </h2>
              <p className="text-2xl mb-4">
                {result.gameResult === "win"
                  ? `You won ${result.winAmount.toFixed(2)} KAS`
                  : "You Lose!"}
              </p>
              <div className="bg-black text-white p-4 rounded mb-4 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="mr-2" /> Provably Fair
                </div>
                <p className="break-all">Client Seed: {result.clientSeed}</p>
                <p className="break-all">Server Hash: {result.serverSeedHash}</p>
              </div>
              <Button onClick={resetGame} className="bg-black text-green-300">
                Play Again
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

