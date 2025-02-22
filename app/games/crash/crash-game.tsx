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

  // Create refs for the images, initializing them as null.
  const rocketImg = useRef<HTMLImageElement | null>(null);
  const explosionImg = useRef<HTMLImageElement | null>(null);

  // Load the images from the public folder in a client-side effect.
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

  // Use a ref for the crash point so it’s computed only once per round.
  const crashPointRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    // Reset the crash state when a new round starts.
    setHasCrashed(false);

    // Generate the crash point only once per round.
    if (crashPointRef.current === null) {
      crashPointRef.current = Math.max(1.5, 1 / (1 - Math.random() * 0.95));
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
        // Set multiplier to the crash point and trigger explosion.
        setMultiplier(crashPoint);
        setHasCrashed(true);
        onGameEnd(crashPoint, 0);
        return; // Stop the animation loop.
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      crashPointRef.current = null;
    };
  }, [isPlaying]);

  // This effect handles drawing the game on the canvas.
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

    // Define margin and full canvas dimensions.
    const margin = 20;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Define quadratic Bézier curve points:
    // Start at bottom-left, end at top-right, with a control point at top-center.
    const P0 = { x: margin, y: height - margin };
    const P1 = { x: width / 2, y: margin };
    const P2 = { x: width - margin, y: margin };

    // Compute progress (t) based on multiplier relative to crash point.
    const crashPoint = crashPointRef.current || 1.5;
    const t = Math.min((multiplier - 1) / (crashPoint - 1), 1);

    // Use de Casteljau's algorithm for a quadratic Bézier:
    // A = lerp(P0, P1, t)
    // B = lerp(P1, P2, t)
    // C = lerp(A, B, t) -> Point on the curve at parameter t.
    const A = {
      x: (1 - t) * P0.x + t * P1.x,
      y: (1 - t) * P0.y + t * P1.y,
    };
    const B = {
      x: (1 - t) * P1.x + t * P2.x,
      y: (1 - t) * P1.y + t * P2.y,
    };
    const C = {
      x: (1 - t) * A.x + t * B.x,
      y: (1 - t) * A.y + t * B.y,
    };

    // Draw the partial curve from t=0 to t using the subdivided quadratic curve.
    ctx.beginPath();
    ctx.moveTo(P0.x, P0.y);
    // The partial curve can be drawn as a quadratic curve with control point A and endpoint C.
    ctx.quadraticCurveTo(A.x, A.y, C.x, C.y);
    ctx.strokeStyle = "#00FF00"; // A bright green.
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    // Choose the image: rocket while running, explosion when crashed.
    const img = hasCrashed ? explosionImg.current : rocketImg.current;
    if (img) {
      const imgSize = 40; // Size for the rocket/explosion image.
      // Draw the image centered at the point C (tip of the partial curve).
      ctx.drawImage(img, C.x - imgSize / 2, C.y - imgSize / 2, imgSize, imgSize);
    }

    // Optionally, display the multiplier text at the bottom.
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
