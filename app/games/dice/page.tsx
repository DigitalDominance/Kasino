// app/games/dice/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useWallet } from "@/contexts/WalletContext";
import { XPDisplay } from "@/app/page";
import { DiceGame } from "./dice-game";
import { DiceControls } from "./dice-controls";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { SiteFooter } from "@/components/site-footer";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });
const MESSAGES = ["Verifying transaction", "Rolling dice", "Finalizing result"];
const API = "https://kasinobackenddev-0fc15c2c49dc.herokuapp.com/api";

export default function DicePage() {
  const { isConnected, balance } = useWallet();
  const [phase, setPhase] = useState<
    "pregame" | "loading" | "rolling" | "result"
  >("pregame");
  const [txid, setTxid] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [seed, setSeed] = useState<string>();
  const [seedHash, setSeedHash] = useState<string>();
  const [serverHash, setServerHash] = useState<string>();
  const [nonce, setNonce] = useState(0);

  const [betAmount, setBetAmount] = useState("1.00");
  const [multiplier, setMultiplier] = useState<2 | 5 | 10>(2);

  const [userDice, setUserDice] = useState<[number, number]>([1, 1]);
  const [houseDice, setHouseDice] = useState<[number, number]>([1, 1]);
  const [result, setResult] = useState<"win" | "lose" | null>(null);

  // Loading typewriter
  useEffect(() => {
    if (phase !== "loading") return;
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
        setMsgIndex((i) => i + 1);
        setLoadingMsg("");
      }
    }, 2000);
    return () => clearTimeout(t2);
  }, [phase, loadingMsg, msgIndex]);

  // handleRoll: loading → rolling → result
  async function handleRoll() {
    const bet = Number(betAmount);
    if (!isConnected || isNaN(bet) || bet <= 0 || bet > balance)
      return alert("Invalid bet or not connected");

    // 1) client seed
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const buf = await crypto.subtle.digest("SHA-256", arr);
    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setSeed(hex);
    setSeedHash(hash);

    // 2) deposit
    const [addr] = await window.kasware.getAccounts();
    const treasury =
      Math.random() < 0.5
        ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
        : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;
    const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, {
      priorityFee: 10000,
    });
    const parsed = typeof dep === "string" ? JSON.parse(dep) : dep;
    setTxid(parsed.id);

    // 3) backend
    setPhase("loading");
    setMsgIndex(0);
    setLoadingMsg("");
    try {
      const resp = await axios.post(`${API}/game/play`, {
        gameName: "dice",
        clientSeed: hex,
        clientSeedHash: hash,
        nonce,
        walletAddress: addr,
        betAmount: bet,
        txid: parsed.id,
        multiplier,
      });
      if (!resp.data.success) {
        alert(resp.data.message);
        return setPhase("pregame");
      }
      const g = resp.data.game;
      setServerHash(g.serverSeedHash);
      setUserDice(g.userDice);
      setHouseDice(g.houseDice);
      setResult(g.result);

      // switch into rolling for 2s
      setPhase("rolling");
      // after 2s rolling + 3s pause → result
      setTimeout(() => {
        setPhase("result");
        setNonce((n) => n + 1);
      }, 4000);
    } catch (e: any) {
      console.error(e);
      alert("Server error");
      setPhase("pregame");
    }
  }

  const reset = () => window.location.reload();

  return (
    <div className={`${montserrat.className} bg-black min-h-screen text-white`}>
      {/* Loading overlay */}
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono text-[#49EACB]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {loadingMsg}
            {["●", "●", "●"].map((d, i) => (
              <motion.span
                key={i}
                className="ml-2 text-xs"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
              >
                {d}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between p-6">
        <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Games
        </Link>
        <div className="flex items-center gap-4">
          <XPDisplay /> <WalletConnection />
        </div>
      </header>

      {txid && (
        <p className="px-6 mb-4 text-sm text-[#B6B6B6]">
          Deposit TXID:{" "}
          <a
            href={`https://kas.fyi/transaction/${txid}`}
            className="bg-gradient-to-r from-[#B6B6B6] to-[#49EACB] bg-clip-text text-transparent"
            target="_blank"
            rel="noopener noreferrer"
          >
            {txid}
          </a>
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 p-6">
        <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#49EACB]">Dice Game</h2>
              <Button variant="ghost" size="sm" className="text-[#49EACB]">
                <Info className="w-4 h-4 mr-2" /> How to Play
              </Button>
            </div>
            <div className="flex-grow relative aspect-[16/9] bg-[#49EACB]/5 rounded-lg mb-6 p-4">
              {/* only show dice outside loading */}
              {phase !== "loading" && (
                <DiceGame
                  isPlaying={phase === "rolling"}
                  userDice={userDice}
                  houseDice={houseDice}
                />
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <DiceControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            isPlaying={phase !== "pregame"}
            isWalletConnected={isConnected}
            balance={balance}
            onRollDice={handleRoll}
            resetGame={reset}
            gameResult={
              phase === "result"
                ? result === "win"
                  ? "You Win"
                  : "House Wins"
                : null
            }
            winAmount={result === "win" ? Number(betAmount) * multiplier : 0}
            selectedMultiplier={multiplier}
            setSelectedMultiplier={(m) => setMultiplier(m as 2 | 5 | 10)}
          />
          <LiveChat textColor="#49EACB" />
          <LiveWins textColor="#49EACB" />
        </div>
      </div>

      <SiteFooter />

      {/* Result popup */}
      <AnimatePresence>
        {phase === "result" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-4xl font-bold mb-6">
                {result === "win" ? "YOU WIN!" : "YOU LOST!"}
              </h2>
              {result === "win" && (
                <p className="text-3xl mb-4">
                  <strong>{(Number(betAmount) * multiplier).toFixed(2)}</strong> KAS
                </p>
              )}
              <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2" />
                  <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                </div>
                <p className="text-sm text-white break-all">Client seed: {seed}</p>
                <p className="text-sm text-white break-all">Server seed hash: {serverHash}</p>
              </div>
              <Button onClick={reset} className="px-8 py-3">
                Play Again
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
