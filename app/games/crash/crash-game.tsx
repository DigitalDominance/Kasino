"use client";

import { useRef, useEffect, useState } from "react";

export type GameStatus = "Waiting" | "Running" | "Crashed" | "CashedOut";

interface CrashGameProps {
  isPlaying: boolean;
  betAmount: number;
  onGameEnd: (finalMultiplier: number, winAmount: number) => void;
  onCashoutSuccess: (cashoutMultiplier: number, winAmount: number) => void;
  onManualCashout: () => void;
  onMultiplierChange?: (multiplier: number) => void;
}

export function CrashGame({
  isPlaying,
  betAmount,
  onGameEnd,
  onCashoutSuccess,
  onManualCashout,
  onMultiplierChange,
}: CrashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [gameStatus, setGameStatus] = useState<GameStatus>("Waiting");
  const requestRef = useRef<number>();
  // Use a ref to store the crash point so it is computed only once per game.
  const crashPointRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    setGameStatus("Running");
    // Generate crash point only once
    if (crashPointRef.current === null) {
      crashPointRef.current = Math.max(1.5, 1 / (1 - Math.random() * 0.95));
      console.log("Crash point:", crashPointRef.current);
    }
    const start = performance.now();
    const growthRate = 0.5; // multiplier grows as exp(0.5 * seconds)
    const animate = (time: number) => {
      const elapsed = time - start; // elapsed in ms
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
      console.log("Multiplier:", currentMultiplier.toFixed(2), "Elapsed:", elapsed);
      if (crashPointRef.current !== null && currentMultiplier >= crashPointRef.current) {
        setGameStatus("Crashed");
        onGameEnd(crashPointRef.current, 0);
        return; // Stop animation.
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      // Reset crash point when the game stops
      crashPointRef.current = null;
    };
  }, [isPlaying, onGameEnd, onMultiplierChange]);

  // Draw the live multiplier on a canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.font = "60px Arial";
    ctx.fillStyle = "white";
    const text = multiplier.toFixed(2) + "x";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.clientWidth - textWidth) / 2, canvas.clientHeight / 2);
  }, [multiplier]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", background: "black", borderRadius: "8px" }}
    />
  );
}
