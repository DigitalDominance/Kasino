"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { Montserrat } from "next/font/google";
import { WalletConnection } from "@/components/wallet-connection";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { XPDisplay } from "@/app/page";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import "./styles.css";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

/* =============================================================================
   Main Page Component – KaspianCrossPage
   ============================================================================= */
export default function KaspianCrossPage() {
  return <KaspianCrossContent />;
}

/* =============================================================================
   KaspianCrossContent – Contains header, game area, controls, and footer.
   ============================================================================= */
function KaspianCrossContent() {
  // Wallet and game state
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  // API endpoints and treasury addresses (adjust as needed)
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // ---------------------------------------------------------------------------
  // handleStartGame
  // Validate bet & wallet, then call backend /game/start and initiate game play.
  // ---------------------------------------------------------------------------
  const handleStartGame = async () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
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
      // Randomly choose one treasury address
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      // Send deposit transaction (assumes kasware API is available)
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Start game via backend API
      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "Kaspian Cross",
        uniqueHash,
        walletAddress: currentWalletAddress,
        betAmount: bet,
        txid: txidString,
      });
      if (startRes.data.success) {
        setGameId(startRes.data.gameId);
      } else {
        alert("Failed to start game on backend");
        return;
      }
      setIsPlaying(true);
    } catch (error: any) {
      console.error("Error starting game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // ---------------------------------------------------------------------------
  // handleGameEnd
  // Called when game play is complete; notifies backend with result and win.
  // ---------------------------------------------------------------------------
  const handleGameEnd = async (result: string, winAmt: number) => {
    setGameResult(result);
    setWinAmount(winAmt);
    setIsPlaying(false);
    if (gameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: result === "You Win" ? "win" : "lose",
          winAmount: winAmt,
        });
      } catch (error) {
        console.error("Error ending game on backend:", error);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // resetGame
  // Clears current game state to allow for a new play.
  // ---------------------------------------------------------------------------
  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinAmount(null);
    setGameId(null);
    setDepositTxid(null);
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        {/* Header: Back link, XP display and wallet connection */}
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

        {/* Display deposit transaction ID if available */}
        {depositTxid && (
          <p className="mb-4 text-sm" style={{ color: "#B6B6B6" }}>
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

        {/* Main content: Game area + controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Game Card with the 3D scene */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">KASPian CROSS</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                  How to Play
                </Button>
              </div>
              <div className="relative h-[70vh] bg-gradient-to-b from-[#0D0D0D] to-black rounded-lg mb-6 overflow-hidden border border-gray-600 shadow-2xl p-0">
                {/* KaspianCrossGame integrates our ThreeJS scene and game logic */}
                <KaspianCrossGame isPlaying={isPlaying} onGameEnd={handleGameEnd} betAmount={Number(betAmount)} />
              </div>
            </div>
          </Card>

          {/* Right side controls: Bet inputs, live chat/wins */}
          <div className="space-y-6">
            <KaspianCrossControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              balance={balance}
              onStartGame={handleStartGame}
              resetGame={resetGame}
              gameResult={gameResult}
              winAmount={winAmount}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>

        {/* Promo / Info Card */}
        <Card className="mt-6 w-full bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #0D0D0D, #FF0000, #FF7373)",
              backgroundSize: "200% 200%",
            }}
          >
            KASPian CROSS
          </motion.h2>
          <img src="/kaspianpromo.png" alt="Kaspian Cross Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            KASPian CROSS is an electrifying casino experience where bold bets meet cutting-edge 3D visuals.
            Dive into the dynamic world of Kaspian Cross and experience the thrill of chance like never before!
          </p>
          <div className="flex justify-center space-x-4 text-xl">
            <motion.a
              href="https://x.com/KaspianCross"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              {/* Twitter Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0-4.97-4.03-9-9-9S3 7.03 3 12c0 4.42 2.86 8.16 6.84 8.88-.12-.75-.23-1.92.04-2.75.25-.82 1.62-5.29 1.62-5.29s-.41-.82-.41-2.04c0-1.91 1.11-3.33 2.5-3.33 1.18 0 1.75.88 1.75 1.94 0 1.18-.75 2.95-1.14 4.59-.32 1.39.69 2.53 2.05 2.53 2.46 0 4.34-2.59 4.34-6.33 0-3.31-2.39-5.78-5.81-5.78-3.96 0-6.29 2.97-6.29 6.05 0 1.2.46 2.5 1.04 3.21.11.13.13.25.1.39-.11.45-.36 1.39-.41 1.59-.07.25-.23.31-.53.19-1.98-.82-3.21-3.04-3.21-4.91 0-3.99 2.9-7.66 8.38-7.66 4.41 0 7.84 3.15 7.84 7.36 0 4.38-2.76 7.91-6.59 7.91-1.28 0-2.49-.66-2.9-1.43 0 0-.69 2.69-.86 3.25-.26.96-.96 2.16-1.44 2.89.99.31 2.05.48 3.15.48 7.97 0 14.42-6.44 14.42-14.34z"
                />
              </svg>
            </motion.a>
            <motion.a
              href="https://t.me/KaspianCross"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              {/* Telegram Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 4.99 2.88 9.293 6.839 11.084.5.091.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.152-1.11-1.459-1.11-1.459-.909-.62.069-.607.069-.607 1.003.07 1.532 1.03 1.532 1.03.893 1.531 2.341 1.089 2.91.833.091-.647.35-1.089.637-1.341-2.22-.254-4.555-1.114-4.555-4.953 0-1.092.39-1.984 1.03-2.684-.103-.253-.447-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.563 9.563 0 0112 5.803c.853.004 1.71.115 2.512.337 1.909-1.297 2.747-1.026 2.747-1.026.547 1.378.203 2.397.1 2.65.642.7 1.03 1.592 1.03 2.684 0 3.847-2.337 4.697-4.565 4.945.359.31.678.921.678 1.857 0 1.341-.012 2.421-.012 2.75 0 .268.18.579.688.481A10.004 10.004 0 0024 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </motion.a>
            <motion.a
              href="https://kaspiancross.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2 }}
              className="text-[#FF0000] hover:text-[#FF7373]"
            >
              {/* Globe Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </motion.a>
          </div>
        </Card>
      </div>

      <SiteFooter />

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play KASPian CROSS</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount and click "Spin KASPian CROSS" to play.</li>
              <li>The dynamic 3D scene will animate to reveal your fate based on your bet.</li>
              <li>
                Outcomes are determined fairly:
                <ul className="list-disc list-inside ml-4">
                  <li>40% chance to lose</li>
                  <li>40% chance for a modest win (1.5× payout)</li>
                  <li>20% chance for a big win (3× payout)</li>
                </ul>
              </li>
              <li>Winning amounts are calculated as bet × outcome multiplier.</li>
            </ol>
            <p className="mt-4 text-white">Good luck and may fortune favor you!</p>
            <Button onClick={() => setShowHowToPlay(false)} className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   KaspianCrossGame – Integrates ThreeJS scene with game logic.
   ============================================================================= */
interface KaspianCrossGameProps {
  isPlaying: boolean;
  onGameEnd: (result: string, winAmt: number) => void;
  betAmount: number;
}

function KaspianCrossGame({ isPlaying, onGameEnd, betAmount }: KaspianCrossGameProps) {
  // Local state to track the outcome multiplier and when the animation is complete.
  const [outcomeMultiplier, setOutcomeMultiplier] = useState<number | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      setAnimationComplete(false);
      // Determine outcome based on probability:
      // 40% lose (multiplier 0), 40% win modestly (1.5×), 20% win big (3×)
      const r = Math.random();
      let multiplier = 0;
      if (r < 0.4) {
        multiplier = 0;
      } else if (r < 0.8) {
        multiplier = 1.5;
      } else {
        multiplier = 3;
      }
      setOutcomeMultiplier(multiplier);

      // Simulate the game duration (e.g. 5 seconds)
      timer = setTimeout(() => {
        setAnimationComplete(true);
        const result = multiplier > 0 ? "You Win" : "House Wins";
        const winAmt = multiplier > 0 ? betAmount * multiplier : 0;
        onGameEnd(result, winAmt);
      }, 5000);
    }
    return () => timer && clearTimeout(timer);
  }, [isPlaying, betAmount, onGameEnd]);

  return (
    <div className="relative w-full h-full">
      {/* Render the ThreeJS scene as the game’s background */}
      <ThreeScene />
      {/* Optionally overlay a message when the outcome is determined */}
      {animationComplete && outcomeMultiplier !== null && outcomeMultiplier > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black bg-opacity-50 p-4 rounded">
            <h3 className="text-3xl font-bold text-[#49EACB]">
              {outcomeMultiplier === 1.5 ? "Modest Win!" : "Big Win!"}
            </h3>
          </div>
        </motion.div>
      )}
      {/* Display a preview overlay when not playing */}
      {(!isPlaying || !animationComplete) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.h1
            className="text-5xl font-bold text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #0D0D0D, #FF0000, #FF7373)",
              backgroundSize: "200% 200%",
            }}
          >
            KASPian CROSS
          </motion.h1>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   ThreeScene – A ThreeJS-powered component rendering a dynamic 3D scene.
   ============================================================================= */
function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Basic ThreeJS scene, camera and renderer initialization
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current!.clientWidth / mountRef.current!.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current!.clientWidth, mountRef.current!.clientHeight);
    mountRef.current!.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Create a dynamic 3D cross shape
    const crossGroup = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    // Vertical bar
    const verticalGeometry = new THREE.BoxGeometry(0.2, 1, 0.2);
    const verticalBar = new THREE.Mesh(verticalGeometry, material);
    crossGroup.add(verticalBar);

    // Horizontal bar
    const horizontalGeometry = new THREE.BoxGeometry(1, 0.2, 0.2);
    const horizontalBar = new THREE.Mesh(horizontalGeometry, material);
    crossGroup.add(horizontalBar);

    scene.add(crossGroup);

    // OrbitControls for interactive camera movement
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      // Rotate the cross group for a dynamic effect
      crossGroup.rotation.x += 0.01;
      crossGroup.rotation.y += 0.01;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}

