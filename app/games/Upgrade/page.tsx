/* global crypto */
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

const MIN_BET = 1;
const MAX_BET = 1000;
const MIN_MULTIPLIER = 1.9;
const MAX_MULTIPLIER = 25;
const HOUSE_EDGE = 0.05;

const getSliderBackground = (m: number) => {
  if (m < 8) return "#00FF00";
  if (m < 17) return "linear-gradient(90deg, #00FF00, #007BFF)";
  return "linear-gradient(90deg, #00FF00, #007BFF, #9400D3)";
};

export default function UpgradeGame() {
  const { isConnected, balance } = useWallet();

  const [betAmount, setBetAmount] = useState("1");
  const [multiplier, setMultiplier] = useState(MIN_MULTIPLIER);
  const winChance = (1 / multiplier) * (1 - HOUSE_EDGE);

  const [phase, setPhase] = useState<"pregame" | "countdown" | "result">("pregame");
  const [countdown, setCountdown] = useState(3);

  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [clientSeedHash, setClientSeedHash] = useState<string | null>(null);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<{ result: "win" | "lose"; amount: number } | null>(null);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [winAmount, setWinAmount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const messages = ["Verifying transaction", "Processing upgrade", "Finalizing result"];

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";

  // typing effect for loading messages
  useEffect(() => {
    if (!loading) return;
    const current = messages[messageIndex];
    if (loadingMessage.length < current.length) {
      const t = setTimeout(() => setLoadingMessage((s) => s + current[s.length]), 40);
      return () => clearTimeout(t);
    }
  }, [loading, loadingMessage, messageIndex]);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (messageIndex < messages.length - 1) {
        setMessageIndex((i) => i + 1);
        setLoadingMessage("");
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [loading, messageIndex]);

  async function handleStartGame() {
    const bet = Number(betAmount);
    if (!isConnected) throw new Error("Connect wallet");
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) throw new Error(`Bet ${MIN_BET}-${MAX_BET}`);
    if (bet > balance) throw new Error("Insufficient balance");

    // 1) Generate a 32-byte CSPRNG client seed
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const rawSeed = Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
    // 2) Hash it with SHA-256
    const buf = await crypto.subtle.digest("SHA-256", array);
    const hashHex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    setClientSeed(rawSeed);
    setClientSeedHash(hashHex);

    // 3) Deposit your bet
    const [addr] = await window.kasware.getAccounts();
    if (!addr) throw new Error("Wallet not found");
    const treasury = Math.random() < 0.5
      ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1
      : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;
    if (!treasury) throw new Error("Treasury missing");
    const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, { priorityFee: 10000 });
    const txid = typeof dep === "string" ? JSON.parse(dep).id : dep.id;
    setDepositTxid(txid);

    // 4) Call our backend
    setLoading(true);
    setMessageIndex(0);
    setLoadingMessage("");
    const res = await axios.post(`${apiUrl}/game/play`, {
      gameName: "Upgrade",
      clientSeed: rawSeed,
      clientSeedHash: hashHex,
      nonce,
      walletAddress: addr,
      betAmount: bet,
      multiplier,
      txid,
    });
    setLoading(false);

    if (!res.data.success) throw new Error("Play API failed");
    const g = res.data.game;
    setServerSeedHash(g.serverSeedHash);
    setServerSeed(g.serverSeed);
    setPendingResult({ result: g.gameResult, amount: g.winAmount });

    // 5) Reveal after countdown
    setPhase("countdown");
    setCountdown(3);
    setNonce((n) => n + 1);
  }

  // countdown handler
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    if (pendingResult) {
      setGameResult(pendingResult.result);
      setWinAmount(pendingResult.amount);
    }
    setPhase("result");
  }, [phase, countdown, pendingResult]);

  function resetGame() {
    window.location.reload();
  }

  const countdownStyle =
    countdown === 3
      ? { color: "#00FF00" }
      : countdown === 2
      ? { backgroundImage: "linear-gradient(90deg, #00FF00, #FFFF00)", WebkitBackgroundClip: "text" as any, color: "transparent" }
      : countdown === 1
      ? { backgroundImage: "linear-gradient(90deg, #00FF00, #FF0000)", WebkitBackgroundClip: "text" as any, color: "transparent" }
      : {};

  return (
    <div className={`${montserrat.className} bg-black min-h-screen`}>
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-[#49EACB] font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {loadingMessage}
            <motion.span className="ml-2 text-xs" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>●</motion.span>
            <motion.span className="ml-0.5 text-xs" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}>●</motion.span>
            <motion.span className="ml-0.5 text-xs" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}>●</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="w-full flex items-center justify-between p-6">
        <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
        </Link>
        <div className="flex items-center gap-4">
          <XPDisplay />
          <WalletConnection />
        </div>
      </header>

      {depositTxid && (
        <p className="px-6 text-sm text-left text-[#B6B6B6] mb-4">
          Deposit TXID:{" "}
          <a
            href={`https://kas.fyi/transaction/${depositTxid}`}
            className="bg-gradient-to-r from-[#B6B6B6] to-[#49EACB] bg-clip-text text-transparent"
            target="_blank"
            rel="noopener noreferrer"
          >
            {depositTxid}
          </a>
        </p>
      )}

      <div className="grid grid-cols-[1fr_300px] gap-6 p-6">
        <div className="w-full px-4 relative">
          {phase === "countdown" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
              <motion.div className="text-9xl font-bold" style={countdownStyle}>
                {countdown}
              </motion.div>
            </div>
          )}

          {phase === "result" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
              <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
                <h2 className="text-4xl font-bold mb-6">Your Upgrade Result</h2>
                {gameResult === "win" ? (
                  <p className="text-4xl animate-pulse uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #9400D3, #007BFF)" }}>
                    YOU WIN <strong>{winAmount.toFixed(2)}</strong> KAS!
                  </p>
                ) : (
                  <p className="text-4xl animate-pulse uppercase text-red-500 mb-4">YOU LOST!</p>
                )}
                <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                  <div className="flex items-center mb-2">
                    <ShieldCheck className="text-white mr-2" />
                    <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                  </div>
                  <p className="text-sm text-white break-all">Client seed: {clientSeed}</p>
                  <p className="text-sm text-white break-all">Server seed: {serverSeed}</p>
                </div>
                <Button onClick={resetGame} className="px-8 py-3">Play Again</Button>
              </Card>
            </div>
          )}

          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm w-full">
            {phase === "pregame" && (
              <div className="p-6 flex flex-col items-center">
                <h1 className="text-5xl font-bold text-[#49EACB] mb-10">UPGRADE</h1>

                <div className="w-full max-w-md mb-10">
                  <label className="text-xl text-[#49EACB] mb-2 block">Bet Amount (KAS)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="w-full p-4 pl-12 text-2xl rounded bg-[#49EACB]/5 border border-[#49EACB]/10 text-white"
                      disabled={loading}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                        alt="KAS"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-10">
                  <span className="text-6xl font-bold text-[#49EACB]">
                    {multiplier.toFixed(2)}×
                  </span>
                </div>

                <div className="w-full max-w-md mb-6 text-center">
                  <label className="text-xl text-[#49EACB] mb-2 block text-center">Adjust Multiplier</label>
                  <input
                    type="range"
                    min={MIN_MULTIPLIER}
                    max={MAX_MULTIPLIER}
                    step={0.01}
                    value={multiplier}
                    onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                    className="slider-custom"
                    disabled={loading}
                    style={{ background: getSliderBackground(multiplier) }}
                  />
                  <p className="mt-2 text-2xl text-[#49EACB]">
                    Win Chance: {(winChance * 100).toFixed(1)}%
                  </p>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full max-w-md">
                  <Button
                    onClick={handleStartGame}
                    disabled={!isConnected || loading}
                    className="w-full p-6 text-2xl font-bold bg-gradient-to-r from-[#49EACB] to-[#00FF00] text-black"
                  >
                    {loading ? "Processing…" : "Start Upgrade"}
                  </Button>
                </motion.div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <LiveChat textColor="#49EACB" />
          <LiveWins textColor="#49EACB" />
        </div>
      </div>

      <SiteFooter />

      <style jsx>{`
        .slider-custom {
          -webkit-appearance: none;
          width: 100%;
          height: 10px;
          outline: none;
          border-radius: 5px;
          margin: 10px 0;
        }
        .slider-custom::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 32px;
          height: 32px;
          background: url('/draggerpoint.webp') no-repeat center center;
          background-size: contain;
          cursor: pointer;
        }
        .slider-custom::-moz-range-thumb {
          width: 32px;
          height: 32px;
          background: url('/draggerpoint.webp') no-repeat center center;
          background-size: contain;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
