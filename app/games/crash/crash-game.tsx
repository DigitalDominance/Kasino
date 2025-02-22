"use client";

import { useRef, useEffect, useState } from "react";

// --- Configuration Constants for the rocket path ---
const coeffB = 0.5;
const coeffA = 2000 * 0.16; // using a base height of 2000
const zoomFactor = 0.5;
const rocketWidth = 55;
const rocketHeight = 50;

// --- Asset Loading ---
let rocketImage: HTMLImageElement, explodeImage: HTMLImageElement;
if (typeof window !== "undefined") {
  rocketImage = new Image();
  rocketImage.src = "/rocket.svg";
  explodeImage = new Image();
  explodeImage.src = "/explode.svg";
}

// --- Curve Function for the rocket path ---
function curveFunction(t: number) {
  return coeffA * (Math.exp(coeffB * t) - 1);
}

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
  const [timeElapsed, setTimeElapsed] = useState(0);
  const requestRef = useRef<number>();
  // Use a ref to store the crash point so it's computed only once per round.
  const crashPointRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    // Generate the crash point only once when the game starts.
    if (crashPointRef.current === null) {
      crashPointRef.current = Math.max(1.5, 1 / (1 - Math.random() * 0.95));
      console.log("Crash point:", crashPointRef.current);
    }
    const start = performance.now();
    const growthRate = 0.5; // Multiplier grows as exp(0.5 * seconds)

    const animate = (time: number) => {
      const elapsed = time - start; // elapsed in ms
      setTimeElapsed(elapsed);
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
      console.log("Multiplier:", currentMultiplier.toFixed(2), "Elapsed:", elapsed);
      // End the game if the multiplier meets/exceeds the crash point.
      if (crashPointRef.current && currentMultiplier >= crashPointRef.current) {
        onGameEnd(crashPointRef.current, 0);
        return; // Stop the animation loop.
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      // Reset crash point for the next round.
      crashPointRef.current = null;
    };
    // Only re-run when isPlaying changes.
  }, [isPlaying, onGameEnd, onMultiplierChange]);

  // Render the entire game on the canvas: path, rocket/explosion, and multiplier text.
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

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Draw the rocket path line (gradient).
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

    // Compute rocket position at the tip of the drawn path.
    const tTip = timeElapsed / 10;
    const maxX = width - rocketWidth;
    const x = Math.min(tTip * zoomFactor, maxX);
    const y = height - curveFunction(tTip / 1000) * zoomFactor;

    // Compute tangent angle at the tip.
    const u = tTip / 1000;
    const deltaU = 0.001;
    const derivative = (curveFunction(u + deltaU) - curveFunction(u)) / deltaU;
    const angle = Math.atan(-derivative / 1000);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Draw explosion if crashed; otherwise, draw rocket.
    const hasCrashed = crashPointRef.current !== null && multiplier >= crashPointRef.current;
    if (hasCrashed) {
      ctx.drawImage(
        explodeImage,
        -rocketWidth / 2,
        -rocketHeight / 2,
        rocketWidth,
        rocketHeight
      );
    } else {
      ctx.drawImage(
        rocketImage,
        -rocketWidth, // so that the right edge is at the tip (0,0)
        -rocketHeight / 2,
        rocketWidth,
        rocketHeight
      );
    }
    ctx.restore();

    // Draw the multiplier text.
    ctx.font = "60px Arial";
    let fillStyle = "white";
    const m = parseFloat(multiplier.toFixed(2));
    if (m > 5) fillStyle = "red";
    else if (m > 2) fillStyle = "yellow";
    ctx.fillStyle = fillStyle;
    const text = m.toFixed(2) + "x";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (width - textWidth) / 2, height / 2);
  }, [timeElapsed, multiplier, isPlaying]);

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
