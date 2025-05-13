"use client";

import { useRef, useEffect, useState } from "react";
import axios from "axios";

interface CrashGameProps {
  /** The database ID of this round (returned from /play) */
  gameId: string;
  /** Whether we should be animating right now */
  isPlaying: boolean;
  /** Called once the server reports a crash (gameResult==="lose") */
  onCrashed: () => void;
  /** Called on every frame so the parent can update the displayed multiplier/cash-out button */
  onMultiplierChange?: (mult: number) => void;
}

export function CrashGame({
  gameId,
  isPlaying,
  onCrashed,
  onMultiplierChange,
}: CrashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const [multiplier, setMultiplier] = useState(1);
  const multRef = useRef(1);

  // Keep a ref in sync for polling
  useEffect(() => {
    multRef.current = multiplier;
    onMultiplierChange?.(multiplier);
  }, [multiplier, onMultiplierChange]);

  // 1) Exponential growth animation
  useEffect(() => {
    if (!isPlaying) return;
    let start: number;
    const growthRate = 0.1;

    const tick = (time: number) => {
      if (!start) start = time;
      const elapsed = (time - start) / 1000;
      const curr = Math.exp(growthRate * elapsed);
      setMultiplier(curr);
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  // 2) Poll the backend every 200 ms with our current multiplier
  useEffect(() => {
    if (!isPlaying) return;
    intervalRef.current = setInterval(async () => {
      try {
        const { data } = await axios.post("https://kasino-backend-4818b4b69870.herokuapp.com/api/game/settle", {
          gameId,
          checkMultiplier: multRef.current,
        });
        if (data.gameResult === "lose") {
          // Stop everything and notify parent
          clearInterval(intervalRef.current!);
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          onCrashed();
        }
      } catch {
        /* ignore network errors */ 
      }
    }, 200);
    return () => clearInterval(intervalRef.current!);
  }, [gameId, isPlaying, onCrashed]);

  // 3) Draw the multiplier on a <canvas>
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // setup hi-dpi
    const w = canvas.clientWidth,
          h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#00FF00";
    ctx.fillText(multiplier.toFixed(2) + "×", w / 2, h / 2);
  }, [multiplier]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        background: "transparent",
        borderRadius: 8,
      }}
    />
  );
}
