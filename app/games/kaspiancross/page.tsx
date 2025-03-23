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

// ---------------------------------------------------------------------------
// Fonts & Basic Constants
// ---------------------------------------------------------------------------
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// Start with 11 lanes: lane 0..10
const INITIAL_LANES = 11;

// We'll keep expanding by 10 lanes whenever we get near the end
const EXPAND_TRIGGER = 5; // if we get within 5 lanes of the end, generate more
const EXPAND_AMOUNT = 10;

// Probability logic & multiplier
const START_PROB = 0.78;      // for laneIndex=1 (adjust as you like)
const PROB_DECREMENT = 0.005; // each lane reduces probability slightly
const MIN_PROB = 0.50;        // never drop below 50%
const BASE_MULTIPLIER = 1.15; // exponential factor

function getLaneProbability(laneIndex: number) {
  // Lane 0 is the safe “start.” For lane 1, prob=START_PROB
  // Then it decreases by PROB_DECREMENT each lane, never below MIN_PROB
  if (laneIndex === 0) return 1.0; // always safe or skip
  const p = START_PROB - PROB_DECREMENT * (laneIndex - 1);
  return Math.max(MIN_PROB, p);
}

function getLaneMultiplier(laneIndex: number) {
  // e.g. laneIndex=1 => 1.15^1, laneIndex=2 => 1.15^2, etc.
  if (laneIndex === 0) return 1; // lane 0 => no multiplier
  return Math.pow(BASE_MULTIPLIER, laneIndex);
}

// Road geometry
const ROAD_WIDTH = 40;
const LANE_HEIGHT = 10;          // each lane is 10 in Z
const TILE_SPACING_Z = -LANE_HEIGHT;

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
      const chosenTreasury =
        Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }

      // Send deposit
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
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

        {/* Deposit TXID display */}
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
          {/* Left: game */}
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

          {/* Right: controls, chat, wins */}
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
          <img
            src="/kaspianpromo.png"
            alt="Kaspian Cross Promo"
            className="w-full h-auto mb-4"
          />
          <p className="text-sm text-white mb-4">
            Kaspian Cross is an electrifying casino experience where bold bets meet
            immersive 3D visuals. Guide our fearless traveler across an infinite
            multi-lane highway—each safe step raises your multiplier, but one wrong
            move and you’re toast!
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
                Lane 0 is a non-clickable “starting road.” We generate lanes in front
                of you infinitely, each with an exponential multiplier.
              </li>
              <li>
                Click the <strong>next lane</strong> (current lane + 1). If it’s safe,
                you keep going; if not, the car hits you after a brief delay!
              </li>
              <li>
                You can <strong>Cash Out</strong> any time after a successful step to
                lock in your winnings.
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
// – We keep a dynamic array of safeStates. Start with 11 lanes (0..10).
// – If you approach the last 5 lanes, we generate 10 more. Each lane has a
//   probability (decreasing) and an exponential multiplier. We do a 1-second
//   delay before showing the car if the lane is unsafe.
// ---------------------------------------------------------------------------
interface KaspianCrossGameProps {
  isPlaying: boolean;
  betAmount: number;
  onGameEnd: (result: string, amount: number) => void;
}

