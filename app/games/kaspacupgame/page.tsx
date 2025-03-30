"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
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

// ---------------------------------------------------------
// Font & Constants
// ---------------------------------------------------------
const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

const MIN_BET = 1;
const MAX_BET = 1000;

// ---------------------------------------------------------
// Cup Game Board Component (Updated)
// ---------------------------------------------------------
interface CupGameBoardProps {
  numCups: number;
  selectedCup: number | null;
  winningCup: number;
  predeterminedWin: boolean;
  showWinningCup: boolean;
  animationFinished: boolean;
  previewPhase: boolean;
  onCupClick: (index: number) => void;
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
  // Container and cup sizes
  const containerWidth = 1200; // px
  const containerHeight = 800; // px
  const cupSize = 500; // each cup is 500px
  const gap = 40;
  const totalWidth = numCups * cupSize + (numCups - 1) * gap;
  const leftOffset = (containerWidth - totalWidth) / 2;
  const initialY = (containerHeight - cupSize) / 2;

  // Initial positions for each cup
  const initialPositions = Array.from({ length: numCups }, (_, i) => leftOffset + i * (cupSize + gap));
  // Shuffled final ordering
  const finalPositions = useMemo(() => {
    const arr = [...initialPositions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [numCups, initialPositions]);

  // Define animation variants that depend on each cup's final x-position
  const staticVariant = (finalX: number) => ({ x: finalX, y: initialY });
  const shuffleVariant = (initX: number, finalX: number) => ({
    x: [initX, initX + 20, initX - 20, initX + 40, initX - 40, initX + 10, initX - 10, finalX],
    y: initialY,
  });
  const liftVariant = (finalX: number) => ({ x: finalX, y: initialY - 150 });
  const previewVariant = (finalX: number) => ({
    x: finalX,
    y: [initialY, initialY - 150, initialY],
  });

  return (
    <div
      className="relative mx-auto"
      style={{ width: containerWidth, height: containerHeight, perspective: 1000 }}
    >
      {initialPositions.map((initX, index) => {
        const finalX = finalPositions[index];

        // Determine the proper animation based on phase:
        let animateProps;
        let transitionProps;
        if (previewPhase) {
          // In preview: only the winning cup animates a lift–drop; the others remain static.
          animateProps = index === winningCup ? previewVariant(finalX) : staticVariant(finalX);
          transitionProps = { duration: 1, ease: "easeInOut" };
        } else if (!animationFinished) {
          // During shuffle, animate all cups using a shuffle pattern.
          animateProps = shuffleVariant(initX, finalX);
          transitionProps = { duration: 5, ease: "easeInOut" };
        } else {
          // After shuffle (reveal phase):
          // If a cup was clicked OR (in a loss) we need to reveal the winning cup,
          // use the lift animation.
          const shouldLift = (selectedCup === index) || (showWinningCup && index === winningCup);
          animateProps = shouldLift ? liftVariant(finalX) : staticVariant(finalX);
          transitionProps = { duration: 0.5, ease: "easeOut" };
        }

        // Adjust z-index:
        // When a cup is lifted (in preview or reveal) we want it to drop behind the ball.
        const cupStyle = {
          width: cupSize,
          height: cupSize,
          zIndex:
            (previewPhase && index === winningCup) ||
            (animationFinished &&
              ((selectedCup === index && predeterminedWin) || (showWinningCup && index === winningCup)))
              ? 0
              : 1,
        };

        return (
          <motion.div
            key={index}
            className="absolute cursor-pointer"
            style={cupStyle}
            onClick={() => {
              if (!previewPhase && animationFinished && selectedCup === null) onCupClick(index);
            }}
            initial={{ x: initX, y: initialY }}
            animate={animateProps}
            transition={transitionProps}
          >
            <Image src="/kaspacupgamecup.webp" alt="Cup" width={cupSize} height={cupSize} />
          </motion.div>
        );
      })}
      {/* Render the ball image separately so it stays stationary.
          It is rendered when:
          - In preview phase (revealing behind the winning cup), or
          - In reveal phase when the winning cup is either selected (for a win)
            or needs to be revealed in case of loss.
      */}
      {winningCup !== null &&
        (previewPhase ||
          (animationFinished &&
            ((selectedCup === winningCup && predeterminedWin) || showWinningCup))) && (
          <div
            style={{
              position: "absolute",
              left: finalPositions[winningCup] + (cupSize - 300) / 2,
              top: initialY + (cupSize - 300) / 2,
              width: 300,
              height: 300,
              pointerEvents: "none",
              zIndex: 1, // Render above the lifted cup to appear revealed.
            }}
          >
            <Image src="/kaspacupgameball.webp" alt="Ball" width={300} height={300} />
          </div>
        )}
    </div>
  );
}

// ---------------------------------------------------------
// Cup Game Controls Component
// ---------------------------------------------------------
interface CupGameControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  multiplier: number;
  setMultiplier: (m: number) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  gameResult: string | null;
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
  gameResult,
  cooldown,
}: CupGameControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
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
          {/* Bet Amount Input */}
          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Bet Amount (KAS)</label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (isNaN(value)) value = MIN_BET;
                  value = Math.max(MIN_BET, Math.min(MAX_BET, value));
                  setBetAmount(value.toString());
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
                onClick={() => {
                  let current = Number(betAmount);
                  if (isNaN(current)) current = MIN_BET;
                  setBetAmount((current / 2).toString());
                }}
                disabled={isPlaying || !isWalletConnected}
              >
                ½
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => {
                  let current = Number(betAmount);
                  if (isNaN(current)) current = MIN_BET;
                  setBetAmount((current * 2).toString());
                }}
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
                onClick={() => setBetAmount(Math.min(MAX_BET, balance).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Multiplier Selection */}
          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Select Multiplier</label>
            <div className="flex gap-2">
              <Button
                variant={multiplier === 2 ? "default" : "outline"}
                onClick={() => setMultiplier(2)}
                disabled={isPlaying || !isWalletConnected}
              >
                2× (2 cups)
              </Button>
              <Button
                variant={multiplier === 3 ? "default" : "outline"}
                onClick={() => setMultiplier(3)}
                disabled={isPlaying || !isWalletConnected}
              >
                3× (3 cups)
              </Button>
            </div>
            <div className="mt-2">
              <Button
                variant={multiplier === 5 ? "default" : "outline"}
                onClick={() => setMultiplier(5)}
                disabled={isPlaying || !isWalletConnected}
                className="w-full"
              >
                5× (5 cups)
              </Button>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">Result: {gameResult}</div>
              </div>
            )}
            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleStartClick}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Start Game (${cooldown}s)`
                  : "Start Kaspa Cup Game"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                Game in Progress...
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
              <button onClick={() => setErrorMessage(null)} className="ml-4 font-bold text-white">
                X
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------
// Main Page Export
// ---------------------------------------------------------
export default function KaspaCupGamePage() {
  // States for controlling the phases
  const { isConnected, balance } = useWallet();
  const [pregame, setPregame] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("1");
  const [multiplier, setMultiplier] = useState<number>(2);
  const [previewPhase, setPreviewPhase] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [selectedCup, setSelectedCup] = useState<number | null>(null);
  const [winningCup, setWinningCup] = useState(0);
  const [predeterminedWin, setPredeterminedWin] = useState<boolean | null>(null);
  const [showWinningCup, setShowWinningCup] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winPopup, setWinPopup] = useState(false);
  const [losePopup, setLosePopup] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // ---------------------------------------------------------
  // Start Game: Determine outcome, trigger preview then shuffle.
  // ---------------------------------------------------------
  const handleStartGame = async () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }
    try {
      const uniqueHash = uuidv4();
      const accounts = await window.kasware.getAccounts();
      const currentWalletAddress = accounts[0];
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Determine outcome based on multiplier probability.
      const winProb = multiplier === 2 ? 0.45 : multiplier === 3 ? 0.25 : 0.12;
      const outcome = Math.random() < winProb;
      setPredeterminedWin(outcome);
      const winCup = Math.floor(Math.random() * multiplier);
      setWinningCup(winCup);

      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "Kaspa Cup Game",
        uniqueHash,
        walletAddress: currentWalletAddress,
        betAmount: bet,
        multiplier,
        txid: txidString,
      });
      if (startRes.data.success) {
        setGameId(startRes.data.gameId);
      } else {
        alert("Failed to start game on backend");
        return;
      }
      setIsPlaying(true);
      setPregame(false);
      setGameResult(null);
      setSelectedCup(null);
      setShowWinningCup(false);
      // Start with a 1-second preview (winning cup shows ball), then start a 5-second shuffle.
      setPreviewPhase(true);
      setTimeout(() => {
        setPreviewPhase(false);
      }, 1000);
      setTimeout(() => {
        setAnimationFinished(true);
      }, 6000); // total 6 seconds delay
    } catch (error: any) {
      console.error("Error starting Kaspa Cup Game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // ---------------------------------------------------------
  // Handle Cup Click: Reveal player's selection and, if losing, also reveal winning cup.
  // ---------------------------------------------------------
  const handleCupClick = (cupIndex: number) => {
    if (!animationFinished || selectedCup !== null) return;
    setSelectedCup(cupIndex);
    const bet = Number(betAmount);
    let playerWon = false;
    if (predeterminedWin) {
      playerWon = cupIndex === winningCup;
    } else {
      playerWon = cupIndex !== winningCup;
    }
    setTimeout(() => {
      if (playerWon) {
        setGameResult("You Win!");
        setWinPopup(true);
        axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: "win",
          winAmount: bet * multiplier,
        });
      } else {
        setGameResult("Game Over");
        setLosePopup(true);
        setShowWinningCup(true);
        axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: "lose",
          winAmount: 0,
        });
      }
      setIsPlaying(false);
    }, 1000);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setGameId(null);
    setDepositTxid(null);
    setPregame(true);
    setSelectedCup(null);
    setWinningCup(0);
    setPredeterminedWin(null);
    setShowWinningCup(false);
    setAnimationFinished(false);
    setPreviewPhase(false);
  };

  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown]);

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
          <motion.div className="flex items-center gap-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <XPDisplay />
            <WalletConnection />
          </motion.div>
        </header>

        {/* Deposit TXID */}
        {depositTxid && (
          <p className="mb-4 text-sm" style={{ color: "#B6B6B6" }}>
            Deposit TXID:{" "}
            <a
              className="txid-link"
              style={{ background: "linear-gradient(90deg, #B6B6B6, #49EACB)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              href={`https://kas.fyi/transaction/${depositTxid}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {depositTxid}
            </a>
          </p>
        )}

        <div className="grid grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Left Column: Game Container */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspa Cup Game</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={resetGame}>
                  Reset
                </Button>
              </div>
              {/* Pregame Screen */}
              {pregame ? (
                <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600 shadow-2xl bg-gradient-to-b from-[#002200] to-[#005500] bg-opacity-80">
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
                    <motion.h1
                      className="text-5xl font-bold mb-4"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#49EACB" }}
                    >
                      KASPA CUP GAME
                    </motion.h1>
                    <motion.p
                      className="text-xl tracking-wider mb-4"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "#49EACB" }}
                    >
                      Follow the ball and pick your cup!
                    </motion.p>
                    <div className="flex items-center space-x-4 mt-10">
                      <Image src="/kaspacupgamecup.webp" alt="Cup" width={250} height={250} />
                      <Image src="/kaspacupgameball.webp" alt="Ball" width={150} height={150} />
                    </div>
                    <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                      <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                        Place Your Bet &amp; Select Multiplier
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                // Game Board: Pass previewPhase and other props
                <CupGameBoard
                  numCups={multiplier}
                  selectedCup={selectedCup}
                  winningCup={winningCup}
                  predeterminedWin={predeterminedWin as boolean}
                  showWinningCup={showWinningCup}
                  animationFinished={animationFinished}
                  previewPhase={previewPhase}
                  onCupClick={handleCupClick}
                />
              )}
            </div>
          </Card>

          {/* Right Column: Bet Controls, LiveChat & LiveWins */}
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
              gameResult={gameResult}
              cooldown={cooldown}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* Animated Win Popup */}
      <AnimatePresence>
        {winPopup && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-[#49EACB] p-6 rounded-lg shadow-2xl text-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
              <p className="text-xl mb-6">You won {Number(betAmount) * multiplier} KAS!</p>
              <Button className="bg-black text-[#49EACB] hover:bg-black/80" onClick={() => { setWinPopup(false); resetGame(); }}>
                Reset Game
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Lose Popup */}
      <AnimatePresence>
        {losePopup && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-red-700 p-6 rounded-lg shadow-2xl text-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <h2 className="text-3xl font-bold mb-4">Game Over</h2>
              <p className="text-xl mb-6">You lost your bet.</p>
              <Button className="bg-black text-red-700 hover:bg-black/80" onClick={() => { setLosePopup(false); resetGame(); }}>
                Reset Game
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
