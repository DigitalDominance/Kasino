// app/games/mines/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WalletConnection } from "@/components/wallet-connection";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "./live-chat";
import { LiveWins } from "./live-wins";
import { MinesControls } from "./mines-controls";
import { useWallet } from "@/contexts/WalletContext";
import type { MinesGame, MinesTile } from "./mines-logic";
import { revealTile, calculatePayout } from "./mines-logic";
import { Bomb, Diamond } from "./icons";
import { useRouter } from "next/navigation";
import { XPDisplay } from "@/app/page";
import "./styles.css";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

export default function MinesPage() {
  const { isConnected, balance } = useWallet();
  const router = useRouter();
  const API = "https://kasinobackenddev-0fc15c2c49dc.herokuapp.com/api/game";

  const [game, setGame] = useState<MinesGame | null>(null);
  const [betAmount, setBetAmount] = useState("1");
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const messages = ["Verifying transaction", "Hashing seeds", "Generating mines"];

  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<"win"|"lose"|null>(null);
  const [winAmount, setWinAmount] = useState(0);

  const [clientSeed, setClientSeed] = useState("");
  const [serverSeedHash, setServerSeedHash] = useState("");

  // ─── Typewriter effect ──────────────────────────────
  useEffect(() => {
    if (!loading) return;
    setLoadingMessage("");
    setMessageIndex(0);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const curr = messages[messageIndex];
    if (loadingMessage.length < curr.length) {
      const t = setTimeout(() => {
        setLoadingMessage(curr.slice(0, loadingMessage.length + 1));
      }, 40);
      return () => clearTimeout(t);
    }
  }, [loading, loadingMessage, messageIndex]);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (messageIndex < messages.length - 1) {
        setMessageIndex(i => i + 1);
        setLoadingMessage("");
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [loading, messageIndex]);

  // ─── 1) Start Game ───────────────────────────────────
  const startGame = useCallback(async () => {
    if (!isConnected) return alert("Connect wallet");
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < 1 || bet > balance) return alert("Invalid bet");

    try {
      // generate client seed & hash
      const arr = crypto.getRandomValues(new Uint8Array(32));
      const rawSeed = Array.from(arr)
        .map(b => b.toString(16).padStart(2,"0"))
        .join("");
      const buf = await crypto.subtle.digest("SHA-256", arr);
      const hash = Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2,"0"))
        .join("");
      setClientSeed(rawSeed);

      // deposit
      const [addr] = await window.kasware.getAccounts();
      const treasury = Math.random() < 0.5
        ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
        : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;
      const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, { priorityFee: 10000 });
      const txid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;
      setDepositTxid(txid);

      // call play
      setLoading(true);
      const r = await axios.post(`${API}/play`, {
        gameName:       "Mines",
        clientSeed:     rawSeed,
        clientSeedHash: hash,
        nonce:          0,
        walletAddress:  addr,
        betAmount:      bet,
        txid,
        numMines:       5
      });
      setLoading(false);

      if (!r.data.success) throw new Error("Play failed");
      const g = r.data.game;
      setServerSeedHash(g.serverSeedHash);

      setGame({
        gameId:         g._id,
        clientSeed:     rawSeed,
        serverSeedHash: g.serverSeedHash,
        tiles:          g.tiles.map((t:any) => ({ ...t, revealed: false })),
        multipliers:    g.multipliers,
        safeClicks:     0,
        betAmount:      bet,
        isGameOver:     false
      });
    } catch (e:any) {
      setLoading(false);
      alert(e.message);
    }
  }, [isConnected, balance, betAmount]);

  // ─── 2) Reveal a tile ─────────────────────────────────
  const onTile = async (i:number) => {
    if (!game || game.isGameOver) return;
    const updated = revealTile(game, i);
    setGame(updated);

    if (updated.isGameOver) {
      setResultType("lose");
      setShowResult(true);
      // only pass gameId on a loss → no payout
      axios.post(`${API}/settle`, { gameId: game.gameId })
           .catch(console.error);
    }
  };

  // ─── 3) Cash out ──────────────────────────────────────
  const onCash = async () => {
    if (!game) return;
    const payout = calculatePayout(game);
    setResultType("win");
    setWinAmount(payout);
    setShowResult(true);

    axios.post(`${API}/settle`, {
      gameId:     game.gameId,
      safeClicks: game.safeClicks
    }).catch(console.error);
  };

  // ─── Reset ────────────────────────────────────────────
  const reset = () => {
    setGame(null);
    setShowResult(false);
    setDepositTxid(null);
    router.refresh();
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      {/* LOADING OVERLAY */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-[#49EACB] font-mono"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            {loadingMessage}
            <motion.span animate={{ opacity:[0,1,0] }} transition={{ repeat:Infinity, duration:0.8 }} className="ml-2">●</motion.span>
            <motion.span animate={{ opacity:[0,1,0] }} transition={{ repeat:Infinity, duration:0.8, delay:0.2 }} className="ml-0.5">●</motion.span>
            <motion.span animate={{ opacity:[0,1,0] }} transition={{ repeat:Infinity, duration:0.8, delay:0.4 }} className="ml-0.5">●</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-grow p-6 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-[#49EACB] hover:underline inline-flex items-center">
            <ArrowLeft className="mr-2"/> Back
          </Link>
          <div className="flex items-center gap-4">
            <XPDisplay/>
            <WalletConnection/>
          </div>
        </div>

        {/* Deposit TXID */}
        {depositTxid && (
          <p className="text-sm text-gray-400">
            TXID:{" "}
            <a
              href={`https://kas.fyi/transaction/${depositTxid}`}
              target="_blank"
              className="text-[#49EACB]"
            >
              {depositTxid}
            </a>
          </p>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* BOARD */}
          <Card className="bg-[#49EACB]/10 border-[#49EACB]/20 p-6">
            {!game ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-12">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00FF00] to-[#C084FC] bg-clip-text text-transparent">
                  MINES
                </h1>
                <p className="max-w-sm text-[#B6B6B6]">
                  Uncover safe tiles and cash out before you hit a mine.
                  The more you reveal, the higher your multiplier.
                </p>
                <div className="text-[#49EACB] uppercase font-semibold">
                  Place your bet to start
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between mb-4 items-center">
                  <span
                    className="text-3xl font-bold bg-gradient-to-r from-[#00FF00] to-[#C084FC] bg-clip-text text-transparent"
                  >
                    Bet: {game.betAmount.toFixed(2)} KAS
                  </span>
                  <span
                    className="text-4xl font-bold bg-gradient-to-r from-[#00FF00] to-[#C084FC] bg-clip-text text-transparent"
                  >
                    ×{(game.multipliers[game.safeClicks-1] || 1).toFixed(2)}
                  </span>
                  <Button onClick={onCash} disabled={game.safeClicks===0 || game.isGameOver}>
                    Cash Out
                  </Button>
                </div>
                <div className="flex justify-center">
                  <div className="inline-grid grid-cols-5 gap-2">
                    {game.tiles.map((t:MinesTile,i) => (
                      <button
                        key={i}
                        onClick={()=>onTile(i)}
                        disabled={t.revealed||game.isGameOver}
                        className={`
                          flex items-center justify-center
                          ${t.revealed
                            ? t.isSafe ? "bg-green-600" : "bg-red-600"
                            : "bg-gray-800 hover:bg-gray-700"}
                          w-16 h-12 sm:w-20 sm:h-16 md:w-24 md:h-20
                          border-2 border-transparent hover:border-[#49EACB] rounded-sm overflow-hidden
                        `}
                      >
                        {t.revealed && (t.isSafe
                          ? <Diamond className="w-6 h-6"/>
                          : <Bomb    className="w-6 h-6"/>)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* CONTROLS */}
          <div className="space-y-6">
            {!game && (
              <MinesControls
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                isPlaying={!!game}
                isWalletConnected={isConnected}
                balance={balance}
                onStartGame={startGame}
              />
            )}
            <LiveChat textColor="#49EACB"/>
            <LiveWins textColor="#49EACB"/>
          </div>
        </div>
      </div>

      <SiteFooter/>

      {/* RESULT POPUP */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            <motion.div
              className={`p-6 rounded-lg max-w-sm w-full text-center ${
                resultType==="win"?"bg-green-600":"bg-red-600"
              }`}
              initial={{ scale:0.8 }} animate={{ scale:1 }} exit={{ scale:0.8 }}
            >
              <h2 className="text-3xl font-bold mb-4">
                {resultType==="win"?"Congratulations!":"Game Over"}
              </h2>
              {resultType==="win"
                ? <p className="mb-4">You won {winAmount.toFixed(2)} KAS!</p>
                : <p className="mb-4">You hit a mine!</p>}
              <div className="bg-black/80 p-3 rounded mb-4 text-left">
                <div className="flex items-center mb-1">
                  <ShieldCheck className="mr-2 text-white"/>
                  <span className="text-white font-semibold">Provably Fair</span>
                </div>
                <p className="text-xs text-white break-all">Client: {clientSeed}</p>
                <p className="text-xs text-white break-all">Server: {serverSeedHash}</p>
              </div>
              <Button onClick={reset}>Play Again</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
