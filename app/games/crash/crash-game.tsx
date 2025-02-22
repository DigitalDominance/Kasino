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
  const [hasCrashed, setHasCrashed] = useState(false);
  const requestRef = useRef<number>();

  // Refs for the images.
  const rocketImg = useRef<HTMLImageElement | null>(null);
  const explosionImg = useRef<HTMLImageElement | null>(null);

  // Load images on the client.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rocket = new Image();
      rocket.src = "/rocket.svg";
      rocketImg.current = rocket;

      const explosion = new Image();
      explosion.src = "/explode.svg";
      explosionImg.current = explosion;
    }
  }, []);

  // Use a ref to compute the crash multiplier only once per round.
  const crashPointRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    setHasCrashed(false);

    if (crashPointRef.current === null) {
      const r = Math.random();
      let crashPoint;
      if (r < 0.5) {
        // 50% chance: uniform between 1 and 1.5.
        crashPoint = 1 + Math.random() * 0.5;
      } else if (r < 0.5 + 0.1) {
        // 10% chance: uniform between 1.5 and 2.
        crashPoint = 1.5 + Math.random() * 0.5;
      } else if (r < 0.5 + 0.1 + 0.2) {
        // 20% chance: uniform between 2 and 3.
        crashPoint = 2 + Math.random() * 1;
      } else if (r < 0.5 + 0.1 + 0.2 + 0.1) {
        // 10% chance: uniform between 5 and 7.5.
        crashPoint = 5 + Math.random() * 2.5;
      } else if (r < 0.5 + 0.1 + 0.2 + 0.1 + 0.05) {
        // 5% chance: uniform between 7.5 and 10.
        crashPoint = 7.5 + Math.random() * 2.5;
      } else if (r < 0.5 + 0.1 + 0.2 + 0.1 + 0.05 + 0.04) {
        // 4% chance: uniform between 11 and 12.
        crashPoint = 11 + Math.random() * 1;
      } else {
        // 1% chance: exponential between 12 and 100.
        const expR = Math.random();
        crashPoint = 12 * Math.exp(expR * Math.log(100 / 12));
      }
      crashPointRef.current = crashPoint;
      console.log("Crash point:", crashPointRef.current);
    }

    const start = performance.now();
    const growthRate = 0.5; // Adjust growth rate as needed.

    const animate = (time: number) => {
      const elapsed = time - start;
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
      console.log("Multiplier:", currentMultiplier.toFixed(2), "Elapsed:", elapsed);
      const crashPoint = crashPointRef.current;
      if (crashPoint && currentMultiplier >= crashPoint) {
        setMultiplier(crashPoint);
        setHasCrashed(true);
        onGameEnd(crashPoint, 0);
        return;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      crashPointRef.current = null;
    };
  }, [isPlaying]);

  // Cubic Bézier helper function.
  const cubicBezier = (
    P0: { x: number; y: number },
    P1: { x: number; y: number },
    P2: { x: number; y: number },
    P3: { x: number; y: number },
    t: number
  ) => {
    const mt = 1 - t;
    const x =
      mt * mt * mt * P0.x +
      3 * mt * mt * t * P1.x +
      3 * mt * t * t * P2.x +
      t * t * t * P3.x;
    const y =
      mt * mt * mt * P0.y +
      3 * mt * mt * t * P1.y +
      3 * mt * t * t * P2.y +
      t * t * t * P3.y;
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Adjust for device pixel ratio.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear the canvas (transparent background).
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const margin = 20;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Define the cubic Bézier curve points.
    // P0: Start at the bottom left.
    const P0 = { x: margin, y: height - margin };
    // P1: Control point to push the path upward.
    const P1 = { x: margin, y: height * 0.6 };
    // P2: Adjusted to reverse the bend—higher up to keep the path upward/right.
    const P2 = { x: width * 0.6, y: height * 0.2 };
    // P3: End point toward the right.
    const P3 = { x: width - margin, y: height * 0.2 };

    // Compute progress (t) based on multiplier relative to crash point.
    const crashPoint = crashPointRef.current || 1;
    const tProgress = Math.min((multiplier - 1) / (crashPoint - 1), 1);

    // Draw the partial cubic Bézier curve.
    ctx.beginPath();
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * tProgress;
      const { x, y } = cubicBezier(P0, P1, P2, P3, t);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    // Determine the tip of the curve.
    const tip = cubicBezier(P0, P1, P2, P3, tProgress);

    // Draw the rocket (or explosion) image at the tip.
    const img = hasCrashed ? explosionImg.current : rocketImg.current;
    if (img) {
      const imgSize = 40;
      ctx.drawImage(img, tip.x - imgSize / 2, tip.y - imgSize / 2, imgSize, imgSize);
    }

    // Draw the multiplier text.
    ctx.font = "24px Arial";
    ctx.fillStyle = "white";
    const text = multiplier.toFixed(2) + "x";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (width - textWidth) / 2, height - 30);
  }, [multiplier, hasCrashed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        backgroundColor: "transparent",
      }}
    />
  );
}
