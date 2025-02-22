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

  // Camera offset ref for smooth following.
  const cameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Compute the crash multiplier only once per round.
  const crashPointRef = useRef<number | null>(null);

  // Ref for randomized control points for the rocket's path.
  const controlPointsRef = useRef<{
    P0: { x: number; y: number };
    P1: { x: number; y: number };
    P2: { x: number; y: number };
    P3: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    setHasCrashed(false);

    // Generate crash point only once per round.
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
    const growthRate = 0.5; // Adjust as needed.

    const animate = (time: number) => {
      const elapsed = time - start;
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
      const cp = crashPointRef.current;
      if (cp && currentMultiplier >= cp) {
        setMultiplier(cp);
        setHasCrashed(true);
        onGameEnd(cp, 0);
        return;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      crashPointRef.current = null;
      controlPointsRef.current = null; // Reset curve for the next round.
    };
  }, [isPlaying]);

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

    // --- Draw the multiplier text (centered) ---
    ctx.save();
    ctx.font = "48px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(multiplier.toFixed(2) + "x", width / 2, height / 2);
    ctx.restore();

    // Initialize a randomized curve if not already set.
    if (!controlPointsRef.current) {
      const margin = 20;
      const P0 = { x: margin, y: height - margin };
      const P1 = {
        x: margin + (width - 2 * margin) * (0.2 + Math.random() * 0.2),
        y: height - margin - Math.random() * 30,
      };
      const P2 = {
        x: margin + (width - 2 * margin) * (0.5 + Math.random() * 0.3),
        y: height * (0.2 + Math.random() * 0.3),
      };
      const P3 = {
        x: margin + (width - 2 * margin) * (0.8 + Math.random() * 0.2),
        y: margin + Math.random() * 20,
      };
      controlPointsRef.current = { P0, P1, P2, P3 };
    }
    const { P0, P1, P2, P3 } = controlPointsRef.current!;

    // --- Determine the tip progress along the path based on crash point (cp) ---
    // New mapping:
    // • cp in [1, 1.2] → tip = P0 (no movement)
    // • cp in (1.2, 1.5] → tip goes to P1 (~33% along curve)
    // • cp in (1.5, 2] → tip goes to P2 (~66% along curve)
    // • cp in (2, 3] → tip goes to P3 (end of curve)
    // • cp > 3 → full curve then upward extension.
    const cp = crashPointRef.current || 1;
    let tProgress = 0; // progress along cubic Bézier (0 to 1)
    let extension = 0; // extra upward extension if multiplier > 3
    if (cp <= 1.2) {
      // For crash multipliers between 1 and 1.2, stay at P0.
      tProgress = 0;
    } else if (cp <= 1.5) {
      // Map multiplier from 1 to cp onto 0 to 0.33 (P1).
      const targetT = 0.33;
      tProgress =
        multiplier <= cp
          ? ((multiplier - 1) / (cp - 1)) * targetT
          : targetT;
    } else if (cp <= 2) {
      // Map multiplier from 1 to cp onto 0 to 0.66 (P2).
      const targetT = 0.66;
      tProgress =
        multiplier <= cp
          ? ((multiplier - 1) / (cp - 1)) * targetT
          : targetT;
    } else if (cp <= 3) {
      // Map multiplier from 1 to cp onto 0 to 1.0 (P3).
      const targetT = 1.0;
      tProgress =
        multiplier <= cp
          ? ((multiplier - 1) / (cp - 1)) * targetT
          : targetT;
    } else {
      // For crash multipliers above 3, follow curve until multiplier 3 then extend upward.
      if (multiplier <= 3) {
        tProgress = ((multiplier - 1) / (3 - 1)) * 1.0;
      } else {
        tProgress = 1.0;
        extension = (multiplier - 3) * 50; // Adjust extension factor as needed.
      }
    }

    // --- Draw the trajectory line ---
    ctx.save();
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    // For cp > 3 and multiplier > 3, draw the full curve plus extension.
    if (cp > 3 && multiplier > 3) {
      const segments = 30;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const { x, y } = cubicBezier(P0, P1, P2, P3, t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // Draw extension upward from P3.
      const extendedTip = { x: P3.x, y: P3.y - extension };
      ctx.lineTo(extendedTip.x, extendedTip.y);
    } else {
      // Otherwise, draw only up to the current tProgress.
      const segments = 30;
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * tProgress;
        const { x, y } = cubicBezier(P0, P1, P2, P3, t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();

    // --- Compute the rocket tip position ---
    let tip = { x: 0, y: 0 };
    if (cp > 3 && multiplier > 3) {
      tip = { x: P3.x, y: P3.y - extension };
    } else {
      tip = cubicBezier(P0, P1, P2, P3, tProgress);
    }

    // --- Apply camera transform to keep the rocket in view ---
    const desired = { x: width / 2, y: height * 0.7 };
    const targetOffset = { x: desired.x - tip.x, y: desired.y - tip.y };
    cameraOffsetRef.current.x += 0.1 * (targetOffset.x - cameraOffsetRef.current.x);
    cameraOffsetRef.current.y += 0.1 * (targetOffset.y - cameraOffsetRef.current.y);
    const cameraOffset = cameraOffsetRef.current;

    ctx.save();
    ctx.translate(cameraOffset.x, cameraOffset.y);

    // --- Draw the rocket or explosion image at the tip ---
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
