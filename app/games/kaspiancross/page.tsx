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

// Remove OrbitControls so camera is locked automatically
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// ------------------------------------------------------
// Constants & Config
// ------------------------------------------------------
const NUM_ROWS = 10; // total steps to cross
const TILES_PER_ROW = 3; // always 3 columns
const TILE_SPACING_X = 3; // horizontal gap between columns
const TILE_SPACING_Z = -3; // negative Z moves “forward” in our scene
const BASE_MULTIPLIER = 1.1; // each successful step multiplies bet by 1.1^row
const ROAD_LENGTH = 40; // length of the central road plane
const SIDE_GRASS_WIDTH = 4; // each side's grass plane width

// ------------------------------------------------------
// Main Page
// ------------------------------------------------------
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

  // Example API config
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // -------------------------------------------------------------------------
  // Start Game
  // -------------------------------------------------------------------------
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
      // Randomly pick treasury
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      // Send deposit
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Start on backend
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
      // Reset local state
      setIsPlaying(true);
      setGameResult(null);
      setWinAmount(null);
    } catch (err: any) {
      console.error("Error starting game:", err);
      alert("Error starting game: " + err.message);
    }
  };

  // -------------------------------------------------------------------------
  // End Game
  // -------------------------------------------------------------------------
  const handleGameEnd = async (result: string, amount: number) => {
    setGameResult(result);
    setWinAmount(amount);
    setIsPlaying(false);

    if (gameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: result === "You Win" ? "win" : "lose",
          winAmount: amount,
        });
      } catch (error) {
        console.error("Error ending game on backend:", error);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Reset Game
  // -------------------------------------------------------------------------
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

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Game area */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspian Cross</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                  How to Play
                </Button>
              </div>
              <div className="relative h-[70vh] bg-gradient-to-b from-[#002400] to-black rounded-lg mb-6 overflow-hidden border border-gray-600 shadow-2xl p-0">
                {/* The 3D game + pre-game overlay */}
                <KaspianCrossGame
                  isPlaying={isPlaying}
                  betAmount={Number(betAmount)}
                  onGameEnd={handleGameEnd}
                />
              </div>
            </div>
          </Card>

          {/* Right column: controls + chat/wins */}
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

        {/* Promo Card */}
        <Card className="mt-6 w-full bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
          <motion.h2
            className="text-4xl font-bold mb-4 text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage: "linear-gradient(270deg, #0D0D0D, #00FF00, #49EACB)",
              backgroundSize: "200% 200%",
            }}
          >
            Kaspian Cross
          </motion.h2>
          <img src="/kaspianpromo.png" alt="Kaspian Cross Promo" className="w-full h-auto mb-4" />
          <p className="text-sm text-white mb-4">
            Kaspian Cross is an electrifying casino experience where bold bets meet immersive 3D visuals.
            Guide our fearless traveler across the busy street—each safe step raises your multiplier, but
            one wrong move and you’re toast!
          </p>
        </Card>
      </div>
      <SiteFooter />

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Kaspian Cross</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet and press “Spin Kaspian Cross” to begin.</li>
              <li>
                You’ll see 3 tiles (lanes) per row. Only one tile is safe. Click a tile to move there.
              </li>
              <li>
                If you pick correctly, your traveler moves forward and your multiplier grows (1.1× each step).
              </li>
              <li>
                If you pick the wrong tile, a car collision ends the game and you lose your bet.
              </li>
              <li>
                You can **Cash Out** after any successful step to secure your current multiplier.
              </li>
            </ol>
            <Button
              onClick={() => setShowHowToPlay(false)}
              className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
            >
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------
// KaspianCrossGame – 3D logic
// ------------------------------------------------------
interface KaspianCrossGameProps {
  isPlaying: boolean;
  betAmount: number;
  onGameEnd: (result: string, amount: number) => void;
}

