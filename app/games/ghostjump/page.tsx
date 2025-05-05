
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
const messages = [
  "Verifying transaction",
  "Hashing game seed",
  "Building platforms",
];

// Image assets
const GHOST_NORMAL = "/ghostkasper.webp";
const GHOST_JUMPING = "/ghostkasperjumping.webp";
const SPACE_TILE = "/ghosttile.webp";
const JUMP_TILE = "/ghosttile3.webp";

type Tile = { multiplier: number; isWin: boolean; position: number };

// Space Jump Game Component
function SpaceJumpGame({
  tiles,
  currentPosition,
  onTileClick,
  isJumping,
  isFalling,
}: {
  tiles: Tile[];
  currentPosition: number;
  onTileClick: () => void;
  isJumping: boolean;
  isFalling: boolean;
}) {
  const stars = useMemo(() => Array.from({ length: 100 }), []);
  const visibleTiles = tiles.slice(
    Math.max(0, currentPosition - 2),
    Math.min(tiles.length, currentPosition + 3)
  );

  return (
    <div className="relative h-[600px] w-full mx-auto">
      {/* Space background */}
      <div className="absolute inset-0 rounded-lg overflow-hidden shadow-2xl bg-gradient-to-b from-gray-900 via-blue-900 to-purple-900">
        {/* Stars */}
        <div className="absolute inset-0 opacity-80">
          {stars.map((_, i) => (
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
        {/* Moon */}
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

      {/* Platforms */}
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
              {isCurrent && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-2 bg-blue-500 rounded-full blur-sm" />
              )}
              <div className="relative w-full h-full">
                <Image
                  src={SPACE_TILE}
                  alt="Platform"
                  fill
                  className={`object-contain transition-transform duration-300 ${
                    isCurrent ? "scale-110" : ""
                  }`}
                />
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                  {tile.multiplier}×
                </div>
              </div>
              {isActive && !isFalling && !isJumping && (
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
                      alt="Next platform"
                      fill
                      className="object-contain drop-shadow-[0_0_8px_rgba(73,234,203,0.5)]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                      {tile.multiplier}×
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Ghost */}
      <motion.div
        className="absolute left-1/2 w-24 h-24 z-10"
        style={{ bottom: "11rem", x: "-50%" }}
        animate={{
          y: isJumping ? [0, -60, 0] : isFalling ? [0, 200, 400] : 0,
          rotate: isFalling ? [0, 15, 45, 90] : 0,
          filter: isJumping
            ? "drop-shadow(0 0 12px rgba(73,234,203,0.8))"
            : "none",
        }}
        transition={{
          duration: isJumping ? 0.8 : isFalling ? 1.5 : 0,
          ease: isJumping ? "easeOut" : isFalling ? "easeIn" : "linear",
        }}
      >
        <Image
          src={isJumping ? GHOST_JUMPING : GHOST_NORMAL}
          alt="Ghost"
          fill
          className="object-contain"
        />
      </motion.div>
    </div>
  );
}

// Main Page
export default function SpaceJumpPage() {
  return <SpaceJumpContent />;
}

function SpaceJumpContent() {
  const { isConnected, balance } = useWallet();

  // Game state
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [betAmount, setBetAmount] = useState("1");

  // Provably-fair & results
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [currentPosition, setCurrentPosition] = useState(1);
  const [gameId, setGameId] = useState<string | null>(null);

  // Loading overlay + typewriter
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgText, setMsgText] = useState("");
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
    }, 2000);
    return () => clearTimeout(t2);
  }, [loading, msgText, msgIndex]);

  // Result popup
  const [result, setResult] = useState<{
    gameResult: string;
    winAmount: number;
    clientSeed: string | null;
    serverSeedHash: string | null;
  } | null>(null);

  // Settle game via API (fire-and-forget)
  const settleInBackground = (floorsReached: number) => {
    axios
      .post(
        "https://kasino-backend-4818b4b69870.herokuapp.com/api/game/settle",
        { gameId, floorsReached }
      )
      .catch(console.error);
  };

  // Start game
  const handleStartGame = async () => {
    if (!isConnected) {
      alert("Connect your wallet first");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      alert(`Bet between ${MIN_BET} and ${MAX_BET}, within your balance.`);
      return;
    }

    // 1) generate clientSeed + hash
    const arr = crypto.getRandomValues(new Uint8Array(32));
    const rawSeed = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const buf = await crypto.subtle.digest("SHA-256", arr);
    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setClientSeed(rawSeed);

    // 2) send deposit on-chain
    const [addr] = await window.kasware.getAccounts();
    const treasury =
      Math.random() < 0.5
        ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
        : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;
    const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, {
      priorityFee: 10000,
    });
    const txid =
      typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;

    // 3) call play API
    setLoading(true);
    const { data } = await axios.post(
      "https://kasino-backend-4818b4b69870.herokuapp.com/api/game/play",
      {
        gameName: "Ghost Jump",
        clientSeed: rawSeed,
        clientSeedHash: hash,
        nonce: 0,
        walletAddress: addr,
        betAmount: bet,
        txid,
      }
    );
    setLoading(false);

    if (!data.success) {
      alert("Play API failed");
      return;
    }

    setGameId(data.game._id);
    setServerSeedHash(data.game.serverSeedHash);
    setTiles(data.game.tiles);
    setCurrentPosition(1);
    setPregame(false);
    setIsPlaying(true);
  };

  // Jump to next tile
  const handleJump = () => {
    if (!isPlaying) return;
    const next = tiles[currentPosition];
    setIsJumping(true);
    setTimeout(() => {
      setIsJumping(false);
      if (next && next.isWin) {
        setCurrentPosition((p) => p + 1);
      } else {
        setIsFalling(true);
        setTimeout(() => {
          setResult({
            gameResult: "lose",
            winAmount: 0,
            clientSeed,
            serverSeedHash,
          });
          settleInBackground(0);
        }, 1500);
      }
    }, 800);
  };

  // Cash out
  const handleCashOut = () => {
    const bet = Number(betAmount);
    const mult = tiles[currentPosition - 1]?.multiplier ?? 1;
    const winAmt = bet * mult;
    setResult({
      gameResult: "win",
      winAmount: winAmt,
      clientSeed,
      serverSeedHash,
    });
    setIsPlaying(false);
    setIsJumping(false);
    setIsFalling(false);
    settleInBackground(currentPosition);
  };

  // Reset
  const resetGame = () => {
    setPregame(true);
    setIsPlaying(false);
    setIsJumping(false);
    setIsFalling(false);
    setResult(null);
    setClientSeed(null);
    setServerSeedHash(null);
    setTiles([]);
    setCurrentPosition(1);
    setGameId(null);
  };

  // Decorative ghosts
  const decorativeGhosts = useMemo(
    () =>
      Array.from({ length: 15 }).map(() => ({
        top: `${Math.random() * 80}%`,
        left: `${Math.random() * 80}%`,
        size: Math.random() * 30 + 20,
        opacity: Math.random() * 0.3 + 0.1,
      })),
    []
  );

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-[#49EACB] font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center">
              {msgText}
              <motion.span
                className="ml-2 text-xs"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                ●
              </motion.span>
              <motion.span
                className="ml-0.5 text-xs"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
              >
                ●
              </motion.span>
              <motion.span
                className="ml-0.5 text-xs"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
              >
                ●
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-grow p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
          </Link>
          <div className="flex items-center gap-4">
            <XPDisplay />
            <WalletConnection />
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Ghost Jump</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-black to-blue-900 bg-opacity-80">
                  {decorativeGhosts.map((g, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{ top: g.top, left: g.left, width: g.size, height: g.size, opacity: g.opacity }}
                      animate={{ y: [0, -10, 0], opacity: [g.opacity, g.opacity * 1.5, g.opacity] }}
                      transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Image src={GHOST_NORMAL} alt="Ghost" fill className="object-contain" />
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="mt-6">
                      <Button
                        className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                        onClick={handleStartGame}
                        disabled={!isConnected}
                      >
                        {!isConnected ? "Connect Wallet to Play" : "Start Ghost Jump"}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                <>
                  <SpaceJumpGame
                    tiles={tiles}
                    currentPosition={currentPosition}
                    onTileClick={handleJump}
                    isJumping={isJumping}
                    isFalling={isFalling}
                  />
                  {isPlaying && currentPosition > 1 && !isFalling && (
                    <div className="mt-4 text-center">
                      <Button onClick={handleCashOut} className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
                        Cash Out
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Right Column */}
          <div className="space-y-6">
            <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6">
              <div className="space-y-4">
                <label className="text-sm text-[#49EACB]">Bet Amount (KAS)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8"
                    disabled={isPlaying}
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                    <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp" alt="KAS" width={16} height={16} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                    onClick={() => setBetAmount(String(Math.max(MIN_BET, Number(betAmount) / 2)))}
                    disabled={isPlaying}
                  >
                    ½
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                    onClick={() => setBetAmount(String(Math.min(MAX_BET, Number(betAmount) * 2)))}
                    disabled={isPlaying}
                  >
                    2×
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                    onClick={() => setBetAmount(String(MIN_BET))}
                    disabled={isPlaying}
                  >
                    Min
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                    onClick={() => setBetAmount(String(Math.min(MAX_BET, balance)))}
                    disabled={isPlaying}
                  >
                    Max
                  </Button>
                </div>
                <Button
                  className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                  onClick={handleStartGame}
                  disabled={isPlaying || !isConnected}
                >
                  {!isConnected
                    ? "Connect Wallet"
                    : isPlaying
                    ? "Game in Progress"
                    : "Start Ghost Jump"}
                </Button>
              </div>
            </Card>

            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </div>

      <SiteFooter />

      {/* Result Popup */}
      <AnimatePresence>
        {result && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
            <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-4xl font-bold mb-6">
                {result.gameResult === "win" ? "You Win!" : "Game Over"}
              </h2>
              {result.gameResult === "win" ? (
                <p className="text-4xl animate-pulse uppercase mb-4">
                  You won <strong>{result.winAmount.toFixed(2)}</strong> KAS!
                </p>
              ) : (
                <p className="text-4xl animate-pulse uppercase text-red-500 mb-4">
                  You Lose!
                </p>
              )}
              <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2" />
                  <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                </div>
                <p className="text-sm text-white break-all">Client Seed: {result.clientSeed}</p>
                <p className="text-sm text-white break-all">Server Hash: {result.serverSeedHash}</p>
              </div>
              <Button onClick={resetGame} className="px-8 py-3">
                Play Again
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
