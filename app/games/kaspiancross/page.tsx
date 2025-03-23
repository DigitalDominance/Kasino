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
// Fonts & Constants
// ---------------------------------------------------------------------------
const REAL_LANES = 30;
const TOTAL_LANES = REAL_LANES + 1;

const ROAD_WIDTH = 40;
const LANE_HEIGHT = ROAD_WIDTH / 4; // 10
const ROAD_HEIGHT = TOTAL_LANES * LANE_HEIGHT;
const TILE_SPACING_Z = -LANE_HEIGHT; // -10

const BASE_MULTIPLIER = 1.1;
const SAFE_PROBABILITY = 0.7;

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

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
      const chosenTreasury =
        Math.random() < 0.5
          ? process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1
          : process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }

      // Send deposit
      const depositTx = await window.kasware.sendKaspa(
        chosenTreasury,
        bet * 1e8,
        { priorityFee: 10000 }
      );
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Notify backend
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

  // End Game
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
            <Link
              href="/"
              className="inline-flex items-center text-[#49EACB] hover:underline"
            >
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
                <h2 className="text-2xl font-bold text-[#49EACB]">
                  Kaspian Cross
                </h2>
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
                  onReset={resetGame}
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
              backgroundImage:
                "linear-gradient(270deg, #0D0D0D, #00FF00, #49EACB)",
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
            Kaspian Cross is an electrifying casino experience where bold bets
            meet immersive 3D visuals. Guide our fearless traveler across a
            multi-lane highway—each safe step raises your multiplier, but one
            wrong move and you’re toast!
          </p>
        </Card>
      </div>
      <SiteFooter />

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">
              How to Play Kaspian Cross
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet and press “Spin Kaspian Cross” to begin.</li>
              <li>
                Lane 0 is a non-clickable “starting road.” Lanes 1–{REAL_LANES} each
                have a safe tile (70% chance).
              </li>
              <li>
                Click the <strong>next lane</strong> (current lane + 1). Each success
                raises your multiplier by 1.1×.
              </li>
              <li>
                If the tile isn’t safe, a car collision ends the game—after you reach
                the tile, the car comes in.
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
// KaspianCrossGame – handles game logic and movement
// ---------------------------------------------------------------------------
interface KaspianCrossGameProps {
  isPlaying: boolean;
  betAmount: number;
  onGameEnd: (result: string, amount: number) => void;
  onReset: () => void;
}

