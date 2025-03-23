"use client";
import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls, Html } from "@react-three/drei";
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
import * as THREE from 'three';
import BatchedMesh from 'three/src/objects/BatchedMesh.js';
(THREE as any).BatchedMesh = BatchedMesh;

// ---------------------------------------------------------------------------
// Constants & Fonts
// ---------------------------------------------------------------------------
const REAL_LANES = 30;
const TOTAL_LANES = REAL_LANES + 1;
const ROAD_WIDTH = 40;
const LANE_HEIGHT = ROAD_WIDTH / 4; // 10
const TILE_SPACING_Z = -LANE_HEIGHT;
const BASE_MULTIPLIER = 1.1;
const SAFE_PROBABILITY = 0.7;
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// ---------------------------------------------------------------------------
// MultiLaneHighwayScene using react-three-fiber & drei
// ---------------------------------------------------------------------------
export function MultiLaneHighwayScene({
  currentLane,
  gameOver,
  pendingUnsafe,
  pickRow,
  onCarCollision,
  onUnsafeLaneReached,
}: {
  currentLane: number;
  gameOver: boolean;
  pendingUnsafe: number | null;
  pickRow: (laneIndex: number) => void;
  onCarCollision: () => void;
  onUnsafeLaneReached: () => void;
}) {
  return (
    <Canvas style={{ width: "100%", height: "100%" }}>
      <Scene
        currentLane={currentLane}
        gameOver={gameOver}
        pendingUnsafe={pendingUnsafe}
        pickRow={pickRow}
        onCarCollision={onCarCollision}
        onUnsafeLaneReached={onUnsafeLaneReached}
      />
    </Canvas>
  );
}

