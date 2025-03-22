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
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/**
 * We now define 11 total lanes:
 *   lane 0: extra road in front (not clickable, no multiplier)
 *   lanes 1..10: the actual clickable lanes with multipliers
 */
const REAL_LANES = 10;        // The actual playable lanes
const TOTAL_LANES = REAL_LANES + 1; // 11 total, including lane 0

// The ratio of your road image is 4:1 (1000×250), so we set the width to 40, each lane’s height to 10
const ROAD_WIDTH = 40;
const LANE_HEIGHT = ROAD_WIDTH / 4; // 10
const ROAD_HEIGHT = TOTAL_LANES * LANE_HEIGHT; // 11 lanes × 10 = 110

// The tile spacing in Z is –LANE_HEIGHT = –10
const TILE_SPACING_Z = -LANE_HEIGHT;

const BASE_MULTIPLIER = 1.1;   // each safe step multiplies by 1.1^(laneIndex)
const SAFE_PROBABILITY = 0.7;  // 70% chance each lane (except 0) is safe
const COLLISION_POPUP_DELAY = 2000; // 2s delay for game-over popup

// ---------------------------------------------------------------------------
// Main Page
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

  // Example backend config
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Start Game
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
    } catch (err: any) {
      console.error("Error starting game:", err);
      alert("Error starting game: " + err.message);
    }
  };

  // End Game
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

  // Reset Game
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
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Kaspian Cross</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#49EACB]"
                  onClick={() => setShowHowToPlay(true)}
                >
                  How to Play
                </Button>
              </div>
              <div className="relative h-[70vh] bg-gradient-to-b from-black to-[#002400] rounded-lg mb-6 overflow-hidden border border-gray-600 shadow-2xl p-0">
                <KaspianCrossGame
                  isPlaying={isPlaying}
                  betAmount={Number(betAmount)}
                  onGameEnd={handleGameEnd}
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
            Guide our fearless traveler across a multi-lane highway—each safe step raises your multiplier,
            but one wrong move and you’re toast!
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
              <li>
                Lane 0 is a non-clickable “starting road.” Lanes 1–10 each have a safe tile (70% chance).
              </li>
              <li>
                Click the safe tile to attempt crossing to the next lane. Each success raises your multiplier (1.1×).
              </li>
              <li>
                If the tile isn’t safe, a car collision ends the game and you lose your bet.
              </li>
              <li>
                You can <strong>Cash Out</strong> after any successful step to secure your current multiplier.
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

// ---------------------------------------------------------------------------
// KaspianCrossGame
// – 11 total lanes: lane 0 is a non-clickable starting road, lanes 1..10 are playable
// ---------------------------------------------------------------------------
interface KaspianCrossGameProps {
  isPlaying: boolean;
  betAmount: number;
  onGameEnd: (result: string, amount: number) => void;
}

