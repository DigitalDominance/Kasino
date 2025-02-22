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

  // Refs for images.
  const rocketImg = useRef<HTMLImageElement | null>(null);
  const explosionImg = useRef<HTMLImageElement | null>(null);

  // Load images client-side.
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

  // Generate a random Bézier curve configuration per game.
  // The offsets will be added to P1 and P2.
  const curveControlRef = useRef<{
    P1Offset: { x: number; y: number };
    P2Offset: { x: number; y: number };
  } | null>(null);
  useEffect(() => {
    // Reset curve control when a new game starts.
    curveControlRef.current = {
      P1Offset: { x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40 },
      P2Offset: { x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40 },
    };
  }, [isPlaying]);

  // Compute the crash multiplier only once per round.
  const crashPointRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying) return;
    setHasCrashed(false);
    setMultiplier(1);

    if (crashPointRef.current === null) {
      const r = Math.random();
      let crashPoint;
      if (r < 0.605) {
        // 60.5% chance: uniform between 1 and 1.5.
        crashPoint = 1 + Math.random() * 0.5;
      } else if (r < 0.705) {
        // 10% chance: uniform between 1.5 and 2.
        crashPoint = 1.5 + Math.random() * 0.5;
      } else if (r < 0.905) {
        // 20% chance: uniform between 2 and 3.
        crashPoint = 2 + Math.random() * 1;
      } else if (r < 0.955) {
        // 5% chance: uniform between 5 and 7.5.
        crashPoint = 5 + Math.random() * 2.5;
      } else if (r < 0.995) {
        // 4% chance: uniform between 7.5 and 10.
        crashPoint = 7.5 + Math.random() * 2.5;
      } else {
        // 0.5% chance: exponential (log‑uniform) above 10.
        const expR = Math.random();
        crashPoint = 10 * Math.exp(expR * Math.log(100 / 10));
      }
      crashPointRef.current = crashPoint;
      console.log("Crash point:", crashPointRef.current);
    }

    const start = performance.now();
    const growthRate = 0.5; // Base growth rate.

    const animate = (time: number) => {
      const elapsed = time - start;
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
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
  }, [isPlaying, onGameEnd]);

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

    // --- Draw centered multiplier text (background layer) ---
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "48px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(multiplier.toFixed(2) + "x", width / 2, height / 2);
    ctx.restore();
    // --------------------------------------------------------

    // Set up our dynamic Bézier curve.
    const margin = 20;
    const P0 = { x: margin, y: height - margin };

    // Compute a dynamic P3 based on the crash multiplier.
    const maxMultiplier = 100;
    const crashPoint = crashPointRef.current || 1;
    const norm = Math.min((crashPoint - 1) / (maxMultiplier - 1), 1);
    // As crash multiplier increases, P3 moves farther right and higher.
    const P3 = {
      x: margin + (width - 2 * margin) * (0.3 + 0.7 * norm),
      y: margin + (height - 2 * margin) * (1 - norm),
    };

    // Use random offsets for control points (generated per game).
    const baseP1 = {
      x: P0.x + 0.3 * (P3.x - P0.x),
      y: P0.y + 0.3 * (P3.y - P0.y),
    };
    const baseP2 = {
      x: P0.x + 0.6 * (P3.x - P0.x),
      y: P0.y + 0.6 * (P3.y - P0.y),
    };

    const randomOffsets = curveControlRef.current || {
      P1Offset: { x: 0, y: 0 },
      P2Offset: { x: 0, y: 0 },
    };
    const P1 = {
      x: baseP1.x + randomOffsets.P1Offset.x,
      y: baseP1.y + randomOffsets.P1Offset.y,
    };
    const P2 = {
      x: baseP2.x + randomOffsets.P2Offset.x,
      y: baseP2.y + randomOffsets.P2Offset.y,
    };

    // tProgress is determined by current multiplier relative to crashPoint.
    const tProgress = Math.min((multiplier - 1) / (crashPoint - 1), 1);

    // Determine the rocket tip along the curve.
    const tip = cubicBezier(P0, P1, P2, P3, tProgress);

    // --- Camera Following with Zoom ---
    // We'll zoom in on the curve.
    const zoom = 2; // Zoom factor.
    // Desired position for the rocket tip in screen coordinates.
    const desired = { x: width / 2, y: height * 0.7 };
    // Compute target offset so that after scaling, the tip appears at 'desired'.
    const targetOffset = {
      x: desired.x - tip.x * zoom,
      y: desired.y - tip.y * zoom,
    };
    // Smoothly interpolate camera offset.
    cameraOffsetRef.current.x += 0.1 * (targetOffset.x - cameraOffsetRef.current.x);
    cameraOffsetRef.current.y += 0.1 * (targetOffset.y - cameraOffsetRef.current.y);
    const cameraOffset = cameraOffsetRef.current;

    ctx.save();
    ctx.translate(cameraOffset.x, cameraOffset.y);
    ctx.scale(zoom, zoom);
    // --------------------------------------------------

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