function Scene({
  currentLane,
  gameOver,
  pendingUnsafe,
  pickRow,
  onCarCollision,
  onUnsafeLaneReached,
}: {
  currentLane: number;
  gameOver: boolean;
  pendingUnsafe: number | null;
  pickRow: (laneIndex: number) => void;
  onCarCollision: () => void;
  onUnsafeLaneReached: () => void;
}) {
  // We'll simulate movement by updating a "target" lane.
  const [isWalking, setIsWalking] = useState(false);
  const [targetLane, setTargetLane] = useState(currentLane);
  const [carTriggered, setCarTriggered] = useState(false);

  // When the currentLane prop changes, start a “walking” transition.
  useEffect(() => {
    if (currentLane !== targetLane) {
      setIsWalking(true);
      setTargetLane(currentLane);
      const timeout = setTimeout(() => {
        setIsWalking(false);
        if (pendingUnsafe === currentLane) {
          onUnsafeLaneReached();
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentLane, pendingUnsafe, onUnsafeLaneReached, targetLane]);

  // Create tiles for each lane (center lane only for simplicity)
  const tiles = [];
  for (let i = 0; i < TOTAL_LANES; i++) {
    tiles.push(
      <mesh key={`tile-${i}`} position={[0, 0.05, i * TILE_SPACING_Z]}>
        <boxGeometry args={[4, 0.1, 4]} />
        <meshStandardMaterial color="white" transparent opacity={0.9} />
        <Html center>
          <div style={{ color: "black", fontSize: "20px", fontWeight: "bold" }}>
            {(Math.pow(BASE_MULTIPLIER, i)).toFixed(2)}x
          </div>
        </Html>
      </mesh>
    );
  }

  return (
    <>
      {/* Basic lights */}
      <ambientLight intensity={0.8} />
      <directionalLight intensity={0.5} position={[10, 20, 10]} />
      <pointLight intensity={0.4} position={[-5, 10, 5]} color="#49eacb" />
      {/* Render the highway tiles */}
      <group>{tiles}</group>
      {/* Render the character */}
      <Character position={[0, 1.8, targetLane * TILE_SPACING_Z]} isWalking={isWalking} />
      {/* If game over, show a car animation (only once) */}
      {gameOver && !carTriggered && (
        <Car
          laneZ={currentLane * TILE_SPACING_Z}
          onCollision={() => {
            setCarTriggered(true);
            onCarCollision();
          }}
        />
      )}
      <OrbitControls />
    </>
  );
}

const Character = React.forwardRef(
  (
    { position, isWalking }: { position: [number, number, number]; isWalking: boolean },
    ref
  ) => {
    // Load the character model and animations
    const { scene, animations } = useGLTF("/kaspacrosscharacter.glb");
    const { actions } = useAnimations(animations, scene);

    useEffect(() => {
      if (isWalking) {
        // Assumes your walking animation is named "Walk"
        actions.Walk?.reset().play();
      } else {
        actions.Walk?.stop();
      }
    }, [isWalking, actions]);

    return (
      <primitive
        ref={ref}
        object={scene}
        position={position}
        scale={[2, 2, 2]}
        rotation={[0, Math.PI, 0]}
      />
    );
  }
);

function Car({ laneZ, onCollision }: { laneZ: number; onCollision: () => void }) {
  const { scene } = useGLTF("/kaspacrosscar.glb");
  const carRef = useRef<THREE.Group>();
  // Scale car on load
  useEffect(() => {
    if (carRef.current) {
      carRef.current.scale.set(3 * 1.75, 3 * 1.75, 3 * 1.75);
    }
  }, []);
  // Animate car movement
  useFrame((state, delta) => {
    if (carRef.current) {
      carRef.current.position.x += delta * 5; // Adjust speed as needed
      if (carRef.current.position.x > 10) {
        onCollision();
      }
    }
  });
  return (
    <primitive
      ref={carRef}
      object={scene}
      position={[-10, 1, laneZ]}
      rotation={[0, Math.PI / 2, 0]}
    />
  );
}

useGLTF.preload("/kaspacrosscharacter.glb");
useGLTF.preload("/kaspacrosscar.glb");

// ---------------------------------------------------------------------------
// Main Page & Other UI Components (unchanged)
// ---------------------------------------------------------------------------
export default function KaspianCrossPage() {
  return <KaspianCrossContent />;
}

function KaspianCrossContent() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

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
      const chosenTreasury =
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      const depositTx = await window.kasware.sendKaspa(
        chosenTreasury,
        bet * 1e8,
        { priorityFee: 10000 }
      );
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);
      const startRes = await axios.post(
        `${process.env.API_URL ||
          "https://kasino-backend-4818b4b69870.herokuapp.com/api"}/game/start`,
        {
          gameName: "Kaspian Cross",
          uniqueHash,
          walletAddress: currentWalletAddress,
          betAmount: bet,
          txid: txidString,
        }
      );
      if (startRes.data.success) {
        setGameId(startRes.data.gameId);
      } else {
        alert("Failed to start game on backend");
        return;
      }
      setIsPlaying(true);
      setGameResult(null);
      setWinAmount(null);
    } catch (err: any) {
      console.error("Error starting game:", err);
      alert("Error starting game: " + err.message);
    }
  };

  const handleGameEnd = async (result: string, amount: number) => {
    setGameResult(result);
    setWinAmount(amount);
    setIsPlaying(false);
    if (gameId) {
      try {
        await axios.post(
          `${process.env.API_URL ||
            "https://kasino-backend-4818b4b69870.herokuapp.com/api"}/game/end`,
          {
            gameId,
            result: result === "You Win" ? "win" : "lose",
            winAmount: amount,
          }
        );
      } catch (error) {
        console.error("Error ending game on backend:", error);
      }
    }
  };

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
            <a className="txid-link" style={{ background: "linear-gradient(90deg, #B6B6B6, #49EACB)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} href={`https://kas.fyi/transaction/${depositTxid}`} target="_blank" rel="noopener noreferrer">
              {depositTxid}
            </a>
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspian Cross</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                  How to Play
                </Button>
              </div>
              <div className="relative h-[70vh] bg-gradient-to-b from-black to-[#002400] rounded-lg mb-6 overflow-hidden border border-gray-600 shadow-2xl p-0">
                <MultiLaneHighwayScene
                  currentLane={0}
                  gameOver={!isPlaying}
                  pendingUnsafe={null}
                  pickRow={() => {}}
                  onCarCollision={handleGameEnd}
                  onUnsafeLaneReached={() => {}}
                />
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
        <Card className="mt-6 w-full bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text" animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }} style={{ backgroundImage: "linear-gradient(270deg, #0D0D0D, #00FF00, #49EACB)", backgroundSize: "200% 200%" }}>
            Kaspian Cross
          </motion.h2>
          <img src="/kaspianpromo.png" alt="Kaspian Cross Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Kaspian Cross is an electrifying casino experience where bold bets meet immersive 3D visuals. Guide our fearless traveler across a multi-lane highway—each safe step raises your multiplier, but one wrong move and you’re toast!
          </p>
        </Card>
      </div>
      <SiteFooter />
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Kaspian Cross</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet and press “Spin Kaspian Cross” to begin.</li>
              <li>Lane 0 is a non-clickable “starting road.” Lanes 1–{REAL_LANES} each have a safe tile (70% chance).</li>
              <li>Click the <strong>next lane</strong> (current lane + 1). Each success raises your multiplier by 1.1×.</li>
              <li>If the tile isn’t safe, a car collision ends the game—after you reach the tile, the car comes in.</li>
              <li>You can <strong>Cash Out</strong> any time after a successful step to lock in your winnings.</li>
            </ol>
            <Button onClick={() => setShowHowToPlay(false)} className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
      showError("Please connect your wallet first.");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet) || bet < 1 || bet > 1000) {
      showError("Bet must be between 1 and 1000.");
      return;
    }
    if (bet > balance) {
      showError("Insufficient balance.");
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
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  val = Math.max(1, Math.min(1000, val));
                  setBetAmount(val.toString());
                }}
                className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8 w-full"
                placeholder="0"
                disabled={isPlaying || !isWalletConnected}
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
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
                  <div className="text-xl text-green-400">You won {winAmount.toFixed(8)} KAS!</div>
                ) : (
                  <div className="text-xl text-red-400">You lost your bet.</div>
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
                  ? `Spin Kaspian Cross (${cooldown}s)`
                  : "Spin Kaspian Cross"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black" disabled>
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
            className="fixed bottom-4 left-4 bg-gradient-to-r from-red-700 to-black text-white px-4 py-2 rounded shadow-lg z-50"
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