function KaspianCrossGame({ isPlaying, betAmount, onGameEnd }: KaspianCrossGameProps) {
  // Row-based approach
  // Each row has exactly 1 safe tile
  const [rows, setRows] = useState<number[]>(() =>
    Array.from({ length: NUM_ROWS }, () => Math.floor(Math.random() * TILES_PER_ROW))
  );
  // Current row index
  const [currentRow, setCurrentRow] = useState(0);
  // Has the game ended?
  const [gameOver, setGameOver] = useState(false);
  // Has the user advanced at least 1 row? (for enabling Cash Out)
  const [hasAdvanced, setHasAdvanced] = useState(false);

  // Character position states
  const [charXIndex, setCharXIndex] = useState<number>(1); // start in middle tile
  const [charZIndex, setCharZIndex] = useState<number>(-1); // start behind row 0

  // Multiplier
  const [multiplier, setMultiplier] = useState(1);

  // On game start, reset
  useEffect(() => {
    if (isPlaying) {
      setRows(Array.from({ length: NUM_ROWS }, () => Math.floor(Math.random() * TILES_PER_ROW)));
      setCurrentRow(0);
      setCharXIndex(1);
      setCharZIndex(-1);
      setMultiplier(1);
      setGameOver(false);
      setHasAdvanced(false);
    }
  }, [isPlaying]);

  // Move to tile (row, tileIndex)
  const pickTile = (rowIndex: number, tileIndex: number) => {
    if (gameOver || rowIndex !== currentRow) return; // only pick on current row
    // Check if tileIndex matches safe tile
    const safeIndex = rows[rowIndex];
    if (tileIndex === safeIndex) {
      // correct pick
      const newRow = currentRow + 1;
      const newMultiplier = Math.pow(BASE_MULTIPLIER, newRow);
      setMultiplier(Number(newMultiplier.toFixed(2)));
      setHasAdvanced(true);

      // move character to this tile
      setCharXIndex(tileIndex);
      setCharZIndex(rowIndex);

      if (newRow >= NUM_ROWS) {
        // Auto-win if we reached the final row
        setTimeout(() => {
          onGameEnd("You Win", betAmount * newMultiplier);
          setGameOver(true);
        }, 600);
      } else {
        // go to next row
        setCurrentRow(newRow);
      }
    } else {
      // wrong pick => collision
      setCharXIndex(tileIndex);
      setCharZIndex(rowIndex);
      setTimeout(() => {
        setGameOver(true);
        onGameEnd("House Wins", 0);
      }, 600);
    }
  };

  // Cash out
  const cashOut = () => {
    if (!hasAdvanced || gameOver) return;
    const payout = betAmount * multiplier;
    onGameEnd("You Win", payout);
    setGameOver(true);
  };

  return (
    <div className="w-full h-full relative">
      {/* If not playing, show a pre-game overlay with instructions */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 p-4">
          <h1 className="text-3xl mb-4 text-[#49EACB] font-bold">Get Ready to Cross!</h1>
          <p className="text-sm mb-2 text-white">Place your bet and click “Spin Kaspian Cross” to start.</p>
          <Image src="/crosspreview.png" alt="Preview" width={180} height={100} />
        </div>
      )}
      {/* The 3D scene */}
      <CrossScene
        currentRow={currentRow}
        charXIndex={charXIndex}
        charZIndex={charZIndex}
        rows={rows}
        pickTile={pickTile}
        gameOver={gameOver}
      />
      {/* Multiplier display & Cash Out button */}
      {isPlaying && !gameOver && (
        <>
          <div className="absolute top-4 left-4 text-xl font-bold text-lime-300">
            Multiplier: {multiplier}×
          </div>
          {hasAdvanced && (
            <div className="absolute bottom-4 right-4">
              <Button onClick={cashOut} className="bg-lime-400 text-black hover:bg-lime-300">
                Cash Out
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------
// CrossScene – The Three.js scene
// ------------------------------------------------------
interface CrossSceneProps {
  currentRow: number;
  charXIndex: number;
  charZIndex: number; // which row the character is standing on
  rows: number[]; // each row’s safe tile index
  pickTile: (rowIndex: number, tileIndex: number) => void;
  gameOver: boolean;
}

function CrossScene({
  currentRow,
  charXIndex,
  charZIndex,
  rows,
  pickTile,
  gameOver,
}: CrossSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const characterRef = useRef<THREE.Mesh>(null);
  const tileMeshesRef = useRef<THREE.Mesh[]>([]);
  const requestRef = useRef<number>();

  // Setup the scene
  useEffect(() => {
    const width = mountRef.current!.clientWidth;
    const height = mountRef.current!.clientHeight;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x002000);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 10, 12);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountRef.current!.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Add a directional light for shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Road plane
    const roadGeom = new THREE.PlaneGeometry(ROAD_LENGTH, NUM_ROWS * Math.abs(TILE_SPACING_Z) + 10);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -(NUM_ROWS * Math.abs(TILE_SPACING_Z)) / 2;
    scene.add(road);

    // Grass on left
    const grassGeom = new THREE.PlaneGeometry(SIDE_GRASS_WIDTH, roadGeom.parameters.height);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x003300 });
    const grassLeft = new THREE.Mesh(grassGeom, grassMat);
    grassLeft.rotation.x = -Math.PI / 2;
    grassLeft.position.set(-ROAD_LENGTH / 2 - SIDE_GRASS_WIDTH / 2, 0, road.position.z);
    scene.add(grassLeft);

    // Grass on right
    const grassRight = new THREE.Mesh(grassGeom, grassMat);
    grassRight.rotation.x = -Math.PI / 2;
    grassRight.position.set(ROAD_LENGTH / 2 + SIDE_GRASS_WIDTH / 2, 0, road.position.z);
    scene.add(grassRight);

    // Create all row tiles (for 10 rows, each with 3 columns)
    tileMeshesRef.current = [];
    for (let row = 0; row < NUM_ROWS; row++) {
      for (let col = 0; col < TILES_PER_ROW; col++) {
        const tileGeom = new THREE.BoxGeometry(2.5, 0.1, 2.5);
        const tileMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
        });
        const tileMesh = new THREE.Mesh(tileGeom, tileMat);
        const xPos = (col - 1) * TILE_SPACING_X;
        const zPos = row * TILE_SPACING_Z;
        tileMesh.position.set(xPos, 0.05, zPos);
        tileMesh.userData = { rowIndex: row, tileIndex: col };
        scene.add(tileMesh);
        tileMeshesRef.current.push(tileMesh);
      }
    }

    // Character: a greenish “human”
    const charGeom = new THREE.BoxGeometry(0.8, 1.6, 0.5);
    const charMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const character = new THREE.Mesh(charGeom, charMat);
    character.position.set(0, 0.8, 1.5); // start behind row 0
    characterRef.current = character;
    scene.add(character);

    // Click detection: raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(tileMeshesRef.current, false);
      if (intersects.length > 0) {
        const { rowIndex, tileIndex } = intersects[0].object.userData;
        pickTile(rowIndex, tileIndex);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Animation loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      // Keep camera behind and above the character
      if (characterRef.current) {
        const { x, z } = characterRef.current.position;
        // Smooth camera follow
        camera.position.x += (x - camera.position.x) * 0.05;
        camera.position.z += (z + 12 - camera.position.z) * 0.05; // behind the character
        camera.lookAt(x, 0.8, z);
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      cancelAnimationFrame(requestRef.current!);
      if (renderer) {
        mountRef.current?.removeChild(renderer.domElement);
      }
    };
  }, [pickTile]);

  // Each time charXIndex or charZIndex changes, move character
  useEffect(() => {
    if (!characterRef.current) return;
    // Move the character to the correct tile
    const newX = (charXIndex - 1) * TILE_SPACING_X;
    const newZ = charZIndex * TILE_SPACING_Z;
    // Animate from old position to new
    const startX = characterRef.current.position.x;
    const startZ = characterRef.current.position.z;
    const duration = 400;
    const startTime = performance.now();

    const animateMove = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      characterRef.current!.position.x = startX + (newX - startX) * t;
      characterRef.current!.position.z = startZ + (newZ - startZ) * t;
      if (t < 1) requestAnimationFrame(animateMove);
    };
    requestAnimationFrame(animateMove);
  }, [charXIndex, charZIndex]);

  // If gameOver, spawn a car to collide
  useEffect(() => {
    if (gameOver && characterRef.current && sceneRef.current) {
      // “Realistic” car geometry
      const carGeom = new THREE.BoxGeometry(1.5, 0.6, 3);
      const carMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const car = new THREE.Mesh(carGeom, carMat);
      const { x, z } = characterRef.current.position;
      // spawn from right side
      car.position.set(x + 5, 0.3, z);
      sceneRef.current.add(car);

      // animate in 600ms
      const startTime = performance.now();
      const duration = 600;
      const animateCar = (time: number) => {
        const elapsed = time - startTime;
        const t = Math.min(elapsed / duration, 1);
        car.position.x = x + 5 - 5 * t;
        if (t < 1) {
          requestAnimationFrame(animateCar);
        } else {
          // remove car
          sceneRef.current!.remove(car);
        }
      };
      requestAnimationFrame(animateCar);
    }
  }, [gameOver]);

  return <div ref={mountRef} className="w-full h-full" />;
}

// ------------------------------------------------------
// Controls
// ------------------------------------------------------
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
                  <div className="text-xl text-green-400">
                    You won {winAmount.toFixed(8)} KAS!
                  </div>
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
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                disabled
              >
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
