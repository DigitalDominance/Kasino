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
import "./styles.css";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// Define 15 loot items with 3 tiers of rarity:
// 10 common, 4 rare, and 1 legendary.
const lootItems = [
  // Common items (10)
  { id: 1, name: "Common Item 1", tier: "common", image: "/placeholder.svg" },
  { id: 2, name: "Common Item 2", tier: "common", image: "/placeholder2.svg" },
  { id: 3, name: "Common Item 3", tier: "common", image: "/placeholder3.svg" },
  { id: 4, name: "Common Item 4", tier: "common", image: "/placeholder4.svg" },
  { id: 5, name: "Common Item 5", tier: "common", image: "/placeholder5.svg" },
  { id: 6, name: "Common Item 6", tier: "common", image: "/placeholder6.svg" },
  { id: 7, name: "Common Item 7", tier: "common", image: "/placeholder7.svg" },
  { id: 8, name: "Common Item 8", tier: "common", image: "/placeholder8.svg" },
  { id: 9, name: "Common Item 9", tier: "common", image: "/placeholder.svg" },
  { id: 10, name: "Common Item 10", tier: "common", image: "/placeholder2.svg" },
  // Rare items (4)
  { id: 11, name: "Rare Item 1", tier: "rare", image: "/placeholder3.svg" },
  { id: 12, name: "Rare Item 2", tier: "rare", image: "/placeholder4.svg" },
  { id: 13, name: "Rare Item 3", tier: "rare", image: "/placeholder5.svg" },
  { id: 14, name: "Rare Item 4", tier: "rare", image: "/placeholder6.svg" },
  // Legendary item (1)
  { id: 15, name: "Legendary Item", tier: "legendary", image: "/placeholder7.svg" },
];

export default function LootBoxGamePage() {
  return <LootBoxContent />;
}

function LootBoxContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [gameResult, setGameResult] = useState(null);
  const [winItem, setWinItem] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [depositTxid, setDepositTxid] = useState(null);

  // These API endpoints and treasury addresses should match your backend/system.
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  const handleOpenLootBox = async () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
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
        gameName: "Loot Box",
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
      setIsPlaying(true);
    } catch (error) {
      console.error("Error starting loot box game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  const handleGameEnd = async (item) => {
    setWinItem(item);
    setGameResult("You Got");
    setIsPlaying(false);
    if (gameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: item.tier !== "common" ? "win" : "lose",
          winItem: item,
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
    setGameId(null);
    setDepositTxid(null);
  };

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

        {/* Main Game & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Loot Box</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => resetGame()}>
                  Reset
                </Button>
              </div>
              <div className="relative h-[70vh] bg-gradient-to-b from-[#600000] to-black rounded-lg mb-6 overflow-hidden border border-gray-600 shadow-2xl">
                <LootBoxGame isPlaying={isPlaying} onGameEnd={handleGameEnd} />
              </div>
            </div>
          </Card>

          <LootBoxControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            isPlaying={isPlaying}
            isWalletConnected={isConnected}
            balance={balance}
            onOpenLootBox={handleOpenLootBox}
            gameResult={gameResult}
            winItem={winItem}
          />
        </div>

        {/* Promo / Info Card */}
        <Card className="mt-6 w-full bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #600000, #FF0000, #FF7373)",
              backgroundSize: "200% 200%",
            }}
          >
            Loot Box
          </motion.h2>
          <img src="/lootboxpromo.png" alt="Loot Box Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Open the Loot Box for a chance to win exclusive in-game items! With 15 unique items spanning three tiers of rarity,
            the odds are set in favor of the house by 5%. Will you get a common, rare, or the elusive legendary item?
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a
              href="https://x.com/KasenOnKaspa"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              <FaTwitter />
            </motion.a>
            <motion.a
              href="https://t.co/W4YDM1cUpY"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              <FaTelegramPlane />
            </motion.a>
            <motion.a
              href="https://kasenonkas.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
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
/*                         Loot Box Game Component                    */
/* ------------------------------------------------------------------ */

// This component creates a horizontally spinning “reel”.
// When a loot box is opened, it first determines the winning tier/item
// (common 90%, rare 9%, legendary 1%), then generates a reel of items
// with the winning item inserted at a predetermined position. The reel
// then decelerates smoothly to stop with the winning item centered.
function LootBoxGame({ isPlaying, onGameEnd }) {
  const [reelItems, setReelItems] = useState([]);
  const [animationX, setAnimationX] = useState(0);
  const itemWidth = 100; // width for each item (in pixels)
  const reelVisibleCount = 5; // number of items visible in the viewport

  useEffect(() => {
    let animationTimeout;
    if (isPlaying) {
      // Determine winning tier based on our odds:
      // Legendary: 1%, Rare: 9%, otherwise Common (90%)
      const r = Math.random();
      let chosenTier;
      if (r < 0.01) {
        chosenTier = "legendary";
      } else if (r < 0.10) {
        chosenTier = "rare";
      } else {
        chosenTier = "common";
      }
      // Select a random winning item from the chosen tier.
      const tierItems = lootItems.filter(item => item.tier === chosenTier);
      const winningItem = tierItems[Math.floor(Math.random() * tierItems.length)];

      // Generate a reel of random items.
      const randomReel = Array.from({ length: 40 }, () => {
        return lootItems[Math.floor(Math.random() * lootItems.length)];
      });
      // Insert the winning item at a predetermined index.
      const winningPosition = 40;
      const finalReel = [...randomReel];
      finalReel.splice(winningPosition, 0, winningItem);
      // Optionally add extra items at the end to smooth the animation.
      finalReel.push(...Array.from({ length: reelVisibleCount }, () => lootItems[Math.floor(Math.random() * lootItems.length)]));
      setReelItems(finalReel);

      // Calculate the final offset so that the winning item is centered.
      const finalOffset = -(winningPosition - Math.floor(reelVisibleCount / 2)) * itemWidth;
      setAnimationX(finalOffset);

      // Trigger game end after the animation completes.
      animationTimeout = setTimeout(() => {
        onGameEnd(winningItem);
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                     Loot Box Controls Component                    */
/* ------------------------------------------------------------------ */

function LootBoxControls({ betAmount, setBetAmount, isPlaying, isWalletConnected, balance, onOpenLootBox, gameResult, winItem }) {
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
      const intervalId = setInterval(() => setCooldown(prev => prev - 1), 1000);
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  const showError = (msg) => setErrorMessage(msg);

  const handleOpenBox = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet)) {
      showError("Invalid bet amount");
      return;
    }
    if (bet < 1 || bet > 1000) {
      showError("Bet must be between 1 & 1000");
      return;
    }
    if (bet > balance) {
      showError("Insufficient balance");
      return;
    }
    onOpenLootBox();
    setCooldown(10);
  };

  return (
    <>
      <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Bet Amount</label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (isNaN(value)) value = 1;
                  value = Math.max(1, Math.min(1000, value));
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
                  if (isNaN(current)) current = 1;
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
                  if (isNaN(current)) current = 1;
                  setBetAmount((current * 2).toString());
                }}
                disabled={isPlaying || !isWalletConnected}
              >
                2×
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount("1")}
                disabled={isPlaying || !isWalletConnected}
              >
                Min
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(Math.min(1000, balance).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Max
              </Button>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult && winItem && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">
                  {gameResult}: {winItem.name} ({winItem.tier})
                </div>
              </div>
            )}

            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
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
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
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
