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

const MIN_BET = 1;
const MAX_BET = 1000;
const NUM_COLS = 6;
const TOTAL_ROWS = 10;
const PLACEHOLDER_IMG = "/kaspatowerclimbbrick.png";
const WIN_IMG = "/kaspatowerclimbwin.png";
const LOSE_IMG = "/kaspatowerclimbloss.png";

interface TowerRow {
  pattern: boolean[];
  revealed: boolean;
}

interface TowerClimbGameProps {
  finishedRows: TowerRow[];
  activeRow: TowerRow | null;
  onCubeClick: (cubeIndex: number) => void;
  flipBoard: boolean;
}

function TowerClimbGame({
  finishedRows,
  activeRow,
  onCubeClick,
  flipBoard,
}: TowerClimbGameProps) {
  const allRows = [...finishedRows];
  if (activeRow) allRows.push(activeRow);

  return (
    <div className="flex flex-col-reverse gap-2">
      {allRows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`flex justify-center gap-2 transition-opacity duration-500 ${
            !row.revealed && rowIndex >= finishedRows.length ? "opacity-40" : "opacity-100"
          }`}
        >
          {row.pattern.map((cell, colIndex) => {
            const imgSrc = row.revealed
              ? cell
                ? WIN_IMG
                : LOSE_IMG
              : PLACEHOLDER_IMG;
            return (
              <motion.div
                key={colIndex}
                className="w-16 h-16 cursor-pointer border border-gray-700 rounded-md overflow-hidden"
                onClick={() => {
                  if (rowIndex === finishedRows.length && !row.revealed) {
                    onCubeClick(colIndex);
                  }
                }}
                animate={{ rotateY: row.revealed || flipBoard ? 180 : 0 }}
                transition={{ duration: 0.8 }}
              >
                <Image src={imgSrc} alt="" width={64} height={64} />
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
  const [finishedRows, setFinishedRows] = useState<TowerRow[]>([]);
  const [activeRow, setActiveRow] = useState<TowerRow | null>(null);
  const [lockedRows, setLockedRows] = useState<boolean[][]>([]);

  // seeds & result
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);

  // txid + loading
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messages = [
    "Verifying transaction",
    "Hashing game seed",
    "Building tower",
  ];
  const [messageIndex, setMessageIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const T1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!;
  const T2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;

  // typewriter effect
  useEffect(() => {
    if (loading) {
      setMessageIndex(0);
      setLoadingMessage("");
    }
  }, [loading]);
  useEffect(() => {
    if (!loading) return;
    const curr = messages[messageIndex];
    if (loadingMessage.length < curr.length) {
      const t = setTimeout(
        () => setLoadingMessage(curr.slice(0, loadingMessage.length + 1)),
        40
      );
      return () => clearTimeout(t);
    }
    const t2 = setTimeout(() => {
      if (messageIndex < messages.length - 1) {
        setMessageIndex((i) => i + 1);
        setLoadingMessage("");
      }
    }, 2000);
    return () => clearTimeout(t2);
  }, [loading, loadingMessage, messageIndex]);

  // cooldown
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  // init tower rows from /play
  function initTower(serverPatterns: boolean[][]) {
    setFinishedRows([]);
    setActiveRow({ pattern: serverPatterns[0], revealed: false });
    setLockedRows(serverPatterns.slice(1));
    setIsPlaying(true);
    setGameResult(null);
    setWinAmount(0);
    setCashoutClicked(false);
  }

  // Start game
  async function handleStartGame() {
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
      // provably-fair seeds
      const arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      const raw = Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const buf = await crypto.subtle.digest("SHA-256", arr);
      const hash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setClientSeed(raw);

      // deposit KAS
      const [addr] = await window.kasware.getAccounts();
      const treasury = Math.random() < 0.5 ? T1 : T2;
      const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const txid = typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;
      setDepositTxid(txid);

      // now start loading/typewriter
      setLoading(true);

      // call play
      const r = await axios.post(`${apiUrl}/game/play`, {
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
      initTower(g.patterns);

      setPregame(false);
      setCooldown(10);
    } catch (err: any) {
      setLoading(false);
      alert(err.message);
    }
  }

  // Settle a tile click
  async function handleCubeClick(colIndex: number) {
    if (!gameId || !isPlaying) return;
    setIsPlaying(false);

    try {
      const { data } = await axios.post(`${apiUrl}/game/settle`, {
        gameId,
        floorsReached: finishedRows.length + 1,
        tileIndex: colIndex,
      });
      const { gameResult, winAmount, revealedTiles, nextFloor } = data.game;

      // add the revealed row
      setFinishedRows((rows) => [
        ...rows,
        { pattern: revealedTiles, revealed: true },
      ]);

      if (gameResult === "continue") {
        // move to next row
        const nextPattern = lockedRows[0];
        setActiveRow({ pattern: nextPattern, revealed: false });
        setLockedRows((prev) => prev.slice(1));
        setIsPlaying(true);
      } else {
        // win or lose
        setGameResult(gameResult);
        setWinAmount(winAmount);
        setShowResultPopup(true);
      }
    } catch (err: any) {
      alert("Settle error: " + err.message);
    }
  }

  // Cash out
  const [cashoutClicked, setCashoutClicked] = useState(false);
  async function handleCashOut() {
    if (cashoutClicked || !gameId) return;
    setCashoutClicked(true);
    setIsPlaying(false);

    const floors = finishedRows.length;
    const multiplier = Math.pow(1.1, floors);
    const payout = Number(betAmount) * multiplier;
    setGameResult("win");
    setWinAmount(payout);
    setShowResultPopup(true);

    try {
      await axios.post(`${apiUrl}/game/settle`, {
        gameId,
        floorsReached: floors,
        cashoutMultiplier: multiplier,
      });
    } catch (err: any) {
      console.error("Cashout settle error:", err);
    }
  }

  // reset
  function resetGame() {
    setPregame(true);
    setIsPlaying(false);
    setShowResultPopup(false);
    setFinishedRows([]);
    setActiveRow(null);
    setLockedRows([]);
    setGameId(null);
    setDepositTxid(null);
    setClientSeed(null);
    setServerSeed(null);
    setGameResult(null);
    setWinAmount(0);
    setCooldown(0);
  }

  const [showResultPopup, setShowResultPopup] = useState(false);

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
            {loadingMessage}
            <motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.8 }}>●</motion.span>
            <motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}>●</motion.span>
            <motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}>●</motion.span>
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

      {/* Deposit TXID */}
      {depositTxid && (
        <p className="px-6 mb-4 text-sm text-[#B6B6B6]">
          Deposit TXID:{" "}
          <a
            href={`https://kas.fyi/transaction/${depositTxid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-[#B6B6B6] to-[#49EACB] bg-clip-text text-transparent"
          >
            {depositTxid}
          </a>
        </p>
      )}

      <div className="flex-grow p-6">
        {/* Main Grid */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Game Container */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/20 p-6 rounded-lg">
            <div className="w-full flex flex-col items-center">
              <div className="flex justify-between w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspa Tower Climb</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <div className="relative w-full min-h-[600px] rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-black to-[#004225]/80">
                  {useMemo(() =>
                    Array.from({ length: 50 }).map((_, idx) => ({
                      top: `${Math.random() * 80}%`,
                      left: `${Math.random() * 80}%`,
                    })).map((pos, idx) => (
                      <motion.div
                        key={idx}
                        className="absolute opacity-50"
                        style={{ top: pos.top, left: pos.left }}
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
                    ))
                  , [])}

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
                  finishedRows={finishedRows}
                  activeRow={activeRow}
                  onCubeClick={handleCubeClick}
                  flipBoard={flipBoard}
                />
              )}

              {isPlaying && finishedRows.length > 0 && (
                <Button
                  className="mt-4 bg-[#49EACB] text-black"
                  onClick={handleCashOut}
                  disabled={cashoutClicked}
                >
                  Cash Out (Payout: {(Number(betAmount) * Math.pow(1.1, finishedRows.length)).toFixed(2)} KAS)
                </Button>
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
              onStartGame={handleStartGame}
              cooldown={cooldown}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        {/* Promo Section */}
        <Card className="w-full bg-[#49EACB]/5 border-[#49EACB]/20 p-6 text-center rounded-lg">
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

      <SiteFooter />

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
    </div>
  );
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
      <Card className="bg-[#49EACB]/5 border-[#49EACB]/20 p-6 rounded-lg">
        <div className="space-y-4">
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
                className="w-full bg-[#222] border border-gray-600 text-white pl-8 p-2 rounded"
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

