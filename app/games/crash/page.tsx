"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useWallet } from "@/contexts/WalletContext";
import { CrashGame } from "./crash-game";
import { CrashControls } from "./crash-controls";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { XPDisplay } from "@/app/page";
import { Button } from "@/components/ui/button";
import { Montserrat } from "next/font/google";
import "./styles.css";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });
const MESSAGES = ["Verifying transaction", "Starting crash", "Finalizing result"];
const API = "https://kasino-backend-4818b4b69870.herokuapp.com/api/game";

export default function CrashPage() {
  const [betAmount, setBetAmount] = useState("0.00");
  const [clientSeed, setClientSeed] = useState("");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [winAmount, setWinAmount] = useState(0);

  // Typewriter for loading
  useEffect(() => {
    if (!loading) return;
    const full = MESSAGES[msgIndex];
    if (loadingMsg.length < full.length) {
      const t = setTimeout(
        () => setLoadingMsg(full.slice(0, loadingMsg.length + 1)),
        40
      );
      return () => clearTimeout(t);
    }
    const t2 = setTimeout(() => {
      if (msgIndex < MESSAGES.length - 1) {
        setMsgIndex(i => i + 1);
        setLoadingMsg("");
      }
    }, 2000);
    return () => clearTimeout(t2);
  }, [loading, loadingMsg, msgIndex]);

  // 1) Place Bet → /play
  const handlePlaceBet = useCallback(async () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0) return alert("Invalid bet");
    try {
      // generate seed + hash
      const arr = crypto.getRandomValues(new Uint8Array(32));
      const raw = Array.from(arr)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      const buf = await crypto.subtle.digest("SHA-256", arr);
      const hashHex = Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      setClientSeed(raw);

      // deposit on-chain (same as your other games)
      const [addr] = await window.kasware.getAccounts();
      const treasury = Math.random() < 0.5
        ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
        : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;
      const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, { priorityFee: 10000 });
      const txid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;

      // call play
      setLoading(true);
      setMsgIndex(0);
      setLoadingMsg("");
      const resp = await axios.post(`${API}/play`, {
        gameName:       "crash",
        clientSeed:     raw,
        clientSeedHash: hashHex,
        nonce:          0,
        walletAddress:  addr,
        betAmount:      bet,
        txid,
      });
      setLoading(false);

      if (!resp.data.success) {
        alert(resp.data.message || "Play failed");
        return;
      }
      setServerSeedHash(resp.data.game.serverSeedHash);
      setGameId(resp.data.game._id);
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      setLoading(false);
      alert("Error starting game");
    }
  }, [betAmount]);

  // 2a) Crash callback from CrashGame
  const handleCrash = useCallback(() => {
    setIsPlaying(false);
    setGameResult("lose");
    setWinAmount(0);
    setShowResult(true);
  }, []);

  // 2b) Manual cash-out
  const handleCashout = useCallback(async () => {
    setIsPlaying(false);
    const payout = Number(betAmount) * currentMultiplier;
    setGameResult("win");
    setWinAmount(payout);
    setShowResult(true);
    if (gameId) {
      await axios.post(`${API}/settle`, {
        gameId,
        cashoutMultiplier: currentMultiplier
      }).catch(console.error);
    }
  }, [betAmount, gameId, currentMultiplier]);

  const reset = () => window.location.reload();

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono text-[#49EACB]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {loadingMsg}
            {["●","●","●"].map((d,i) => (
              <motion.span
                key={i}
                className="ml-2 text-xs"
                animate={{ opacity: [0,1,0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i*0.2 }}
              >
                {d}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Games
        </Link>
        <div className="flex items-center gap-4">
          <XPDisplay /> <WalletConnection />
        </div>
      </header>

      {/* Crash Canvas & Controls */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 p-6">
        <div
          className="relative bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden"
          style={{ height: 700 }}
        >
          {!isPlaying && !showResult && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-[#49EACB]/20 border border-[#49EACB] rounded-lg p-6 text-center">
                <h2 className="text-4xl font-bold text-[#49EACB] mb-4">Crash</h2>
                <p className="text-lg text-white mb-6">
                  Place your bet. Cash out before it crashes!
                </p>
                <p className="text-xl text-[#49EACB]">Place Bet to Start</p>
              </div>
            </div>
          )}
          <div className="p-6 flex flex-col h-full">
            {isPlaying && gameId && (
              <CrashGame
                gameId={gameId}
                isPlaying={isPlaying}
                onCrashed={handleCrash}
                onMultiplierChange={setCurrentMultiplier}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <CrashControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            isPlaying={isPlaying}
            isWalletConnected={isConnected}
            balance={balance}
            onPlaceBet={handlePlaceBet}
            onCashout={handleCashout}
            resetGame={reset}
            currentMultiplier={currentMultiplier}
          />
          <LiveChat textColor="#49EACB" />
          <LiveWins textColor="#49EACB" />
        </div>
      </div>

      <SiteFooter />

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            <div className={`bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full`}>
              <h2 className="text-4xl font-bold mb-6">
                {gameResult === "win" ? "YOU CASHED OUT!" : "YOU CRASHED!"}
              </h2>
              {gameResult === "win" && (
                <p className="text-3xl mb-4">
                  <strong>{winAmount.toFixed(2)}</strong> KAS
                </p>
              )}
              <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="mr-2 text-white" />
                  <span className="text-white font-semibold">Provably Fair</span>
                </div>
                <p className="text-sm text-white break-all">Client seed: {clientSeed}</p>
                <p className="text-sm text-white break-all">Server seed hash: {serverSeedHash}</p>
              </div>
              <Button onClick={reset} className="px-8 py-3">Play Again</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
