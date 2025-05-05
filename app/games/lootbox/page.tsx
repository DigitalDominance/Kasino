// app/kasper-loot-box/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
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
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";
import { XPDisplay } from "@/app/page";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });
const LOOTBOX_COST = 25;
const loadingMessages = ["Verifying transaction", "Opening box", "Finalizing"];

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
    case "wraiths-whispers":   return "border-blue-500 bg-blue-900/30";
    case "phantom-echoes":     return "border-indigo-500 bg-indigo-900/30";
    case "spectral-symphony":  return "border-purple-500 bg-purple-900/30";
    case "kaspa-legend":       return "border-pink-500 bg-pink-900/30";
    default:                   return "border-gray-500 bg-gray-800/30";
  }
}
function getRarityOverlayClass(tier: string) {
  switch (tier) {
    case "wraiths-whispers":   return "bg-gradient-to-br from-blue-400/30 to-blue-900/30";
    case "phantom-echoes":     return "bg-gradient-to-br from-indigo-400/30 to-indigo-900/30";
    case "spectral-symphony":  return "bg-gradient-to-br from-purple-400/30 to-purple-900/30";
    case "kaspa-legend":       return "bg-gradient-to-br from-pink-400/30 to-pink-900/30";
    default:                   return "bg-gradient-to-br from-gray-400/30 to-gray-800/30";
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

  // parent game state
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [gameResult,   setGameResult]   = useState<"win"|"lose"|null>(null);
  const [winItem,      setWinItem]      = useState<typeof lootItems[0] | null>(null);
  const [winAmount,    setWinAmount]    = useState<number|null>(null);
  const [depositTxid,  setDepositTxid]  = useState<string|null>(null);

  const [clientSeed,     setClientSeed]     = useState("");
  const [clientSeedHash, setClientSeedHash] = useState("");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [nonce,          setNonce]          = useState(0);

  const [phase,        setPhase]        = useState<"idle"|"depositing"|"loading"|"spinning">("idle");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [loadingMsg,   setLoadingMsg]   = useState("");

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api/game/play";
  const t1     = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!;
  const t2     = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;

  // rotate loading messages
  useEffect(() => {
    if (phase !== "loading") return;
    setLoadingMsg(loadingMessages[loadingIndex]);
    const t = setTimeout(() => setLoadingIndex(i => (i+1)%loadingMessages.length), 2000);
    return () => clearTimeout(t);
  }, [phase, loadingIndex]);

  // entire deposit → play → spin flow
  const handleOpenLootBox = async () => {
    if (!isConnected) { alert("Please connect your wallet"); return; }
    if (balance < LOOTBOX_COST) { alert("Insufficient balance"); return; }

    // 1) generate client seed + hash
    const arr  = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const seed = Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");
    const buf  = await crypto.subtle.digest("SHA-256", arr);
    const hash = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
    setClientSeed(seed);
    setClientSeedHash(hash);

    // 2) deposit
    setPhase("depositing");
    const [addr] = await window.kasware.getAccounts();
    const to = Math.random()<0.5 ? t1 : t2;
    const dep = await window.kasware.sendKaspa(to, LOOTBOX_COST*1e8, { priorityFee:10000 });
    const txid = typeof dep==="string" ? JSON.parse(dep).id : dep.id;
    setDepositTxid(txid);

    // 3) call backend
    setPhase("loading");
    setLoadingIndex(0);
    try {
      const { data } = await axios.post(apiUrl, {
        gameName:       "kasper loot box",
        clientSeed:     seed,
        clientSeedHash: hash,
        nonce,
        walletAddress:  addr,
        betAmount:      LOOTBOX_COST,
        txid,
      });
      if (!data.success) throw new Error(data.message||"Error");

      // **capture exactly the backend result**
      setServerSeedHash(data.game.serverSeedHash);
      const chosen = lootItems.find(i=>i.id===data.game.predeterminedItemId)!;
      setWinItem(chosen);
      setWinAmount(chosen.reward);
      setNonce(n=>n+1);

      // 4) spin
      setPhase("spinning");
      setIsPlaying(true);
    } catch(err:any) {
      console.error(err);
      alert(err.response?.data?.message||err.message||"Failed");
      setPhase("idle");
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinItem(null);
    setWinAmount(null);
    setDepositTxid(null);
    setPhase("idle");
    setClientSeed("");
    setClientSeedHash("");
    setServerSeedHash("");
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        {/* header */}
        <header className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center text-blue-400 hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4"/> Back to Games
          </Link>
          <div className="flex items-center gap-4">
            <XPDisplay/><WalletConnection/>
          </div>
        </header>

        {/* deposit TXID */}
        {depositTxid && (
          <p className="mb-4 text-sm text-gray-300">
            Deposit TXID:{" "}
            <a
              href={`https://kas.fyi/transaction/${depositTxid}`}
              target="_blank" rel="noopener noreferrer"
              className="underline text-teal-300"
            >
              {depositTxid}
            </a>
          </p>
        )}

        {/* game + controls grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
          {/* left side: relative container for popup */}
          <div className="relative">
            <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm overflow-visible">
              <div className="p-6 flex flex-col items-center">
                <div className="flex justify-between w-full mb-4">
                  <h2 className="text-2xl font-bold text-blue-300">Kasper Loot Box</h2>
                  <Button variant="ghost" size="sm" className="text-blue-300" onClick={resetGame}>
                    Reset
                  </Button>
                </div>
                <div className="relative w-full max-w-[600px] h-72 mx-auto flex items-center justify-center overflow-hidden">
                  <KasperLootBoxReel
                    isPlaying={isPlaying}
                    onSpinEnd={() => {
                      // trigger popup only after reel stops
                      setGameResult("win");
                    }}
                  />
                  {/* spin overlays */}
                  {isPlaying && (
                    <>
                      <div className="absolute top-0 bottom-0 left-0 w-40 bg-teal-900/60 backdrop-blur-md"/>
                      <div className="absolute top-0 bottom-0 right-0 w-40 bg-teal-900/60 backdrop-blur-md"/>
                      <div className="absolute top-0 left-20 w-20 h-20 bg-teal-900/50 backdrop-blur-sm rounded-lg"/>
                      <div className="absolute bottom-0 right-20 w-20 h-20 bg-teal-900/50 backdrop-blur-sm rounded-lg"/>
                    </>
                  )}
                  {/* idle title */}
                  {!isPlaying && !gameResult && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center">
                      <motion.h1
                        className="text-5xl font-bold mb-4"
                        animate={{ scale: [1,1.1,1] }}
                        transition={{ duration:2, repeat:Infinity, ease:"easeInOut" }}
                        style={{ color:"#49EACB" }}
                      >
                        KASPER LOOT BOX
                      </motion.h1>
                      <motion.p
                        className="text-xl tracking-wider"
                        animate={{ opacity: [0.8,1,0.8] }}
                        transition={{ duration:2, repeat:Infinity, ease:"easeInOut" }}
                        style={{ color:"#00FFFF" }}
                      >
                        SPIN TO WIN
                      </motion.p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* popup uses exactly winItem from backend */}
            <AnimatePresence>
              {gameResult === "win" && winItem && (
                <motion.div
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
                    <h2 className="text-4xl font-bold mb-6">Your Loot Box Result</h2>

                    <Image
                      src={winItem.image}
                      alt={winItem.name}
                      width={100}
                      height={100}
                      className="mx-auto mb-4"
                    />

                    <p className="text-4xl font-bold mb-4">
                      YOU WIN <strong>{winItem.reward}</strong> KAS!
                    </p>

                    <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                      <div className="flex items-center mb-2">
                        <ShieldCheck className="text-white mr-2"/>
                        <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                      </div>
                      <p className="text-sm text-white break-all">Client seed: {clientSeed}</p>
                      <p className="text-sm text-white break-all">Server seed hash: {serverSeedHash}</p>
                    </div>

                    <Button onClick={resetGame} className="px-8 py-3">Play Again</Button>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* right controls */}
          <KasperLootBoxControls
            betAmount={LOOTBOX_COST.toString()}
            isPlaying={isPlaying}
            isWalletConnected={isConnected}
            balance={balance}
            onOpenLootBox={handleOpenLootBox}
            gameResult={gameResult}
            winItem={winItem}
            winAmount={winAmount}
          />
        </div>

        {/* traits grid */}
        <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-4 mb-6">
          <h3 className="text-xl font-bold text-blue-300 mb-4 text-center">
            Kasper Loot Box Traits & Rewards
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {lootItems.map(item => (
              <div key={item.id} className={`flex flex-col items-center border p-2 rounded text-xs ${getRarityStyle(item.tier)}`}>
                <Image src={item.image} alt={item.name} width={40} height={40}/>
                <p className="mt-1 font-semibold text-blue-400 drop-shadow">{item.name}</p>
                <p className="capitalize text-blue-300 drop-shadow">{item.tier.replace("-", " ")}</p>
                <p className="text-teal-300 drop-shadow">{item.reward} KAS</p>
              </div>
            ))}
          </div>
        </Card>

        {/* footer */}
        <Card className="w-full bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%","100% 50%"] }}
            transition={{ duration:7, repeat:Infinity, ease:"linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #49EACB, #00FFFF, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Kasper Loot Box
          </motion.h2>
          <img src="/lootboxpromo.png" alt="Loot Box Promo" className="w-full h-auto mb-4"/>
          <p className="text-sm mb-4">
            For 25 KAS you might receive a <strong>Flickering Wisp</strong> (1 KAS),
            a <strong>Resonant Shade</strong> (25 KAS), a potent <strong>Arcane Apparition</strong> (90 KAS),
            or the ultra-rare <strong>King KASPER</strong> (6250 KAS, 250× payout)!
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a href="https://x.com/KasenOnKaspa" whileHover={{ scale:1.2 }} className="text-blue-400">
              <FaTwitter/>
            </motion.a>
            <motion.a href="https://t.co/W4YDM1cUpY" whileHover={{ scale:1.2 }} className="text-blue-400">
              <FaTelegramPlane/>
            </motion.a>
            <motion.a href="https://kasenonkas.com" whileHover={{ scale:1.2 }} className="text-blue-400">
              <FaGlobe/>
            </motion.a>
          </div>
        </Card>
      </div>

      <SiteFooter/>

      {/* global overlays */}
      <AnimatePresence>
        {phase==="depositing" && (
          <motion.div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center text-white text-lg"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            Depositing your {LOOTBOX_COST} KAS…
          </motion.div>
        )}
        {phase==="loading" && (
          <motion.div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center text-teal-300 font-mono text-lg"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            {loadingMsg}
            <motion.span className="ml-2 animate-pulse" animate={{ opacity:[0,1,0] }} transition={{ repeat:Infinity, duration:1 }}>●</motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------
// Reel Component (pure spin, no internal winner)
// ---------------------------------------------------------
function KasperLootBoxReel({
  isPlaying,
  onSpinEnd,
}: {
  isPlaying: boolean;
  onSpinEnd: () => void;
}) {
  const controls = useAnimation();
  const containerWidth = 600;
  const itemWidth = 120;
  const currentXRef = useRef(0);
  const [finalReel, setFinalReel] = useState<any[]>([]);
  const spinTriggered = useRef(false);

  useEffect(() => {
    if (isPlaying && !spinTriggered.current) {
      spinTriggered.current = true;
      const base = Array.from({ length: 40 }, () => lootItems[Math.floor(Math.random()*lootItems.length)]);
      setFinalReel(base.concat(base));
      controls.start({ x: [0, -base.length*itemWidth], transition:{ duration:1, repeat:Infinity, ease:"linear" } });
      setTimeout(() => {
        controls.stop();
        const aligned = Math.round(currentXRef.current / itemWidth)*itemWidth;
        controls.start({ x: aligned, transition:{ duration:0.5, ease:"easeOut" } });
        onSpinEnd();
      },4000);
    }
    if (!isPlaying) {
      spinTriggered.current = false;
      controls.set({ x:0 });
      setFinalReel([]);
    }
  }, [isPlaying, controls, onSpinEnd]);

  return (
    <div className="relative overflow-hidden" style={{ width:containerWidth, height:itemWidth }}>
      <motion.div className="flex" animate={controls} onUpdate={v => currentXRef.current = v.x as number}>
        {finalReel.map((it,i)=>(
          <div key={i} style={{ width:itemWidth, flexShrink:0 }}>
            <div className="relative w-full h-full">
              <Image src={it.image} alt={it.name} width={itemWidth} height={itemWidth}/>
              <div className={`absolute inset-0 ${getRarityOverlayClass(it.tier)}`}/>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------
// Controls Component
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
  const [errorMessage, setErrorMessage] = useState<string|null>(null);
  const [cooldown, setCooldown]         = useState(0);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (cooldown > 0) {
      const id = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(id);
    }
  }, [cooldown]);

  const showError = (m: string) => setErrorMessage(m);
  const handleClick = () => {
    if (!isWalletConnected) { showError("Please connect your wallet"); return; }
    if (Number(betAmount) !== LOOTBOX_COST) { showError("Cost fixed at 25 KAS"); return; }
    if (balance < LOOTBOX_COST) { showError("Insufficient balance"); return; }
    onOpenLootBox(); setCooldown(10);
  };

  return (
    <>
      <Card className="bg-teal-900/50 border border-teal-500 backdrop-blur-sm p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-blue-300">Cost per Kasper Loot Box (KAS)</label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                disabled
                className="bg-teal-900/50 border border-teal-500 text-white pl-8 w-full"
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
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

          <motion.div whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}>
            {gameResult && winItem && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-blue-300">
                  {gameResult.toUpperCase()}: {winItem.name}
                </div>
                <div className="text-sm text-blue-200">
                  Payout: {winAmount} KAS
                </div>
              </div>
            )}
            {!isPlaying ? (
              <Button
                onClick={handleClick}
                disabled={!isWalletConnected || cooldown>0}
                className="w-full bg-teal-400 text-black hover:bg-teal-300"
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown>0
                    ? `Open Loot Box (${cooldown}s)`
                    : "Open Loot Box"}
              </Button>
            ) : (
              <Button className="w-full bg-teal-400 text-black" disabled>
                Opening...
              </Button>
            )}
          </motion.div>
        </div>
      </Card>

      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ x:-300, opacity:0 }}
            animate={{ x:0, opacity:1 }}
            exit={{ x:-300, opacity:0 }}
            transition={{ duration:0.5 }}
            className="fixed bottom-4 left-4 bg-gradient-to-r from-teal-700 to-black text-white px-4 py-2 rounded shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={()=>setErrorMessage(null)} className="ml-4 font-bold text-white">X</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
