"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/contexts/WalletContext";
import { XPDisplay } from "@/app/page";
import { RouletteControls } from "./roulette-controls";
import { RouletteGame } from "./roulette-game";
import { Montserrat } from "next/font/google";
import "./styles.css";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });
const API = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
const LOADING_MSGS = ["Verifying transaction", "Spinning wheel", "Finalizing result"];

export default function RoulettePage() {
  const { isConnected, balance } = useWallet();

  // Front-end states
  const [phase, setPhase] = useState<"pregame" | "loading" | "rolling" | "result">("pregame");
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);
  const [selectedBet, setSelectedBet] = useState<{ type: string; amount: number } | null>(null);
  const [betAmount, setBetAmount] = useState("0.00");

  const [clientSeed, setClientSeed] = useState<string>();
  const [clientSeedHash, setClientSeedHash] = useState<string>();
  const [serverHash, setServerHash] = useState<string>();
  const [nonce, setNonce] = useState(0);

  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number>(0);

  // Typewriter for loading
  useEffect(() => {
    if (phase !== "loading") return;
    const full = LOADING_MSGS[msgIndex];
    if (loadingMsg.length < full.length) {
      const t = setTimeout(() => {
        setLoadingMsg(full.slice(0, loadingMsg.length + 1));
      }, 40);
      return () => clearTimeout(t);
    }
    const t2 = setTimeout(() => {
      if (msgIndex < LOADING_MSGS.length - 1) {
        setMsgIndex((i) => i + 1);
        setLoadingMsg("");
      }
    }, 2000);
    return () => clearTimeout(t2);
  }, [phase, loadingMsg, msgIndex]);

  // Start roulette flow
  const handleSpinRoulette = async () => {
    if (!selectedBet) return alert("Select a bet first");
    const bet = selectedBet.amount;
    if (!isConnected || bet <= 0 || bet > balance) {
      return alert("Invalid bet or not connected");
    }

    // 1) provably-fair client seed
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr).map((b) => b.toString(16).padStart(2,"0")).join("");
    const buf = await crypto.subtle.digest("SHA-256", arr);
    const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2,"0")).join("");
    setClientSeed(hex);
    setClientSeedHash(hash);

    // 2) deposit
    const [addr] = await window.kasware.getAccounts();
    const treasury = Math.random() < 0.5
      ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
      : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;
    const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, { priorityFee: 10000 });
    const parsed = typeof dep === "string" ? JSON.parse(dep) : dep;
    setDepositTxid(parsed.id);

    // 3) backend `/game/play`
    setPhase("loading");
    setMsgIndex(0);
    setLoadingMsg("");
    const resp = await axios.post(`${API}/game/play`, {
      gameName:       "roulette",
      clientSeed:     hex,
      clientSeedHash: hash,
      nonce,
      walletAddress:  addr,
      betAmount:      bet,
      txid:           parsed.id,
      selectedBetType: selectedBet.type
    });
    if (!resp.data.success) {
      alert(resp.data.message);
      return setPhase("pregame");
    }

    // grab server hash + result
    const g = resp.data.game;
    setServerHash(g.serverSeedHash);
    setWinningNumber(g.winningNumber);
    setWinAmount(g.winAmount);
    setGameId(g._id);

    // 4) roll & then show popup
    setPhase("rolling");
    // 6s spin + 3s delay before result
    setTimeout(() => {
      setPhase("result");
      setNonce((n) => n + 1);
    }, 9000);
  };

  const reset = () => window.location.reload();

  return (
    <div className={`${montserrat.className} bg-black min-h-screen text-white`}>
      {/* Loading overlay */}
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono text-[#49EACB]"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          >
            {loadingMsg}
            {["●","●","●"].map((d,i)=>(
              <motion.span
                key={i} className="ml-2 text-xs"
                animate={{opacity:[0,1,0]}}
                transition={{repeat:Infinity,duration:0.8,delay:i*0.2}}
              >{d}</motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between p-6">
        <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
          <ArrowLeft className="mr-2 w-4 h-4"/>Back to Games
        </Link>
        <div className="flex items-center gap-4">
          <XPDisplay/><WalletConnection/>
        </div>
      </header>

      {depositTxid && (
        <p className="px-6 mb-4 text-sm text-[#B6B6B6]">
          Deposit TXID:{" "}
          <a
            href={`https://kas.fyi/transaction/${depositTxid}`}
            className="bg-gradient-to-r from-[#B6B6B6] to-[#49EACB] bg-clip-text text-transparent"
            target="_blank" rel="noopener noreferrer"
          >{depositTxid}</a>
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 p-6">
        <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden" style={{height:700}}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#49EACB]">Roulette</h2>
              <Button variant="ghost" size="sm" className="text-[#49EACB]">
                <Info className="w-4 h-4 mr-2"/> How to Play
              </Button>
            </div>
            <div className="flex-grow relative flex items-center justify-center">
              {/* overlay before spin */}
              {phase==="pregame" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-black/50">
                  <h3 className="text-3xl text-[#49EACB] mb-4">Place Bet to Start</h3>
                </div>
              )}
              {/* wheel */}
              {phase!=="loading" && (
                <RouletteGame
                  isPlaying={phase==="rolling"}
                  winningNumber={winningNumber}
                />
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <RouletteControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            isPlaying={phase!=="pregame"}
            isWalletConnected={isConnected}
            balance={balance}
            selectedBet={selectedBet}
            setSelectedBet={setSelectedBet}
            onSpinRoulette={handleSpinRoulette}
            gameResult={phase==="result"? winningNumber : null}
            winAmount={winAmount}
          />
          <LiveChat textColor="#49EACB"/>
          <LiveWins textColor="#49EACB"/>
        </div>
      </div>

      <SiteFooter/>

      {/* Result popup */}
      <AnimatePresence>
        {phase==="result" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          >
            <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-4xl font-bold mb-6">
                {winAmount>0 ? `YOU WIN ${winAmount.toFixed(2)} KAS!` : "YOU LOST!"}
              </h2>
              <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2"/>
                  <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                </div>
                <p className="text-sm text-white break-all">Client seed: {clientSeed}</p>
                <p className="text-sm text-white break-all">Server seed hash: {serverHash}</p>
                <p className="text-sm text-white mt-2">Winning # : {winningNumber}</p>
              </div>
              <Button onClick={reset} className="px-8 py-3">Play Again</Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
