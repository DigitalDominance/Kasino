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

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// -------------------------------
// Game Constants
// -------------------------------
const LANES = [-2, 0, 2]; // x positions for lanes
const SEGMENT_LENGTH = 5; // how far the chicken moves per safe crossing
const MAX_SEGMENTS = 10; // maximum number of segments

/* =============================================================================
   Main Page Component – KaspianCrossPage
============================================================================= */
export default function KaspianCrossPage() {
  return <KaspianCrossContent />;
}

/* =============================================================================
   KaspianCrossContent – Overall layout with header, game area and controls
============================================================================= */
function KaspianCrossContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  // API endpoints and treasury addresses
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // ---------------------------------------------------------------------------
  // Start Game – Validate bet and wallet, then start game via backend
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
      // Choose treasury address at random
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      // Send deposit transaction (assumes kasware API)
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Notify backend
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
      setGameResult(null);
      setWinAmount(null);
    } catch (error: any) {
      console.error("Error starting game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  // ---------------------------------------------------------------------------
  // End Game – Notify backend and update UI
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
  // Reset Game – Clear state for a new play
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

        {/* Main Game & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                {/* Notice the title now uses proper case */}
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspian Cross</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                  How to Play
                </Button>
              </div>
              <div className="relative h-[70vh] bg-gradient-to-b from-[#0D0D0D] to-black rounded-lg mb-6 overflow-hidden border border-gray-600 shadow-2xl p-0">
                {/* The game logic + 3D interactive scene */}
                <KaspianCrossGame isPlaying={isPlaying} onGameEnd={handleGameEnd} betAmount={Number(betAmount)} />
              </div>
            </div>
          </Card>

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
            Kaspian Cross
          </motion.h2>
          <img src="/kaspianpromo.png" alt="Kaspian Cross Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Kaspian Cross is an electrifying casino experience where bold bets meet cutting-edge 3D visuals.
            Help the chicken cross the busy street—each safe step increases your multiplier, but one wrong move ends it all!
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0-4.97-4.03-9-9-9S3 7.03 3 12c0 4.42 2.86 8.16 6.84 8.88-.12-.75-.23-1.92.04-2.75.25-.82 1.62-5.29 1.62-5.29s-.41-.82-.41-2.04c0-1.91 1.11-3.33 2.5-3.33 1.18 0 1.75.88 1.75 1.94 0 1.18-.75 2.95-1.14 4.59-.32 1.39.69 2.53 2.05 2.53 2.46 0 4.34-2.59 4.34-6.33 0-3.31-2.39-5.78-5.81-5.78-3.96 0-6.29 2.97-6.29 6.05 0 1.2.46 2.5 1.04 3.21.11.13.13.25.1.39-.11.45-.36 1.39-.41 1.59-.07.25-.23.31-.53.19-1.98-.82-3.21-3.04-3.21-4.91 0-3.99 2.9-7.66 8.38-7.66 4.41 0 7.84 3.15 7.84 7.36 0 4.38-2.76 7.91-6.59 7.91-1.28 0-2.49-.66-2.9-1.43 0 0-.69 2.69-.86 3.25-.26.96-.96 2.16-1.44 2.89.99.31 2.05.48 3.15.48 7.97 0 14.42-6.44 14.42-14.34z" />
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
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Kaspian Cross</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount and click "Spin Kaspian Cross" to play.</li>
              <li>Your chicken must cross a busy street—each segment is a choice between three lanes.</li>
              <li>
                In each segment, only one lane is safe. Pick the correct lane to advance and boost your multiplier.
              </li>
              <li>
                If you pick the wrong lane, a car will hit your chicken and the game ends.
              </li>
              <li>You can cash out at any time for your current multiplier.</li>
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
   KaspianCrossGame – Manages game state and interactions
============================================================================= */
interface KaspianCrossGameProps {
  isPlaying: boolean;
  onGameEnd: (result: string, winAmt: number) => void;
  betAmount: number;
}

function KaspianCrossGame({ isPlaying, onGameEnd, betAmount }: KaspianCrossGameProps) {
  // Game state: current segment count, safe lane, multiplier, game over flag, and animation flag
  const [currentSegment, setCurrentSegment] = useState(0);
  const [safeLane, setSafeLane] = useState<number>(Math.floor(Math.random() * LANES.length));
  const [multiplier, setMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [animating, setAnimating] = useState(false);

  // When the game starts, reset state
  useEffect(() => {
    if (isPlaying) {
      setCurrentSegment(0);
      setMultiplier(1);
      setGameOver(false);
      setAnimating(false);
      setSafeLane(Math.floor(Math.random() * LANES.length));
    }
  }, [isPlaying]);

  // Called when the user selects a lane in the Three.js scene
  const handleLaneChoice = (laneIndex: number) => {
    if (animating || gameOver) return;
    setAnimating(true);
    if (laneIndex === safeLane) {
      // Correct choice: increment segment and update multiplier
      const newSegment = currentSegment + 1;
      setCurrentSegment(newSegment);
      const newMultiplier = Number(Math.pow(1.1, newSegment).toFixed(2));
      setMultiplier(newMultiplier);
      // If maximum segments reached, auto cash out
      if (newSegment >= MAX_SEGMENTS) {
        setTimeout(() => {
          onGameEnd("You Win", betAmount * newMultiplier);
        }, 1000);
      } else {
        // Prepare next segment with a new safe lane
        setSafeLane(Math.floor(Math.random() * LANES.length));
      }
      setTimeout(() => {
        setAnimating(false);
      }, 1000);
    } else {
      // Wrong choice: trigger collision animation and end game
      setTimeout(() => {
        setGameOver(true);
        onGameEnd("House Wins", 0);
      }, 1000);
    }
  };

  // Allow the player to cash out manually between segments
  const cashOut = () => {
    if (animating || gameOver || currentSegment === 0) return;
    onGameEnd("You Win", betAmount * multiplier);
    setGameOver(true);
  };

  return (
    <div className="relative w-full h-full">
      <ThreeScene
        currentSegment={currentSegment}
        targetZ={currentSegment * SEGMENT_LENGTH}
        onLaneClick={handleLaneChoice}
        animating={animating}
        gameOver={gameOver}
      />
      {/* Display current multiplier */}
      <div className="absolute top-4 left-4 text-2xl font-bold text-[#49EACB]">
        Multiplier: {multiplier}x
      </div>
      {/* Cash Out button (shown once at least one safe crossing has occurred) */}
      {!gameOver && currentSegment > 0 && (
        <div className="absolute bottom-4 right-4">
          <Button onClick={cashOut} className="bg-[#49EACB] text-black">
            Cash Out
          </Button>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   ThreeScene – Renders the Three.js interactive scene
============================================================================= */
interface ThreeSceneProps {
  currentSegment: number;
  targetZ: number;
  onLaneClick: (laneIndex: number) => void;
  animating: boolean;
  gameOver: boolean;
}

function ThreeScene({ currentSegment, targetZ, onLaneClick, animating, gameOver }: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const chickenRef = useRef<THREE.Mesh>(null);
  const laneRefs = useRef<THREE.Mesh[]>([]);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const requestRef = useRef<number>();

  // Initialize scene, camera, renderer and objects
  useEffect(() => {
    const width = mountRef.current!.clientWidth;
    const height = mountRef.current!.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountRef.current!.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    // Create a road plane
    const roadGeometry = new THREE.PlaneGeometry(10, 100);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = 50;
    scene.add(road);

    // Create lane markers (3 lanes at x positions from LANES)
    laneRefs.current = [];
    LANES.forEach((x, index) => {
      const laneGeometry = new THREE.BoxGeometry(2, 0.1, 10);
      const laneMaterial = new THREE.MeshBasicMaterial({
        color: 0x49eacb,
        transparent: true,
        opacity: 0.5,
      });
      const laneMesh = new THREE.Mesh(laneGeometry, laneMaterial);
      laneMesh.position.set(x, 0.05, 5);
      laneMesh.userData = { laneIndex: index };
      scene.add(laneMesh);
      laneRefs.current.push(laneMesh);
    });

    // Create the chicken (a yellow box)
    const chickenGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const chickenMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const chicken = new THREE.Mesh(chickenGeometry, chickenMaterial);
    chicken.position.set(0, 0.25, 0);
    chickenRef.current = chicken;
    scene.add(chicken);

    // Set up OrbitControls (optional – remove if you want fixed camera)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Set up raycaster for lane clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(laneRefs.current);
      if (intersects.length > 0) {
        const laneIndex = intersects[0].object.userData.laneIndex;
        onLaneClick(laneIndex);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Animation loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      cancelAnimationFrame(requestRef.current!);
      mountRef.current!.removeChild(renderer.domElement);
    };
  }, [onLaneClick]);

  // Animate chicken moving forward when targetZ changes
  useEffect(() => {
    if (!chickenRef.current) return;
    const startZ = chickenRef.current.position.z;
    const endZ = targetZ;
    const duration = 1000;
    const startTime = performance.now();
    const animateChicken = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      if (chickenRef.current) {
        chickenRef.current.position.z = startZ + (endZ - startZ) * t;
      }
      if (t < 1) {
        requestAnimationFrame(animateChicken);
      }
    };
    requestAnimationFrame(animateChicken);
  }, [targetZ]);

  // On game over, trigger a collision animation (a red car coming in from the side)
  useEffect(() => {
    if (gameOver && chickenRef.current && sceneRef.current) {
      const carGeometry = new THREE.BoxGeometry(1, 0.5, 2);
      const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const car = new THREE.Mesh(carGeometry, carMaterial);
      // Spawn car at a position offset to the right of the chicken
      car.position.set(chickenRef.current.position.x + 5, 0.25, chickenRef.current.position.z);
      sceneRef.current.add(car);
      const duration = 1000;
      const startTime = performance.now();
      const animateCar = (time: number) => {
        const elapsed = time - startTime;
        const t = Math.min(elapsed / duration, 1);
        car.position.x = (chickenRef.current!.position.x + 5) - 5 * t;
        if (t < 1) {
          requestAnimationFrame(animateCar);
        } else {
          sceneRef.current!.remove(car);
        }
      };
      requestAnimationFrame(animateCar);
    }
  }, [gameOver]);

  return <div ref={mountRef} className="w-full h-full" />;
}

/* =============================================================================
   KaspianCrossControls – Bet input, multiplier buttons, and game status
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

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

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
                <div className="text-2xl font-bold text-[#49EACB]">Result: {gameResult}</div>
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
                {!isWalletConnected ? "Connect Wallet to Play" : cooldown > 0 ? `Spin Kaspian Cross (${cooldown}s)` : "Spin Kaspian Cross"}
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
