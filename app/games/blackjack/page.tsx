"use client";

import { useState, useEffect } from "react";
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
import { XPDisplay } from "@/components/xp-display";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com";
const MIN_BET = 1;
const MAX_BET = 1000;

// loader messages
const DEAL_MESSAGES = ["Verifying transaction", "Hashing game seed", "Shuffling deck"];

export default function BlackjackPage() {
  return <BlackjackContent />;
}

function BlackjackContent() {
  const { isConnected, balance } = useWallet();

  // seeds + bet
  const [betAmount, setBetAmount] = useState("1");
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);

  // game state
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerHand, setPlayerHand] = useState<string[]>([]);
  const [dealerHand, setDealerHand] = useState<string[]>([]);
  const [pregame, setPregame] = useState(true);
  const [isDealing, setIsDealing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // deal loader
  const [dealMsgIdx, setDealMsgIdx] = useState(0);
  const [dealText, setDealText] = useState("");
  useEffect(() => {
    if (!isDealing) return;
    setDealMsgIdx(0);
    setDealText("");
  }, [isDealing]);
  useEffect(() => {
    if (!isDealing) return;
    const full = DEAL_MESSAGES[dealMsgIdx];
    if (dealText.length < full.length) {
      const t = setTimeout(() => setDealText(full.slice(0, dealText.length + 1)), 40);
      return () => clearTimeout(t);
    }
    const t2 = setTimeout(() => {
      if (dealMsgIdx < DEAL_MESSAGES.length - 1) {
        setDealMsgIdx(i => i + 1);
        setDealText("");
      }
    }, 1200);
    return () => clearTimeout(t2);
  }, [isDealing, dealMsgIdx, dealText]);

  // result popup
  const [result, setResult] = useState<{
    gameResult: "win" | "lose" | "push";
    winAmount: number;
  } | null>(null);

  const settleInBackground = (body: object) => axios.post(`${API_BASE}/api/game/settle`, body).catch(console.error);

  // --- DEAL ---
  const handleDeal = async () => {
    if (!isConnected) return alert("Connect your wallet first");
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      return alert(`Bet must be between ${MIN_BET} and ${MAX_BET} and ≤ your balance.`);
    }

    // provably-fair seeds
    const arr = crypto.getRandomValues(new Uint8Array(32));
    const rawSeed = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
    const buf = await crypto.subtle.digest("SHA-256", arr);
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    setClientSeed(rawSeed);

    // on-chain deposit
    const [addr] = await window.kasware.getAccounts();
    const treasury =
      Math.random() < 0.5
        ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
        : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;
    const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, { priorityFee: 10000 });
    const txid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;

    // call play
    setIsDealing(true);
    const { data } = await axios.post(`${API_BASE}/api/game/play`, {
      gameName: "blackjack",
      clientSeed: rawSeed,
      clientSeedHash: hash,
      nonce: 0,
      walletAddress: addr,
      betAmount: bet,
      txid,
    });
    setIsDealing(false);
    if (!data.success) return alert("Play API failed");

    setGameId(data.game._id);
    setServerSeedHash(data.game.serverSeedHash);
    setPlayerHand(data.game.playerHand);
    setDealerHand(data.game.dealerHand);
    setPregame(false);
  };

  // --- HIT ---
  const handleHit = async () => {
    if (!gameId) return;
    setActionLoading(true);
    const { data } = await axios.post(`${API_BASE}/api/game/settle`, { gameId, action: "hit" });
    setActionLoading(false);
    if (data.gameResult === "continue") {
      setPlayerHand(data.playerHand);
    } else {
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setResult({ gameResult: "lose", winAmount: 0 });
    }
  };

  // --- STAND ---
  const handleStand = async () => {
    if (!gameId) return;
    setActionLoading(true);
    const { data } = await axios.post(`${API_BASE}/api/game/settle`, { gameId, action: "stand" });
    setActionLoading(false);

    setDealerHand(data.dealerHand);
    if (data.gameResult === "win") {
      setResult({ gameResult: "win", winAmount: data.winAmount });
    } else if (data.gameResult === "push") {
      setResult({ gameResult: "push", winAmount: 0 });
      settleInBackground({ gameId, action: "push" });
    } else {
      setResult({ gameResult: "lose", winAmount: 0 });
    }
  };

  // --- RESET ---
  const resetGame = () => {
    setPregame(true);
    setGameId(null);
    setPlayerHand([]);
    setDealerHand([]);
    setResult(null);
    setClientSeed(null);
    setServerSeedHash(null);
    setBetAmount("1");
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      {/* DEAL Loader */}
      <AnimatePresence>
        {isDealing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-[#49EACB] font-mono text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {dealText}
            <motion.span
              className="ml-2"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              ●
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="flex items-center justify-between p-6">
        <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
          <ArrowLeft className="mr-2 w-5 h-5" /> Back to Games
        </Link>
        <div className="flex items-center gap-4">
          <XPDisplay />
          <WalletConnection />
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* LEFT: TABLE */}
        <Card className="relative overflow-hidden min-h-[600px] bg-gradient-to-br from-[#003f2f] via-[#006d5b] to-[#003f2f] border-[#49EACB]/20 backdrop-blur-sm">
          {/* Optional background image */}
          {/* <Image src="/blackjack-table-bg.webp" fill className="object-cover opacity-20" alt="Table" /> */}

          {pregame ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#49EACB] mb-4 text-center">
                Welcome to Blackjack
              </h1>
              <p className="text-lg md:text-xl text-gray-200 mb-8 text-center">
                Place your bet and test your luck at the table
              </p>
              <Button
                size="lg"
                className="bg-[#49EACB] text-black px-8 py-4 text-lg"
                onClick={handleDeal}
                disabled={!isConnected}
              >
                {!isConnected ? "Connect Wallet" : "Deal Cards"}
              </Button>
            </div>
          ) : (
            <div className="relative z-10 p-6 flex flex-col space-y-6">
              {/* Dealer */}
              <div>
                <h3 className="text-lg text-gray-200 mb-2">Dealer</h3>
                <div className="flex gap-2 flex-wrap">
                  {dealerHand.map((c, i) => (
                    <div key={i} className="relative w-16 h-24">
                      <Image src="/placeholder.svg" fill className="object-contain" alt="card" />
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {c}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player */}
              <div>
                <h3 className="text-lg text-gray-200 mb-2">Your Hand</h3>
                <div className="flex gap-2 flex-wrap">
                  {playerHand.map((c, i) => (
                    <div key={i} className="relative w-16 h-24">
                      <Image src="/placeholder.svg" fill className="object-contain" alt="card" />
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {c}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {!result && (
                <div className="flex gap-4">
                  <Button onClick={handleHit} disabled={actionLoading}>Hit</Button>
                  <Button onClick={handleStand} disabled={actionLoading}>Stand</Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* RIGHT: CONTROLS + CHAT */}
        <div className="space-y-6">
          <Card className="bg-[#49EACB]/10 border-[#49EACB]/20 backdrop-blur-sm p-6 space-y-4">
            <label className="text-sm text-[#49EACB]">Bet Amount (KAS)</label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                className="w-full bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8"
                disabled={!pregame}
              />
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                  width={16}
                  height={16}
                  alt="KAS"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(String(Math.max(MIN_BET, Number(betAmount) / 2)))}
                disabled={!pregame}
              >
                ½
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(String(Math.min(MAX_BET, Number(betAmount) * 2)))}
                disabled={!pregame}
              >
                2×
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(String(MIN_BET))}
                disabled={!pregame}
              >
                Min
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(String(Math.min(MAX_BET, balance)))}
                disabled={!pregame}
              >
                Max
              </Button>
            </div>

            <Button
              className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
              onClick={handleDeal}
              disabled={!pregame || !isConnected}
            >
              {!isConnected ? "Connect Wallet" : pregame ? "Deal Cards" : "Dealt"}
            </Button>
          </Card>

          <LiveChat textColor="#49EACB" />
          <LiveWins textColor="#49EACB" />
        </div>
      </div>

      <SiteFooter />

      {/* RESULT POPUP */}
      <AnimatePresence>
        {result && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
            <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-4xl font-bold mb-4">
                {result.gameResult === "win"
                  ? "You Win!"
                  : result.gameResult === "push"
                  ? "Push"
                  : "Bust!"}
              </h2>
              {result.gameResult === "win" && (
                <p className="text-3xl animate-pulse uppercase mb-4">
                  +{result.winAmount.toFixed(2)} KAS
                </p>
              )}
              {result.gameResult === "push" && (
                <p className="text-2xl uppercase mb-4">Your bet was returned</p>
              )}
              {result.gameResult === "lose" && (
                <p className="text-3xl animate-pulse uppercase text-red-500 mb-4">
                  You Lose
                </p>
              )}
              <div className="bg-black/80 p-4 rounded-md mb-6 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2" />
                  <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                </div>
                <p className="text-sm text-white break-all">Client Seed: {clientSeed}</p>
                <p className="text-sm text-white break-all">Server Hash: {serverSeedHash}</p>
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

