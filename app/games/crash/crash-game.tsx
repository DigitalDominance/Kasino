"use client";

import { useRef, useEffect, useState } from "react";

// --- Configuration Constants ---
const coeffB = 0.5;
const coeffA = 2000 * 0.16; // Base height for curve calculation
const zoomFactor = 0.5;

// --- Asset Loading ---
// Rocket and explosion images (in public folder)
let rocketImage: HTMLImageElement, explodeImage: HTMLImageElement;
if (typeof window !== "undefined") {
  rocketImage = new Image();
  rocketImage.src = "/rocket.svg";
  explodeImage = new Image();
  explodeImage.src = "/explode.svg";
}

const rocketWidth = 55;
const rocketHeight = 50;

// --- Curve Function ---
function curveFunction(t: number) {
  return coeffA * (Math.exp(coeffB * t) - 1);
}

// --- Custom Crash Multiplier Generator ---
// Returns a target multiplier between 1.01 and 100 with approximate probabilities:
// • 60% chance: [1.01, 1.5)
// • 20% chance: [1.5, 2.0)
// • 10% chance: [2.0, 3.0)
// • 10% chance: [3.0, 100] (exponentially distributed)
function generateCrashMultiplier(): number {
  const r = Math.random();
  if (r < 0.60) {
    return 1.01 + (1.5 - 1.01) * Math.random();
  } else if (r < 0.80) {
    return 1.5 + (2.0 - 1.5) * Math.random();
  } else if (r < 0.90) {
    return 2.0 + (3.0 - 2.0) * Math.random();
  } else {
    const t = Math.random();
    return 3 + (100 - 3) * Math.pow(t, 3);
  }
}

// --- CrashGame Types ---
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
  const [gameStatus, setGameStatus] = useState<GameStatus>("Waiting");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const requestRef = useRef<number>();

  // Set up canvas resolution.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }, []);

  // Animation effect – runs only when isPlaying is true.
  useEffect(() => {
    if (!isPlaying) return;
    setGameStatus("Running");
    // Generate a target crash multiplier using our custom generator.
    const crashTarget = generateCrashMultiplier();
    console.log("Crash Multiplier:", crashTarget.toFixed(2));
    const start = performance.now();
    // Use a growth rate (adjust as needed). For example, 0.0005 gives ~1.65x after 1 second.
    const growthRate = 0.0005;
    const animate = (time: number) => {
      const elapsed = time - start;
      setTimeElapsed(elapsed);
      const newMultiplier = Math.exp(growthRate * elapsed);
      setMultiplier(newMultiplier);
      if (onMultiplierChange) onMultiplierChange(newMultiplier);
      console.log("Multiplier:", newMultiplier.toFixed(2), "Elapsed:", elapsed);
      // End game if multiplier reaches the target.
      if (newMultiplier >= crashTarget) {
        setGameStatus("Crashed");
        onGameEnd(crashTarget, 0);
        cancelAnimationFrame(requestRef.current);
        return;
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, betAmount, onGameEnd, onMultiplierChange]);

  // Render the canvas.
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    if (!isPlaying && gameStatus === "Waiting") {
      ctx.fillStyle = "white";
      ctx.font = "30px Arial";
      const text = "Place your bet to start playing";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, width / 2 - textWidth / 2, height / 2);
      ctx.restore();
      return;
    }

    // Draw the rocket path.
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#49EACB");
    gradient.addColorStop(1, "#111");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, height);
    const step = 10;
    for (let t = 0; t < timeElapsed / 10; t += step) {
      const x = t * zoomFactor - 5;
      const y = height - curveFunction(t / 1000) * zoomFactor;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Compute rocket position at the tip.
    const tTip = timeElapsed / 10;
    const maxX = width - rocketWidth;
    const x = Math.min(tTip * zoomFactor, maxX);
    const y = height - curveFunction(tTip / 1000) * zoomFactor;

    // Compute the tangent angle.
    const u = tTip / 1000;
    const deltaU = 0.001;
    const derivative = (curveFunction(u + deltaU) - curveFunction(u)) / deltaU;
    const angle = Math.atan(-derivative / 1000);

    ctx.save();
    if (gameStatus === "Crashed") {
      ctx.translate(x, y);
      ctx.drawImage(
        explodeImage,
        -rocketWidth / 2,
        -rocketHeight / 2,
        rocketWidth,
        rocketHeight
      );
      ctx.translate(-x, -y);
    } else {
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(
        rocketImage,
        -rocketWidth,
        -rocketHeight / 2,
        rocketWidth,
        rocketHeight
      );
      ctx.rotate(-angle);
      ctx.translate(-x, -y);
    }
    ctx.restore();

    // Draw the multiplier.
    ctx.font = "60px Arial";
    let fillStyle = "white";
    const m = parseFloat(multiplier.toFixed(2));
    if (m > 5) fillStyle = "red";
    else if (m > 2) fillStyle = "yellow";
    ctx.fillStyle = fillStyle;
    const text = m.toFixed(2) + "x";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, width / 2 - textWidth / 2, height / 2);
    ctx.restore();
  };

  useEffect(() => {
    renderCanvas();
  }, [timeElapsed, multiplier, gameStatus, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "transparent",
        borderRadius: "8px",
      }}
    />
  );
}
