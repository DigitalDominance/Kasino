"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useWallet } from "@/contexts/WalletContext";
import { XPDisplay } from "@/app/page";
import { CoinFlipGame } from "./coinflip-game";
import { CoinFlipControls } from "./coinflip-controls";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { Montserrat } from "next/font/google";
import { WalletConnection } from "@/components/wallet-connection";
import { SiteFooter } from "@/components/site-footer";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });
const LOADING_MESSAGES = [
  "Verifying transaction",
  "Flipping coins",
  "Finalizing result",
];
const BACKEND = "https://kasino-backend-4818b4b69870.herokuapp.com/api";

export default function CoinFlipPage() {
  const { isConnected, balance } = useWallet();

  const [phase, setPhase] = useState<"pregame" | "loading" | "result">("pregame");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);

  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<string>();
  const [clientSeedHash, setClientSeedHash] = useState<string>();
  const [serverSeedHash, setServerSeedHash] = useState<string>();
  const [nonce, setNonce] = useState(0);

  const [betAmount, setBetAmount] = useState("1");
  const [multiplier, setMultiplier] = useState(2);
  const [selectedSymbol, setSelectedSymbol] = useState<"sun" | "moon">("sun");

  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  // 1) loading overlay typing
  useEffect(() => {
    if (phase !== "loading") return;
    const full = LOADING_MESSAGES[msgIndex];
    if (loadingMessage.length < full.length) {
      const t = setTimeout(() => {
        setLoadingMessage(full.slice(0, loadingMessage.length + 1));
      }, 40);
      return () => clearTimeout(t);
    }
    const t2 = setTimeout(() => {
      if (msgIndex < LOADING_MESSAGES.length - 1) {
        setMsgIndex(i => i + 1);
        setLoadingMessage("");
      }
    }, 2000);
    return () => clearTimeout(t2);
  }, [phase, loadingMessage, msgIndex]);

  async function handleFlipCoin() {
    const bet = Number(betAmount);
    if (!isConnected) return alert("Please connect your wallet");
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert("Invalid bet amount");

    // client seed + hash
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const raw = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
    const buf = await crypto.subtle.digest("SHA-256", arr);
    const hashHex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    setClientSeed(raw);
    setClientSeedHash(hashHex);

    // deposit
    const [addr] = await window.kasware.getAccounts();
    const treasury = Math.random() < 0.5
      ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1
      : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;
    const dep = await window.kasware.sendKaspa(treasury!, bet * 1e8, { priorityFee: 10000 });
    const txid = typeof dep === "string" ? JSON.parse(dep).id : dep.id;
    setDepositTxid(txid);

    // call backend
    setPhase("loading");
    setMsgIndex(0);
    setLoadingMessage("");
    const res = await axios.post(
      `${BACKEND}/game/play`,
      {
        gameName: "coinflip",
        clientSeed: raw,
        clientSeedHash: hashHex,
        nonce,
        walletAddress: addr,
        betAmount: bet,
        multiplier,
        selectedSymbol,
        txid,
      }
    );
    if (!res.data.success) {
      alert("Error: " + res.data.message);
      return void setPhase("pregame");
    }
    const g = res.data.game;
    setServerSeedHash(g.serverSeedHash);
    setResult(g.result);
    setWinAmount(g.winAmount);

    // go to result phase
    setPhase("result");
    setNonce(n => n + 1);
  }

  // once coins stop spinning, wait 1s then show modal
  function onSpinEnd() {
    setTimeout(() => setShowPopup(true), 1000);
  }

  const reset = () => window.location.reload();

  return (
    <div className={`${montserrat.className} bg-black min-h-screen text-white`}>
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono text-[#49EACB]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {loadingMessage}
            {["●","●","●"].map((dot, i) => (
              <motion.span
                key={i}
                className="ml-2 text-xs"
                animate={{ opacity: [0,1,0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
              >
                {dot}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between p-6">
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
            target="_blank" rel="noopener noreferrer"
          >
            {depositTxid}
          </a>
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 p-6">
        <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#49EACB]">Coin Flip Game</h2>
              <Button variant="ghost" size="sm" className="text-[#49EACB]">
                <Info className="w-4 h-4 mr-2" /> How to Play
              </Button>
            </div>
            <div className="flex-grow relative aspect-[16/9] bg-[#49EACB]/5 rounded-lg mb-6 p-4">
              <CoinFlipGame
                isPlaying={phase === "result"}
                result={result}
                selectedSymbol={selectedSymbol}
                onGameEnd={onSpinEnd}
              />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <CoinFlipControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            isPlaying={phase !== "pregame"}
            isWalletConnected={isConnected}
            balance={balance}
            onFlipCoin={handleFlipCoin}
            resetGame={reset}
            gameResult={phase === "result" && showPopup
              ? result === "win" ? "You Win" : "House Wins"
              : null}
            winAmount={winAmount}
            selectedMultiplier={multiplier}
            setSelectedMultiplier={setMultiplier}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
          />
          <LiveChat textColor="#49EACB" />
          <LiveWins textColor="#49EACB" />
        </div>
      </div>

      <SiteFooter />

      <AnimatePresence>
        {phase === "result" && showPopup && (
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
                  <strong>{winAmount.toFixed(2)}</strong> KAS
                </p>
              )}
              <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                <p className="text-sm text-white break-all">Client seed: {clientSeed}</p>
                <p className="text-sm text-white break-all">Server seed hash: {serverSeedHash}</p>
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
