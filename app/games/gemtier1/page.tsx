"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { XPDisplay } from "@/app/page";
import axios from "axios";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// =============================================================================
// GEM CRATE GATE COMPONENT (Checks if user has enough gems to play)
// =============================================================================

interface GemCrateGateProps {
  requiredGems: number;
  children: React.ReactNode;
}

export function GemCrateGate({ requiredGems, children }: GemCrateGateProps) {
  const { isConnected } = useWallet();
  const [userGems, setUserGems] = useState<number | null>(null);
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";

  // Fetch the user's gems from the backend
  useEffect(() => {
    async function fetchUserGems() {
      if (isConnected && window.kasware && window.kasware.getAccounts) {
        try {
          const accounts: string[] = await window.kasware.getAccounts();
          if (!accounts || accounts.length === 0) return;
          const walletAddress = accounts[0];
          const res = await axios.get(
            `${apiUrl}/user?walletAddress=${encodeURIComponent(walletAddress)}`
          );
          if (res.data.success && res.data.user) {
            setUserGems(res.data.user.gems || 0);
          }
        } catch (err) {
          console.error("Error fetching user gems", err);
        }
      }
    }
    fetchUserGems();
    const interval = setInterval(fetchUserGems, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  let blockMessage = "";
  if (userGems === null) {
    blockMessage = "Loading your gem balance...";
  } else if (userGems < requiredGems) {
    blockMessage = `Not enough gems to play. You need at least ${requiredGems} gems.`;
  }

  return (
    <div className="relative">
      {children}
      {blockMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/90 p-6 rounded-lg border border-teal-500 text-white text-center max-w-sm"
          >
            <p>{blockMessage}</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// GEM CRATE TIER 1 GAME COMPONENT & CONTENT
// =============================================================================

const gemCrateItems = [
  { id: 1, name: "Lucky Gem", tier: "gem-common", reward: 0.5, image: "/GemCommon1.webp" },
  { id: 2, name: "Shiny Stone", tier: "gem-common", reward: 0.5, image: "/GemCommon2.webp" },
  { id: 3, name: "Sparkling Rock", tier: "gem-common", reward: 0.5, image: "/GemCommon3.webp" },
  { id: 4, name: "Golden Nugget", tier: "gem-common", reward: 0.5, image: "/GemCommon4.webp" },
  { id: 5, name: "Mystic Orb", tier: "gem-common", reward: 0.5, image: "/GemCommon5.webp" },
  { id: 6, name: "Enchanted Crystal", tier: "gem-common", reward: 0.5, image: "/GemCommon6.webp" },
  { id: 7, name: "Ruby Shard", tier: "gem-common", reward: 0.5, image: "/GemCommon7.webp" },
  { id: 8, name: "Diamond Prize", tier: "gem-ultra-rare", reward: 50, image: "/GemUltraRare.webp" },
];

function getGemRarityStyle(tier: string) {
  switch (tier) {
    case "gem-common":
      return "border-green-500 bg-green-900/30";
    case "gem-ultra-rare":
      return "border-yellow-500 bg-yellow-900/30";
    default:
      return "border-gray-500 bg-gray-800/30";
  }
}

function getGemRarityOverlayClass(tier: string) {
  switch (tier) {
    case "gem-common":
      return "bg-gradient-to-br from-green-400/30 to-green-900/30";
    case "gem-ultra-rare":
      return "bg-gradient-to-br from-yellow-400/30 to-yellow-900/30";
    default:
      return "bg-gradient-to-br from-gray-400/30 to-gray-800/30";
  }
}

// Main Page Component for Gem Crate Tier 1 Game
export default function GemCrateTier1GamePage() {
  return <GemCrateContent />;
}

function GemCrateContent() {
  const { isConnected, username } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winItem, setWinItem] = useState<any>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const REQUIRED_GEMS = 10;
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";

  // Countdown effect for cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // Start the gem crate game on the backend using the gemcrate API
  const handleOpenCrate = async () => {
    if (!isConnected || !username) {
      showError("Please connect your wallet and set your username");
      return;
    }
    if (cooldown > 0) {
      showError(`Please wait ${cooldown} seconds before spinning again.`);
      return;
    }
    try {
      const accounts = await window.kasware.getAccounts();
      if (!accounts || accounts.length === 0) {
        showError("No wallet address found");
        return;
      }
      const walletAddress = accounts[0];
      // Pass both the walletAddress and the gems being spent (10)
      const startRes = await axios.post(`${apiUrl}/gemcrate/start`, { walletAddress, gemsSpent: REQUIRED_GEMS });
      if (startRes.data.success) {
        setGameId(startRes.data.gameId);
        setIsPlaying(true);
        setCooldown(15);
      } else {
        showError("Failed to start Gem Crate: " + startRes.data.message);
        return;
      }
    } catch (error: any) {
      console.error("Error starting Gem Crate game:", error);
      showError("Error starting game: " + error.message);
    }
  };

  // When the game ends, notify the backend using the gemcrate end API.
  const handleGameEnd = async (item: any) => {
    setWinItem(item);
    setGameResult("You Win");
    if (gameId) {
      try {
        const accounts = await window.kasware.getAccounts();
        if (!accounts || accounts.length === 0) {
          showError("No wallet address found");
          return;
        }
        const walletAddress = accounts[0];
        await axios.post(`${apiUrl}/gemcrate/end`, {
          gameId,
          result: "win",
          winAmount: item.reward,
          walletAddress,
        });
      } catch (error) {
        console.error("Error ending Gem Crate game on backend:", error);
      }
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinItem(null);
    setGameId(null);
  };

  const showError = (msg: string) => setErrorMessage(msg);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="inline-flex items-center text-green-400 hover:underline">
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

        <GemCrateGate requiredGems={REQUIRED_GEMS}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
            <Card className="bg-green-900/50 border border-green-500 backdrop-blur-sm overflow-hidden">
              <div className="p-6 flex flex-col h-full items-center">
                <div className="flex justify-between items-center w-full mb-4">
                  <h2 className="text-2xl font-bold text-green-300">Gem Crate Tier 1</h2>
                  <Button variant="ghost" size="sm" className="text-green-300" onClick={resetGame}>
                    Reset
                  </Button>
                </div>
                <div className="relative w-full max-w-[600px] h-72 mx-auto flex items-center justify-center">
                  <GemCrateGame isPlaying={isPlaying} onGameEnd={handleGameEnd} />
                  {isPlaying && (
                    <>
                      <div className="absolute top-0 bottom-0 left-0 w-40 bg-green-900/60 backdrop-blur-md pointer-events-none" />
                      <div className="absolute top-0 bottom-0 right-0 w-40 bg-green-900/60 backdrop-blur-md pointer-events-none" />
                    </>
                  )}
                  {!isPlaying && (
                    <>
                      <div className="absolute inset-0 z-30">
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                          className="absolute top-0 left-20"
                          style={{ filter: "drop-shadow(0 0 15px #F59E0B)" }}
                        >
                          <Image src="/GemUltraRare.webp" alt="Ultra Rare Reward" width={100} height={100} className="rounded-full border-4 border-yellow-500" />
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: -5 }}
                          whileTap={{ scale: 0.95 }}
                          className="absolute bottom-0 right-20"
                          style={{ filter: "drop-shadow(0 0 15px #00FF7F)" }}
                        >
                          <Image src="/GemCommon1.webp" alt="Common Reward" width={80} height={80} className="rounded-lg border-4 border-green-500" />
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                          className="absolute top-0 right-20"
                          style={{ filter: "drop-shadow(0 0 15px #00FF7F)" }}
                        >
                          <Image src="/GemCommon2.webp" alt="Common Reward" width={70} height={70} className="rounded-md border-4 border-green-500" />
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: -5 }}
                          whileTap={{ scale: 0.95 }}
                          className="absolute bottom-0 left-20"
                          style={{ filter: "drop-shadow(0 0 15px #00FF7F)" }}
                        >
                          <Image src="/GemCommon3.webp" alt="Common Reward" width={70} height={70} className="rounded-md border-4 border-green-500" />
                        </motion.div>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-40 text-center">
                        <motion.h1
                          className="text-5xl font-bold mb-4"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          style={{ color: "#32CD32" }}
                        >
                          GEM CRATE TIER 1
                        </motion.h1>
                        <motion.p
                          className="text-xl tracking-wider"
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          style={{ color: "#00FF7F" }}
                        >
                          SPIN TO WIN
                        </motion.p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>

            <GemCrateControls
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              onOpenCrate={handleOpenCrate}
              gameResult={gameResult}
              winItem={winItem}
              cooldown={cooldown}
            />
          </div>
        </GemCrateGate>

        <Card className="bg-green-900/50 border border-green-500 backdrop-blur-sm p-4 mb-6">
          <h3 className="text-xl font-bold text-green-300 mb-4 text-center">Gem Crate Tier 1 Rewards</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {gemCrateItems.map((item) => {
              const rarityClass = getGemRarityStyle(item.tier);
              const displayTier = item.tier === "gem-ultra-rare" ? "Ultra Rare" : item.tier.replace("gem-", "");
              return (
                <div key={item.id} className={`flex flex-col items-center border p-2 rounded text-xs ${rarityClass}`}>
                  <Image src={item.image} alt="Reward" width={40} height={40} />
                  <p className="mt-1 font-semibold text-green-400 drop-shadow">{item.name}</p>
                  <p className="capitalize text-green-300 drop-shadow">{displayTier}</p>
                  <p className="text-green-300 drop-shadow">{item.reward} KAS</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="w-full bg-green-900/50 border border-green-500 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #00FF7F, #32CD32, #00FF7F)",
              backgroundSize: "200% 200%",
            }}
          >
            Gem Crate Tier 1
          </motion.h2>
          <p className="text-2xl font-extrabold text-green-400 mb-4">
            Open the crate for a chance to win common rewards or a rare diamond prize!
          </p>
          <p className="text-lg text-green-200">Cost per play: 10 Gems</p>
        </Card>
      </div>
      <SiteFooter />
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-4 left-4 bg-gradient-to-r from-green-700 to-black text-white px-4 py-2 rounded shadow-lg"
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
    </div>
  );
}

// ---------------------------------------------------------
// Gem Crate Game Component (Horizontal Reel with Popup)
// ---------------------------------------------------------
function GemCrateGame({ isPlaying, onGameEnd }: { isPlaying: boolean; onGameEnd: (item: any) => void; }) {
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

      // Generate a random reel of 40 items from gemCrateItems
      const randomReel = Array.from({ length: 40 }, () => gemCrateItems[Math.floor(Math.random() * gemCrateItems.length)]);
      randomReelLengthRef.current = randomReel.length;
      // Duplicate for seamless looping
      const loopReel = randomReel.concat(randomReel);
      setFinalReel(loopReel);

      // Determine winning item via probability logic:
      const r = Math.random();
      let winItem;
      if (r < 0.9999) {
        // 99.99% chance to win a common reward
        const commonRewards = gemCrateItems.filter(item => item.tier === "gem-common");
        winItem = commonRewards[Math.floor(Math.random() * commonRewards.length)];
      } else {
        // Ultra Rare reward
        winItem = gemCrateItems.find(item => item.tier === "gem-ultra-rare");
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
              <div className={`absolute inset-0 ${getGemRarityOverlayClass(item.tier)}`} style={{ pointerEvents: "none" }} />
            </div>
          </div>
        ))}
      </motion.div>
      <AnimatePresence>
        {showResultOverlay && winningItem && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: [1, 1.4, 1] }} transition={{ times: [0, 0.5, 1], duration: 2, ease: "easeInOut" }} className="text-center p-6 rounded-lg border-2 border-green-400 shadow-[0_0_25px_8px_rgba(0,255,0,0.5)] bg-green-800/80 max-w-xs">
              <Image src={winningItem.image} alt="Reward" width={80} height={80} className="mx-auto mb-2" loading="eager" style={{ filter: "drop-shadow(0 0 10px #00FF7F) drop-shadow(0 0 20px #00FF7F)" }} />
              <p className="text-3xl font-extrabold text-green-400 mb-2">Congratulations!</p>
              <p className="text-xl font-bold text-green-100">
                {winningItem.name}{" "}
                <span className="text-base text-green-200">
                  {winningItem.tier === "gem-ultra-rare" ? "Ultra Rare" : winningItem.tier.replace("gem-", "")}
                </span>
              </p>
              <p className="text-lg text-green-50 mt-2">
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
// Gem Crate Controls Component
// ---------------------------------------------------------
function GemCrateControls({
  isPlaying,
  isWalletConnected,
  onOpenCrate,
  gameResult,
  winItem,
  cooldown,
}: {
  isPlaying: boolean;
  isWalletConnected: boolean;
  onOpenCrate: () => void;
  gameResult: string | null;
  winItem: any;
  cooldown: number;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearInterval(timer);
    }
  }, [errorMessage]);

  const showError = (msg: string) => setErrorMessage(msg);

  const handleOpenCrate = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    onOpenCrate();
  };

  return (
    <>
      <Card className="bg-green-900/50 border border-green-500 backdrop-blur-sm">
        <div className="p-6 space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult && winItem && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-green-300">
                  {gameResult}: {winItem.name}{" "}
                  <span className="text-base text-green-200">
                    {winItem.tier === "gem-ultra-rare" ? "Ultra Rare" : winItem.tier.replace("gem-", "")}
                  </span>
                </div>
                <div className="text-sm text-green-200">Payout: {winItem.reward} KAS</div>
              </div>
            )}
            {!isPlaying ? (
              <Button className="w-full bg-green-400 text-black hover:bg-green-300" onClick={handleOpenCrate} disabled={!isWalletConnected || cooldown > 0}>
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Cooldown: ${cooldown}s`
                  : "Open Crate (10 Gems)"}
              </Button>
            ) : (
              <Button className="w-full bg-green-400 text-black hover:bg-green-300" disabled>
                Opening...
              </Button>
            )}
          </motion.div>
        </div>
      </Card>
      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.5 }} className="fixed bottom-4 left-4 bg-gradient-to-r from-green-700 to-black text-white px-4 py-2 rounded shadow-lg">
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
