"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { XPDisplay } from "@/app/page";
import axios from "axios";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// API endpoint for your backend
const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";

// ---------------------------------------------------------
// Daily Loot Items Distribution for Level 1 Daily Loot Box
// ---------------------------------------------------------
export const dailyLootItems = [
  { id: 1, name: "Daily Loot", tier: "daily-common", reward: 0.1, image: "/placeholder2.svg" },
  { id: 2, name: "Daily Loot", tier: "daily-common", reward: 0.1, image: "/placeholder3.svg" },
  { id: 3, name: "Daily Loot", tier: "daily-common", reward: 0.1, image: "/placeholder4.svg" },
  { id: 4, name: "Daily Loot", tier: "daily-common", reward: 0.1, image: "/placeholder5.svg" },
  { id: 5, name: "Daily Loot", tier: "daily-common", reward: 0.1, image: "/placeholder6.svg" },
  { id: 6, name: "Daily Loot", tier: "daily-common", reward: 0.1, image: "/placeholder7.svg" },
  { id: 7, name: "Daily Loot", tier: "daily-common", reward: 0.1, image: "/placeholder8.svg" },
  { id: 8, name: "Daily Loot", tier: "daily-ultra-rare", reward: 100, image: "/placeholder.svg" },
];

// ---------------------------------------------------------
// Rarity Styling & Overlay
// ---------------------------------------------------------
function getRarityStyle(tier: string) {
  switch (tier) {
    case "daily-common":
      return "border-blue-500 bg-blue-900/30";
    case "daily-ultra-rare":
      return "border-pink-500 bg-pink-900/30";
    default:
      return "border-gray-500 bg-gray-800/30";
  }
}

function getRarityOverlayClass(tier: string) {
  switch (tier) {
    case "daily-common":
      return "bg-gradient-to-br from-blue-400/30 to-blue-900/30";
    case "daily-ultra-rare":
      return "bg-gradient-to-br from-pink-400/30 to-pink-900/30";
    default:
      return "bg-gradient-to-br from-gray-400/30 to-gray-800/30";
  }
}

// ---------------------------------------------------------
// Main Page Component for Level 1 Daily Loot Box Game
// ---------------------------------------------------------
export default function Level1DailyLootBoxGamePage() {
  return <DailyLootBoxContent />;
}

