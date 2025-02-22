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

    if (crashPointRef.current === null) {
      const r = Math.random();
      let crashPoint;
      if (r < 0.605) {
        crashPoint = 1 + Math.random() * 0.5;
      } else if (r < 0.705) {
        crashPoint = 1.5 + Math.random() * 0.5;
      } else if (r < 0.905) {
        crashPoint = 2 + Math.random() * 1;
      } else if (r < 0.955) {
        crashPoint = 5 + Math.random() * 2.5;
      } else if (r < 0.995) {
        crashPoint = 7.5 + Math.random() * 2.5;
      } else {
        const expR = Math.random();
        crashPoint = 10 * Math.exp(expR * Math.log(100 / 10));
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
      controlPointsRef.current = null; // Reset the curve for the next round.
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

    // Clear the canvas.
    ctx.clearRect(0, 0, width, height);

    // --- Draw the multiplier text (centered) ---
    ctx.save();
    ctx.font = "48px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(multiplier.toFixed(2) + "x", width / 2, height / 2);
    ctx.restore();

    // Initialize a randomized curve if not set.
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

    // --- Determine the progress (tProgress) along the curve ---
    // New mapping for unpredictability:
    // • If crash multiplier (cp) is between 1 and 1.2, the rocket stays at P0.
    // • (1.2, 1.5] maps to ~33% (P1),
    // • (1.5, 2] maps to ~66% (P2),
    // • (2, 3] maps to the full curve (P3),
    // • Above 3, we extend the line upward beyond P3.
    const cp = crashPointRef.current || 1;
    let tProgress = 0;
    let extension = 0;
    if (cp <= 1.2) {
      tProgress = 0;
    } else if (cp <= 1.5) {
      const targetT = 0.33;
      tProgress =
        multiplier <= cp
          ? ((multiplier - 1) / (cp - 1)) * targetT
          : targetT;
    } else if (cp <= 2) {
      const targetT = 0.66;
      tProgress =
        multiplier <= cp
          ? ((multiplier - 1) / (cp - 1)) * targetT
          : targetT;
    } else if (cp <= 3) {
      const targetT = 1.0;
      tProgress =
        multiplier <= cp
          ? ((multiplier - 1) / (cp - 1)) * targetT
          : targetT;
    } else {
      // For cp > 3: while multiplier is below 3, follow the curve.
      if (multiplier <= 3) {
        tProgress = ((multiplier - 1) / (3 - 1)) * 1.0;
      } else {
        tProgress = 1.0;
        extension = (multiplier - 3) * 50; // Adjust the upward extension factor as needed.
      }
    }

    // --- Draw the trajectory line ---
    ctx.save();
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (cp > 3 && multiplier > 3) {
      // Draw the complete cubic Bézier curve.
      const segments = 30;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const { x, y } = cubicBezier(P0, P1, P2, P3, t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // Then extend the line upward.
      const extendedTip = { x: P3.x, y: P3.y - extension };
      ctx.lineTo(extendedTip.x, extendedTip.y);
    } else {
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

    // --- Revert to the original rocket/explosion logic ---
    // The tip for the rocket (or explosion) now always follows the current tProgress along the curve.
    // (Note: even if the line is extended, the explosion remains at the tip of the cubic Bézier path.)
    const tip = cubicBezier(P0, P1, P2, P3, tProgress);

    // --- Apply camera transform to keep the rocket in view ---
    const desired = { x: width / 2, y: height * 0.7 };
    const targetOffset = { x: desired.x - tip.x, y: desired.y - tip.y };
    cameraOffsetRef.current.x += 0.1 * (targetOffset.x - cameraOffsetRef.current.x);
    cameraOffsetRef.current.y += 0.1 * (targetOffset.y - cameraOffsetRef.current.y);
    const cameraOffset = cameraOffsetRef.current;

    ctx.save();
    ctx.translate(cameraOffset.x, cameraOffset.y);

    // --- Draw the rocket or explosion image at the tip (as before) ---
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
