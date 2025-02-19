"use client";

import { useEffect, useRef, useState } from "react";
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

  // When the game stops playing, reset the state.
  useEffect(() => {
    if (!isPlaying) {
      resetGameState();
    }
  }, [isPlaying]);

  // When starting a new game, calculate the crash point and initialize.
  useEffect(() => {
    if (isPlaying && !gameInitialized) {
      const newCrashPoint = calculateCrashPoint();
      setCrashPoint(newCrashPoint);
      setGameInitialized(true);
      initializeGame(newCrashPoint);
    } else if (!isPlaying) {
      resetGameState();
    }
    return () => cleanup();
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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    gameStartedRef.current = false;
    setGameInitialized(false);
  };

  /**
   * Calculate the crash point.
   * Uses a 10% house edge:
   *   - A uniformly random value is scaled by a factor (houseEdge = 0.9).
   *   - The result is floored to two decimals.
   *   - The multiplier is ensured to be at least 1.01× and capped at 100×.
   */
  const calculateCrashPoint = (): number => {
    const random = Math.random();
    const houseEdge = 0.9; // 10% house edge in favor of the casino
    let baseMultiplier = (100 * houseEdge) / (random * 0.99 + 0.01);
    baseMultiplier = Math.floor(baseMultiplier * 100) / 100;
    baseMultiplier = Math.max(1.01, baseMultiplier);
    const finalCrashPoint = Math.min(Number(baseMultiplier.toFixed(2)), 100);
    return finalCrashPoint;
  };

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
   * Game loop: uses a fixed growth rate so that:
   *   multiplier = exp(growthRate × elapsedTime)
   * This produces a variable game duration—lower crash points will be reached quickly,
   * while higher crash points will take longer.
   */
  const startGameLoop = (crashPointValue: number) => {
    const growthRate = 0.00006; // constant growth rate

    const updateGame = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const timeSinceLastUpdate = timestamp - lastUpdateTimeRef.current;

      const newMultiplier = Math.exp(growthRate * elapsed);
      setCurrentMultiplier(newMultiplier);

      if (timeSinceLastUpdate >= 50) {
        setChartData((prevData) => [
          ...prevData,
          { x: elapsed / 1000, y: Math.min(newMultiplier, crashPointValue) },
        ]);
        lastUpdateTimeRef.current = timestamp;
      }

      if (newMultiplier >= crashPointValue) {
        setIsGameOver(true);
        onGameEnd(crashPointValue, 0);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(updateGame);
    };

    animationFrameRef.current = requestAnimationFrame(updateGame);
  };

  /**
   * Handle a manual cashout.
   * Once cashed out, the game stops and the parent is notified.
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

  // When not playing and no game result is showing, display an initial prompt.
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
          <Line type="monotone" dataKey="y" stroke="#49EACB" strokeWidth={2} dot={false} isAnimationActive={false} />
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
