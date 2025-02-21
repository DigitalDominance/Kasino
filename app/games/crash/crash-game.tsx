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

  useEffect(() => {
    if (!isPlaying) return;
    setGameStatus("Running");
    // Generate a random crash point.
    // Here we use a formula that ensures at least 1.5x.
    const crashPoint = Math.max(1.01, 1 / (1 - Math.random() * 0.95));
    console.log("Crash point:", crashPoint);
    const start = performance.now();
    const growthRate = 1; // multiplier grows as exp(0.5 * seconds)
    const animate = (time: number) => {
      const elapsed = time - start; // in ms
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
      console.log("Multiplier:", currentMultiplier.toFixed(2), "Elapsed:", elapsed);
      if (currentMultiplier >= crashPoint) {
        setGameStatus("Crashed");
        onGameEnd(crashPoint, 0);
        return;
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, onGameEnd, onMultiplierChange]);

  // Render the multiplier on a simple canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Set proper resolution for crisp rendering.
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
