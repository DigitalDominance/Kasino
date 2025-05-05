"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { XPDisplay } from "@/app/page";
import { Montserrat } from "next/font/google";
import axios from "axios";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";
import "./styles.css";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

const API_URL = "https://kasino-backend-4818b4b69870.herokuapp.com/api/game/play";
const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!;
const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;

export default function KasenManiaSlotsPage() {
  return <SlotsContent />;
}

function SlotsContent() {
  const { isConnected, balance } = useWallet();

  // gameplay state
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  // provably-fair
  const [clientSeed, setClientSeed] = useState("");
  const [clientSeedHash, setClientSeedHash] = useState("");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const nonceRef = useRef(0);

  // loading overlay
  const [loading, setLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const messages = ["Verifying transaction", "Processing spin", "Finalizing result"];

  // controls
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // errors / cooldown
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // popup timers
  const popupTimers = useRef<NodeJS.Timeout[]>([]);

  // clear error toast
  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(null), 3000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  // cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const i = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(i);
  }, [cooldown]);

  const showError = (msg: string) => setErrorMessage(msg);

  // loading message type effect
  useEffect(() => {
    if (!loading) return;
    const current = messages[messageIndex];
    if (loadingMessage.length < current.length) {
      const t = setTimeout(() => {
        setLoadingMessage(current.slice(0, loadingMessage.length + 1));
      }, 40);
      return () => clearTimeout(t);
    }
  }, [loading, loadingMessage, messageIndex]);

  // advance loading messages
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

  const handleRollSlots = async () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      showError("Invalid bet amount");
      return;
    }
    if (!isConnected) {
      showError("Please connect your wallet");
      return;
    }

    // provably-fair seed generation
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const seed = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    const buf = await crypto.subtle.digest("SHA-256", arr);
    const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    setClientSeed(seed);
    setClientSeedHash(hash);

    try {
      // on-chain deposit
      const [addr] = await window.kasware.getAccounts();
      const to = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      const dep = await window.kasware.sendKaspa(to, Math.round(bet * 1e8), { priorityFee: 10000 });
      const txid = typeof dep === "string" ? JSON.parse(dep).id : dep.id;
      setDepositTxid(txid);

      // backend call
      setLoading(true);
      setMessageIndex(0);
      setLoadingMessage("");
      const { data } = await axios.post(API_URL, {
        gameName:       "Kasen Mania",
        clientSeed:     seed,
        clientSeedHash: hash,
        nonce:          nonceRef.current,
        walletAddress:  addr,
        betAmount:      bet,
        txid,
      });
      setLoading(false);

      if (!data.success) throw new Error(data.message || "Error");
      setServerSeedHash(data.game.serverSeedHash);
      setWinAmount(data.game.winAmount);
      nonceRef.current++;

      // start spin + cooldown
      setIsPlaying(true);
      setCooldown(10);
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      alert(err.response?.data?.message || err.message || "Failed");
    }
  };

  const handleGameEnd = (result: string, amt: number) => {
    popupTimers.current.forEach(clearTimeout);
    popupTimers.current = [];

    setIsPlaying(false);
    setWinAmount(amt);

    const t = setTimeout(() => setGameResult(result), 1200);
    popupTimers.current.push(t);
  };

  const resetGame = () => {
    popupTimers.current.forEach(clearTimeout);
    popupTimers.current = [];
    setIsPlaying(false);
    setGameResult(null);
    setWinAmount(null);
    setDepositTxid(null);
    setClientSeed("");
    setClientSeedHash("");
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
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <XPDisplay />
            <WalletConnection />
          </motion.div>
        </header>

        {/* Deposit TXID */}
        {depositTxid && (
          <p className="mb-4 text-sm text-gray-400">
            Deposit TXID:{" "}
            <a
              href={`https://kas.fyi/transaction/${depositTxid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-teal-200"
            >
              {depositTxid}
            </a>
          </p>
        )}

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-[#49EACB] font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {loadingMessage}
              <motion.span className="ml-2 text-xs" animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.8 }}>●</motion.span>
              <motion.span className="ml-0.5 text-xs" animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}>●</motion.span>
              <motion.span className="ml-0.5 text-xs" animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}>●</motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">KASEN MANIA</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                  How to Play
                </Button>
              </div>
              <div className="relative h-[70vh] bg-gradient-to-b from-[#600000] to-black rounded-lg mb-6 overflow-hidden border border-gray-600 shadow-2xl">
                <SlotsGame
                  isPlaying={isPlaying}
                  onGameEnd={handleGameEnd}
                  betAmount={Number(betAmount)}
                  winAmount={winAmount}
                />
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <SlotsControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              balance={balance}
              onRollSlots={handleRollSlots}
              resetGame={resetGame}
              gameResult={gameResult}
              winAmount={winAmount}
              cooldown={cooldown}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        {/* Promo */}
        <Card className="mt-6 w-full bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6 text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%","100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #600000, #FF0000, #FF7373)",
              backgroundSize: "200% 200%",
            }}
          >
            KASEN Mania
          </motion.h2>
          <img src="/kasenpromo.png" alt="Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            KASEN MANIA is an electrifying online slot machine game set in the adventurous world of
            KASEN! ...
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a href="https://x.com/KasenOnKaspa" whileHover={{ scale: 1.2 }} className="text-[#FF0000]"><FaTwitter/></motion.a>
            <motion.a href="https://t.co/W4YDM1cUpY" whileHover={{ scale: 1.2 }} className="text-[#FF0000]"><FaTelegramPlane/></motion.a>
            <motion.a href="https://kasenonkas.com"   whileHover={{ scale: 1.2 }} className="text-[#FF0000]"><FaGlobe/></motion.a>
          </div>
        </Card>
      </div>

      <SiteFooter />

      {/* How to Play */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Kasen Mania</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount and click "Spin Kasen Mania".</li>
              <li>The reels (5×5) spin vertically, one after the other.</li>
              <li>
                <strong>Winning Patterns:</strong>
                <div className="mt-2">
                  <p className="mb-1">Center (1.1×):</p>
                  <div className="flex space-x-1">
                    {Array(5).fill(0).map((_, i) => <Image key={i} src="/kasen3.webp" alt="Symbol" width={40} height={40} />)}
                    <span className="ml-2 text-sm">1.1×</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="mb-1">Diagonal (2×):</p>
                  <div className="flex space-x-1">
                    {Array(5).fill(0).map((_, i) => <Image key={i} src="/kasen4.webp" alt="Symbol" width={40} height={40} />)}
                    <span className="ml-2 text-sm">2×</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="mb-1">Top (3×):</p>
                  <div className="flex space-x-1">
                    {Array(5).fill(0).map((_, i) => <Image key={i} src="/kasen5.webp" alt="Symbol" width={40} height={40} />)}
                    <span className="ml-2 text-sm">3×</span>
                  </div>
                </div>
              </li>
            </ol>
            <Button onClick={() => setShowHowToPlay(false)} className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
              Got it!
            </Button>
          </div>
        </div>
      )}

      {/* Result Popup */}
      <AnimatePresence>
        {gameResult && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"  
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <Card className="bg-[#49EACB] p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-4xl font-bold mb-6">Your Slot Result</h2>
              <div className="bg-black/80 p-6 rounded-md mb-6 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2" />
                  <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                </div>
                <p className="text-sm text-white break-all">Client seed: {clientSeed}</p>
                <p className="text-sm text-white break-all">Server seed hash: {serverSeedHash}</p>
              </div>
              {gameResult === "You Win" ? (
                <p className="text-2xl font-bold mb-4">YOU WIN {winAmount} KAS!</p>
              ) : (
                <p className="text-2xl font-bold mb-4">HOUSE WINS</p>
              )}
              <Button onClick={resetGame} className="px-8 py-3">Play Again</Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-4 left-4 bg-gradient-to-r from-red-700 to-black text-white px-4 py-2 rounded shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-4 font-bold">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                             Slots Game                             */
/* ------------------------------------------------------------------ */

interface SlotsGameProps {
  isPlaying: boolean;
  onGameEnd: (result: string, winAmt: number) => void;
  betAmount: number;
  winAmount: number | null;
}

const symbolImages = [
  "/kasen1.webp","/kasen2.webp","/kasen3.webp","/kasen4.webp",
  "/kasen5.webp","/kasen6.webp","/kasen7.webp","/kasen8.webp",
];
const reelWidth = 720, reelHeight = 390;

function generateFinalGrid(mult: number, count: number): number[][] {
  const g = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => Math.floor(Math.random() * count))
  );
  if (mult === 1.1) {
    const s = Math.floor(Math.random() * count);
    g[2] = g[2].map(() => s);
  } else if (mult === 2) {
    const s = Math.floor(Math.random() * count);
    for (let i = 0; i < 5; i++) g[i][i] = s;
  } else if (mult === 3) {
    const s = Math.floor(Math.random() * count);
    g[0] = g[0].map(() => s);
  }
  return g;
}

function generateLosingGrid(count: number): number[][] {
  let g: number[][];
  do {
    g = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => Math.floor(Math.random() * count))
    );
  } while (
    g[2].every((v) => v === g[2][0]) ||
    g[0].every((v) => v === g[0][0]) ||
    g.every((row, i) => row[i] === row[0])
  );
  return g;
}

export function SlotsGame({
  isPlaying,
  onGameEnd,
  betAmount,
  winAmount
}: SlotsGameProps) {
  const [finalGrid, setFinalGrid] = useState<number[][] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [stoppedReels, setStoppedReels] = useState([false, false, false, false, false]);
  const [outcomeMultiplier, setOutcomeMultiplier] = useState<number>(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    if (isPlaying) {
      setSpinning(true);
      setFinalGrid(null);
      setStoppedReels([false, false, false, false, false]);

      const mult = (winAmount ?? 0) > 0 ? (winAmount! / betAmount) : 0;
      setOutcomeMultiplier(mult);

      const grid = mult > 0
        ? generateFinalGrid(mult, symbolImages.length)
        : generateLosingGrid(symbolImages.length);
      setFinalGrid(grid);

      for (let i = 0; i < 5; i++) {
        // start stopping after ~2s, then every 0.4s for 5 reels (2s → 3.6s)
        const delay = 200 + i * 200;
        const t = setTimeout(() => {
          setStoppedReels(prev => {
            const c = [...prev];
            c[i] = true;
            return c;
          });
          if (i === 4) {
            setSpinning(false);
            onGameEnd(outcomeMultiplier > 0 ? "You Win" : "House Wins", betAmount * outcomeMultiplier);
          }
        }, delay);
        timers.push(t);
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [isPlaying, betAmount, onGameEnd, winAmount]);

  const showPreview = !isPlaying && !finalGrid;

  // draw line for winning pattern
  let overlayElement = null;
  if (!spinning && finalGrid && outcomeMultiplier > 0) {
    if (outcomeMultiplier === 1.1) {
      overlayElement = (
        <div className="absolute bg-green-500" style={{
          top: reelHeight / 2 - 2,
          left: 0,
          width: reelWidth - 150,
          height: 4,
        }} />
      );
    } else if (outcomeMultiplier === 3) {
      overlayElement = (
        <div className="absolute bg-green-500" style={{
          top: 2,
          left: 0,
          width: reelWidth - 150,
          height: 4,
        }} />
      );
    } else if (outcomeMultiplier === 2) {
      const x0 = 0, y0 = 0;
      const x1 = reelWidth - 150, y1 = reelHeight - 20;
      const dx = x1 - x0, dy = y1 - y0;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      overlayElement = (
        <div className="absolute bg-green-500" style={{
          top: y0, left: x0,
          width: length, height: 4,
          transform: `rotate(${angle}deg)`,
          transformOrigin: "0 0",
        }} />
      );
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-[800px] mx-auto">
        <Image src="/slotmachine.webp" alt="Slot Machine" width={800} height={400} className="w-full h-auto" />
        <div className="absolute flex items-end justify-center gap-14" style={{
          bottom: "90%", left: "50%", transform: "translateX(-50%)"
        }}>
          <Image src="/kasenfox.webp" alt="Fox" width={150} height={170}/>
          <Image src="/kasenmale.webp" alt="Male" width={120} height={140}/>
          <Image src="/kasenfemale.webp" alt="Female" width={180} height={140}/>
        </div>
      </div>

      {showPreview && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <Card className="bg-black/50 backdrop-blur-md p-8 z-30 text-center">
            <motion.h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text"
              animate={{ backgroundPosition: ["0% 50%","100% 50%"] }}
              transition={{ duration:3, repeat: Infinity, ease: "linear" }}
              style={{ backgroundImage: "linear-gradient(270deg,#600,#f00,#f73)", backgroundSize:"200% 200%" }}>
              KASEN MANIA
            </motion.h1>
            <h3 className="text-xl text-white">Place bet to spin</h3>
          </Card>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ width: reelWidth, height: reelHeight, marginLeft:150 }} className="relative">
          <div className="w-full h-full flex space-x-5">
            {Array.from({ length: 5 }).map((_, col) => (
              <Reel
                key={col}
                isSpinning={spinning && !stoppedReels[col]}
                finalSymbols={finalGrid?.map((r) => r[col])}
              />
            ))}
          </div>
          {overlayElement}
        </div>
      </div>
    </div>
  );
}

function Reel({ isSpinning, finalSymbols }: { isSpinning: boolean; finalSymbols?: number[] }) {
  const cellH = 75, imgSz = 65;
  const [randSyms] = useState(() =>
    Array.from({ length: 40 }, () => Math.floor(Math.random() * symbolImages.length))
  );
  const syms = finalSymbols ? [...randSyms, ...finalSymbols] : [...randSyms, ...randSyms];
  const finalOffset = -randSyms.length * cellH;

  return (
    <div className="w-24 h-full overflow-hidden relative">
      <motion.div
        animate={isSpinning ? { y: [0, finalOffset] } : { y: finalOffset }}
        transition={isSpinning
          ? { duration: 0.12, repeat: Infinity, ease: "linear" }
          : { duration: 0.12, ease: "easeOut" }}
      >
        {syms.map((s, i) => (
          <div key={i} style={{ height: cellH }} className="flex items-center justify-center">
            <Image src={symbolImages[s]} alt="" width={imgSz} height={imgSz} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         Slots Controls                             */
/* ------------------------------------------------------------------ */

interface SlotsControlsProps {
  betAmount: string;
  setBetAmount: (a: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onRollSlots: () => void;
  resetGame: () => void;
  gameResult: string | null;
  winAmount: number | null;
  cooldown: number;
}

export function SlotsControls({
  betAmount, setBetAmount, isPlaying,
  isWalletConnected, balance, onRollSlots, resetGame,
  gameResult, winAmount, cooldown
}: SlotsControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(null), 3000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  const showError = (m: string) => setErrorMessage(m);

  const handleSpin = () => {
    if (!isWalletConnected) return showError("Connect your wallet");
    const bet = Number(betAmount);
    if (isNaN(bet)) return showError("Invalid bet");
    if (bet < 1 || bet > 1000) return showError("Bet 1–1000");
    if (bet > balance) return showError("Insufficient balance");
    onRollSlots();
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
                  let v = Number(e.target.value);
                  if (isNaN(v)) v = 1;
                  v = Math.max(1, Math.min(1000, v));
                  setBetAmount(v.toString());
                }}
                className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8 w-full"
                placeholder="0.00"
                disabled={isPlaying || !isWalletConnected}
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                  width={16}
                  height={16}
                  alt="KAS"
                  className="rounded-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["½", "2×", "Min", "Max"].map((lbl, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                  onClick={() => {
                    let c = Number(betAmount);
                    if (isNaN(c)) c = 1;
                    switch (lbl) {
                      case "½":
                        c /= 2;
                        break;
                      case "2×":
                        c *= 2;
                        break;
                      case "Min":
                        c = 1;
                        break;
                      case "Max":
                        c = balance;
                        break;
                    }
                    setBetAmount(c.toString());
                  }}
                  disabled={isPlaying || !isWalletConnected}
                >
                  {lbl}
                </Button>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">Result: {gameResult}</div>
                {winAmount! > 0 ? (
                  <div className="text-xl text-green-500">
                    You won {winAmount!.toFixed(8)} KAS!
                  </div>
                ) : (
                  <div className="text-xl text-red-500">You lost</div>
                )}
              </div>
            )}
            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleSpin}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet"
                  : cooldown > 0
                    ? `Spin (${cooldown}s)`
                    : "Spin Kasen Mania"
                }
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black" disabled>
                Spinning...
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
              <button onClick={() => setErrorMessage(null)} className="ml-4 font-bold">
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
