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
const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// Probability & multiplier logic
const BASE_MULTIPLIER = 1.15;
const START_PROB = 0.78;      // probability at laneIndex=1
const PROB_DECREMENT = 0.005; // each lane reduces probability by 0.5%
const MIN_PROB = 0.50;        // never drop below 50%

function getLaneProbability(laneIndex: number) {
  // Probability decreases by PROB_DECREMENT each lane, never below MIN_PROB.
  // For lane 1, 2, 3, etc. (lane 0 is the “pre-lane” and is not clicked).
  const p = START_PROB - PROB_DECREMENT * (laneIndex - 1);
  return Math.max(MIN_PROB, p);
}

function getLaneMultiplier(laneIndex: number) {
  // Exponential growth: 1.15^laneIndex
  // laneIndex=1 => 1.15^1, laneIndex=2 => 1.15^2, ...
  return Math.pow(BASE_MULTIPLIER, laneIndex);
}

// Road geometry
const ROAD_WIDTH = 40;
const LANE_HEIGHT = 10; // Each lane is 10 units in Z
const TILE_SPACING_Z = -LANE_HEIGHT;

// Always keep 10 lanes in front of the player
const INITIAL_MAX_LANE = 10;

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
            immersive 3D visuals. Guide our fearless traveler across a multi-lane
            highway—each safe step raises your multiplier, but one wrong move and
            you’re toast!
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
                Lane 0 is your safe “starting lane.” Each new lane in front has a
                certain probability of being safe, but the multiplier grows
                exponentially.
              </li>
              <li>
                Click the <strong>next lane</strong> (current lane + 1). If it’s safe,
                you keep going. One misstep, and the car hits you!
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
// – Lane 0 is the “pre-lane” (safe to stand on). We always generate the next 10.
// – 1-second delay before car spawns if you step on an unsafe tile.
// ---------------------------------------------------------------------------
interface KaspianCrossGameProps {
  isPlaying: boolean;
  betAmount: number;
  onGameEnd: (result: string, amount: number) => void;
}

function KaspianCrossGame({ isPlaying, betAmount, onGameEnd }: KaspianCrossGameProps) {
  // We track how far we’ve generated lanes. E.g. if maxLane=10, we have lanes 0..10.
  const [maxLane, setMaxLane] = useState(INITIAL_MAX_LANE);

  // Store a boolean for each lane indicating if it’s safe (lane 0 is irrelevant).
  const [safeStates, setSafeStates] = useState<boolean[]>([]);

  // currentLane => physically on [0..∞]
  const [currentLane, setCurrentLane] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  // Popups
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  // Car spawn
  const [showCar, setShowCar] = useState(false);

  // -------------------------------------------------------------------------
  // Generate Safe States Up to maxLane
  // -------------------------------------------------------------------------
  useEffect(() => {
    // If safeStates is not big enough, expand it up to maxLane.
    // lane 0 is just the “pre-lane” (we can treat it as safe or irrelevant).
    setSafeStates((prev) => {
      const newArr = [...prev];
      while (newArr.length <= maxLane) {
        const i = newArr.length; // next lane index
        if (i === 0) {
          // lane 0 is a pre-lane, mark it safe or do whatever
          newArr.push(true);
        } else {
          // lane i => random chance
          const p = getLaneProbability(i);
          newArr.push(Math.random() < p);
        }
      }
      return newArr;
    });
  }, [maxLane]);

  // Reset each time the user starts
  useEffect(() => {
    if (isPlaying) {
      setMaxLane(INITIAL_MAX_LANE);
      setSafeStates([]);
      setCurrentLane(0);
      setGameOver(false);
      setHasAdvanced(false);
      setMultiplier(1);
      setPopupVisible(false);
      setPopupMessage("");
      setShowCar(false);
    }
  }, [isPlaying]);

  // Called when user clicks a lane
  const pickRow = (laneIndex: number) => {
    if (!isPlaying || gameOver) return;
    // Must pick currentLane+1
    if (laneIndex !== currentLane + 1) return;
    // Make sure it’s within our generated lanes
    if (laneIndex > maxLane) return;

    const isSafe = safeStates[laneIndex];
    if (isSafe) {
      // Step forward
      const newMult = getLaneMultiplier(laneIndex);
      setMultiplier(Number(newMult.toFixed(2)));
      setHasAdvanced(true);
      setCurrentLane(laneIndex);

      // Generate the next lane if needed so we always have 10 ahead
      const needed = laneIndex + 10;
      if (needed > maxLane) {
        setMaxLane(needed);
      }
    } else {
      // Wait 1 second, then show the car
      setGameOver(true);
      setTimeout(() => {
        setShowCar(true);
      }, 1000);
    }
  };

  // Once the car collision finishes, handle lose
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

  // Popup
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
          <h1 className="text-3xl mb-4 text-[#49EACB] font-bold">Get Ready to Cross!</h1>
          <p className="text-sm mb-2 text-white">
            Place your bet and click “Spin Kaspian Cross” to start.
          </p>
          <Image src="/crosspreview.png" alt="Preview" width={180} height={100} />
        </div>
      )}

      <InfiniteHighwayScene
        currentLane={currentLane}
        maxLane={maxLane}
        gameOver={gameOver}
        pickRow={pickRow}
        showCar={showCar}
        onCarCollisionDone={handleCarCollisionDone}
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

