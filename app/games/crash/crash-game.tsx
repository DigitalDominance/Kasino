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
  const requestRef = useRef<number>();
  // Store crash point and start time in refs so they are set only once per round.
  const crashPointRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const growthRate = 0.5; // Multiplier grows as exp(0.5 * seconds)
  const [multiplier, setMultiplier] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Adjust canvas for device pixel ratio.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;

    function loop(time: number) {
      if (!isPlaying) return; // Stop if game isn't playing.
      if (startRef.current === null) {
        startRef.current = time;
      }
      if (crashPointRef.current === null) {
        crashPointRef.current = Math.max(1.5, 1 / (1 - Math.random() * 0.95));
        console.log("Crash point:", crashPointRef.current);
      }
      const elapsed = time - startRef.current; // in ms
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
      // Clear the canvas.
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // --- Draw the rocket path line (gradient) ---
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#49EACB");
      gradient.addColorStop(1, "#111");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, height);
      const step = 10;
      for (let t = 0; t < elapsed / 10; t += step) {
        const x = t * zoomFactor - 5;
        const y = height - curveFunction(t / 1000) * zoomFactor;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // --- Compute rocket's current position and angle ---
      const tTip = elapsed / 10;
      const maxX = width - rocketWidth;
      const x = Math.min(tTip * zoomFactor, maxX);
      const y = height - curveFunction(tTip / 1000) * zoomFactor;
      const u = tTip / 1000;
      const deltaU = 0.001;
      const derivative = (curveFunction(u + deltaU) - curveFunction(u)) / deltaU;
      const angle = Math.atan(-derivative / 1000);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // --- Draw rocket or explosion based on game status ---
      const hasCrashed =
        crashPointRef.current !== null && currentMultiplier >= crashPointRef.current;
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
          -rocketWidth, // so that the right edge aligns with the tip.
          -rocketHeight / 2,
          rocketWidth,
          rocketHeight
        );
      }
      ctx.restore();

      // --- Draw the multiplier text ---
      ctx.font = "60px Arial";
      let fillStyle = "white";
      const m = parseFloat(currentMultiplier.toFixed(2));
      if (m > 5) fillStyle = "red";
      else if (m > 2) fillStyle = "yellow";
      ctx.fillStyle = fillStyle;
      const text = m.toFixed(2) + "x";
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, (width - textWidth) / 2, height / 2);

      // End game if crash point reached.
      if (crashPointRef.current && currentMultiplier >= crashPointRef.current) {
        onGameEnd(crashPointRef.current, 0);
        return;
      }
      requestRef.current = requestAnimationFrame(loop);
    }

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(requestRef.current);
      startRef.current = null;
      crashPointRef.current = null;
    };
  }, [isPlaying, onGameEnd, onMultiplierChange]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", background: "transparent", borderRadius: "8px" }}
    />
  );
}
