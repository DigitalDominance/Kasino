"use client";

import { useRef, useEffect, useState } from "react";

// --- Configuration Constants ---
const coeffB = 0.5;
const coeffA = 2000 * 0.16; // using a base height of 2000 (for the curve)

const zoomFactor = 0.5; // < 1 zooms out the drawn content

// --- Asset Loading ---
// Make sure these files exist in your public folder.
let rocketImage: HTMLImageElement, explodeImage: HTMLImageElement;
if (typeof window !== "undefined") {
  rocketImage = new Image();
  rocketImage.src = "/rocket.svg";
  explodeImage = new Image();
  explodeImage.src = "/explode.svg";
}

const rocketWidth = 50;
const rocketHeight = 50;

// --- Curve Function ---
// Returns the vertical displacement for time t (in seconds)
function curveFunction(t: number) {
  return coeffA * (Math.exp(coeffB * t) - 1);
}

// --- CrashGame Types ---
export type GameStatus = "Waiting" | "Running" | "Crashed" | "CashedOut";

interface CrashGameProps {
  isPlaying: boolean;
  betAmount: number;
  autoCashOut?: number; // optional auto-cashout multiplier
  onGameEnd: (finalMultiplier: number, winAmount: number) => void;
  onCashoutSuccess: (cashoutMultiplier: number, winAmount: number) => void;
  onManualCashout: () => void;
}

export function CrashGame({
  isPlaying,
  betAmount,
  autoCashOut,
  onGameEnd,
  onCashoutSuccess,
  onManualCashout,
}: CrashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("Waiting");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [crashMultiplier, setCrashMultiplier] = useState<number>(1);
  const requestRef = useRef<number>();

  // Set up the canvas resolution for crisp rendering.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }, []);

  // When isPlaying changes, start (or reset) the animation.
  useEffect(() => {
    if (!isPlaying) {
      setGameStatus("Waiting");
      setTimeElapsed(0);
      setMultiplier(1);
      return;
    }
    setGameStatus("Running");
    // Use a new formula for crash multiplier:
    // This gives a wider distribution. (For example, if random=0.5, crash≈1.90; if 0.9, crash≈6.90; if 0.99, crash≈16.8)
    const crash = Math.max(1.01, 1 / (1 - Math.random() * 0.95));
    setCrashMultiplier(crash);

    const start = performance.now();
    const growthRate = 0.00006; // multiplier = exp(growthRate * elapsed)
    const animate = (time: number) => {
      const elapsed = time - start;
      setTimeElapsed(elapsed);
      const newMultiplier = Math.exp(growthRate * elapsed);
      setMultiplier(newMultiplier);

      // Auto cashout check:
      if (autoCashOut && newMultiplier >= autoCashOut) {
        setGameStatus("CashedOut");
        onCashoutSuccess(newMultiplier, betAmount * newMultiplier);
        cancelAnimationFrame(requestRef.current);
        return;
      }
      // Crash condition:
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
  }, [isPlaying, autoCashOut, betAmount, onCashoutSuccess, onGameEnd]);

  // Render the canvas.
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // For crisp rendering, scale context by devicePixelRatio.
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    // Use transparent background.
    // If game isn't started, display "Place your bet" message.
    if (!isPlaying) {
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
      const x = t * zoomFactor;
      const y = height - curveFunction(t / 1000) * zoomFactor;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Determine rocket position.
    const maxX = width - rocketWidth;
    const x = Math.min(((timeElapsed / 1000) * 10) * zoomFactor, maxX);
    const y = height - curveFunction(timeElapsed / 1000) * zoomFactor;

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
      // Compute angle from the derivative of the curve.
      const d1 = curveFunction(timeElapsed / 1000);
      const d2 = curveFunction((timeElapsed + 10) / 1000);
      const slope = (d2 - d1) / 10;
      const angle = -Math.atan(slope);
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(
        rocketImage,
        -rocketWidth / 2,
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
        height: "100%", // fill the container fully
        display: "block",
        background: "transparent",
        borderRadius: "8px",
      }}
    />
  );
}