// ---------------------------------------------------------------------------
// InfiniteHighwayScene
// – Builds lanes from 0..maxLane. Lane 0 is the “pre-lane” at z=0.
// – If showCar=true => animate the car from left to right, then onCarCollisionDone().
// ---------------------------------------------------------------------------
interface InfiniteHighwaySceneProps {
  currentLane: number;
  maxLane: number;
  gameOver: boolean;
  pickRow: (laneIndex: number) => void;
  showCar: boolean;
  onCarCollisionDone: () => void;
}

function InfiniteHighwayScene({
  currentLane,
  maxLane,
  gameOver,
  pickRow,
  showCar,
  onCarCollisionDone,
}: InfiniteHighwaySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const characterRef = useRef<THREE.Group | null>(null);
  const carRef = useRef<THREE.Group | null>(null);

  // For click-lanes
  const laneMeshesRef = useRef<THREE.Mesh[]>([]);

  // Three.js requestAnimationFrame handle
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

    // Green accent light
    const greenLight = new THREE.PointLight(0x49eacb, 0.4, 50);
    greenLight.position.set(-5, 10, 5);
    scene.add(greenLight);

    // Character
    const loader = new GLTFLoader();
    loader.load("/kaspacrosscharacter.glb", (gltf) => {
      const model = gltf.scene;
      model.scale.set(2, 2, 2);
      model.rotation.y = Math.PI;
      // lane 0 => z=0
      model.position.set(0, 1.8, 0);
      scene.add(model);
      characterRef.current = model;
    });

    // Car
    loader.load("/kaspacrosscar.glb", (gltf) => {
      carRef.current = gltf.scene;
      carRef.current.scale.set(3, 3, 3);
    });

    // Raycasting for tile clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(laneMeshesRef.current, false);
      if (intersects.length > 0) {
        const { laneIndex } = intersects[0].object.userData;
        pickRow(laneIndex);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Animate
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      // Keep the camera stable behind the character
      if (characterRef.current) {
        const cz = characterRef.current.position.z;
        // We'll smoothly follow in z, but keep x=0, y=8
        const desiredZ = cz + 8; // behind the character
        camera.position.z += (desiredZ - camera.position.z) * 0.1;
        camera.lookAt(0, 1.8, cz);
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

  // Rebuild or add lanes from 0..maxLane
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // For each lane i in [0..maxLane], build planes & tile if not already built
    for (let i = laneMeshesRef.current.length; i <= maxLane; i++) {
      const roadTexture = new THREE.TextureLoader().load("/kaspacrossroad.png");
      roadTexture.wrapS = THREE.RepeatWrapping;
      roadTexture.wrapT = THREE.RepeatWrapping;
      const laneMat = new THREE.MeshStandardMaterial({ map: roadTexture });

      const zPos = i * TILE_SPACING_Z - LANE_HEIGHT / 2 + Math.abs(TILE_SPACING_Z) / 2;

      // Center plane
      const centerGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const centerLane = new THREE.Mesh(centerGeom, laneMat);
      centerLane.rotation.x = -Math.PI / 2;
      centerLane.position.set(0, 0, zPos);
      scene.add(centerLane);

      // Left plane
      const leftGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const leftLane = new THREE.Mesh(leftGeom, laneMat);
      leftLane.rotation.x = -Math.PI / 2;
      leftLane.position.set(-ROAD_WIDTH, 0, zPos);
      scene.add(leftLane);

      // Right plane
      const rightGeom = new THREE.PlaneGeometry(ROAD_WIDTH, LANE_HEIGHT);
      const rightLane = new THREE.Mesh(rightGeom, laneMat);
      rightLane.rotation.x = -Math.PI / 2;
      rightLane.position.set(ROAD_WIDTH, 0, zPos);
      scene.add(rightLane);

      // Clickable tile in the center
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
      laneMeshesRef.current.push(tileMesh);

      // Add multiplier label for lanes > 0
      if (i > 0) {
        const mult = getLaneMultiplier(i);
        addMultiplierLabelToTile(tileMesh, mult, "#000000");
      }
    }
  }, [maxLane]);

  // Animate character to currentLane
  useEffect(() => {
    if (!characterRef.current) return;
    const newZ = currentLane * TILE_SPACING_Z;
    // Animate over 0.5s
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

  // If showCar => spawn it from left to right
  useEffect(() => {
    if (!showCar || !sceneRef.current || !carRef.current) return;
    const scene = sceneRef.current;
    const carClone = carRef.current.clone(true);
    scene.add(carClone);

    // Place car off to the left, at the currentLane's Z
    const laneZ = currentLane * TILE_SPACING_Z;
    carClone.position.set(-10, 1, laneZ);
    carClone.rotation.y = Math.PI / 2;

    // Animate from x=-10 to x=+10 over 1 second
    const startTime = performance.now();
    const duration = 1000;
    const animateCar = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      carClone.position.x = -10 + 20 * t;
      if (t < 1) {
        requestAnimationFrame(animateCar);
      } else {
        // Done => remove from scene
        scene.remove(carClone);
        onCarCollisionDone();
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
