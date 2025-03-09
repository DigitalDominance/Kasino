"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// Define 15 ghost-themed loot items with four rarities.
// Tier 1: Haunted Wisp (Common, 50% chance) – 6 variants, reward: 0.05 KAS
// Tier 2: Ectoplasmic Echo (Uncommon, 40% chance) – 5 variants, reward: 20 KAS
// Tier 3: Spectral Surge (Rare, ~9.9% chance) – 3 variants, reward: 96 KAS
// Tier 4: Phantasmal Phantom (Legendary, 0.1% chance) – 1 variant, reward: 6250 KAS
export const lootItems = [
  // Tier 1: Haunted Wisp (IDs 1-6)
  { id: 1, name: "Haunted Wisp", tier: "haunted-wisp", reward: 0.05, image: "/placeholder.svg" },
  { id: 2, name: "Haunted Wisp", tier: "haunted-wisp", reward: 0.05, image: "/placeholder2.svg" },
  { id: 3, name: "Haunted Wisp", tier: "haunted-wisp", reward: 0.05, image: "/placeholder3.svg" },
  { id: 4, name: "Haunted Wisp", tier: "haunted-wisp", reward: 0.05, image: "/placeholder4.svg" },
  { id: 5, name: "Haunted Wisp", tier: "haunted-wisp", reward: 0.05, image: "/placeholder5.svg" },
  { id: 6, name: "Haunted Wisp", tier: "haunted-wisp", reward: 0.05, image: "/placeholder6.svg" },
  // Tier 2: Ectoplasmic Echo (IDs 7-11)
  { id: 7, name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 20, image: "/placeholder7.svg" },
  { id: 8, name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 20, image: "/placeholder8.svg" },
  { id: 9, name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 20, image: "/placeholder.svg" },
  { id: 10, name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 20, image: "/placeholder2.svg" },
  { id: 11, name: "Ectoplasmic Echo", tier: "ectoplasmic-echo", reward: 20, image: "/placeholder3.svg" },
  // Tier 3: Spectral Surge (IDs 12-14)
  { id: 12, name: "Spectral Surge", tier: "spectral-surge", reward: 96, image: "/placeholder4.svg" },
  { id: 13, name: "Spectral Surge", tier: "spectral-surge", reward: 96, image: "/placeholder5.svg" },
  { id: 14, name: "Spectral Surge", tier: "spectral-surge", reward: 96, image: "/placeholder6.svg" },
  // Tier 4: Phantasmal Phantom (ID 15)
  { id: 15, name: "Phantasmal Phantom", tier: "phantasmal-phantom", reward: 6250, image: "/placeholder7.svg" },
];

export default function LootBoxGamePage() {
  return <LootBoxContent />;
}

function LootBoxContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [winItem, setWinItem] = useState(null);
  const [winAmount, setWinAmount] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [depositTxid, setDepositTxid] = useState(null);

  // API endpoints and treasury addresses should match your backend.
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Loot Box cost is fixed at 25 KAS.
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
        gameName: "Loot Box",
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
    } catch (error) {
      console.error("Error starting loot box game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // Updated handleGameEnd now mimics the slots game.
  const handleGameEnd = async (item) => {
    setWinItem(item);
    // If the item is Haunted Wisp, consider it a loss.
    const isWin = item.tier !== "haunted-wisp";
    const resultText = isWin ? "You Win" : "You Lose";
    const winAmt = isWin ? item.reward : 0;
    setGameResult(resultText);
    setWinAmount(winAmt);
    setIsPlaying(false);
    if (gameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: isWin ? "win" : "lose",
          winAmount: winAmt,
        });
      } catch (error) {
        console.error("Error ending game on backend:", error);
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
            <Link href="/" className="inline-flex items-center text-teal-400 hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <WalletConnection />
          </motion.div>
        </header>

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

        {/* Traits Layout Card */}
        <Card className="mb-6 bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-4">
          <h3 className="text-xl font-bold text-teal-300 mb-4 text-center">Loot Box Traits & Rewards</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {lootItems.map((item) => (
              <div key={item.id} className="flex flex-col items-center border border-teal-600 p-2 rounded">
                <Image src={item.image} alt={item.name} width={50} height={50} />
                <p className="mt-2 text-teal-200 text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-teal-100">{item.tier.replace("-", " ")}</p>
                <p className="text-xs text-teal-100">{item.reward} KAS</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Main Game & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-teal-300">Loot Box</h2>
                <Button variant="ghost" size="sm" className="text-teal-300" onClick={resetGame}>
                  Reset
                </Button>
              </div>
              <div className="relative w-full flex-grow flex items-center justify-center">
                {/* Reel container (centered) */}
                <div className="relative w-full max-w-lg h-64 overflow-hidden">
                  <LootBoxGame isPlaying={isPlaying} onGameEnd={handleGameEnd} />
                  {/* Glass overlay (mask) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[250px] h-full border-x-4 border-teal-400" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <LootBoxControls
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

        {/* Promo / Info Card */}
        <Card className="mt-6 w-full bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #49EACB, #00FFFF, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Loot Box
          </motion.h2>
          <img src="/lootboxpromo.png" alt="Loot Box Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-teal-200 mb-4">
            For 25 KAS you might receive a meager <strong>Haunted Wisp</strong> (0.05 KAS), a modest{" "}
            <strong>Ectoplasmic Echo</strong> (20 KAS), a powerful <strong>Spectral Surge</strong> (~96 KAS) – or the ultra‑rare{" "}
            <strong>Phantasmal Phantom</strong> (6250 KAS, 250× payout)!
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

/* ------------------------------------------------------------------ */
/*                        Loot Box Game Component                     */
/* ------------------------------------------------------------------ */

// This component creates a horizontally spinning reel.
// The winning tier is determined by a random draw with these odds:
// - Haunted Wisp (Common): 50%
// - Ectoplasmic Echo (Uncommon): 40%
// - Spectral Surge (Rare): ~9.9%
// - Phantasmal Phantom (Legendary): 0.1%
// The winning item is inserted into a reel of 40 random items so that it stops centered.
// When the animation ends, a fade-in overlay shows the result.
function LootBoxGame({ isPlaying, onGameEnd }) {
  const [reelItems, setReelItems] = useState([]);
  const [animationX, setAnimationX] = useState(0);
  const itemWidth = 100; // width (in pixels) for each item
  const reelVisibleCount = 5; // number of items visible
  const [showResultOverlay, setShowResultOverlay] = useState(false);

  useEffect(() => {
    let animationTimeout;
    if (isPlaying) {
      setShowResultOverlay(false);
      // Determine winning tier based on odds.
      const r = Math.random();
      let chosenTier;
      if (r < 0.5) {
        chosenTier = "haunted-wisp";
      } else if (r < 0.9) {
        chosenTier = "ectoplasmic-echo";
      } else if (r < 0.999) {
        chosenTier = "spectral-surge";
      } else {
        chosenTier = "phantasmal-phantom";
      }
      // Select winning item from that tier.
      const tierItems = lootItems.filter((item) => item.tier === chosenTier);
      const winningItem = tierItems[Math.floor(Math.random() * tierItems.length)];

      // Generate a reel of 40 random items.
      const randomReel = Array.from({ length: 40 }, () => {
        return lootItems[Math.floor(Math.random() * lootItems.length)];
      });
      // Insert the winning item at a fixed index.
      const winningPosition = 40;
      const finalReel = [...randomReel];
      finalReel.splice(winningPosition, 0, winningItem);
      // Append extra items to smooth the animation.
      finalReel.push(...Array.from({ length: reelVisibleCount }, () => lootItems[Math.floor(Math.random() * lootItems.length)]));
      setReelItems(finalReel);

      // Calculate final offset so that winning item is centered.
      const finalOffset = -(winningPosition - Math.floor(reelVisibleCount / 2)) * itemWidth;
      setAnimationX(finalOffset);

      // End game after animation completes.
      animationTimeout = setTimeout(() => {
        onGameEnd(winningItem);
        setTimeout(() => setShowResultOverlay(true), 500);
      }, 4000);
    } else {
      setReelItems([]);
      setAnimationX(0);
    }
    return () => clearTimeout(animationTimeout);
  }, [isPlaying, onGameEnd]);

  return (
    <div className="w-full h-full overflow-hidden relative">
      <motion.div
        className="flex"
        animate={{ x: animationX }}
        transition={{ duration: 3, ease: "easeOut" }}
      >
        {reelItems.map((item, index) => (
          <div key={index} className="flex-shrink-0" style={{ width: itemWidth, height: itemWidth, padding: "5px" }}>
            <Image src={item.image} alt={item.name} width={itemWidth - 10} height={itemWidth - 10} />
          </div>
        ))}
      </motion.div>
      <AnimatePresence>
        {showResultOverlay && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center p-4 rounded bg-teal-800/80">
              <p className="text-2xl font-bold text-teal-200">You Got:</p>
              <p className="text-xl text-teal-100">
                {/* Display winning item's name and tier */}
                {reelItems[40] && reelItems[40].name} ({reelItems[40] && reelItems[40].tier.replace("-", " ")})
              </p>
              <p className="text-sm text-teal-100">
                Payout: {reelItems[40] && reelItems[40].reward} KAS
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                     Loot Box Controls Component                    */
/* ------------------------------------------------------------------ */

function LootBoxControls({ betAmount, isPlaying, isWalletConnected, balance, onOpenLootBox, gameResult, winItem, winAmount }) {
  const [errorMessage, setErrorMessage] = useState(null);
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

  const showError = (msg) => setErrorMessage(msg);

  const handleOpenBox = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    if (Number(betAmount) !== 25) {
      showError("Loot Box cost is fixed at 25 KAS");
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
            <label className="text-sm text-teal-300">Cost per Loot Box (KAS)</label>
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
            {gameResult && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-teal-300">
                  {gameResult}: {winItem && winItem.name} ({winItem && winItem.tier.replace("-", " ")})
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
                  ? `Open Loot Box (${cooldown}s)`
                  : "Open Loot Box"}
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
