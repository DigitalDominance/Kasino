
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
  revealedIndices?: boolean[];
}

interface TowerClimbGameProps {
  finishedRows: TowerRow[];
  activeRow: TowerRow | null;
  lockedRows: TowerRow[];
  onCubeClick: (cubeIndex: number) => void;
  flipBoard: boolean;
}

function TowerClimbGame({
  finishedRows,
  activeRow,
  lockedRows,
  onCubeClick,
  flipBoard,
}: TowerClimbGameProps) {
  const allRows = [...finishedRows];
  if (activeRow) allRows.push(activeRow);
  allRows.push(...lockedRows);

  return (
    <div className="flex flex-col-reverse gap-2">
      {allRows.map((row, rowIndex) => {
        const rowType =
          rowIndex < finishedRows.length
            ? "finished"
            : activeRow && rowIndex === finishedRows.length
            ? "active"
            : "locked";
        return (
          <div
            key={rowIndex}
            className={`flex justify-center gap-2 transition-opacity duration-500 ${
              rowType === "locked" ? "opacity-40" : "opacity-100"
            }`}
          >
            {row.pattern.map((cell, colIndex) => {
              const isRevealed =
                row.revealed || !!row.revealedIndices?.[colIndex];
              const imgSrc = isRevealed
                ? cell
                  ? WIN_IMG
                  : LOSE_IMG
                : PLACEHOLDER_IMG;
              return (
                <motion.div
                  key={colIndex}
                  className="w-16 h-16 cursor-pointer border border-gray-700 rounded-md overflow-hidden"
                  onClick={() => {
                    if (rowType === "active" && !isRevealed) {
                      onCubeClick(colIndex);
                    }
                  }}
                  animate={{ rotateY: isRevealed || flipBoard ? 180 : 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <Image src={imgSrc} alt="cube" width={64} height={64} />
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function KaspaTowerClimbPage() {
  const { isConnected, balance } = useWallet();

  // core state
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [finishedRows, setFinishedRows] = useState<TowerRow[]>([]);
  const [activeRow, setActiveRow] = useState<TowerRow | null>(null);
  const [lockedRows, setLockedRows] = useState<TowerRow[]>([]);
  const [flipBoard, setFlipBoard] = useState(false);
  const [cashoutClicked, setCashoutClicked] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // provably-fair & results
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [patterns, setPatterns] = useState<boolean[][]>([]);

  // track game entry ID so we can call /settle
  const [gameId, setGameId] = useState<string | null>(null);

  // txid/loading
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messages = [
    "Verifying transaction",
    "Hashing game seed",
    "Building tower",
  ];
  const [messageIndex, setMessageIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const apiUrl = "https://kasinobackenddev-0fc15c2c49dc.herokuapp.com/api";
  const T1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1!;
  const T2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2!;

  // loading typewriter…
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
        () =>
          setLoadingMessage(curr.slice(0, loadingMessage.length + 1)),
        40
      );
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

  const decorativeLogos = useMemo(
    () =>
      Array.from({ length: 50 }).map(() => ({
        top: `${Math.random() * 80}%`,
        left: `${Math.random() * 80}%`,
      })),
    []
  );

  // helper to call /settle
  async function settle(id: string, floorsReached: number) {
  const { data } = await axios.post(`${apiUrl}/game/settle`, {
    gameId: id,
    floorsReached
  });
  return data;
}

  // init tower after /play returns patterns
  function initTower(serverPatterns: boolean[][]) {
    setFinishedRows([]);
    setFlipBoard(false);
    setCashoutClicked(false);
    setPatterns(serverPatterns);
    setActiveRow({
      pattern: serverPatterns[0],
      revealed: false,
      revealedIndices: Array(NUM_COLS).fill(false),
    });
    setLockedRows(
      serverPatterns.slice(1).map((p) => ({ pattern: p, revealed: false }))
    );
  }

  // 1) Start: /play
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
      // client seed+hash
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

      // deposit
      const [addr] = await window.kasware.getAccounts();
      const treasury = Math.random() < 0.5 ? T1 : T2;
      const dep = await window.kasware.sendKaspa(treasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const txid =
        typeof dep === "string" ? JSON.parse(dep).id : (dep as any).id;
      setDepositTxid(txid);

      // play
      setLoading(true);
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
      if (!r.data.success) throw new Error("Play API failed");
      const g = r.data.game;
      setServerSeed(g.serverSeed);
      setGameId(g._id);
      initTower(g.patterns);
      setGameResult(null);
      setPregame(false);
      setIsPlaying(true);
      setCooldown(10);
    } catch (e: any) {
      setLoading(false);
      alert(e.message);
    }
  }

  // 2) Tile click
  function handleCubeClick(ci: number) {
    if (!activeRow || activeRow.revealed) return;
    const rev = [...activeRow.revealedIndices!];
    rev[ci] = true;
    setActiveRow({ ...activeRow, revealedIndices: rev });

    setTimeout(() => {
      const full = {
        ...activeRow,
        revealed: true,
        revealedIndices: Array(NUM_COLS).fill(true),
      } as TowerRow;
      setActiveRow(full);
      const outcome = activeRow.pattern[ci];

      if (outcome) {
        // win floor
        setTimeout(() => {
          const done = [...finishedRows, full];
          setFinishedRows(done);
          if (done.length < TOTAL_ROWS) {
            const nxt = lockedRows[0];
            setActiveRow({
              pattern: nxt.pattern,
              revealed: false,
              revealedIndices: Array(NUM_COLS).fill(false),
            });
            setLockedRows((prev) => prev.slice(1));
          } else {
            // completed all floors → auto cashout
            handleCashOut();
          }
        }, 500);
      } else {
        // LOSE → reveal rest, show lose immediately, no KAS sent
        setLockedRows((prev) => prev.map((r) => ({ ...r, revealed: true })));
        setFlipBoard(true);
        setIsPlaying(false);

        setGameResult("lose");
        setWinAmount(0);
        setShowResultPopup(true);

        // background settle so server marks game settled but no payout
        if (gameId) settle(gameId).catch(console.error);
      }
    }, 1000);
  }

  // 3) Cash out → immediate popup + background settle
  function handleCashOut() {
  if (cashoutClicked) return;
  setCashoutClicked(true);
  setIsPlaying(false);

  // locally compute payout & show popup immediately
  const floors = finishedRows.length;
  const payout = Number(betAmount) * Math.pow(1.1, floors);
  setGameResult("win");
  setWinAmount(payout);
  setShowResultPopup(true);

  // background settle — pass the exact floor count
  if (gameId) {
    settle(gameId, floors).catch((err) =>
      alert("Settle error: " + err.message)
    );
  }
}

  // reset
  function resetGame() {
    setPregame(true);
    setIsPlaying(false);
    setShowResultPopup(false);
    setClientSeed(null);
    setServerSeed(null);
    setDepositTxid(null);
    setFinishedRows([]);
    setActiveRow(null);
    setLockedRows([]);
    setGameId(null);
    setGameResult(null);
    setWinAmount(0);
  }

  // cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const [showResultPopup, setShowResultPopup] = useState(false);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
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
            <motion.span
              className="ml-2 text-xs"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              ●
            </motion.span>
            <motion.span
              className="ml-0.5 text-xs"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
            >
              ●
            </motion.span>
            <motion.span
              className="ml-0.5 text-xs"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
            >
              ●
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-grow p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
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
          <p className="mb-4 text-sm text-[#B6B6B6]">
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

        {/* Main Grid */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Game Container */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspa Tower Climb</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>

              {pregame ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-black to-[#004225]/80">
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
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#49EACB" }}
                    >
                      KASPA TOWER CLIMB
                    </motion.h1>
                    <motion.p
                      className="text-xl tracking-wider mb-4"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#00FFFF" }}
                    >
                      CLIMB TO WIN BIG
                    </motion.p>
                    <div className="mt-20">
                      <Image src="/kaspagameicon.png" alt="Kaspa Icon" width={96} height={96} />
                    </div>
                    <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                      <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                        Place Your Bet
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md mx-auto">
                  <TowerClimbGame
                    finishedRows={finishedRows}
                    activeRow={activeRow!}
                    lockedRows={lockedRows}
                    onCubeClick={handleCubeClick}
                    flipBoard={flipBoard}
                  />
                </div>
              )}

              {isPlaying && finishedRows.length > 0 && (
                <motion.div className="mt-4">
                  <Button
                    onClick={handleCashOut}
                    disabled={cashoutClicked}
                    className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                  >
                    Cash Out (Payout:{" "}
                    {(Number(betAmount) * Math.pow(1.1, finishedRows.length)).toFixed(2)}{" "}
                    KAS)
                  </Button>
                </motion.div>
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
            Kaspa Tower Climb
          </motion.h2>
          <img src="/towerpromo.png" alt="Tower Climb Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Climb the tower one floor at a time. Each successful floor increases your payout,
            but one wrong move ends the climb!
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a
              href="https://x.com/KasenOnKaspa"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#49EACB] hover:text-[#49EACB]/80"
            >
              <FaTwitter />
            </motion.a>
            <motion.a
              href="https://t.co/W4YDM1cUpY"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#49EACB] hover:text-[#49EACB]/80"
            >
              <FaTelegramPlane />
            </motion.a>
            <motion.a
              href="https://kasenonkas.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#49EACB] hover:text-[#49EACB]/80"
            >
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
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
              <div className="bg-black/80 p-4 rounded-md mb-4 text-left">
                <div className="flex items-center mb-2">
                  <ShieldCheck className="text-white mr-2" />
                  <h3 className="text-white font-semibold m-0">Provably Fair</h3>
                </div>
                <p className="text-sm text-white break-all">Client Seed: {clientSeed}</p>
                <p className="text-sm text-white break-all">Server Seed: {serverSeed}</p>
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
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount((n) => (Number(n) / 2).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                ½
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount((n) => (Number(n) * 2).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                2×
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(MIN_BET.toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Min
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
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
              className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
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
