"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface CrashGameProps {
  isPlaying: boolean;
  onGameEnd: (result: number, winAmount: number) => void;
  betAmount: number;
  onCashoutSuccess: (multiplier: number, amount: number) => void;
  onManualCashout: () => void;
}

export function CrashGame({
  isPlaying,
  onGameEnd,
  betAmount,
  onCashoutSuccess,
  onManualCashout,
}: CrashGameProps) {
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [chartData, setChartData] = useState<{ x: number; y: number }[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [showCashoutPopup, setShowCashoutPopup] = useState<boolean>(false);
  const [cashoutAmount, setCashoutAmount] = useState<number>(0);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number>(1);
  const [gameInitialized, setGameInitialized] = useState<boolean>(false);
  const gameStartedRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const hasManualCashedOut = useRef<boolean>(false);
  // We'll use a fixed game duration (in ms) for the multiplier to reach the crash point.
  const targetDuration = 10000; // 10 seconds

  // Reset game state when isPlaying changes to false
  useEffect(() => {
    if (!isPlaying) {
      resetGameState();
    }
  }, [isPlaying]);

  // Initialize game when isPlaying changes to true
  useEffect(() => {
    if (isPlaying && !gameInitialized) {
      console.log("Initializing game with bet amount:", betAmount);
      const newCrashPoint = calculateCrashPoint();
      console.log("Calculated crash point:", newCrashPoint);
      setCrashPoint(newCrashPoint);
      setGameInitialized(true);
      initializeGame(newCrashPoint);
    } else if (!isPlaying) {
      resetGameState();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameInitialized, betAmount]);

  const resetGameState = () => {
    cleanup();
    setCrashPoint(null);
    setCurrentMultiplier(1);
    setChartData([]);
    setIsGameOver(false);
    setShowCashoutPopup(false);
    setGameInitialized(false);
    gameStartedRef.current = false;
    hasManualCashedOut.current = false;
  };

  const cleanup = () => {
    console.log("Cleaning up game");
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    gameStartedRef.current = false;
    setGameInitialized(false);
  };

  /**
   * Calculate the crash point using a 10% house edge.
   * The formula below uses a uniformly distributed random value and then scales the “fair”
   * multiplier by the house edge (0.9). Finally, the value is capped at 100×.
   */
  const calculateCrashPoint = (): number => {
    const random = Math.random();
    const houseEdge = 0.9; // 10% house edge in favor of the casino
    // Compute a base multiplier. (This formula is one way to simulate a fair game modified by house edge.)
    let baseMultiplier = (100 * houseEdge) / (random * 0.99 + 0.01);
    // Floor to two decimals:
    baseMultiplier = Math.floor(baseMultiplier * 100) / 100;
    // Ensure a minimum multiplier of 1.01×:
    baseMultiplier = Math.max(1.01, baseMultiplier);
    // Cap the crash point to 100×:
    const finalCrashPoint = Math.min(Number(baseMultiplier.toFixed(2)), 100);
    console.log("Calculated crash point:", finalCrashPoint);
    return finalCrashPoint;
  };

  /**
   * Initialize the game by resetting the chart and multiplier,
   * then starting the game loop.
   */
  const initializeGame = (newCrashPoint: number) => {
    if (!gameStartedRef.current) {
      setChartData([{ x: 0, y: 1 }]);
      setCurrentMultiplier(1);
      setIsGameOver(false);
      gameStartedRef.current = true;
      startTimeRef.current = performance.now();
      lastUpdateTimeRef.current = performance.now();
      startGameLoop(newCrashPoint);
    }
  };

  /**
   * Start the game loop.
   * We compute a growth constant k such that:
   *    crashPoint = exp(k * targetDuration)
   * or equivalently:
   *    k = ln(crashPoint) / targetDuration
   * Then the multiplier at any time elapsed is:
   *    multiplier = exp(k * elapsed)
   */
  const startGameLoop = (crashPointValue: number) => {
    console.log("Starting game loop with crash point:", crashPointValue);
    const k = Math.log(crashPointValue) / targetDuration;
    const updateGame = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const timeSinceLastUpdate = timestamp - lastUpdateTimeRef.current;

      // Calculate new multiplier using the dynamic growth rate
      const newMultiplier = Math.exp(k * elapsed);
      setCurrentMultiplier(newMultiplier);

      if (timeSinceLastUpdate >= 50) {
        // Update chart every 50ms
        setChartData((prevData) => [
          ...prevData,
          { x: elapsed / 1000, y: Math.min(newMultiplier, crashPointValue) },
        ]);
        lastUpdateTimeRef.current = timestamp;
      }

      if (newMultiplier >= crashPointValue) {
        console.log("Game over, crashed at:", newMultiplier.toFixed(2));
        setIsGameOver(true);
        onGameEnd(crashPointValue, 0);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(updateGame);
    };

    animationFrameRef.current = requestAnimationFrame(updateGame);
  };

  /**
   * Cashout the game manually.
   * This stops the game loop and notifies the parent component.
   */
  const handleCashout = () => {
    if (!hasManualCashedOut.current && !isGameOver && currentMultiplier > 1) {
      const finalMultiplier = Number(currentMultiplier.toFixed(2));
      const amount = betAmount * finalMultiplier;
      setCashoutMultiplier(finalMultiplier);
      setCashoutAmount(amount);
      setShowCashoutPopup(true);
      onCashoutSuccess(finalMultiplier, amount);
      hasManualCashedOut.current = true;
      cleanup();
    }
  };

  const handleManualCashout = () => {
    if (currentMultiplier > 1 && !isGameOver) {
      handleCashout();
      onManualCashout();
    }
  };

  // Initial state display when not playing and no game result to show.
  if (!isPlaying && !isGameOver && !showCashoutPopup) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl text-[#49EACB]">Place your bet to start playing!</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis dataKey="x" domain={[0, "auto"]} hide />
          <YAxis dataKey="y" domain={[1, "auto"]} hide />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#49EACB"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <AnimatePresence>
        {(isPlaying || isGameOver) && (
          <motion.div
            key={isPlaying ? "playing" : "game-over"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <div className="text-8xl font-bold text-[#49EACB] drop-shadow-glow mb-4">
                {currentMultiplier.toFixed(2)}×
              </div>
              {isGameOver && <div className="text-4xl font-bold text-red-500">CRASHED!</div>}
            </div>
          </motion.div>
        )}
        {!isPlaying && !isGameOver && crashPoint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <p className="text-2xl text-[#49EACB]">Last crash: {crashPoint.toFixed(2)}×</p>
          </motion.div>
        )}
        {showCashoutPopup && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-8 max-w-md w-full text-center">
              <div className="flex justify-center mb-4">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                  alt="KAS"
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              </div>
              <div className="text-4xl font-bold text-[#49EACB] mb-2">Success!</div>
              <div className="text-2xl text-white mb-4">Cashed out @ {cashoutMultiplier.toFixed(2)}×</div>
              <div className="text-3xl font-bold text-[#49EACB]">
                Won {cashoutAmount.toFixed(8)} KAS
              </div>
              <button
                onClick={() => setShowCashoutPopup(false)}
                className="mt-6 px-6 py-2 bg-[#49EACB] text-black rounded-lg hover:bg-[#49EACB]/80 transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