/* =============================================================================
   KaspianCrossControls – Bet input, multiplier buttons, and game status.
   ============================================================================= */
interface KaspianCrossControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onStartGame: () => void;
  resetGame: () => void;
  gameResult: string | null;
  winAmount: number | null;
}

function KaspianCrossControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onStartGame,
  resetGame,
  gameResult,
  winAmount,
}: KaspianCrossControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Remove error message after a short delay
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Cooldown for the spin button
  useEffect(() => {
    if (cooldown > 0) {
      const intervalId = setInterval(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  const showError = (msg: string) => setErrorMessage(msg);

  const handleSpinGame = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet)) {
      showError("Invalid bet amount");
      return;
    }
    if (bet < 1 || bet > 1000) {
      showError("Bet must be between 1 & 1000");
      return;
    }
    if (bet > balance) {
      showError("Insufficient balance");
      return;
    }
    onStartGame();
    setCooldown(10);
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
                  let value = Number(e.target.value);
                  if (isNaN(value)) value = 1;
                  value = Math.max(1, Math.min(1000, value));
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
                  if (isNaN(current)) current = 1;
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
                  if (isNaN(current)) current = 1;
                  setBetAmount((current * 2).toString());
                }}
                disabled={isPlaying || !isWalletConnected}
              >
                2×
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount("1")}
                disabled={isPlaying || !isWalletConnected}
              >
                Min
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount(Math.min(1000, balance).toString())}
                disabled={isPlaying || !isWalletConnected}
              >
                Max
              </Button>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult !== null && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">
                  Result: {gameResult}
                </div>
                {winAmount !== null && winAmount > 0 ? (
                  <div className="text-xl text-green-500">
                    You won {winAmount.toFixed(8)} KAS!
                  </div>
                ) : (
                  <div className="text-xl text-red-500">You lost your bet.</div>
                )}
              </div>
            )}

            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleSpinGame}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Spin KASPian CROSS (${cooldown}s)`
                  : "Spin KASPian CROSS"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                Playing...
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