function KaspianCrossGame({ isPlaying, betAmount, onGameEnd, onReset }: KaspianCrossGameProps) {
  const [safeStates, setSafeStates] = useState<boolean[]>(() => {
    const arr = Array(TOTAL_LANES).fill(false);
    for (let i = 1; i <= REAL_LANES; i++) {
      arr[i] = Math.random() < SAFE_PROBABILITY;
    }
    return arr;
  });
  const [currentLane, setCurrentLane] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [pendingUnsafe, setPendingUnsafe] = useState<number | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  useEffect(() => {
    if (isPlaying) {
      const arr = Array(TOTAL_LANES).fill(false);
      for (let i = 1; i <= REAL_LANES; i++) {
        arr[i] = Math.random() < SAFE_PROBABILITY;
      }
      setSafeStates(arr);
      setCurrentLane(0);
      setGameOver(false);
      setHasAdvanced(false);
      setMultiplier(1);
      setPopupVisible(false);
      setPopupMessage("");
      setPendingUnsafe(null);
    }
  }, [isPlaying]);

  const pickRow = (laneIndex: number) => {
    if (gameOver) return;
    if (laneIndex !== currentLane + 1) return;
    if (laneIndex < 1 || laneIndex > REAL_LANES) return;

    const isSafe = safeStates[laneIndex];
    if (isSafe) {
      const newMultiplier = Math.pow(BASE_MULTIPLIER, laneIndex);
      setMultiplier(Number(newMultiplier.toFixed(2)));
      setHasAdvanced(true);
      setCurrentLane(laneIndex);
      if (laneIndex === REAL_LANES) {
        setTimeout(() => handleWin(newMultiplier), 600);
      }
    } else {
      setPendingUnsafe(laneIndex);
      setHasAdvanced(true);
      setCurrentLane(laneIndex);
    }
  };

  const handleCarCollision = () => {
    handleLose();
  };

  const handleWin = (finalMult: number) => {
    setGameOver(true);
    const payout = betAmount * finalMult;
    onGameEnd("You Win", payout);
    showPopup(`Congratulations! You won ${payout.toFixed(2)} KAS!`);
  };

  const handleLose = () => {
    onGameEnd("House Wins", 0);
    showPopup(`You got hit by a car! Better luck next time.`);
  };

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

      <MultiLaneHighwayScene
        currentLane={currentLane}
        gameOver={gameOver}
        pendingUnsafe={pendingUnsafe}
        pickRow={pickRow}
        onCarCollision={handleCarCollision}
        onUnsafeLaneReached={() => { setGameOver(true); setPendingUnsafe(null); }}
      />

      {/* In-game UI */}
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
              <Button
                onClick={() => {
                  hidePopup();
                  onReset();
                }}
                className="bg-black text-[#49EACB] w-full hover:bg-[#333]"
              >
                Play Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MultiLaneHighwayScene – handles 3D scene, character movement, car collision,
// walking animation (using AnimationMixer), and smooth camera follow.
// ---------------------------------------------------------------------------
interface MultiLaneHighwaySceneProps {
  currentLane: number;
  gameOver: boolean;
  pendingUnsafe: number | null;
  pickRow: (laneIndex: number) => void;
  onCarCollision: () => void;
  onUnsafeLaneReached: () => void;
}

function MultiLaneHighwayScene({
  currentLane,
  gameOver,
  pendingUnsafe,
  pickRow,
  onCarCollision,
  onUnsafeLaneReached,
}: MultiLaneHighwaySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const characterRef = useRef<THREE.Group | null>(null);
  const tileRefs = useRef<THREE.Mesh[]>([]);
  const carModelRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);
  const isMovingRef = useRef(false);
  const requestRef = useRef<number>();
  const carAnimationTriggeredRef = useRef(false);

  useEffect(() => {
    const width = mountRef.current!.clientWidth;
    const height = mountRef.current!.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera with smooth follow using lerp and a constant offset relative to the character.
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    // Initial position uses the same offset as later (offset: {x: 0, y: 6, z: 5})
    camera.position.set(0, 6, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountRef.current!.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);
    const greenLight = new THREE.PointLight(0x49eacb, 0.4, 50);
    greenLight.position.set(-5, 10, 5);
    scene.add(greenLight);

    // Road texture and lanes
    const textureLoader = new THREE.TextureLoader();
    const roadTexture = textureLoader.load("/kaspacrossroad.png");
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    const laneMat = new THREE.MeshStandardMaterial({ map: roadTexture });

    for (let i = 0; i < TOTAL_LANES; i++) {
      // Center lane
      const centerGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const centerLane = new THREE.Mesh(centerGeom, laneMat);
      centerLane.rotation.x = -Math.PI / 2;
      centerLane.position.set(
        0,
        0,
        i * TILE_SPACING_Z - LANE_HEIGHT / 2 + Math.abs(TILE_SPACING_Z) / 2
      );
      scene.add(centerLane);

      // Left lane
      const leftGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const leftLane = new THREE.Mesh(leftGeom, laneMat);
      leftLane.rotation.x = -Math.PI / 2;
      leftLane.position.set(
        -ROAD_WIDTH,
        0,
        i * TILE_SPACING_Z - LANE_HEIGHT / 2 + Math.abs(TILE_SPACING_Z) / 2
      );
      scene.add(leftLane);

      // Right lane
      const rightGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const rightLane = new THREE.Mesh(rightGeom, laneMat);
      rightLane.rotation.x = -Math.PI / 2;
      rightLane.position.set(
        ROAD_WIDTH,
        0,
        i * TILE_SPACING_Z - LANE_HEIGHT / 2 + Math.abs(TILE_SPACING_Z) / 2
      );
      scene.add(rightLane);
    }

    // Create clickable tiles
    tileRefs.current = [];
    for (let i = 0; i < TOTAL_LANES; i++) {
      const tileGeom = new THREE.BoxGeometry(4, 0.1, 4);
      const tileMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const tileMesh = new THREE.Mesh(tileGeom, tileMat);
      tileMesh.position.set(0, 0.05, i * TILE_SPACING_Z);
      tileMesh.userData = { laneIndex: i };
      scene.add(tileMesh);
      tileRefs.current.push(tileMesh);
      if (i > 0) {
        const multiplier = Math.pow(BASE_MULTIPLIER, i);
        addMultiplierLabelToTile(tileMesh, multiplier, "#000000");
      }
    }

    // Load Character
    const loader = new GLTFLoader();
    loader.load("/kaspacrosscharacter.glb", (gltf) => {
      const model = gltf.scene;
      model.scale.set(2, 2, 2);
      model.rotation.y = Math.PI;
      model.position.set(0, 1.8, 0);
      scene.add(model);
      characterRef.current = model;
      // Load walking animation from external file
      loader.load("/Animation_Walking_withSkin.glb", (animGltf) => {
        if (animGltf.animations && animGltf.animations.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(model);
          const walkAction = mixerRef.current.clipAction(animGltf.animations[0]);
          walkAction.setLoop(THREE.LoopRepeat, Infinity);
          // Instead of toggling paused, we will control play/stop explicitly.
          walkAction.stop();
          walkActionRef.current = walkAction;
        }
      });
    });

    // Preload Car Model
    loader.load("/kaspacrosscar.glb", (gltf) => {
      carModelRef.current = gltf.scene;
    });

    // Raycasting for tile clicks with movement lock
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      if (isMovingRef.current) return;
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

    // Animate loop with mixer update and smooth camera follow
    let lastTime = performance.now();
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      if (characterRef.current) {
        // Use a constant offset relative to the character's position.
        const offset = new THREE.Vector3(0, 6, 5);
        const desiredPos = characterRef.current.position.clone().add(offset);
        camera.position.lerp(desiredPos, 0.1);
        camera.lookAt(characterRef.current.position);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener("click", onClick);
      cancelAnimationFrame(requestRef.current!);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [pickRow]);

  // Animate character movement with walking animation control.
  useEffect(() => {
    if (!characterRef.current) return;
    const newZ = currentLane * TILE_SPACING_Z;
    const startZ = characterRef.current.position.z;
    const duration = 1000; // increased duration for more visible walking animation
    const startTime = performance.now();
    isMovingRef.current = true;
    if (walkActionRef.current) {
      walkActionRef.current.reset();
      walkActionRef.current.play();
    }
    const move = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      if (characterRef.current) {
        characterRef.current.position.z = startZ + (newZ - startZ) * t;
      }
      if (t < 1) {
        requestAnimationFrame(move);
      } else {
        isMovingRef.current = false;
        if (walkActionRef.current) {
          walkActionRef.current.stop();
        }
        if (pendingUnsafe === currentLane) {
          onUnsafeLaneReached();
        }
      }
    };
    requestAnimationFrame(move);
  }, [currentLane, pendingUnsafe, onUnsafeLaneReached]);

  // Car collision animation with a bigger car (scaled 1.75×)
  useEffect(() => {
    if (
      !gameOver ||
      !characterRef.current ||
      !sceneRef.current ||
      !carModelRef.current
    )
      return;
    // Only trigger once per game over.
    if (carAnimationTriggeredRef.current) return;
    carAnimationTriggeredRef.current = true;
    // Delay the car animation to allow the character to reach the tile first.
    setTimeout(() => {
      const scene = sceneRef.current!;
      const laneZ = currentLane * TILE_SPACING_Z;
      const carClone = carModelRef.current!.clone(true);
      // Scale car 1.75× bigger than original (base scale 3 -> 5.25)
      carClone.scale.set(3 * 1.75, 3 * 1.75, 3 * 1.75);
      carClone.position.set(-10, 1, laneZ);
      carClone.rotation.y = Math.PI / 2;
      scene.add(carClone);
      const startTime = performance.now();
      const duration = 2000; // extended duration for slower car animation
      const startX = -10;
      const endX = 10;
      const animateCar = (time: number) => {
        const elapsed = time - startTime;
        const t = Math.min(elapsed / duration, 1);
        carClone.position.x = startX + (endX - startX) * t;
        if (t < 1) {
          requestAnimationFrame(animateCar);
        } else {
          setTimeout(() => {
            scene.remove(carClone);
            onCarCollision();
          }, 300);
        }
      };
      requestAnimationFrame(animateCar);
    }, 2000); // wait 2 seconds before starting the car animation
  }, [gameOver, currentLane, onCarCollision]);

  // Reset car animation trigger when gameOver becomes false (new game)
  useEffect(() => {
    if (!gameOver) {
      carAnimationTriggeredRef.current = false;
    }
  }, [gameOver]);

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
