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

  // Use a ref for the crash point so it's computed only once per round.
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

    // Set margins and compute line coordinates.
    const margin = 20;
    const lineY = canvas.clientHeight / 2;
    const crashPoint = crashPointRef.current || 1.5;
    const lineMaxWidth = canvas.clientWidth - 2 * margin;
    // Compute progress based on multiplier (clamped to 1).
    const progress = Math.min((multiplier - 1) / (crashPoint - 1), 1);
    const rocketX = margin + progress * lineMaxWidth;

    // Draw the progress line.
    ctx.beginPath();
    ctx.moveTo(margin, lineY);
    ctx.lineTo(rocketX, lineY);
    ctx.strokeStyle = "#00FF00"; // A bright green for a nice look.
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    // Choose the image: rocket while running, explosion when crashed.
    const img = hasCrashed ? explosionImg.current : rocketImg.current;
    if (img) {
      const imgSize = 40; // Size for the rocket/explosion image.
      // Draw the image centered on the tip of the line.
      ctx.drawImage(img, rocketX - imgSize / 2, lineY - imgSize / 2, imgSize, imgSize);
    }

    // Optionally, display the multiplier text.
    ctx.font = "24px Arial";
    ctx.fillStyle = "white";
    const text = multiplier.toFixed(2) + "x";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.clientWidth - textWidth) / 2, canvas.clientHeight - 30);
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
