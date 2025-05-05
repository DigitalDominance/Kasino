
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { XPDisplay } from "@/app/page";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

const MIN_BET = 1;
const MAX_BET = 1000;
const PIN_ROW_COUNT = 15;
const FINAL_SLOT_COUNT = 18;
const FINAL_SLOT_MULTIPLIERS = [
  110, 41, 10, 5, 3, 1.5, 1, 0.5,
  0.3, 0.3,
  0.5, 1, 1.5, 3, 5, 10, 41, 110,
];
const ROW_SPACING = 50;
const PIN_SPACING = 40;
const PIN_SIZE = 10;
const BOX_SIZE = 28;
const STAGE_HEIGHT = 900;
const STEP_DELAY = 300;
const SPRING_CONFIG = { type: "spring", stiffness: 80, damping: 14 };

// Build a dummy path that always lands in `slot`
function buildPathForSlot(slot: number): boolean[] {
  return Array.from({ length: PIN_ROW_COUNT }, (_, i) => i < slot);
}

// SHA-256 hash using Web Crypto
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function pinsForRow(row: number) { return 4 + row; }

interface PlinkoStageProps {
  pregame: boolean;
  path: boolean[] | null;
  dropping: boolean;
  onBallLanded: (finalSlot: number) => void;
}
function PlinkoStage({ pregame, path, dropping, onBallLanded }: PlinkoStageProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [landed, setLanded] = useState(false);

  const stepPositions = useMemo(() => {
    if (!path) return [];
    const positions: { x: number; y: number }[] = [];
    let col = 0;
    for (let row = 0; row < PIN_ROW_COUNT; row++) {
      const count = pinsForRow(row), center = (count - 1) / 2;
      positions.push({ x: (col - center) * PIN_SPACING, y: row * ROW_SPACING });
      if (path[row]) col++;
    }
    const centerBoxes = (FINAL_SLOT_COUNT - 1) / 2;
    positions.push({ x: (col - centerBoxes) * PIN_SPACING, y: PIN_ROW_COUNT * ROW_SPACING });
    return positions;
  }, [path]);

  useEffect(() => {
    if (pregame) {
      setCurrentStep(0);
      setPos({ x: 0, y: 0 });
      setLanded(false);
      return;
    }
    if (dropping && path && currentStep < stepPositions.length) {
      setPos(stepPositions[currentStep]);
      const t = setTimeout(() => setCurrentStep(c => c + 1), STEP_DELAY);
      return () => clearTimeout(t);
    }
    if (dropping && path && currentStep >= stepPositions.length && !landed) {
      setLanded(true);
      onBallLanded(path.reduce((sum, step) => sum + (step ? 1 : 0), 0));
    }
  }, [pregame, dropping, path, currentStep, stepPositions, landed, onBallLanded]);

  const pinCoords = useMemo(() => {
    const coords: { x: number; y: number }[] = [];
    for (let row = 0; row < PIN_ROW_COUNT; row++) {
      const count = pinsForRow(row), center = (count - 1) / 2, y = row * ROW_SPACING;
      for (let col = 0; col < count; col++) {
        coords.push({ x: (col - center) * PIN_SPACING, y });
      }
    }
    return coords;
  }, []);

  const finalBoxes = useMemo(() => {
    const y = PIN_ROW_COUNT * ROW_SPACING, center = (FINAL_SLOT_COUNT - 1) / 2;
    return FINAL_SLOT_MULTIPLIERS.map((m, slot) => (
      <div
        key={slot}
        className="absolute flex items-center justify-center bg-black/30 border border-[#49EACB] text-[#49EACB] text-xs font-bold rounded-md shadow-[0_0_8px_#49EACB]"
        style={{
          width: BOX_SIZE,
          height: BOX_SIZE,
          left: "50%",
          transform: `translate(${(slot - center) * PIN_SPACING - BOX_SIZE/2}px, ${y}px)`,
          opacity: pregame ? 0.5 : 1,
        }}
      >
        {m}x
      </div>
    ));
  }, [pregame]);

  return (
    <div className="relative w-full" style={{ height: STAGE_HEIGHT }}>
      {pinCoords.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#49EACB]"
          style={{
            width: PIN_SIZE,
            height: PIN_SIZE,
            left: "50%",
            transform: `translate(${p.x - PIN_SIZE/2}px, ${p.y - PIN_SIZE/2}px)`,
            opacity: pregame ? 0.5 : 1,
          }}
        />
      ))}
      {finalBoxes}
      {!pregame && (
        <motion.div
          className="absolute left-1/2"
          animate={{ x: pos.x, y: pos.y }}
          transition={SPRING_CONFIG}
          style={{ width: 28, height: 28, marginLeft: -14, marginTop: -5 }}
        >
          <Image src="/kaspagameicon.png" alt="Ball" width={28} height={28} className="rounded-full" />
        </motion.div>
      )}
    </div>
  );
}