function DailyLootBoxContent() {
  // Now assume that your wallet context provides both isConnected and username.
  const { isConnected, username } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winItem, setWinItem] = useState<any>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Start the daily loot box game on the backend using the daily API
  const handleOpenLootBox = async () => {
    if (!isConnected || !username) {
      alert("Please connect your wallet and set your username");
      return;
    }
    try {
      const startRes = await axios.post(`${apiUrl}/daily-lootbox/start`, {
        username,
        level: 1,
      });
      if (startRes.data.success) {
        setGameId(startRes.data.dailyGameId);
        setIsPlaying(true);
      } else {
        alert("Failed to start daily loot box: " + startRes.data.message);
        return;
      }
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        // If the backend returns a cooldown error, extract remaining seconds.
        const msg = error.response.data.message;
        const match = msg.match(/(\d+) seconds/);
        if (match && match[1]) {
          setCooldown(parseInt(match[1]));
        }
        alert(msg);
      } else {
        console.error("Error starting Level 1 Daily Loot Box game:", error);
        alert("Error starting game: " + error.message);
      }
    }
  };

  // When the game ends, notify the backend using the daily loot box end API
  const handleGameEnd = async (item: any) => {
    setWinItem(item);
    setGameResult("You Win");
    if (gameId) {
      try {
        await axios.post(`${apiUrl}/daily-lootbox/end`, {
          dailyGameId: gameId,
          result: "win",
          winAmount: item.reward,
        });
      } catch (error) {
        console.error("Error ending Level 1 Daily Loot Box game on backend:", error);
      }
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinItem(null);
    setGameId(null);
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="inline-flex items-center text-blue-400 hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
            </Link>
          </motion.div>
          <motion.div className="flex items-center gap-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <XPDisplay />
            <WalletConnection />
          </motion.div>
        </header>

        {/* Main Game & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-blue-300">Level 1 Daily Loot Box</h2>
                <Button variant="ghost" size="sm" className="text-blue-300" onClick={resetGame}>
                  Reset
                </Button>
              </div>
              {/* Reel Container */}
              <div className="relative w-full max-w-[600px] h-72 mx-auto flex items-center justify-center">
                <DailyLootBoxGame isPlaying={isPlaying} onGameEnd={handleGameEnd} />
                {isPlaying && (
                  <>
                    <div className="absolute top-0 bottom-0 left-0 w-40 bg-teal-900/60 backdrop-blur-md pointer-events-none" />
                    <div className="absolute top-0 bottom-0 right-0 w-40 bg-teal-900/60 backdrop-blur-md pointer-events-none" />
                  </>
                )}
                {!isPlaying && (
                  <>
                    <div className="absolute inset-0 z-30">
                      <motion.div whileHover={{ scale: 1.15, rotate: 5 }} whileTap={{ scale: 0.95 }} className="absolute top-0 left-20" style={{ filter: "drop-shadow(0 0 15px #EC4899)" }}>
                        <Image src="/placeholder.svg" alt="Ultra Rare Reward" width={100} height={100} className="rounded-full border-4 border-pink-500" />
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.15, rotate: -5 }} whileTap={{ scale: 0.95 }} className="absolute bottom-0 right-20" style={{ filter: "drop-shadow(0 0 15px #A855F7)" }}>
                        <Image src="/placeholder2.svg" alt="Common Reward" width={80} height={80} className="rounded-lg border-4 border-blue-500" />
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.15, rotate: 5 }} whileTap={{ scale: 0.95 }} className="absolute top-0 right-20" style={{ filter: "drop-shadow(0 0 15px #3B82F6)" }}>
                        <Image src="/placeholder3.svg" alt="Common Reward" width={70} height={70} className="rounded-md border-4 border-blue-500" />
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.15, rotate: -5 }} whileTap={{ scale: 0.95 }} className="absolute bottom-0 left-20" style={{ filter: "drop-shadow(0 0 15px #6366F1)" }}>
                        <Image src="/placeholder4.svg" alt="Common Reward" width={70} height={70} className="rounded-md border-4 border-blue-500" />
                      </motion.div>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 text-center">
                      <motion.h1
                        className="text-5xl font-bold mb-4"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ color: "#49EACB" }}
                      >
                        LEVEL 1 DAILY LOOT BOX
                      </motion.h1>
                      <motion.p
                        className="text-xl tracking-wider"
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ color: "#00FFFF" }}
                      >
                        SPIN TO WIN
                      </motion.p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>

          <DailyLootBoxControls
            isPlaying={isPlaying}
            isWalletConnected={isConnected}
            onOpenLootBox={handleOpenLootBox}
            gameResult={gameResult}
            winItem={winItem}
            cooldown={cooldown}
          />
        </div>

        <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-4 mb-6">
          <h3 className="text-xl font-bold text-blue-300 mb-4 text-center">Level 1 Daily Loot Box Rewards</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {dailyLootItems.map((item) => {
              const rarityClass = getRarityStyle(item.tier);
              const displayTier = item.tier === "daily-ultra-rare" ? "Ultra Rare" : item.tier.replace("daily-", "");
              return (
                <div key={item.id} className={`flex flex-col items-center border p-2 rounded text-xs ${rarityClass}`}>
                  <Image src={item.image} alt="Reward" width={40} height={40} />
                  <p className="mt-1 font-semibold text-blue-400 drop-shadow">Reward</p>
                  <p className="capitalize text-blue-300 drop-shadow">{displayTier}</p>
                  <p className="text-teal-300 drop-shadow">{item.reward} KAS</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Promo Section */}
        <Card className="w-full bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #FF0080, #FF8C00, #FF0080)",
              backgroundSize: "200% 200%",
            }}
          >
            Level 1 Daily Loot Box
          </motion.h2>
          <p className="text-2xl font-extrabold text-yellow-400 mb-4">
            Spin and win amazing rewards – common prizes of 0.1 KAS or an Ultra Rare prize of 100 KAS!
          </p>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}

