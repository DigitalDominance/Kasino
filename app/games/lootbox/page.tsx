"use client";

import { useState, useEffect, useRef } from "react";
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

// ---------------------------------------------------------
// Font
// ---------------------------------------------------------
const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// ---------------------------------------------------------
// Loot Items Distribution
// ---------------------------------------------------------
export const lootItems = [
  { id: 1,  name: "Haunted Wisp", tier: "haunted-wisp", reward: 1,   image: "/placeholder.svg" },
  { id: 2,  name: "Haunted Wisp", tier: "haunted-wisp", reward: 1,   image: "/placeholder2.svg" },
  { id: 3,  name: "Haunted Wisp", tier: "haunted-wisp", reward: 1,   image: "/placeholder3.svg" },
  { id: 4,  name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 25, image: "/placeholder4.svg" },
  { id: 5,  name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 25, image: "/placeholder5.svg" },
  { id: 6,  name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 25, image: "/placeholder6.svg" },
  { id: 7,  name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 25, image: "/placeholder7.svg" },
  { id: 8,  name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 25, image: "/placeholder8.svg" },
  { id: 9,  name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 25, image: "/placeholder.svg" },
  { id: 10, name: "Spectral Surge", tier: "spectral-surge", reward: 96, image: "/placeholder2.svg" },
  { id: 11, name: "Spectral Surge", tier: "spectral-surge", reward: 96, image: "/placeholder3.svg" },
  { id: 12, name: "Spectral Surge", tier: "spectral-surge", reward: 96, image: "/placeholder4.svg" },
  { id: 13, name: "Spectral Surge", tier: "spectral-surge", reward: 96, image: "/placeholder5.svg" },
  { id: 14, name: "Spectral Surge", tier: "spectral-surge", reward: 96, image: "/placeholder6.svg" },
  { id: 15, name: "Phantasmal Phantom", tier: "phantasmal-phantom", reward: 6250, image: "/placeholder7.svg" },
];

// ---------------------------------------------------------
// Rarity Styling
// ---------------------------------------------------------
function getRarityStyle(tier: string) {
  switch (tier) {
    case "haunted-wisp":
      return "border-green-500 bg-green-900/30";
    case "ectoplasmic-echo":
      return "border-blue-500 bg-blue-900/30";
    case "spectral-surge":
      return "border-purple-500 bg-purple-900/30";
    case "phantasmal-phantom":
      return "border-yellow-400 bg-yellow-900/30";
    default:
      return "border-gray-500 bg-gray-800/30";
  }
}

// ---------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------
export default function KasperLootBoxGamePage() {
  return <KasperLootBoxContent />;
}

function KasperLootBoxContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winItem, setWinItem] = useState<any>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;
  const lootBoxCost = 25;

  const handleOpenLootBox = async () => {
    if (lootBoxCost > balance) {
      alert("Insufficient balance");
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
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, lootBoxCost * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "Kasper Loot Box",
        uniqueHash,
        walletAddress: currentWalletAddress,
        betAmount: lootBoxCost,
        txid: txidString,
      });
      if (startRes.data.success) {
        setGameId(startRes.data.gameId);
      } else {
        alert("Failed to start game on backend");
        return;
      }
      setIsPlaying(true);
    } catch (error: any) {
      console.error("Error starting Kasper Loot Box game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  const handleGameEnd = async (item: any) => {
    setWinItem(item);
    setGameResult("You Win");
    setWinAmount(item.reward);
    setIsPlaying(false);

    if (gameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: "win",
          winAmount: item.reward,
        });
      } catch (error) {
        console.error("Error ending Kasper Loot Box game on backend:", error);
      }
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinItem(null);
    setWinAmount(null);
    setGameId(null);
    setDepositTxid(null);
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="inline-flex items-center text-teal-400 hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <WalletConnection />
          </motion.div>
        </header>
        {depositTxid && (
          <p className="mb-4 text-sm text-gray-300">
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-teal-300">Kasper Loot Box</h2>
                <Button variant="ghost" size="sm" className="text-teal-300" onClick={resetGame}>
                  Reset
                </Button>
              </div>
              <div className="relative w-full max-w-[600px] h-72 mx-auto flex items-center justify-center">
                <KasperLootBoxGame isPlaying={isPlaying} onGameEnd={handleGameEnd} />
                <div className="absolute top-0 bottom-0 left-0 w-40 bg-teal-900/60 backdrop-blur-md pointer-events-none" />
                <div className="absolute top-0 bottom-0 right-0 w-40 bg-teal-900/60 backdrop-blur-md pointer-events-none" />
              </div>
            </div>
          </Card>
          <KasperLootBoxControls
            betAmount={lootBoxCost.toString()}
            isPlaying={isPlaying}
            isWalletConnected={isConnected}
            balance={balance}
            onOpenLootBox={handleOpenLootBox}
            gameResult={gameResult}
            winItem={winItem}
            winAmount={winAmount}
          />
        </div>
        <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-4 mb-6">
          <h3 className="text-xl font-bold text-teal-300 mb-4 text-center">
            Kasper Loot Box Traits &amp; Rewards
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {lootItems.map((item) => {
              const rarityClass = getRarityStyle(item.tier);
              return (
                <div key={item.id} className={`flex flex-col items-center border p-2 rounded text-xs ${rarityClass}`}>
                  <Image src={item.image} alt={item.name} width={40} height={40} />
                  <p className="mt-1 font-semibold">{item.name}</p>
                  <p className="capitalize">{item.tier.replace("-", " ")}</p>
                  <p>{item.reward} KAS</p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="w-full bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #49EACB, #00FFFF, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Kasper Loot Box
          </motion.h2>
          <img src="/lootboxpromo.png" alt="Loot Box Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-teal-200 mb-4">
            For 25 KAS you might receive a <strong>Haunted Wisp</strong> (1 KAS), an <strong>Ectoplasmic Echo</strong> (25 KAS),
            a potent <strong>Spectral Surge</strong> (~96 KAS), or the ultra‑rare <strong>Phantasmal Phantom</strong> (6250 KAS, 250× payout)!
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a
              href="https://x.com/KasenOnKaspa"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-teal-400 hover:text-teal-300"
            >
              <FaTwitter />
            </motion.a>
            <motion.a
              href="https://t.co/W4YDM1cUpY"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-teal-400 hover:text-teal-300"
            >
              <FaTelegramPlane />
            </motion.a>
            <motion.a
              href="https://kasenonkas.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-teal-400 hover:text-teal-300"
            >
              <FaGlobe />
            </motion.a>
          </div>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}

function KasperLootBoxGame({ isPlaying, onGameEnd }: { isPlaying: boolean; onGameEnd: (item: any) => void; }) {
  const [reelItems, setReelItems] = useState<any[]>([]);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const itemWidth = 120;
  const reelVisibleCount = 5;
  const [animationTarget, setAnimationTarget] = useState(0);
  const [animationDuration, setAnimationDuration] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPlaying) {
      setShowResultOverlay(false);
      const r = Math.random();
      let chosenTier: string;
      if (r < 0.5) {
        chosenTier = "haunted-wisp";
      } else if (r < 0.9) {
        chosenTier = "ectoplasmic-echo";
      } else if (r < 0.999) {
        chosenTier = "spectral-surge";
      } else {
        chosenTier = "phantasmal-phantom";
      }
      const tierItems = lootItems.filter((itm) => itm.tier === chosenTier);
      const winningItem = tierItems[Math.floor(Math.random() * tierItems.length)];
      const reelLength = 40;
      const winningIndex = Math.floor(reelLength / 2);
      const newReel = Array.from({ length: reelLength }, (_, idx) => {
        if (idx === winningIndex) {
          return winningItem;
        }
        return lootItems[Math.floor(Math.random() * lootItems.length)];
      });
      setReelItems(newReel);

      const containerWidth = containerRef.current?.offsetWidth || 600;
      const containerCenter = containerWidth / 2;
      // Each reel item is forced to have a fixed width via box-sizing.
      const winningItemCenter = winningIndex * itemWidth + itemWidth / 2;
      const finalOffset = containerCenter - winningItemCenter;
      setAnimationTarget(finalOffset);
      setAnimationDuration(3);
    } else {
      setReelItems([]);
      setAnimationTarget(0);
      setAnimationDuration(0);
      setShowResultOverlay(false);
    }
  }, [isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative overflow-hidden">
      <motion.div
        className="flex"
        initial={{ x: 0 }}
        animate={{ x: animationTarget }}
        transition={{ duration: animationDuration, ease: "easeOut" }}
        onAnimationComplete={() => {
          if (reelItems.length > 0) {
            onGameEnd(reelItems[Math.floor(reelItems.length / 2)]);
            setShowResultOverlay(true);
          }
        }}
      >
        {reelItems.map((item, i) => (
          <div
            key={i}
            style={{
              width: itemWidth,
              height: itemWidth,
              padding: "5px",
              boxSizing: "border-box"
            }}
          >
            <Image
              src={item.image}
              alt={item.name}
              width={itemWidth - 10}
              height={itemWidth - 10}
              loading="eager"
            />
          </div>
        ))}
      </motion.div>
      <AnimatePresence>
        {showResultOverlay && reelItems.length > 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center p-6 rounded-lg border-2 border-teal-400 shadow-[0_0_25px_8px_rgba(79,209,197,0.5)] bg-teal-800/80 animate-pulse max-w-xs">
              <Image
                src={reelItems[Math.floor(reelItems.length / 2)].image}
                alt={reelItems[Math.floor(reelItems.length / 2)].name}
                width={80}
                height={80}
                className="mx-auto mb-2"
                loading="eager"
                style={{
                  filter: "drop-shadow(0 0 10px #00FFFF) drop-shadow(0 0 20px #00FFFF)"
                }}
              />
              <p className="text-3xl font-extrabold text-teal-100 mb-2">Congratulations!</p>
              <p className="text-xl font-bold text-white">
                {reelItems[Math.floor(reelItems.length / 2)].name}{" "}
                <span className="text-base text-teal-200">
                  ({reelItems[Math.floor(reelItems.length / 2)].tier.replace("-", " ")})
                </span>
              </p>
              <p className="text-lg text-teal-50 mt-2">
                You won <strong>{reelItems[Math.floor(reelItems.length / 2)].reward} KAS</strong>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KasperLootBoxControls({
  betAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onOpenLootBox,
  gameResult,
  winItem,
  winAmount,
}: {
  betAmount: string;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onOpenLootBox: () => void;
  gameResult: string | null;
  winItem: any;
  winAmount: number | null;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
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
    if (Number(betAmount) !== 25) {
      showError("Kasper Loot Box cost is fixed at 25 KAS");
      return;
    }
    if (25 > balance) {
      showError("Insufficient balance");
      return;
    }
    onOpenLootBox();
    setCooldown(10);
  };

  return (
    <>
      <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-teal-300">Cost per Kasper Loot Box (KAS)</label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                disabled
                className="bg-teal-900/50 border border-teal-500 text-white pl-8 w-full"
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
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult && winItem && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-teal-300">
                  {gameResult}: {winItem.name} ({winItem.tier.replace("-", " ")})
                </div>
                <div className="text-sm text-teal-200">
                  Payout: {winAmount !== null ? winAmount : 0} KAS
                </div>
              </div>
            )}
            {!isPlaying ? (
              <Button
                className="w-full bg-teal-400 text-black hover:bg-teal-300"
                onClick={handleOpenBox}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Open Kasper Loot Box (${cooldown}s)`
                  : "Open Kasper Loot Box"}
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
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-4 left-4 bg-gradient-to-r from-teal-700 to-black text-white px-4 py-2 rounded shadow-lg"
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