function KaspianCrossGame({ isPlaying, betAmount, onGameEnd }: KaspianCrossGameProps) {
  /**
   * We create an array of length (REAL_LANES+1) = 11 for safe states:
   *   index 0 => false (non-clickable lane 0)
   *   indexes 1..10 => random safe or not
   */
  const [safeStates, setSafeStates] = useState<boolean[]>(() => {
    const arr = Array(TOTAL_LANES).fill(false);
    // lane 0 => false (non-clickable)
    // lane 1..10 => random
    for (let i = 1; i <= REAL_LANES; i++) {
      arr[i] = Math.random() < SAFE_PROBABILITY;
    }
    return arr;
  });

  // currentLane: which lane index the character is physically on (0..10)
  //   0 => the extra road in front
  //   1..10 => actual safe tiles
  // If currentLane > 10 => we crossed everything => auto-win
  const [currentLane, setCurrentLane] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  // Popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  // On game start, reset
  useEffect(() => {
    if (isPlaying) {
      const newArr = Array(TOTAL_LANES).fill(false);
      for (let i = 1; i <= REAL_LANES; i++) {
        newArr[i] = Math.random() < SAFE_PROBABILITY;
      }
      setSafeStates(newArr);
      setCurrentLane(0);
      setMultiplier(1);
      setGameOver(false);
      setHasAdvanced(false);
      setPopupVisible(false);
      setPopupMessage("");
    }
  }, [isPlaying]);

  // Called when a lane is clicked
  const pickRow = (laneIndex: number) => {
    if (gameOver) return;
    // Must match our currentLane
    if (laneIndex !== currentLane) return;
    // Must not be lane 0
    if (laneIndex === 0) return;

    const isSafe = safeStates[laneIndex];
    if (isSafe) {
      // Move on to the next lane
      const nextLane = laneIndex + 1;
      const newMultiplier = Math.pow(BASE_MULTIPLIER, laneIndex); // lane 1 => 1.1, lane 2 => 1.1^2, etc.
      setMultiplier(Number(newMultiplier.toFixed(2)));
      setHasAdvanced(true);

      if (nextLane > REAL_LANES) {
        // Reached beyond lane 10 => auto-win
        setTimeout(() => handleWin(newMultiplier), 600);
      } else {
        setCurrentLane(nextLane);
      }
    } else {
      // Not safe => collision => lose
      setTimeout(() => handleLose(), COLLISION_POPUP_DELAY);
    }
  };

  // Cash Out
  const cashOut = () => {
    if (!hasAdvanced || gameOver) return;
    handleWin(multiplier);
  };

  // Win
  const handleWin = (finalMult: number) => {
    setGameOver(true);
    const payout = betAmount * finalMult;
    onGameEnd("You Win", payout);
    showPopup(`Congratulations! You won ${payout.toFixed(2)} KAS!`);
  };

  // Lose
  const handleLose = () => {
    setGameOver(true);
    onGameEnd("House Wins", 0);
    showPopup(`You got hit by a car! Better luck next time.`);
  };

  // Show popup
  const showPopup = (message: string) => {
    setPopupMessage(message);
    setPopupVisible(true);
  };

  // Hide popup
  const hidePopup = () => {
    setPopupVisible(false);
    setPopupMessage("");
  };

  return (
    <div className="w-full h-full relative">
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 p-4">
          <h1 className="text-3xl mb-4 text-[#49EACB] font-bold">Get Ready to Cross!</h1>
          <p className="text-sm mb-2 text-white">Place your bet and click “Spin Kaspian Cross” to start.</p>
          <Image src="/crosspreview.png" alt="Preview" width={180} height={100} />
        </div>
      )}

      <MultiLaneHighwayScene
        currentLane={currentLane}
        pickRow={pickRow}
        gameOver={gameOver}
      />

      {isPlaying && !gameOver && (
        <>
          <div className="absolute top-6 left-6 bg-black/60 px-4 py-2 rounded-md shadow-md">
            <div className="text-2xl font-extrabold tracking-wider" style={{ color: "#39FF14" }}>
              {multiplier.toFixed(2)}×
            </div>
            <div className="text-sm text-white opacity-80">Current Multiplier</div>
          </div>

          {hasAdvanced && (
            <motion.div
              className="absolute bottom-6 right-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Button
                onClick={cashOut}
                style={{ backgroundColor: "#39FF14", color: "black" }}
                className="font-bold px-6 py-3 text-xl hover:opacity-90"
              >
                Cash Out
              </Button>
            </motion.div>
          )}
        </>
      )}

      <AnimatePresence>
        {popupVisible && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#49EACB] p-6 rounded-lg shadow-2xl text-black max-w-sm text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2 className="text-2xl font-bold mb-4">Game Over</h2>
              <p className="mb-4">{popupMessage}</p>
              <Button onClick={hidePopup} className="bg-black text-[#49EACB] w-full hover:bg-[#333]">
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MultiLaneHighwayScene
// – We have 11 lanes total. Lane 0 is a non-clickable extra road.
//   The user physically starts on lane 0 at z=0, or you can define
//   a separate negative-lane if you prefer a bigger lead-up.
// ---------------------------------------------------------------------------
interface MultiLaneHighwaySceneProps {
  currentLane: number;               // 0..10
  pickRow: (laneIndex: number) => void;
  gameOver: boolean;
}

function MultiLaneHighwayScene({
  currentLane,
  pickRow,
  gameOver,
}: MultiLaneHighwaySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const characterRef = useRef<THREE.Group | null>(null);
  const tileRefs = useRef<THREE.Mesh[]>([]);
  const requestRef = useRef<number>();
  const carModelRef = useRef<THREE.Group | null>(null);

  // Build the scene
  useEffect(() => {
    const width = mountRef.current!.clientWidth;
    const height = mountRef.current!.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // More top-down, zoomed in camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 16, 2); // higher Y=16, smaller Z=2 => more top-down & zoom
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountRef.current!.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Road lanes (0..10)
    const textureLoader = new THREE.TextureLoader();
    const roadTexture = textureLoader.load("/kaspacrossroad.png");
    roadTexture.wrapS = THREE.ClampToEdgeWrapping;
    roadTexture.wrapT = THREE.ClampToEdgeWrapping;

    for (let i = 0; i < TOTAL_LANES; i++) {
      const laneGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const laneMat = new THREE.MeshStandardMaterial({ map: roadTexture });
      const lane = new THREE.Mesh(laneGeom, laneMat);
      lane.rotation.x = -Math.PI / 2;

      // Each lane i => z = i * TILE_SPACING_Z - half-lane + half-lane => i * -10
      const laneZ = i * TILE_SPACING_Z;
      lane.position.set(0, 0, laneZ - (LANE_HEIGHT / 2) + (Math.abs(TILE_SPACING_Z) / 2));
      scene.add(lane);
    }

    // Create clickable tiles for lanes 0..10
    tileRefs.current = [];
    for (let i = 0; i < TOTAL_LANES; i++) {
      const tileGeom = new THREE.BoxGeometry(4, 0.1, 4);
      const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, opacity: 0.9, transparent: true });
      const tileMesh = new THREE.Mesh(tileGeom, tileMat);

      tileMesh.position.set(0, 0.05, i * TILE_SPACING_Z);
      tileMesh.userData = { laneIndex: i };
      scene.add(tileMesh);
      tileRefs.current.push(tileMesh);
    }

    // Load character
    const loader = new GLTFLoader();
    loader.load("/kaspacrosscharacter.glb", (gltf) => {
      const model = gltf.scene;
      model.scale.set(2, 2, 2);
      model.rotation.y = Math.PI;

      // Start on lane 0 => z=0
      model.position.set(0, 1.8, 0);
      scene.add(model);
      characterRef.current = model;
    });

    // Load car
    loader.load("/kaspacrosscar.glb", (gltf) => {
      carModelRef.current = gltf.scene;
    });

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(tileRefs.current, false);
      if (intersects.length > 0) {
        const { laneIndex } = intersects[0].object.userData;
        pickRow(laneIndex);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Animation loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      if (characterRef.current) {
        const { x, z } = characterRef.current.position;
        // Move camera to follow the character more top-down
        camera.position.x += (x - camera.position.x) * 0.1;
        camera.position.z += (z + 2 - camera.position.z) * 0.1;
        camera.lookAt(x, 1.8, z);
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      cancelAnimationFrame(requestRef.current!);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [pickRow]);

  // Move character when currentLane changes
  useEffect(() => {
    if (!characterRef.current) return;
    // newZ => currentLane * TILE_SPACING_Z
    const newZ = currentLane * TILE_SPACING_Z;
    const startZ = characterRef.current.position.z;
    const duration = 500;
    const startTime = performance.now();

    const animateMove = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      characterRef.current!.position.z = startZ + (newZ - startZ) * t;
      if (t < 1) requestAnimationFrame(animateMove);
    };
    requestAnimationFrame(animateMove);
  }, [currentLane]);

  // If gameOver => spawn car quickly
  useEffect(() => {
    if (!gameOver || !characterRef.current || !sceneRef.current || !carModelRef.current) return;

    // The losing lane is currentLane
    const laneZ = currentLane * TILE_SPACING_Z;
    const carClone = carModelRef.current.clone(true);
    carClone.scale.set(3, 3, 3);
    // Spawn in front of the character
    carClone.position.set(0, 1, laneZ);
    carClone.rotation.y = Math.PI / 2;
    sceneRef.current.add(carClone);

    // Animate car in 500ms
    const startTime = performance.now();
    const duration = 500;
    const endX = 10; // move from x=0 to x=+10
    const animateCar = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      carClone.position.x = 0 + (endX - 0) * t;
      if (t < 1) {
        requestAnimationFrame(animateCar);
      } else {
        // Collision => remove both
        if (characterRef.current) {
          sceneRef.current!.remove(characterRef.current);
          characterRef.current = null;
        }
        setTimeout(() => {
          sceneRef.current!.remove(carClone);
        }, 500);
      }
    };
    requestAnimationFrame(animateCar);
  }, [gameOver, currentLane]);

  return <div ref={mountRef} className="w-full h-full" />;
}

// ---------------------------------------------------------------------------
// addMultiplierLabelToTile
// – If lane > 0 => label with “(1.1^laneIndex)x” in bold Montserrat, black text
// ---------------------------------------------------------------------------
function addMultiplierLabelToTile(tile: THREE.Mesh, multiplier: number, textColor: string) {
  const labelText = `${multiplier.toFixed(2)}x`;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = textColor;
  ctx.font = "bold 48px Montserrat, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(labelText, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(2, 1, 1);
  sprite.position.set(0, 0.15, 0);
  tile.add(sprite);
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
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
