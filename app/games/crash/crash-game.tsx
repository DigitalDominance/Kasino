"use client";

import { useRef, useEffect, useState } from "react";

// --- Configuration Constants ---
const coeffB = 0.5;
const coeffA = 2000 * 0.16; // using a base height of 2000
const zoomFactor = 0.5;

// --- Asset Loading ---
// Rocket and explosion images are in your public folder.
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
  // This animation computes the multiplier using the in-game elapsed time.
  useEffect(() => {
    if (!isPlaying) return;
    setGameStatus("Running");
    // Generate a random crash point (ensuring at least 1.5x).
    const crash = Math.max(1.5, 1 / (1 - Math.random() * 0.95));
    const start = performance.now();
    // Increase growthRate to see visible multiplier changes. Adjust as needed.
    const growthRate = 1.0; // per second growth rate
    const animate = (time: number) => {
      const elapsed = time - start;
      setTimeElapsed(elapsed);
      const newMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(newMultiplier);
      // Pass the live multiplier to the parent via callback.
      if (onMultiplierChange) onMultiplierChange(newMultiplier);
      console.log("Multiplier:", newMultiplier.toFixed(2), "Elapsed:", elapsed);
      // End game if multiplier reaches crash point.
      if (newMultiplier >= crash) {
        setGameStatus("Crashed");
        onGameEnd(crash, 0);
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

    // If game not started, show placeholder.
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

    // Compute rocket position at tip of drawn line.
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
    if (gameStatus === "Crashed") {
      // Draw explosion image centered at (x, y).
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
      // Draw rocket so its tip (right edge) aligns with (x, y).
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(
        rocketImage,
        -rocketWidth, // shift so that the right edge is at (0,0)
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
