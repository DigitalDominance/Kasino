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
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";

// Import the updated XPDisplay component
import { XPDisplay } from "@/app/page";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// ---------------------------------------------------------
// Loot Items Distribution
// ---------------------------------------------------------
export const lootItems = [
  { id: 1, name: "Flickering Wisp", tier: "wraiths-whispers", reward: 1, image: "/kasperlootbox/common1.webp" },
  { id: 2, name: "Dusky Wisp", tier: "wraiths-whispers", reward: 1, image: "/kasperlootbox/common2.webp" },
  { id: 3, name: "Fading Wisp", tier: "wraiths-whispers", reward: 1, image: "/kasperlootbox/common3.webp" },
  { id: 4, name: "Resonant Shade", tier: "phantom-echoes", reward: 25, image: "/kasperlootbox/uncommon1.webp" },
  { id: 5, name: "Echoing Spirit", tier: "phantom-echoes", reward: 25, image: "/kasperlootbox/uncommon2.webp" },
  { id: 6, name: "Haunting Pulse", tier: "phantom-echoes", reward: 25, image: "/kasperlootbox/uncommon3.webp" },
  { id: 7, name: "Vibrant Apparition", tier: "phantom-echoes", reward: 25, image: "/kasperlootbox/uncommon4.webp" },
  { id: 8, name: "Reverberating Phantom", tier: "phantom-echoes", reward: 25, image: "/kasperlootbox/uncommon5.webp" },
  { id: 9, name: "Chiming Specter", tier: "phantom-echoes", reward: 25, image: "/kasperlootbox/uncommon6.webp" },
  { id: 10, name: "Arcane Apparition", tier: "spectral-symphony", reward: 90, image: "/kasperlootbox/epic1.webp" },
  { id: 11, name: "Mystic Wraith", tier: "spectral-symphony", reward: 90, image: "/kasperlootbox/epic2.webp" },
  { id: 12, name: "Veiled Specter", tier: "spectral-symphony", reward: 90, image: "/kasperlootbox/epic3.webp" },
  { id: 13, name: "Ethereal Enigma", tier: "spectral-symphony", reward: 90, image: "/kasperlootbox/epic4.webp" },
  { id: 14, name: "Otherworldly Pulse", tier: "spectral-symphony", reward: 90, image: "/kasperlootbox/epic5.webp" },
  { id: 15, name: "King KASPER", tier: "kaspa-legend", reward: 6250, image: "/kasperlootbox/legendary.webp" },
];

// ---------------------------------------------------------
// Rarity Styling & Overlay
// ---------------------------------------------------------
function getRarityStyle(tier: string) {
  switch (tier) {
    case "wraiths-whispers":
      return "border-blue-500 bg-blue-900/30";
    case "phantom-echoes":
      return "border-indigo-500 bg-indigo-900/30";
    case "spectral-symphony":
      return "border-purple-500 bg-purple-900/30";
    case "kaspa-legend":
      return "border-pink-500 bg-pink-900/30";
    default:
      return "border-gray-500 bg-gray-800/30";
  }
}

