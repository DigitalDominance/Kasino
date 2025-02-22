"use client";

import { useRef, useEffect, useState } from "react";

// --- Configuration Constants for Path Animation ---
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
  // Store crash point once per round.
  const crashPointRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    // Generate the crash point only once when the game starts.
    if (crashPointRef.current === null) {
      // Using your working formula (ensuring at least 1x in this case).
      crashPointRef.current = Math.max(1, 1 / (1 - Math.random() * 0.95));
      console.log("Crash point:", crashPointRef.current);
    }
    const start = performance.now();
    const growthRate = 0.01; // Use your working growth rate.
    const animate = (time: number) => {
      const elapsed = time - start; // elapsed in ms
      setTimeElapsed(elapsed);
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
      console.log("Multiplier:", currentMultiplier.toFixed(2), "Elapsed:", elapsed);
      if (crashPointRef.current && currentMultiplier >= crashPointRef.current) {
        onGameEnd(crashPointRef.current, 0);
        return; // Stop the animation loop.
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      crashPointRef.current = null;
    };
    // Only re-run when isPlaying changes.
  }, [isPlaying, onGameEnd, onMultiplierChange]);

  // Render the canvas with rocket path, rocket/explosion, and multiplier text.
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

    // If game hasn't started, show placeholder.
    if (!isPlaying && multiplier === 1) {
      ctx.fillStyle = "white";
      ctx.font = "30px Arial";
      const text = "Place your bet to start playing";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, (width - textWidth) / 2, height / 2);
      ctx.restore();
      return;
    }

    // --- Draw the Rocket Path ---
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#49EACB");
    gradient.addColorStop(1, "#111");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, height);
    const step = 10;
    // Use timeElapsed to determine the path length.
    for (let t = 0; t < timeElapsed / 10; t += step) {
      const x = t * zoomFactor - 5;
      const y = height - curveFunction(t / 1000) * zoomFactor;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // --- Compute Rocket Position and Angle ---
    const tTip = timeElapsed / 10;
    const maxX = width - rocketWidth;
    const x = Math.min(tTip * zoomFactor, maxX);
    const y = height - curveFunction(tTip / 1000) * zoomFactor;
    const u = tTip / 1000;
    const deltaU = 0.001;
    const derivative = (curveFunction(u + deltaU) - curveFunction(u)) / deltaU;
    const angle = Math.atan(-derivative / 1000);

    // --- Draw the Rocket or Explosion ---
    ctx.save();
    // Determine if the game has crashed.
    const hasCrashed = crashPointRef.current !== null && multiplier >= crashPointRef.current;
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (hasCrashed) {
      // Draw explosion image centered.
      ctx.drawImage(
        explodeImage,
        -rocketWidth / 2,
        -rocketHeight / 2,
        rocketWidth,
        rocketHeight
      );
    } else {
      // Draw rocket so its tip (right edge) aligns with (0,0).
      ctx.drawImage(
        rocketImage,
        -rocketWidth,
        -rocketHeight / 2,
        rocketWidth,
        rocketHeight
      );
    }
    ctx.restore();

    // --- Draw the Multiplier Text ---
    ctx.font = "60px Arial";
    let fillStyle = "white";
    const m = parseFloat(multiplier.toFixed(2));
    if (m > 5) fillStyle = "red";
    else if (m > 2) fillStyle = "yellow";
    ctx.fillStyle = fillStyle;
    const text = m.toFixed(2) + "x";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (width - textWidth) / 2, height / 2);
    ctx.restore();
  }, [timeElapsed, multiplier, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", background: "black", borderRadius: "8px" }}
    />
  );
}
