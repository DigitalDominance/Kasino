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
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NUM_ROWS = 10;
const TILE_SPACING_Z = -7; // increased spacing
const BASE_MULTIPLIER = 1.1;
const SAFE_PROBABILITY = 0.7;
const ROAD_WIDTH = 40;
const ROAD_HEIGHT = 60;
const COLLISION_POPUP_DELAY = 5000; // 5s delay for both win and lose

// Updated animation paths (FBX versions)
const WALK_ANIMATIONS = [
  "/Animation_Walking_frame_rate_60.fbx",
  "/Animation_Confident_Strut_frame_rate_60.fbx",
  "/Animation_Groovy_Walk_frame_rate_60.fbx",
  "/Animation_Proud_Strut_frame_rate_60.fbx",
  "/Animation_Running_frame_rate_60.fbx",
];

const DEAD_ANIMATION = "/Animation_Dead_frame_rate_60.fbx";

// Asset list for preloading
const ASSETS = [
  "/kaspacrosscharacter.fbx",
  "/Animation_Confident_Strut_frame_rate_60.fbx",
  "/Animation_Dead_frame_rate_60.fbx",
  "/Animation_Groovy_Walk_frame_rate_60.fbx",
  "/Animation_Proud_Strut_frame_rate_60.fbx",
  "/Animation_Running_frame_rate_60.fbx",
  "/Animation_Walking_frame_rate_60.fbx",
  "/kaspacrosscar.fbx",
];