function KaspianCrossGame({ isPlaying, betAmount, onGameEnd }: KaspianCrossGameProps) {
  const [safeStates, setSafeStates] = useState<boolean[]>([]);
  const [currentLane, setCurrentLane] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  // For the “1-second delay => spawn car” logic
  const [showCar, setShowCar] = useState(false);

  // Popup
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  // On mount, or if safeStates is empty, generate the first 11 lanes
  useEffect(() => {
    if (safeStates.length === 0) {
      setSafeStates(generateLanes(INITIAL_LANES, 0));
    }
  }, [safeStates]);

  // Reset each time the user starts
  useEffect(() => {
    if (isPlaying) {
      setSafeStates(generateLanes(INITIAL_LANES, 0));
      setCurrentLane(0);
      setGameOver(false);
      setHasAdvanced(false);
      setMultiplier(1);
      setShowCar(false);
      setPopupVisible(false);
      setPopupMessage("");
    }
  }, [isPlaying]);

  // If we get close to the end, generate more
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    if (currentLane + EXPAND_TRIGGER >= safeStates.length) {
      // expand
      setSafeStates((prev) => [
        ...prev,
        ...generateLanes(EXPAND_AMOUNT, prev.length),
      ]);
    }
  }, [currentLane, safeStates, gameOver, isPlaying]);

  // Called when user clicks a tile => pick that lane
  const pickRow = (laneIndex: number) => {
    if (!isPlaying || gameOver) return;
    // Must pick the next lane
    if (laneIndex !== currentLane + 1) return;
    // Make sure laneIndex < safeStates.length
    if (laneIndex >= safeStates.length) return;

    const isSafe = safeStates[laneIndex];
    if (isSafe) {
      // success => update multiplier, lane
      const newMult = getLaneMultiplier(laneIndex);
      setMultiplier(Number(newMult.toFixed(2)));
      setHasAdvanced(true);
      setCurrentLane(laneIndex);
    } else {
      // 1 second => spawn car => collision => lose
      setGameOver(true);
      setTimeout(() => {
        setShowCar(true);
      }, 1000);
    }
  };

  // Once the car collision finishes => handle lose
  const handleCarCollisionDone = () => {
    handleLose();
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
    onGameEnd("House Wins", 0);
    showPopup(`You got hit by a car! Better luck next time.`);
  };

  // Cash Out
  const cashOut = () => {
    if (!hasAdvanced || gameOver) return;
    handleWin(multiplier);
  };

  const showPopup = (msg: string) => {
    setPopupMessage(msg);
    setPopupVisible(true);
  };
  const hidePopup = () => {
    setPopupVisible(false);
    setPopupMessage("");
  };

  return (
    <div className="w-full h-full relative">
      {/* Pre-game overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 p-4">
          <h1 className="text-3xl mb-4 text-[#49EACB] font-bold">
            Get Ready to Cross!
          </h1>
          <p className="text-sm mb-2 text-white">
            Place your bet and click “Spin Kaspian Cross” to start.
          </p>
          <Image src="/crosspreview.png" alt="Preview" width={180} height={100} />
        </div>
      )}

      {/* The 3D Scene */}
      <InfiniteHighwayScene
        currentLane={currentLane}
        safeStates={safeStates}
        showCar={showCar}
        onCarCollisionDone={handleCarCollisionDone}
        pickRow={pickRow}
      />

      {/* In-game UI */}
      {isPlaying && !gameOver && (
        <>
          <div className="absolute top-6 left-6 bg-black/60 px-4 py-2 rounded-md shadow-md">
            <div
              className="text-2xl font-extrabold tracking-wider"
              style={{ color: "#39FF14" }}
            >
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

      {/* Popup */}
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
              <Button
                onClick={hidePopup}
                className="bg-black text-[#49EACB] w-full hover:bg-[#333]"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Generate `count` new lanes starting from `startIndex`
function generateLanes(count: number, startIndex: number): boolean[] {
  const arr: boolean[] = [];
  for (let i = 0; i < count; i++) {
    const laneIndex = startIndex + i;
    // lane 0 => always safe or skip
    if (laneIndex === 0) {
      arr.push(true);
    } else {
      const p = getLaneProbability(laneIndex);
      arr.push(Math.random() < p);
    }
  }
  return arr;
}

// ---------------------------------------------------------------------------
// InfiniteHighwayScene
// – We draw each lane from 0..(safeStates.length-1).
// – For each lane, we add left/center/right road planes + center tile. We store
//   them in an array so the raycaster can detect clicks. If user clicks a tile,
//   we call pickRow(laneIndex).
// – If showCar=true => animate the car from left to right, remove the character,
//   then onCarCollisionDone() => triggers “Lose” logic.
// – **Fallback**: If the texture fails, we apply a gray color to the roads.
// ---------------------------------------------------------------------------
interface InfiniteHighwaySceneProps {
  currentLane: number;
  safeStates: boolean[];
  showCar: boolean;
  onCarCollisionDone: () => void;
  pickRow: (laneIndex: number) => void;
}

function InfiniteHighwayScene({
  currentLane,
  safeStates,
  showCar,
  onCarCollisionDone,
  pickRow,
}: InfiniteHighwaySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const characterRef = useRef<THREE.Group | null>(null);
  const carRef = useRef<THREE.Group | null>(null);

  // We'll store each tile mesh so we can raycast them
  const tilesRef = useRef<THREE.Mesh[]>([]);

  const requestRef = useRef<number>();

  // Build scene once
  useEffect(() => {
    const width = mountRef.current!.clientWidth;
    const height = mountRef.current!.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(0, 8, 8);
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

    const greenLight = new THREE.PointLight(0x49eacb, 0.4, 50);
    greenLight.position.set(-5, 10, 5);
    scene.add(greenLight);

    // Load character
    const loader = new GLTFLoader();
    loader.load("/kaspacrosscharacter.glb", (gltf) => {
      const model = gltf.scene;
      model.scale.set(2, 2, 2);
      model.rotation.y = Math.PI;
      model.position.set(0, 1.8, 0); // lane 0 => z=0
      scene.add(model);
      characterRef.current = model;
    });

    // Load car
    loader.load("/kaspacrosscar.glb", (gltf) => {
      carRef.current = gltf.scene;
      carRef.current.scale.set(3, 3, 3);
    });

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(tilesRef.current, false);
      if (intersects.length > 0) {
        const { laneIndex } = intersects[0].object.userData;
        pickRow(laneIndex);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Animate
    const animateFn = () => {
      requestRef.current = requestAnimationFrame(animateFn);
      if (characterRef.current && cameraRef.current) {
        const cz = characterRef.current.position.z;
        // stable camera behind the character
        const desiredZ = cz + 8;
        cameraRef.current.position.x = 0; // keep x=0
        cameraRef.current.position.z += (desiredZ - cameraRef.current.position.z) * 0.1;
        cameraRef.current.lookAt(0, 1.8, cz);
      }
      renderer.render(scene, camera);
    };
    animateFn();

    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      cancelAnimationFrame(requestRef.current!);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [pickRow]);

  // Rebuild roads/tiles up to safeStates.length
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // We'll load the texture once, with fallback
    const textureLoader = new THREE.TextureLoader();
    let roadTexture: THREE.Texture | null = null;
    let roadMaterial: THREE.MeshStandardMaterial;

    roadTexture = textureLoader.load(
      "/kaspacrossroad.png",
      (tex) => {
        console.log("Road texture loaded successfully.");
      },
      undefined,
      (err) => {
        console.warn("Could not load /kaspacrossroad.png. Using fallback color.");
        roadTexture = null;
      }
    );

    // Because we might expand safeStates, we build roads only for new lanes
    const existingCount = tilesRef.current.length; // how many lanes we built so far
    for (let i = existingCount; i < safeStates.length; i++) {
      // If the texture didn't load, fallback to a plain color
      if (roadTexture) {
        roadMaterial = new THREE.MeshStandardMaterial({
          map: roadTexture,
          side: THREE.DoubleSide,
        });
      } else {
        roadMaterial = new THREE.MeshStandardMaterial({
          color: 0x444444, // fallback gray
          side: THREE.DoubleSide,
        });
      }

      // center plane
      const centerGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const centerLane = new THREE.Mesh(centerGeom, roadMaterial);
      centerLane.rotation.x = -Math.PI / 2;
      centerLane.position.set(
        0,
        0,
        i * TILE_SPACING_Z - LANE_HEIGHT / 2 + Math.abs(TILE_SPACING_Z) / 2
      );
      scene.add(centerLane);

      // left plane
      const leftGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const leftLane = new THREE.Mesh(leftGeom, roadMaterial);
      leftLane.rotation.x = -Math.PI / 2;
      leftLane.position.set(
        -ROAD_WIDTH,
        0,
        i * TILE_SPACING_Z - LANE_HEIGHT / 2 + Math.abs(TILE_SPACING_Z) / 2
      );
      scene.add(leftLane);

      // right plane
      const rightGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const rightLane = new THREE.Mesh(rightGeom, roadMaterial);
      rightLane.rotation.x = -Math.PI / 2;
      rightLane.position.set(
        ROAD_WIDTH,
        0,
        i * TILE_SPACING_Z - LANE_HEIGHT / 2 + Math.abs(TILE_SPACING_Z) / 2
      );
      scene.add(rightLane);

      // clickable tile
      const tileGeom = new THREE.BoxGeometry(4, 0.1, 4);
      const tileMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const tileMesh = new THREE.Mesh(tileGeom, tileMat);
      tileMesh.position.set(0, 0.05, i * TILE_SPACING_Z);
      tileMesh.userData = { laneIndex: i };
      scene.add(tileMesh);
      tilesRef.current.push(tileMesh);

      // multiplier label for lane>0
      if (i > 0) {
        const mult = getLaneMultiplier(i);
        addMultiplierLabelToTile(tileMesh, mult, "#000000");
      }
    }
  }, [safeStates.length]);

  // Animate character to currentLane
  useEffect(() => {
    if (!characterRef.current) return;
    const newZ = currentLane * TILE_SPACING_Z;
    const startZ = characterRef.current.position.z;
    const duration = 500;
    const startTime = performance.now();

    const move = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      if (characterRef.current) {
        characterRef.current.position.z = startZ + (newZ - startZ) * t;
      }
      if (t < 1) requestAnimationFrame(move);
    };
    requestAnimationFrame(move);
  }, [currentLane]);

  // If showCar => animate collision
  useEffect(() => {
    if (!showCar || !sceneRef.current || !carRef.current || !characterRef.current) return;
    const scene = sceneRef.current;
    const carClone = carRef.current.clone(true);
    scene.add(carClone);

    const laneZ = currentLane * TILE_SPACING_Z;
    carClone.position.set(-10, 1, laneZ);
    carClone.rotation.y = Math.PI / 2;

    // animate over 1 second
    const startTime = performance.now();
    const duration = 1000;
    const animateCar = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      carClone.position.x = -10 + 20 * t;
      if (t < 1) {
        requestAnimationFrame(animateCar);
      } else {
        // remove character => collision
        scene.remove(characterRef.current!);
        characterRef.current = null;
        // remove car after short delay
        setTimeout(() => {
          scene.remove(carClone);
          onCarCollisionDone();
        }, 300);
      }
    };
    requestAnimationFrame(animateCar);
  }, [showCar, currentLane, onCarCollisionDone]);

  return <div ref={mountRef} className="w-full h-full" />;
}

// ---------------------------------------------------------------------------
// addMultiplierLabelToTile
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

  // Clear error after 3s
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Decrement cooldown
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

            {/* Quick bet buttons */}
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

          {/* Game result */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult !== null && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">
                  Result: {gameResult}
                </div>
                {winAmount !== null && winAmount > 0 ? (
                  <div className="text-xl text-green-400">
                    You won {winAmount.toFixed(8)} KAS!
                  </div>
                ) : (
                  <div className="text-xl text-red-400">You lost your bet.</div>
                )}
              </div>
            )}

            {/* Spin / Start button */}
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

      {/* Error toast */}
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