// ---------------------------------------------------------
// Daily Loot Box Game Component (Horizontal Reel with Popup)
// ---------------------------------------------------------
function DailyLootBoxGame({ isPlaying, onGameEnd }: { isPlaying: boolean; onGameEnd: (item: any) => void; }) {
  const controls = useAnimation();
  const containerWidth = 600;
  const itemWidth = 120;
  const currentXRef = useRef(0);
  const randomReelLengthRef = useRef(0);
  const [finalReel, setFinalReel] = useState<any[]>([]);
  const [winningItem, setWinningItem] = useState<any>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const spinTriggered = useRef(false);

  useEffect(() => {
    if (isPlaying && !spinTriggered.current) {
      spinTriggered.current = true;
      setShowResultOverlay(false);

      // Generate a random reel of 40 items from dailyLootItems
      const randomReel = Array.from({ length: 40 }, () => dailyLootItems[Math.floor(Math.random() * dailyLootItems.length)]);
      randomReelLengthRef.current = randomReel.length;
      // Duplicate for seamless looping
      const loopReel = randomReel.concat(randomReel);
      setFinalReel(loopReel);

      // Determine winning item via probability logic:
      const r = Math.random();
      let winItem;
      if (r < 0.9999) {
        // 99.99% chance to win a common reward (0.1 KAS)
        const commonRewards = dailyLootItems.filter(item => item.tier === "daily-common");
        winItem = commonRewards[Math.floor(Math.random() * commonRewards.length)];
      } else {
        // Ultra Rare reward: 100 KAS win
        winItem = dailyLootItems.find(item => item.tier === "daily-ultra-rare");
      }
      setWinningItem(winItem);

      // Start continuous horizontal loop over the first randomReel length
      const loopDistance = randomReel.length * itemWidth;
      controls.start({
        x: [0, -loopDistance],
        transition: { duration: 1, repeat: Infinity, ease: "linear" },
      });

      // After 4 seconds, stop the loop and decelerate to the nearest aligned offset
      setTimeout(() => {
        controls.stop();
        const currentX = currentXRef.current;
        const alignedOffset = Math.round(currentX / itemWidth) * itemWidth;
        controls.start({
          x: alignedOffset,
          transition: { duration: 0.5, ease: "easeOut" },
        });
        onGameEnd(winItem);
        setShowResultOverlay(true);
      }, 4000);
    } else if (!isPlaying) {
      spinTriggered.current = false;
      controls.set({ x: 0 });
      setFinalReel([]);
      setWinningItem(null);
      setShowResultOverlay(false);
    }
  }, [isPlaying, controls, itemWidth, onGameEnd]);

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ width: containerWidth }}>
      <motion.div className="flex" animate={controls} onUpdate={(latest) => { currentXRef.current = latest.x; }}>
        {finalReel.map((item, i) => (
          <div key={i} style={{ width: itemWidth, flexShrink: 0 }} className="p-0">
            <div className="relative w-full h-full">
              <Image src={item.image} alt="Reward" width={itemWidth} height={itemWidth} loading="eager" />
              <div className={`absolute inset-0 ${getRarityOverlayClass(item.tier)}`} style={{ pointerEvents: "none" }} />
            </div>
          </div>
        ))}
      </motion.div>
      <AnimatePresence>
        {showResultOverlay && winningItem && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: [1, 1.4, 1] }} transition={{ times: [0, 0.5, 1], duration: 2, ease: "easeInOut" }} className="text-center p-6 rounded-lg border-2 border-teal-400 shadow-[0_0_25px_8px_rgba(0,255,255,0.5)] bg-teal-800/80 max-w-xs">
              <Image src={winningItem.image} alt="Reward" width={80} height={80} className="mx-auto mb-2" loading="eager" style={{ filter: "drop-shadow(0 0 10px #00FFFF) drop-shadow(0 0 20px #00FFFF)" }} />
              <p className="text-3xl font-extrabold text-teal-400 mb-2">Congratulations!</p>
              <p className="text-xl font-bold text-teal-100">
                {winningItem.name}{" "}
                <span className="text-base text-teal-200">
                  {winningItem.tier === "daily-ultra-rare" ? "Ultra Rare" : winningItem.tier.replace("daily-", "")}
                </span>
              </p>
              <p className="text-lg text-blue-50 mt-2">
                You won <strong>{winningItem.reward} KAS</strong>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------
// Daily Loot Box Controls Component
// ---------------------------------------------------------
function DailyLootBoxControls({
  isPlaying,
  isWalletConnected,
  onOpenLootBox,
  gameResult,
  winItem,
  cooldown,
}: {
  isPlaying: boolean;
  isWalletConnected: boolean;
  onOpenLootBox: () => void;
  gameResult: string | null;
  winItem: any;
  cooldown: number;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (cooldown > 0) {
      const intervalId = setInterval(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  const showError = (msg: string) => setErrorMessage(msg);

  const handleOpenBox = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    onOpenLootBox();
  };

  return (
    <>
      <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm">
        <div className="p-6 space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult && winItem && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-blue-300">
                  {gameResult}: {winItem.name}{" "}
                  <span className="text-base text-teal-200">
                    {winItem.tier === "daily-ultra-rare" ? "Ultra Rare" : winItem.tier.replace("daily-", "")}
                  </span>
                </div>
                <div className="text-sm text-blue-200">Payout: {winItem.reward} KAS</div>
              </div>
            )}
            {!isPlaying ? (
              <Button className="w-full bg-teal-400 text-black hover:bg-teal-300" onClick={handleOpenBox} disabled={!isWalletConnected || cooldown > 0}>
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Open Level 1 Daily Loot Box (${cooldown}s)`
                  : "Open Level 1 Daily Loot Box"}
              </Button>
            ) : (
              <Button className="w-full bg-teal-400 text-black hover:bg-teal-300" disabled>
                Opening...
              </Button>
            )}
          </motion.div>
        </div>
      </Card>
      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.5 }} className="fixed bottom-4 left-4 bg-gradient-to-r from-teal-700 to-black text-white px-4 py-2 rounded shadow-lg">
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