function getRarityOverlayClass(tier: string) {
  switch (tier) {
    case "wraiths-whispers":
      return "bg-gradient-to-br from-blue-400/30 to-blue-900/30";
    case "phantom-echoes":
      return "bg-gradient-to-br from-indigo-400/30 to-indigo-900/30";
    case "spectral-symphony":
      return "bg-gradient-to-br from-purple-400/30 to-purple-900/30";
    case "kaspa-legend":
      return "bg-gradient-to-br from-pink-400/30 to-pink-900/30";
    default:
      return "bg-gradient-to-br from-gray-400/30 to-gray-800/30";
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
      // Start the spin
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
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="inline-flex items-center text-blue-400 hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
            </Link>
          </motion.div>
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Insert XPDisplay next to WalletConnection */}
            <XPDisplay />
            <WalletConnection />
          </motion.div>
        </header>

        {/* Deposit TXID */}
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

        {/* Main Game & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-blue-300">Kasper Loot Box</h2>
                <Button variant="ghost" size="sm" className="text-blue-300" onClick={resetGame}>
                  Reset
                </Button>
              </div>
              {/* Reel Container */}
              <div className="relative w-full max-w-[600px] h-72 mx-auto flex items-center justify-center">
                <KasperLootBoxGame isPlaying={isPlaying} onGameEnd={handleGameEnd} />
                {isPlaying && (
                  <>
                    <div className="absolute top-0 bottom-0 left-0 w-40 bg-teal-900/60 backdrop-blur-md pointer-events-none" />
                    <div className="absolute top-0 bottom-0 right-0 w-40 bg-teal-900/60 backdrop-blur-md pointer-events-none" />
                  </>
                )}
                {!isPlaying && (
                  <>
                    <div className="absolute inset-0 z-30">
                      <motion.div
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        className="absolute top-0 left-20"
                        style={{ filter: "drop-shadow(0 0 15px #EC4899)" }}
                      >
                        <Image
                          src="/kasperlootbox/legendary.webp"
                          alt="King KASPER"
                          width={100}
                          height={100}
                          className="rounded-full border-4 border-pink-500"
                        />
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.15, rotate: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className="absolute bottom-0 right-20"
                        style={{ filter: "drop-shadow(0 0 15px #A855F7)" }}
                      >
                        <Image
                          src="/kasperlootbox/epic1.webp"
                          alt="Arcane Apparition"
                          width={80}
                          height={80}
                          className="rounded-lg border-4 border-purple-500"
                        />
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        className="absolute top-0 right-20"
                        style={{ filter: "drop-shadow(0 0 15px #3B82F6)" }}
                      >
                        <Image
                          src="/kasperlootbox/common1.webp"
                          alt="Flickering Wisp"
                          width={70}
                          height={70}
                          className="rounded-md border-4 border-blue-500"
                        />
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.15, rotate: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className="absolute bottom-0 left-20"
                        style={{ filter: "drop-shadow(0 0 15px #6366F1)" }}
                      >
                        <Image
                          src="/kasperlootbox/uncommon1.webp"
                          alt="Resonant Shade"
                          width={70}
                          height={70}
                          className="rounded-md border-4 border-indigo-500"
                        />
                      </motion.div>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
                      <motion.h1
                        className="text-5xl font-bold mb-4"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ color: "#49EACB" }}
                      >
                        KASPER LOOT BOX
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
          <h3 className="text-xl font-bold text-blue-300 mb-4 text-center">
            Kasper Loot Box Traits & Rewards
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {lootItems.map((item) => {
              const rarityClass = getRarityStyle(item.tier);
              return (
                <div key={item.id} className={`flex flex-col items-center border p-2 rounded text-xs ${rarityClass}`}>
                  <Image src={item.image} alt={item.name} width={40} height={40} />
                  <p className="mt-1 font-semibold text-blue-400 drop-shadow">{item.name}</p>
                  <p className="capitalize text-blue-300 drop-shadow">{item.tier.replace("-", " ")}</p>
                  <p className="text-teal-300 drop-shadow">{item.reward} KAS</p>
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
          <p className="text-sm text-white-200 mb-4">
            For 25 KAS you might receive a <strong>Flickering Wisp</strong> (1 KAS), a <strong>Resonant Shade</strong> (25 KAS),
            a potent <strong>Arcane Apparition</strong> (90 KAS), or the ultra‑rare <strong>King KASPER</strong> (6250 KAS, 250× payout)!
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a
              href="https://x.com/KasenOnKaspa"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-blue-400 hover:text-blue-300"
            >
              <FaTwitter />
            </motion.a>
            <motion.a
              href="https://t.co/W4YDM1cUpY"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-blue-400 hover:text-blue-300"
            >
              <FaTelegramPlane />
            </motion.a>
            <motion.a
              href="https://kasenonkas.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-blue-400 hover:text-blue-300"
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

// ---------------------------------------------------------
// Kasper Loot Box Game Component (Horizontal Reel with Popup)
// ---------------------------------------------------------
function KasperLootBoxGame({ isPlaying, onGameEnd }: { isPlaying: boolean; onGameEnd: (item: any) => void; }) {
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

      // Generate a random reel of 40 items from lootItems
      const randomReel = Array.from({ length: 40 }, () => lootItems[Math.floor(Math.random() * lootItems.length)]);
      randomReelLengthRef.current = randomReel.length;
      // Duplicate for seamless looping
      const loopReel = randomReel.concat(randomReel);
      setFinalReel(loopReel);

      // Determine winning tier/item via probability logic
      const r = Math.random();
      let chosenTier =
        r < 0.5 ? "wraiths-whispers" :
        r < 0.9 ? "phantom-echoes" :
        r < 0.999 ? "spectral-symphony" : "kaspa-legend";
      const tierItems = lootItems.filter((itm) => itm.tier === chosenTier);
      const winItem = tierItems[Math.floor(Math.random() * tierItems.length)];
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
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{ width: containerWidth }}
    >
      <motion.div
        className="flex"
        animate={controls}
        onUpdate={(latest) => {
          currentXRef.current = latest.x;
        }}
      >
        {finalReel.map((item, i) => (
          <div key={i} style={{ width: itemWidth, flexShrink: 0 }} className="p-0">
            <div className="relative w-full h-full">
              <Image
                src={item.image}
                alt={item.name}
                width={itemWidth}
                height={itemWidth}
                loading="eager"
              />
              <div className={`absolute inset-0 ${getRarityOverlayClass(item.tier)}`} style={{ pointerEvents: "none" }} />
            </div>
          </div>
        ))}
      </motion.div>
      <AnimatePresence>
        {showResultOverlay && winningItem && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ times: [0, 0.5, 1], duration: 2, ease: "easeInOut" }}
              className="text-center p-6 rounded-lg border-2 border-teal-400 shadow-[0_0_25px_8px_rgba(0,255,255,0.5)] bg-teal-800/80 max-w-xs"
            >
              <Image
                src={winningItem.image}
                alt={winningItem.name}
                width={80}
                height={80}
                className="mx-auto mb-2"
                loading="eager"
                style={{ filter: "drop-shadow(0 0 10px #00FFFF) drop-shadow(0 0 20px #00FFFF)" }}
              />
              <p className="text-3xl font-extrabold text-teal-400 mb-2">Congratulations!</p>
              <p className="text-xl font-bold text-teal-100">
                {winningItem.name} <span className="text-base text-teal-200">({winningItem.tier.replace("-", " ")})</span>
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
// Kasper Loot Box Controls Component
// ---------------------------------------------------------
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
            <label className="text-sm text-blue-300">Cost per Kasper Loot Box (KAS)</label>
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
                <div className="text-2xl font-bold text-blue-300">
                  {gameResult}: {winItem.name} ({winItem.tier.replace("-", " ")})
                </div>
                <div className="text-sm text-blue-200">
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
