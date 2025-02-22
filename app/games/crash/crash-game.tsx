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

  // For smooth camera following.
  const cameraOffsetRef = useRef({ x: 0, y: 0 });

  // Crash multiplier is computed only once per round.
  const crashPointRef = useRef<number | null>(null);

  // We'll update multiplier using dt, so track last frame time.
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isPlaying) return;

    setHasCrashed(false);
    setMultiplier(1);
    lastTimeRef.current = performance.now();

    if (crashPointRef.current === null) {
      const r = Math.random();
      let crashPoint;
      if (r < 0.605) {
        // 60.5% chance: uniform between 1 and 1.5.
        crashPoint = 1 + Math.random() * 0.5;
      } else if (r < 0.605 + 0.1) {
        // 10% chance: uniform between 1.5 and 2.
        crashPoint = 1.5 + Math.random() * 0.5;
      } else if (r < 0.605 + 0.1 + 0.2) {
        // 20% chance: uniform between 2 and 3.
        crashPoint = 2 + Math.random() * 1;
      } else if (r < 0.605 + 0.1 + 0.2 + 0.1) {
        // 10% chance: uniform between 5 and 7.5.
        crashPoint = 5 + Math.random() * 2.5;
      } else if (r < 0.605 + 0.1 + 0.2 + 0.1 + 0.05) {
        // 5% chance: uniform between 7.5 and 10.
        crashPoint = 7.5 + Math.random() * 2.5;
      } else if (r < 0.605 + 0.1 + 0.2 + 0.1 + 0.05 + 0.04) {
        // 4% chance: uniform between 11 and 12.
        crashPoint = 11 + Math.random() * 1;
      } else {
        // 0.5% chance: exponential (log‑uniform) above 10.
        const expR = Math.random();
        crashPoint = 10 * Math.exp(expR * Math.log(100 / 10));
      }
      crashPointRef.current = crashPoint;
      console.log("Crash point:", crashPoint);
    }

    const growthRate = 0.5; // Base growth rate.

    const animate = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000; // seconds elapsed
      lastTimeRef.current = time;
      // Update multiplier with some jitter for unpredictability.
      setMultiplier((prev) => {
        const jitter = (Math.random() - 0.5) * 0.05; // ±2.5% jitter
        let newVal = prev * (1 + growthRate * dt + jitter);
        const crashPoint = crashPointRef.current || 1;
        if (newVal >= crashPoint) {
          newVal = crashPoint;
          setHasCrashed(true);
          onGameEnd(crashPoint, 0);
        }
        return newVal;
      });
      // Continue animation if not crashed.
      if (!hasCrashed) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      crashPointRef.current = null;
    };
  }, [isPlaying, onGameEnd, hasCrashed]);

  // Cubic Bézier helper.
  const cubicBezier = (
    P0: { x: number; y: number },
    P1: { x: number; y: number },
    P2: { x: number; y: number },
    P3: { x: number; y: number },
    t: number
  ) => {
    const mt = 1 - t;
    return {
      x:
        mt * mt * mt * P0.x +
        3 * mt * mt * t * P1.x +
        3 * mt * t * t * P2.x +
        t * t * t * P3.x,
      y:
        mt * mt * mt * P0.y +
        3 * mt * mt * t * P1.y +
        3 * mt * t * t * P2.y +
        t * t * t * P3.y,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas.
    ctx.clearRect(0, 0, width, height);

    // --- Draw the multiplier text (background layer) ---
    ctx.save();
    // Reset transform so text is drawn in screen coordinates.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "48px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(multiplier.toFixed(2) + "x", width / 2, height / 2);
    ctx.restore();
    // -----------------------------------------------------

    // Define the cubic Bézier curve for the rocket path.
    const margin = 20;
    const P0 = { x: margin, y: height - margin };
    // Start by moving right (almost horizontal).
    const P1 = { x: margin + (width - 2 * margin) * 0.3, y: height - margin };
    // Then gradually curve upward.
    const P2 = { x: margin + (width - 2 * margin) * 0.65, y: height * 0.4 };
    // End near the top right.
    const P3 = { x: width - margin, y: margin };

    // Compute progress along the curve.
    const crashPoint = crashPointRef.current || 1;
    const tProgress = Math.min((multiplier - 1) / (crashPoint - 1), 1);
    const tip = cubicBezier(P0, P1, P2, P3, tProgress);

    // --- Camera Following ---
    // We want the rocket tip to appear at a desired screen position.
    const desired = { x: width / 2, y: height * 0.7 };
    const targetOffset = { x: desired.x - tip.x, y: desired.y - tip.y };
    // Increase the interpolation factor for more responsive following.
    cameraOffsetRef.current.x += 0.2 * (targetOffset.x - cameraOffsetRef.current.x);
    cameraOffsetRef.current.y += 0.2 * (targetOffset.y - cameraOffsetRef.current.y);
    const cameraOffset = cameraOffsetRef.current;
    // ---------------------------------

    ctx.save();
    // Apply camera translation.
    ctx.translate(cameraOffset.x, cameraOffset.y);

    // Draw the partial cubic Bézier curve.
    ctx.beginPath();
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * tProgress;
      const { x, y } = cubicBezier(P0, P1, P2, P3, t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    // Draw the rocket (or explosion) image at the tip.
    const img = hasCrashed ? explosionImg.current : rocketImg.current;
    if (img) {
      const imgSize = 40;
      ctx.drawImage(img, tip.x - imgSize / 2, tip.y - imgSize / 2, imgSize, imgSize);
    }
    ctx.restore();
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