async function preloadAssets() {
  const loader = new FBXLoader();
  await Promise.all(
    ASSETS.map(
      (path) =>
        new Promise<void>((resolve, reject) => {
          loader.load(
            path,
            () => resolve(),
            undefined,
            (error) => reject(error)
          );
        })
    )
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function KaspianCrossPage() {
  return <KaspianCrossContent />;
}

function KaspianCrossContent() {
  const { isConnected, balance } = useWallet();
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Preload assets on mount
  useEffect(() => {
    preloadAssets()
      .then(() => setAssetsLoaded(true))
      .catch((error) => {
        console.error("Error preloading assets:", error);
      });
  }, []);

  if (!assetsLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
        <p className="text-2xl text-[#49EACB]">Loading…</p>
      </div>
    );
  }

  // Start game
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
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, bet * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
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

  // End game
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

  // Reset game
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
                Each row of the highway has a single “safe tile” in the middle. Click it to attempt crossing
                to the next row.
              </li>
              <li>
                Each row has a {Math.floor(SAFE_PROBABILITY * 100)}% chance to be safe. If safe, your
                character advances and your multiplier grows (1.1× each step).
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
// ---------------------------------------------------------------------------
interface KaspianCrossGameProps {
  isPlaying: boolean;
  betAmount: number;
  onGameEnd: (result: string, amount: number) => void;
}

function KaspianCrossGame({ isPlaying, betAmount, onGameEnd }: KaspianCrossGameProps) {
  const [rows, setRows] = useState<boolean[]>(() =>
    Array.from({ length: NUM_ROWS }, () => Math.random() < SAFE_PROBABILITY)
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  const [charZIndex, setCharZIndex] = useState(-1);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  // On game start, reset
  useEffect(() => {
    if (isPlaying) {
      setRows(Array.from({ length: NUM_ROWS }, () => Math.random() < SAFE_PROBABILITY));
      setCurrentRow(0);
      setCharZIndex(-1);
      setMultiplier(1);
      setGameOver(false);
      setHasAdvanced(false);
      setPopupVisible(false);
      setPopupMessage("");
    }
  }, [isPlaying]);

  // Called when user clicks a tile
  const pickRow = (rowIndex: number) => {
    if (gameOver || rowIndex !== currentRow) return;
    const isSafe = rows[rowIndex];
    // Move character onto that tile
    setCharZIndex(rowIndex);

    // Play random walk animation
    playRandomWalkAnimation();

    if (isSafe) {
      const newRow = rowIndex + 1;
      const newMult = Math.pow(BASE_MULTIPLIER, newRow);
      setMultiplier(Number(newMult.toFixed(2)));
      setHasAdvanced(true);

      if (newRow >= NUM_ROWS) {
        // Final row => auto-win after 5s delay
        setTimeout(() => {
          handleWin(newMult);
        }, 5000);
      } else {
        setCurrentRow(newRow);
      }
    } else {
      // collision => 5s delay
      setTimeout(() => {
        handleLose();
      }, COLLISION_POPUP_DELAY);
    }
  };

  // Cash out
  const cashOut = () => {
    if (!hasAdvanced || gameOver) return;
    handleWin(multiplier);
  };

  // Win
  const handleWin = (finalMult: number) => {
    setGameOver(true);
    const payout = betAmount * finalMult;
    // 5 second delay before ending game to allow animation to finish
    setTimeout(() => {
      onGameEnd("You Win", payout);
      showPopup(`Congratulations! You won ${payout.toFixed(2)} KAS!`);
    }, 5000);
  };

  // Lose
  const handleLose = () => {
    setGameOver(true);
    // Switch to "dead" animation
    playDeadAnimation();
    // 5 second delay before ending game
    setTimeout(() => {
      onGameEnd("House Wins", 0);
      showPopup(`You got hit by a car! Better luck next time.`);
    }, 5000);
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

  // -------------------------------------------------------------------------
  // Animation Handling
  // -------------------------------------------------------------------------
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const baseModelRef = useRef<THREE.Group | null>(null);

  // Called once the scene loads the base model
  const setBaseModel = (model: THREE.Group) => {
    baseModelRef.current = model;
    mixerRef.current = new THREE.AnimationMixer(model);
  };

  // Load & play a random walking/strut/running animation
  const playRandomWalkAnimation = () => {
    if (!mixerRef.current) return;
    const randomAnim =
      WALK_ANIMATIONS[Math.floor(Math.random() * WALK_ANIMATIONS.length)];
    loadAnimationAndPlay(randomAnim, false);
  };

  // Load & play the dead animation
  const playDeadAnimation = () => {
    if (!mixerRef.current) return;
    loadAnimationAndPlay(DEAD_ANIMATION, true);
  };

  // Actually load the animation FBX and play it
  const loadAnimationAndPlay = (animPath: string, loopOnce: boolean) => {
    if (!baseModelRef.current || !mixerRef.current) return;
    const loader = new FBXLoader();
    loader.load(animPath, (fbx) => {
      // Assuming the animation clip is in fbx.animations[0]
      const clip = fbx.animations[0];
      const action = mixerRef.current!.clipAction(clip);
      if (loopOnce) {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      }
      action.reset().play();
      mixerRef.current!.update(0);
    });
  };

  // Keep updating the animation mixer
  useEffect(() => {
    const clock = new THREE.Clock();
    let req: number;
    const animateMixer = () => {
      req = requestAnimationFrame(animateMixer);
      if (mixerRef.current) {
        const delta = clock.getDelta();
        mixerRef.current.update(delta);
      }
    };
    animateMixer();
    return () => cancelAnimationFrame(req);
  }, []);

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
        currentRow={currentRow}
        charZIndex={charZIndex}
        pickRow={pickRow}
        gameOver={gameOver}
        onBaseModelLoaded={setBaseModel}
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
              <Button onClick={() => setPopupVisible(false)} className="bg-black text-[#49EACB] w-full hover:bg-[#333]">
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
// - Zoomed camera
// - Painted tile multipliers
// - Raycasting for tile clicks
// - onBaseModelLoaded callback to pass the loaded base model
// ---------------------------------------------------------------------------
interface MultiLaneHighwaySceneProps {
  currentRow: number;
  charZIndex: number;
  pickRow: (rowIndex: number) => void;
  gameOver: boolean;
  onBaseModelLoaded: (model: THREE.Group) => void;
}

function MultiLaneHighwayScene({
  currentRow,
  charZIndex,
  pickRow,
  gameOver,
  onBaseModelLoaded,
}: MultiLaneHighwaySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const characterRef = useRef<THREE.Group | null>(null);
  const tileRefs = useRef<THREE.Mesh[]>([]);
  const carModelRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    // Scene & camera
    const width = mountRef.current!.clientWidth;
    const height = mountRef.current!.clientHeight;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x000000);

    // Zoom camera in more
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 6, 8); // zoomed in (Z changed from 10 to 8)
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

    // Road plane
    const roadGeom = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_HEIGHT);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x303030 });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -(ROAD_HEIGHT / 2) + 10;
    scene.add(road);

    // Create tiles
    tileRefs.current = [];
    for (let row = 0; row < NUM_ROWS; row++) {
      const tileGeom = new THREE.BoxGeometry(4, 0.1, 4);
      // “Paint” the multiplier directly on the tile top
      const tileMultiplier = Math.pow(BASE_MULTIPLIER, row + 1);
      const tileMat = createTileMaterial(tileMultiplier);

      const tileMesh = new THREE.Mesh(tileGeom, tileMat);
      tileMesh.position.set(0, 0.05, row * TILE_SPACING_Z);
      tileMesh.userData = { rowIndex: row };
      scene.add(tileMesh);
      tileRefs.current.push(tileMesh);
    }

    // Load base model using FBXLoader and apply character texture
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();
    loader.load("/kaspacrosscharacter.fbx", (fbx) => {
      const texture = texLoader.load("/kaspacrosscharactertexture.png");
      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              (mat as THREE.MeshStandardMaterial).map = texture;
              mat.needsUpdate = true;
            });
          } else {
            (mesh.material as THREE.MeshStandardMaterial).map = texture;
            mesh.material.needsUpdate = true;
          }
        }
      });
      const model = fbx;
      model.scale.set(2, 2, 2);
      model.rotation.y = Math.PI;
      model.position.set(0, 1.2, 5);
      scene.add(model);
      characterRef.current = model;
      onBaseModelLoaded(model);
    });

    // Load car using FBXLoader and apply car texture
    loader.load("/kaspacrosscar.fbx", (fbx) => {
      const texture = texLoader.load("/kaspacrosscartexture.png");
      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              (mat as THREE.MeshStandardMaterial).map = texture;
              mat.needsUpdate = true;
            });
          } else {
            (mesh.material as THREE.MeshStandardMaterial).map = texture;
            mesh.material.needsUpdate = true;
          }
        }
      });
      carModelRef.current = fbx;
    });

    // Raycaster for tile clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(tileRefs.current, false);
      if (intersects.length > 0) {
        const { rowIndex } = intersects[0].object.userData;
        pickRow(rowIndex);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Animation loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      if (characterRef.current) {
        const { x, z } = characterRef.current.position;
        // Keep camera behind & slightly above
        camera.position.x += (x - camera.position.x) * 0.08;
        camera.position.z += (z + 10 - camera.position.z) * 0.08;
        camera.lookAt(x, 1.2, z);
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
  }, [onBaseModelLoaded, pickRow]);

  // Animate character movement when charZIndex changes
  useEffect(() => {
    if (!characterRef.current) return;
    const newZ = charZIndex * TILE_SPACING_Z;
    const startZ = characterRef.current.position.z;
    const duration = 400;
    const startTime = performance.now();

    const animateMove = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      characterRef.current!.position.z = startZ + (newZ - startZ) * t;
      if (t < 1) requestAnimationFrame(animateMove);
    };
    requestAnimationFrame(animateMove);
  }, [charZIndex]);

  // Spawn car on game over
  useEffect(() => {
    if (!gameOver || !characterRef.current || !sceneRef.current || !carModelRef.current) return;
    const carClone = carModelRef.current.clone(true);
    carClone.scale.set(2, 2, 2);

    const fromLeft = Math.random() < 0.5;
    const { x, z } = characterRef.current.position;
    const spawnX = fromLeft ? -20 : 20;
    carClone.position.set(spawnX, 1, z);
    carClone.rotation.y = fromLeft ? Math.PI * 0.5 : -Math.PI * 0.5;
    sceneRef.current.add(carClone);

    const startTime = performance.now();
    const duration = 1000;
    const endX = fromLeft ? 20 : -20;
    const animateCar = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      carClone.position.x = spawnX + (endX - spawnX) * t;
      if (t < 1) {
        requestAnimationFrame(animateCar);
      } else {
        sceneRef.current!.remove(carClone);
      }
    };
    requestAnimationFrame(animateCar);
  }, [gameOver]);

  return <div ref={mountRef} className="w-full h-full" />;
}

// ---------------------------------------------------------------------------
// createTileMaterial
// Paints the multiplier on the top face of the tile
// ---------------------------------------------------------------------------
function createTileMaterial(tileMultiplier: number) {
  const topCanvas = document.createElement("canvas");
  topCanvas.width = 256;
  topCanvas.height = 256;
  const ctx = topCanvas.getContext("2d")!;
  ctx.fillStyle = "#000000"; // black background
  ctx.fillRect(0, 0, 256, 256);
  // Write multiplier in bright green
  ctx.fillStyle = "#39FF14";
  ctx.font = "bold 48px Montserrat, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = `${tileMultiplier.toFixed(2)}x`;
  ctx.fillText(text, 128, 128);

  const topTexture = new THREE.CanvasTexture(topCanvas);
  topTexture.minFilter = THREE.LinearFilter;

  // We'll create 6 materials for the box geometry
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const bottomMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const topMat = new THREE.MeshStandardMaterial({ map: topTexture });

  return [
    sideMat,     // +x
    sideMat,     // -x
    topMat,      // +y (top)
    bottomMat,   // -y (bottom)
    sideMat,     // +z
    sideMat,     // -z
  ];
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
