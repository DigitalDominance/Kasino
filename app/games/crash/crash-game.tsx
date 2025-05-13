"use client";

import { useRef, useEffect, useState } from "react";
import axios from "axios";

interface CrashGameProps {
  gameId: string;
  isPlaying: boolean;
  onCrashed: () => void;
  onMultiplierChange?: (mult: number) => void;
}

export function CrashGame({
  gameId,
  isPlaying,
  onCrashed,
  onMultiplierChange,
}: CrashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number>();
  const pollRef = useRef<NodeJS.Timeout>();
  const [multiplier, setMultiplier] = useState(1);
  const multRef = useRef(1);

  // keep ref & parent callback in sync
  useEffect(() => {
    multRef.current = multiplier;
    onMultiplierChange?.(multiplier);
  }, [multiplier, onMultiplierChange]);

  // 1) animate the crash curve
  useEffect(() => {
    if (!isPlaying) return;
    const ctxStart = performance.now();
    const growthRate = 0.12;                          // tweak for speed
    const crashPt = 20;                               // fallback if server not polled yet
    const expectedTime =
      Math.log(crashPt) / growthRate;                 // seconds until crash

    const step = (t: number) => {
      const elapsed = (t - ctxStart) / 1000;
      const mult = Math.exp(growthRate * elapsed);
      setMultiplier(mult);

      // draw immediately
      drawCurve(mult, elapsed, expectedTime);

      // stop if we exceed canvas width or server says crash
      reqRef.current = requestAnimationFrame(step);
    };
    reqRef.current = requestAnimationFrame(step);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isPlaying]);

  // 2) poll backend every 100ms for crash
  useEffect(() => {
    if (!isPlaying) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.post(
          "https://kasino-backend-4818b4b69870.herokuapp.com/api/game/settle",
          { gameId, checkMultiplier: multRef.current }
        );
        if (data.gameResult === "lose") {
          // flash animation
          flashCrash();
          clearInterval(pollRef.current!);
          cancelAnimationFrame(reqRef.current!);
          onCrashed();
        }
      } catch {
        /* ignore */
      }
    }, 100);

    return () => clearInterval(pollRef.current!);
  }, [gameId, isPlaying, onCrashed]);

  // 3) drawing helper
  const drawCurve = (
    currentMult: number,
    elapsedSec: number,
    totalSec: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // resize for DPI
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // map time → x, multiplier → y (log scale)
    const x = Math.min((elapsedSec / totalSec) * w, w);
    const y = h - (Math.log(currentMult) / Math.log(currentMult + 1)) * h;

    // store history
    if (!drawCurve.points) drawCurve.points = [];
    drawCurve.points.push({ x, y });

    // draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "rgba(0,255,0,0.3)");
    gradient.addColorStop(1, "rgba(0,255,0,0.01)");

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (const pt of drawCurve.points!) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(x, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // draw the line
    ctx.beginPath();
    ctx.moveTo(0, drawCurve.points![0]?.y ?? h);
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    for (const pt of drawCurve.points!) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    // draw the “rocket” dot
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#00FF00";
    ctx.fill();

    // draw the current multiplier text
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#00FF00";
    ctx.textAlign = "right";
    ctx.fillText(currentMult.toFixed(2) + "×", w - 10, 30);
  };
  // store persistent points array
  drawCurve.points = drawCurve.points || [] as { x: number; y: number }[];

  // 4) flash effect on crash
  const flashCrash = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    ctx.save();
    ctx.fillStyle = "rgba(255,0,0,0.4)";
    ctx.fillRect(0, 0, w, h);
    setTimeout(() => ctx.restore(), 100);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        background: "black",
        borderRadius: 8,
      }}
    />
  );
}
