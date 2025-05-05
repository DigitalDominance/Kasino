"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/contexts/WalletContext";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { XPDisplay } from "@/app/page";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

const MIN_BET = 1;
const MAX_BET = 1000;

// ─── Cup Game Board ───────────────────────────────────
interface CupGameBoardProps {
  numCups: number;
  selectedCup: number | null;
  winningCup: number;
  predeterminedWin: boolean;
  showWinningCup: boolean;
  animationFinished: boolean;
  previewPhase: boolean;
  onCupClick: (i: number) => void;
}
function CupGameBoard({
  numCups,
  selectedCup,
  winningCup,
  predeterminedWin,
  showWinningCup,
  animationFinished,
  previewPhase,
  onCupClick,
}: CupGameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const effectiveWidth = width || window.innerWidth;
  const cupSize = effectiveWidth * 0.15;
  const containerHeight = cupSize * 1.6;
  const gap = 40;
  const totalWidth = numCups * cupSize + (numCups - 1) * gap;
  const leftOffset = (effectiveWidth - totalWidth) / 2;
  const initialY = (containerHeight - cupSize) / 2;
  const ballSize = cupSize * 0.3;
  const ballY = initialY + (cupSize - ballSize) * 0.8;

  // generate shuffle sequence
  const initialPositions = useMemo(
    () => Array.from({ length: numCups }, (_, i) => leftOffset + i * (cupSize + gap)),
    [numCups, leftOffset, cupSize, gap]
  );
  const totalSteps = 20;
  const positionsSequence = useMemo(() => {
    const seq: number[][] = [initialPositions];
    let curr = [...initialPositions];
    for (let i = 1; i < totalSteps; i++) {
      const next = [...curr];
      for (let j = next.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [next[j], next[k]] = [next[k], next[j]];
      }
      seq.push(next);
      curr = next;
    }
    return seq;
  }, [initialPositions]);
  const finalPositions = positionsSequence[positionsSequence.length - 1];

  const [ballVisible, setBallVisible] = useState(false);
  useEffect(() => {
    if (previewPhase) {
      setBallVisible(true);
    } else if (animationFinished) {
      if ((predeterminedWin && selectedCup === winningCup) || showWinningCup) {
        const t = setTimeout(() => setBallVisible(true), 800);
        return () => clearTimeout(t);
      } else {
        setBallVisible(false);
      }
    } else {
      setBallVisible(false);
    }
  }, [previewPhase, animationFinished, selectedCup, winningCup, predeterminedWin, showWinningCup]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto"
      style={{
        width: "100%",
        height: containerHeight,
        perspective: 1000,
        pointerEvents: animationFinished ? "auto" : "none",
      }}
    >
      {initialPositions.map((x0, i) => {
        let animateX: number | number[];
        let animateY: number;
        let transition: any;

        if (previewPhase) {
          animateX = x0;
          animateY = i === winningCup ? initialY - 150 : initialY;
          transition = { duration: 0.5, ease: "easeInOut" };
        } else if (!animationFinished) {
          animateX = positionsSequence.map(step => step[i]);
          animateY = initialY;
          transition = {
            x: { duration: 1.5, ease: "easeInOut" },
            y: { duration: 0.2, ease: "easeInOut" },
          };
        } else {
          const targetX = finalPositions[i];
          const lift = (i === selectedCup) || (showWinningCup && i === winningCup);
          animateX = targetX;
          animateY = lift ? initialY - 150 : initialY;
          transition = {
            duration: 0.5,
            ease: "easeOut",
            delay: (showWinningCup && i === winningCup && selectedCup !== winningCup) ? 0.5 : 0,
          };
        }

        return (
          <motion.div
            key={i}
            className="absolute cursor-pointer"
            style={{
              x: x0,
              y: initialY,
              width: cupSize,
              height: cupSize,
              zIndex:
                previewPhase ||
                (animationFinished && (i === selectedCup || (showWinningCup && i === winningCup)))
                  ? 1
                  : 0,
            }}
            initial={{ x: x0, y: initialY }}
            animate={{ x: animateX, y: animateY }}
            transition={transition}
            onClick={() => animationFinished && selectedCup === null && onCupClick(i)}
          >
            <Image src="/kaspacupgamecup.webp" alt="Cup" width={cupSize} height={cupSize} />
          </motion.div>
        );
      })}

      {/* Ball */}
      {ballVisible &&
        (previewPhase ? (
          <div
            style={{
              position: "absolute",
              left: initialPositions[winningCup] + (cupSize - ballSize) / 2,
              top: ballY,
              width: ballSize,
              height: ballSize,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <Image src="/kaspacupgameball.webp" alt="Ball" width={ballSize} height={ballSize} />
          </div>
        ) : (
          animationFinished && (
            <div
              style={{
                position: "absolute",
                left: finalPositions[winningCup] + (cupSize - ballSize) / 2,
                top: ballY,
                width: ballSize,
                height: ballSize,
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <Image src="/kaspacupgameball.webp" alt="Ball" width={ballSize} height={ballSize} />
            </div>
          )
        ))}
    </div>
  );
}

// ─── Controls ───────────────────────────────────────
interface ControlsProps {
  betAmount: string;
  setBetAmount: (s: string) => void;
  multiplier: number;
  setMultiplier: (n: number) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  cooldown: number;
}
function CupGameControls({
  betAmount,
  setBetAmount,
  multiplier,
  setMultiplier,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  cooldown,
}: ControlsProps) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const tryStart = () => {
    if (!isWalletConnected) return setError("Connect wallet");
    const b = Number(betAmount);
    if (isNaN(b) || b < MIN_BET || b > MAX_BET) return setError(`Bet ${MIN_BET}-${MAX_BET}`);
    if (b > balance) return setError("Insufficient balance");
    onStartGame();
  };

  return (
    <>
      <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-[#49EACB]">Bet Amount</label>
          <input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(e.target.value)}
            disabled={isPlaying || !isWalletConnected}
            className="w-full bg-black border border-[#49EACB] p-2 text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#49EACB]">Multiplier</label>
          <div className="flex gap-2">
            {[2, 3, 5].map(m => (
              <Button
                key={m}
                variant={multiplier === m ? "default" : "outline"}
                onClick={() => setMultiplier(m)}
                disabled={isPlaying || !isWalletConnected}
              >
                {m}×
              </Button>
            ))}
          </div>
        </div>
        <Button
          className="w-full bg-[#49EACB] text-black"
          onClick={tryStart}
          disabled={!isWalletConnected || isPlaying || cooldown > 0}
        >
          {!isWalletConnected
            ? "Connect Wallet"
            : cooldown > 0
            ? `Wait ${cooldown}s`
            : isPlaying
            ? "Game in progress…"
            : "Start Guess The Cup"}
        </Button>
      </Card>
      {error && (
        <motion.div
          className="fixed bottom-4 left-4 bg-red-700 text-white px-4 py-2 rounded"
          initial={{ x: -200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -200, opacity: 0 }}
        >
          {error}
        </motion.div>
      )}
    </>
  );
}

// ─── Main Page ──────────────────────────────────────
export default function CupGamePage() {
  const { isConnected, balance } = useWallet();
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  // provably fair
  const [clientSeed, setClientSeed] = useState("");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [predeterminedWin, setPredeterminedWin] = useState(false);
  const [winningCup, setWinningCup] = useState(0);

  // UI state
  const [betAmount, setBetAmount] = useState("1");
  const [multiplier, setMultiplier] = useState(2);
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewPhase, setPreviewPhase] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [selectedCup, setSelectedCup] = useState<number | null>(null);
  const [showWinningCup, setShowWinningCup] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // loading/typewriter
  const [loading, setLoading] = useState(false);
  const messages = ["Verifying transaction", "Hashing seeds", "Shuffling cups"];
  const [msgIdx, setMsgIdx] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");

  useEffect(() => {
    if (!loading) return;
    setLoadingMsg("");
    setMsgIdx(0);
  }, [loading]);
  useEffect(() => {
    if (!loading) return;
    const curr = messages[msgIdx];
    if (loadingMsg.length < curr.length) {
      const t = setTimeout(() => setLoadingMsg(curr.slice(0, loadingMsg.length + 1)), 40);
      return () => clearTimeout(t);
    }
  }, [loading, loadingMsg, msgIdx]);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (msgIdx < messages.length - 1) {
        setMsgIdx(i => i + 1);
        setLoadingMsg("");
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [loading, msgIdx]);

  // ─── start game ─────────────────────────────────────
  const handleStartGame = useCallback(async () => {
    if (!isConnected) return alert("Connect wallet");
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      return alert(`Bet ${MIN_BET}-${MAX_BET}, within balance`);
    }

    // client seed+hash
    const arr = crypto.getRandomValues(new Uint8Array(32));
    const raw = Array.from(arr)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    const buf = await crypto.subtle.digest("SHA-256", arr);
    const hash = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    setClientSeed(raw);

    try {
      // deposit
      const [addr] = await window.kasware.getAccounts();
      const treasury =
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;
      const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, { priorityFee: 10000 });
      const pd = typeof dep === "string" ? JSON.parse(dep) : dep;
      setDepositTxid(pd.id);

      // play API
      setLoading(true);
      const res = await axios.post(
        `https://kasinobackenddev-0fc15c2c49dc.herokuapp.com/api/game/play`,
        {
          gameName: "Guess The Cup",
          clientSeed: raw,
          clientSeedHash: hash,
          nonce: 0,
          walletAddress: addr,
          betAmount: bet,
          multiplier,
          txid: pd.id,
        }
      );
      setLoading(false);

      if (!res.data.success) throw new Error("Play failed");
      const g = res.data.game;
      setServerSeedHash(g.serverSeedHash);
      setPredeterminedWin(g.predeterminedWin);
      setWinningCup(g.winningCup);
      setGameId(g._id);

      // animate
      setPregame(false);
      setIsPlaying(true);
      setPreviewPhase(true);
      setTimeout(() => setPreviewPhase(false), 1000);
      setTimeout(() => setAnimationFinished(true), 2500);
    } catch (e: any) {
      setLoading(false);
      alert(e.message);
    }
  }, [isConnected, balance, betAmount, multiplier]);

  // ─── cup click ──────────────────────────────────────
  const handleCupClick = (i: number) => {
    if (!animationFinished || selectedCup !== null) return;
    setSelectedCup(i);
    setTimeout(() => {
      const won = predeterminedWin && i === winningCup;
      setGameResult(won ? "win" : "lose");
      setShowWinningCup(true);
      setIsPlaying(false);
      // settle API
      axios
        .post(`https://kasinobackenddev-0fc15c2c49dc.herokuapp.com/api/game/settle`, {
          gameId,
          selectedCup: i,
        })
        .catch(console.error);
    }, 500);
  };

  // ─── reset ──────────────────────────────────────────
  const reset = () => {
    setPregame(true);
    setIsPlaying(false);
    setDepositTxid(null);
    setGameId(null);
    setClientSeed("");
    setServerSeedHash("");
    setPredeterminedWin(false);
    setWinningCup(0);
    setPreviewPhase(false);
    setAnimationFinished(false);
    setSelectedCup(null);
    setShowWinningCup(false);
    setGameResult(null);
  };

  // ─── cooldown ───────────────────────────────────────
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      {/* loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-[#49EACB] font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {loadingMsg}
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="ml-2">
              ●
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
              className="ml-0.5"
            >
              ●
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
              className="ml-0.5"
            >
              ●
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-grow p-6 space-y-6">
        {/* header */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-[#49EACB] hover:underline inline-flex items-center">
            <ArrowLeft className="mr-2" /> Back
          </Link>
          <div className="flex items-center gap-4">
            <XPDisplay />
            <WalletConnection />
          </div>
        </div>

        {/* txid */}
        {depositTxid && (
          <p className="text-sm text-[#B6B6B6]">
            TXID:{" "}
            <a href={`https://kas.fyi/transaction/${depositTxid}`} target="_blank" className="text-[#49EACB]">
              {depositTxid}
            </a>
          </p>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 h-full">
          {/* board */}
          <Card className="bg-[#49EACB]/10 border-[#49EACB]/20 p-6 h-full flex items-center justify-center">
            {pregame ? (
              <div className="flex flex-col items-center justify-center w-full text-center space-y-8">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00FF00] to-[#C084FC] bg-clip-text text-transparent">
                  GUESS THE CUP
                </h1>
                <p className="max-w-sm text-[#B6B6B6]">
                  Follow the shuffle, then pick the cup hiding the ball.
                </p>
                <Button disabled className="bg-[#49EACB] text-black">
                  Place your bet &amp; select multiplier
                </Button>
              </div>
            ) : (
              <CupGameBoard
                numCups={multiplier}
                selectedCup={selectedCup}
                winningCup={winningCup}
                predeterminedWin={predeterminedWin}
                showWinningCup={showWinningCup}
                animationFinished={animationFinished}
                previewPhase={previewPhase}
                onCupClick={handleCupClick}
              />
            )}
          </Card>

          {/* controls */}
          <div className="space-y-6">
            <CupGameControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              multiplier={multiplier}
              setMultiplier={setMultiplier}
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              balance={balance}
              onStartGame={() => {
                handleStartGame();
                setCooldown(10);
              }}
              cooldown={cooldown}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </div>

      <SiteFooter />

      {/* result popup */}
      <AnimatePresence>
        {gameResult && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`p-6 rounded-lg max-w-sm w-full text-center ${
                gameResult === "win" ? "bg-green-600" : "bg-red-600"
              }`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2 className="text-3xl font-bold mb-4">
                {gameResult === "win" ? "Congratulations!" : "Game Over"}
              </h2>
              {gameResult === "win" ? (
                <p className="mb-4">You won {(Number(betAmount) * multiplier).toFixed(2)} KAS!</p>
              ) : (
                <p className="mb-4">You lost your bet.</p>
              )}
              <div className="bg-black/80 p-4 rounded mb-4 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="mr-2 text-white" />
                  <span className="text-white font-semibold">Provably Fair</span>
                </div>
                <p className="text-xs text-white break-all">Client Seed: {clientSeed}</p>
                <p className="text-xs text-white break-all">Server Seed Hash: {serverSeedHash}</p>
              </div>
              <Button onClick={reset}>Play Again</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
