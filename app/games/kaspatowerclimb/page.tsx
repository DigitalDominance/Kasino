// app/pages/kaspa-tower-climb.tsx

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
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { XPDisplay } from "@/app/page";
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

const API_BASE = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
const MIN_BET = 1;
const MAX_BET = 1000;
const NUM_COLS = 6;
const TOTAL_ROWS = 10;
const PLACEHOLDER_IMG = "/kaspatowerclimbbrick.png";
const WIN_IMG = "/kaspatowerclimbwin.png";
const LOSE_IMG = "/kaspatowerclimbloss.png";

interface RowState {
  pattern: boolean[] | null;
  revealed: boolean;
}

interface TowerClimbControlsProps {
  betAmount: string;
  setBetAmount: (val: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  cooldown: number;
}

function TowerClimbControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  cooldown,
}: TowerClimbControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  const showError = (msg: string) => setErrorMessage(msg);
  const handleStartClick = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      showError(`Bet must be between ${MIN_BET} and ${MAX_BET}`);
      return;
    }
    if (bet > balance) {
      showError("Insufficient balance");
      return;
    }
    onStartGame();
  };

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
                onChange={(e) => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = MIN_BET;
                  val = Math.max(MIN_BET, Math.min(MAX_BET, val));
                  setBetAmount(val.toString());
                }}
                className="bg-[#222] border border-gray-600 text-white pl-8 w-full p-2 rounded"
                placeholder="0.00"
                disabled={isPlaying || !isWalletConnected}
                min={MIN_BET}
                max={MAX_BET}
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
              <Button
                variant="outline"
                onClick={() => setBetAmount((n) => (Number(n) / 2).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                ½
              </Button>
              <Button
                variant="outline"
                onClick={() => setBetAmount((n) => (Number(n) * 2).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                2×
              </Button>
              <Button
                variant="outline"
                onClick={() => setBetAmount(MIN_BET.toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Min
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setBetAmount(Math.min(MAX_BET, balance).toString())
                }
                disabled={isPlaying || !isWalletConnected}
              >
                Max
              </Button>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="w-full bg-[#49EACB] text-black"
              onClick={handleStartClick}
              disabled={!isWalletConnected || cooldown > 0}
            >
              {!isWalletConnected
                ? "Connect Wallet"
                : cooldown > 0
                ? `Wait ${cooldown}s`
                : "Start Tower Climb"}
            </Button>
          </motion.div>
        </div>
      </Card>
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            className="fixed bottom-4 left-4 bg-red-700 text-white px-4 py-2 rounded shadow-lg"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="font-bold ml-4"
              >
                X
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TowerClimbGame({
  rows,
  currentFloor,
  onTileClick,
}: {
  rows: RowState[];
  currentFloor: number;
  onTileClick: (col: number) => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2">
      {rows.map((row, ri) => (
        <div
          key={ri}
          className={`flex justify-center gap-2 transition-opacity duration-300 ${
            !row.revealed && ri > currentFloor ? "opacity-30" : "opacity-100"
          }`}
        >
          {Array.from({ length: NUM_COLS }).map((_, ci) => {
            const isRevealed = row.revealed;
            const img = isRevealed
              ? row.pattern![ci]
                ? WIN_IMG
                : LOSE_IMG
              : PLACEHOLDER_IMG;
            return (
              <motion.div
                key={ci}
                className="w-16 h-16 cursor-pointer border border-gray-700 rounded-md overflow-hidden"
                onClick={() => {
                  if (ri === currentFloor && !row.revealed) onTileClick(ci);
                }}
                animate={{ rotateY: isRevealed ? 180 : 0 }}
                transition={{ duration: 0.8 }}
              >
                <Image src={img} alt="" width={64} height={64} />
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function KaspaTowerClimbPage() {
  const { isConnected, balance } = useWallet();

  // game state
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [rows, setRows] = useState<RowState[]>(
    Array.from({ length: TOTAL_ROWS }, () => ({ pattern: null, revealed: false }))
  );
  const [currentFloor, setCurrentFloor] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);

  // seeds & result
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [showResultPopup, setShowResultPopup] = useState(false);

  // loading & cooldown
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // typewriter
  const messages = ["Verifying transaction", "Hashing game seed", "Waiting for backend"];
  const [msgIdx, setMsgIdx] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");
  useEffect(() => {
    if (!loading) return;
    setLoadingMsg("");
    setMsgIdx(0);
  }, [loading]);
  useEffect(() => {
    if (!loading) return;
    const full = messages[msgIdx];
    if (loadingMsg.length < full.length) {
      const t = setTimeout(
        () => setLoadingMsg(full.slice(0, loadingMsg.length + 1)),
        40
      );
      return () => clearTimeout(t);
    }
    const t2 = setTimeout(() => {
      if (msgIdx < messages.length - 1) {
        setLoadingMsg("");
        setMsgIdx((i) => i + 1);
      }
    }, 2000);
    return () => clearTimeout(t2);
  }, [loading, loadingMsg, msgIdx]);

  // helpers
  async function settleRow(col: number) {
    const { data } = await axios.post(`${API_BASE}/game/settle`, {
      gameId,
      floorsReached: currentFloor + 1,
    });
    return data.game as {
      gameResult: "continue" | "win" | "lose";
      winAmount: number;
      revealedTiles: boolean[];
    };
  }
  async function settleCashout() {
    const multiplier = Math.pow(1.1, currentFloor);
    const { data } = await axios.post(`${API_BASE}/game/settle`, {
      gameId,
      floorsReached: currentFloor,
      cashoutMultiplier: multiplier,
    });
    return data.game as { gameResult: "win"; winAmount: number };
  }

  // start
  async function handleStart() {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      alert(`Bet must be between ${MIN_BET} and ${MAX_BET}, and within your balance.`);
      return;
    }
    try {
      setLoading(true);
      // clientSeed+hash
      const arr = crypto.getRandomValues(new Uint8Array(32));
      const raw = Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const buf = await crypto.subtle.digest("SHA-256", arr);
      const hash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setClientSeed(raw);

      // deposit
      const [addr] = await window.kasware.getAccounts();
      const dep = await window.kasware.sendKaspa(
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!,
        bet * 1e8,
        { priorityFee: 10000 }
      );
      const txid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;

      // play
      const r = await axios.post(`${API_BASE}/game/play`, {
        gameName: "Kaspa Tower Climb",
        clientSeed: raw,
        clientSeedHash: hash,
        nonce: 0,
        walletAddress: addr,
        betAmount: bet,
        txid,
      });
      setLoading(false);
      if (!r.data.success) throw new Error(r.data.message || "Play API failed");
      const g = r.data.game;
      setServerSeed(g.serverSeed);
      setGameId(g._id);

      // reset tower
      setRows(
        Array.from({ length: TOTAL_ROWS }, () => ({ pattern: null, revealed: false }))
      );
      setCurrentFloor(0);
      setPregame(false);
      setIsPlaying(true);
      setCooldown(10);
    } catch (e: any) {
      setLoading(false);
      alert(e.message);
    }
  }

  // click tile
  async function handleTileClick(ci: number) {
    if (!isPlaying || rows[currentFloor].revealed) return;
    try {
      const result = await settleRow(ci);
      // reveal
      const copy = [...rows];
      copy[currentFloor] = {
        pattern: result.revealedTiles,
        revealed: true,
      };
      setRows(copy);
      if (result.gameResult === "continue") {
        setCurrentFloor((f) => f + 1);
      } else if (result.gameResult === "lose") {
        setIsPlaying(false);
        setGameResult("lose");
        setWinAmount(0);
        setShowResultPopup(true);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // cash out
  async function handleCashOut() {
    if (!isPlaying) return;
    setIsPlaying(false);
    // show immediately
    const multiplier = Math.pow(1.1, currentFloor);
    const payout = Number(betAmount) * multiplier;
    setGameResult("win");
    setWinAmount(payout);
    setShowResultPopup(true);

    // backend
    try {
      await settleCashout();
    } catch (e: any) {
      console.error(e);
    }
  }

  // reset
  function resetGame() {
    setPregame(true);
    setIsPlaying(false);
    setShowResultPopup(false);
    setClientSeed(null);
    setServerSeed(null);
    setGameId(null);
    setRows(
      Array.from({ length: TOTAL_ROWS }, () => ({ pattern: null, revealed: false }))
    );
    setCurrentFloor(0);
    setGameResult(null);
    setWinAmount(0);
  }

  // cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  // decorative logos for pregame
  const decorativeLogos = useMemo(
    () =>
      Array.from({ length: 50 }).map(() => ({
        top: `${Math.random() * 80}%`,
        left: `${Math.random() * 80}%`,
      })),
    []
  );

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
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>●</motion.span>
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}>●</motion.span>
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}>●</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
        </Link>
        <div className="flex items-center gap-4">
          <XPDisplay />
          <WalletConnection />
        </div>
      </header>

      <div className="flex-grow p-6">
        {/* Main Grid */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Game Container */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/20 p-6">
            <div className="flex flex-col items-center">
              <div className="flex justify-between w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspa Tower Climb</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <div className="relative w-full h-80 rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-black to-[#004225]/80">
                  {decorativeLogos.map((pos, idx) => (
                    <motion.div
                      key={idx}
                      className="absolute"
                      style={{ top: pos.top, left: pos.left, opacity: 0.5 }}
                      whileHover={{ scale: 1.2 }}
                    >
                      <Image
                        src="/kaspagameicon.png"
                        alt="Kaspa Logo"
                        width={30}
                        height={30}
                        style={{ border: "2px solid #004d00", borderRadius: "50%" }}
                      />
                    </motion.div>
                  ))}
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
                    <motion.h1
                      className="text-5xl font-bold mb-4"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ color: "#49EACB" }}
                    >
                      KASPA TOWER CLIMB
                    </motion.h1>
                    <motion.p
                      className="text-xl mb-4"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ color: "#00FFFF" }}
                    >
                      CLIMB TO WIN BIG
                    </motion.p>
                    <Image src="/kaspagameicon.png" alt="Kaspa Icon" width={96} height={96} />
                    <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                      <Button className="bg-[#49EACB] text-black" disabled>
                        Place Your Bet
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                <TowerClimbGame
                  rows={rows}
                  currentFloor={currentFloor}
                  onTileClick={handleTileClick}
                />
              )}

              {isPlaying && !pregame && (
                <div className="mt-4">
                  <Button className="bg-[#49EACB] text-black" onClick={handleCashOut}>
                    Cash Out (Payout: {(Number(betAmount) * Math.pow(1.1, currentFloor)).toFixed(2)} KAS)
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Controls & Chat */}
          <div className="space-y-6">
            <TowerClimbControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              balance={balance}
              onStartGame={handleStart}
              cooldown={cooldown}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        {/* Promo Section */}
        <Card className="w-full bg-[#49EACB]/5 border-[#49EACB]/20 p-6 text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 bg-clip-text text-transparent"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #49EACB, #00FFFF, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Kaspa Tower Climb
          </motion.h2>
          <img src="/towerpromo.png" alt="Tower Climb Promo" className="w-full h-auto mb-4" />
          <p className="text-sm mb-4">
            Climb the tower one floor at a time. Each successful floor increases your payout,
            but one wrong move ends the climb!
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a href="https://x.com/KasenOnKaspa" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.2 }} className="text-[#49EACB]">
              <FaTwitter />
            </motion.a>
            <motion.a href="https://t.co/W4YDM1cUpY" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.2 }} className="text-[#49EACB]">
              <FaTelegramPlane />
            </motion.a>
            <motion.a href="https://kasenonkas.com" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.2 }} className="text-[#49EACB]">
              <FaGlobe />
            </motion.a>
          </div>
        </Card>
      </div>

      {/* Result Popup */}
      <AnimatePresence>
        {showResultPopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#49EACB] p-6 rounded-lg shadow-2xl text-center max-w-md w-full"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4">
                {gameResult === "win" ? "Congratulations!" : "Game Over"}
              </h2>
              {gameResult === "win" ? (
                <p className="text-xl mb-4">You won {winAmount.toFixed(2)} KAS!</p>
              ) : (
                <p className="text-xl mb-4">You lost your bet.</p>
              )}
              <div className="bg-black/70 p-4 rounded-md mb-4 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2" />
                  <span className="text-white font-semibold">Provably Fair</span>
                </div>
                <p className="text-sm break-all">Client Seed: {clientSeed}</p>
                <p className="text-sm break-all">Server Seed: {serverSeed}</p>
              </div>
              <Button onClick={resetGame} className="px-8 py-2">
                Play Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SiteFooter />
    </div>
  );
}