export default function PlinkoPage() {
  return <PlinkoContent />;
}

function PlinkoContent() {
  const { isConnected, balance } = useWallet();
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [cooldown, setCooldown] = useState(0);
  const [ballPath, setBallPath] = useState<boolean[] | null>(null);
  const [dropping, setDropping] = useState(false);

  const [gameId, setGameId] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [clientSeedHash, setClientSeedHash] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [nonce, setNonce] = useState<number | null>(null);
  const [slot, setSlot] = useState<number>(0);

  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);

  const [messageIndex, setMessageIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const messages = [
    "Verifying transaction",
    "Hashing game seed",
    "Drawing game canvas"
  ];

  // Reset and typewriter effects
  useEffect(() => {
    if (loading) {
      setMessageIndex(0);
      setLoadingMessage("");
    }
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const current = messages[messageIndex];
    if (loadingMessage.length < current.length) {
      const t = setTimeout(() => setLoadingMessage(s => s + current[s.length]), 40);
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
    }, 2000);
    return () => clearTimeout(t);
  }, [loading, messageIndex]);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const T1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!;
  const T2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;

  async function handleStartGame() {
    const bet = Number(betAmount);
    if (!isConnected) { alert("Connect your wallet first"); return; }
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) { alert(`Bet ${MIN_BET}–${MAX_BET}`); return; }
    if (bet > balance) { alert("Insufficient balance"); return; }

    try {
      // 1) Generate 32-byte clientSeed
      const arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      const rawSeed = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");

      // 2) SHA-256 of that seed
      const buf = await crypto.subtle.digest("SHA-256", arr);
      const hashHex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");

      // 3) Generate a 32-bit nonce
      const na = new Uint32Array(1);
      crypto.getRandomValues(na);
      const n = na[0];

      setClientSeed(rawSeed);
      setClientSeedHash(hashHex);
      setNonce(n);

      // 4) Randomly pick treasury
      const flip = new Uint8Array(1);
      crypto.getRandomValues(flip);
      const treasury = flip[0] < 128 ? T1 : T2;

      // 5) Deposit
      const [addr] = await window.kasware.getAccounts();
      if (!addr) throw new Error("Wallet not found");
      const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, { priorityFee: 10000 });
      const tx = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;
      setDepositTxid(tx);

      // 6) Call backend
      setLoading(true);
      const res = await axios.post(`${apiUrl}/game/play`, {
        gameName: "Plinko",
        clientSeed: rawSeed,
        clientSeedHash: hashHex,
        nonce: n,
        walletAddress: addr,
        betAmount: bet,
        txid: tx,
      });
      setLoading(false);

      if (!res.data.success) throw new Error("Play API failed");
      const g = res.data.game;
      setGameId(g._id);
      setServerSeed(g.serverSeed);
      setServerSeedHash(g.serverSeedHash);
      setWinAmount(g.winAmount);
      setSlot(g.slot);

      // 7) Animate exact path
      setBallPath(buildPathForSlot(g.slot));
      setPregame(false);
      setIsPlaying(true);
      setShowResult(false);
      setCooldown(10);
      setDropping(true);
    } catch (err: any) {
      console.error(err);
      setLoading(false);
      alert(err.message);
    }
  }

  function handleBallLanded(_: number) {
    setDropping(false);
    setShowResult(true);
    setIsPlaying(false);
  }

  function resetGame() {
    setPregame(true);
    setIsPlaying(false);
    setShowResult(false);
    setBallPath(null);
    setDropping(false);
    setDepositTxid(null);
    setGameId(null);
    setServerSeed(null);
    setServerSeedHash(null);
    setClientSeed(null);
    setClientSeedHash(null);
    setNonce(null);
    setSlot(0);
  }

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  return (
    <div className={`${montserrat.className} bg-black min-h-screen`}>
      {/* LOADING OVERLAY */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-[#49EACB] text-lg font-mono"
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

      <div className="flex-grow p-6">
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>  
            <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-4">
            <XPDisplay />
            <WalletConnection />
          </motion.div>
        </header>

        {depositTxid && (
          <p className="mb-4 text-sm text-[#B6B6B6]">
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

        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 relative">
              <PlinkoStage
                pregame={pregame}
                path={ballPath}
                dropping={dropping}
                onBallLanded={handleBallLanded}
              />
              {pregame && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.h1
                    className="text-5xl font-bold mb-4"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ color: "#49EACB" }}
                  >
                    KASPA PLINKO
                  </motion.h1>
                  <motion.p
                    className="text-xl tracking-wider mb-4"
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ color: "#00FFFF" }}
                  >
                    Drop the Ball and Win Big!
                  </motion.p>
                  <Image src="/kaspagameicon.png" alt="Kaspa Icon" width={96} height={96} />
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <PlinkoControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              balance={balance}
              onStartGame={handleStartGame}
              cooldown={cooldown}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        <Card className="w-full bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #49EACB, #00FFFF, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Kaspa Plinko
          </motion.h2>
          <p className="text-sm text-white mb-4">
            Drop a KAS coin through a cascade of pegs, watch it bounce unpredictably, and land in one of the slots to reveal your prize multiplier.
          </p>
        </Card>
      </div>

      <SiteFooter />

      {/* RESULT POPUP */}
      <AnimatePresence>
        {showResult && winAmount !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#49EACB] p-6 rounded-lg shadow-2xl text-center max-w-sm w-full"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-3xl font-bold mb-4">Your Plinko Result</h2>
              <p className="text-xl mb-4">
                You won <strong>{winAmount.toFixed(2)}</strong> KAS!
              </p>
              <div className="text-left bg-black/80 p-4 rounded-md mb-4">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2" />
                  <h3 className="text-lg font-semibold text-white m-0">Provably Fair</h3>
                </div>
                <p className="text-sm text-white break-all">Client seed: {clientSeed}</p>
                <p className="text-sm text-white break-all">Server seed: {serverSeed}</p>
              </div>
              <Button
                className="bg-black text-[#49EACB] hover:bg-black/80"
                onClick={() => {
                  setShowResult(false);
                  resetGame();
                }}
              >
                Play Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PlinkoControlsProps {
  betAmount: string;
  setBetAmount(val: string): void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame(): void;
  cooldown: number;
}
function PlinkoControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  cooldown,
}: PlinkoControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartClick = () => {
    if (!isWalletConnected) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    const b = Number(betAmount);
    if (isNaN(b) || b < MIN_BET || b > MAX_BET) {
      setErrorMessage(`Bet must be between ${MIN_BET} and ${MAX_BET}`);
      return;
    }
    if (b > balance) {
      setErrorMessage("Insufficient balance");
      return;
    }
    onStartGame();
  };

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  return (
    <>
      <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Bet Amount (KAS)</label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={e => {
                  let v = Number(e.target.value);
                  if (isNaN(v)) v = MIN_BET;
                  v = Math.max(MIN_BET, Math.min(MAX_BET, v));
                  setBetAmount(v.toString());
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
              <Button variant="outline" onClick={() => setBetAmount((Number(betAmount)/2).toString())} disabled={isPlaying || !isWalletConnected}>½</Button>
              <Button variant="outline" onClick={() => setBetAmount((Number(betAmount)*2).toString())} disabled={isPlaying || !isWalletConnected}>2×</Button>
              <Button variant="outline" onClick={() => setBetAmount(MIN_BET.toString())} disabled={isPlaying || !isWalletConnected}>Min</Button>
              <Button variant="outline" onClick={() => setBetAmount(Math.min(MAX_BET, balance).toString())} disabled={isPlaying || !isWalletConnected}>Max</Button>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleStartClick}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet"
                  : cooldown > 0
                  ? `Wait ${cooldown}s`
                  : "Start Plinko"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black" disabled>
                Ball Dropping...
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
            className="fixed bottom-4 left-4 bg-red-700 text-white px-4 py-2 rounded shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-4 font-bold">X</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
