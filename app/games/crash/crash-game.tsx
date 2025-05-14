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

  // Keep ref & parent callback in sync
  useEffect(() => {
    multRef.current = multiplier;
    onMultiplierChange?.(multiplier);
  }, [multiplier, onMultiplierChange]);

  // 1) Animate the crash curve
  useEffect(() => {
    if (!isPlaying) return;
    const start = performance.now();
    const growthRate = 0.32;
    const crashPt = 20; // fallback
    const totalSec = Math.log(crashPt) / growthRate;

    const step = (t: number) => {
      const elapsed = (t - start) / 1000;
      const mult = Math.exp(growthRate * elapsed);
      setMultiplier(mult);
      drawCurve(mult, elapsed, totalSec);
      reqRef.current = requestAnimationFrame(step);
    };
    reqRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isPlaying]);

  // 2) Poll backend for crash
  useEffect(() => {
    if (!isPlaying) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.post(
          "https://kasino-backend-4818b4b69870.herokuapp.com/api/game/settle",
          { gameId, checkMultiplier: multRef.current }
        );
        if (data.gameResult === "lose") {
          flashCrash();
          clearInterval(pollRef.current!);
          cancelAnimationFrame(reqRef.current!);
          onCrashed();
        }
      } catch {
        // ignore
      }
    }, 100);
    return () => clearInterval(pollRef.current!);
  }, [gameId, isPlaying, onCrashed]);

  // 3) Drawing helper
  const drawCurve = (
    current: number,
    elapsed: number,
    total: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize for DPI
    const w = canvas.clientWidth,
      h = canvas.clientHeight,
      dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Compute point
    const x = Math.min((elapsed / total) * w, w);
    const y = h - (Math.log(current) / Math.log(current + 1)) * h;

    // Store history
    if (!drawCurve.points) drawCurve.points = [];
    drawCurve.points.push({ x, y });

    // Gradient fill under curve
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, "rgba(73,234,203,0.3)");
    fillGrad.addColorStop(1, "rgba(73,234,203,0.01)");
    ctx.beginPath();
    ctx.moveTo(0, h);
    drawCurve.points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(x, h);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Curve line
    ctx.beginPath();
    ctx.moveTo(0, drawCurve.points[0]?.y ?? h);
    ctx.strokeStyle = "#49EACB";
    ctx.lineWidth = 2;
    drawCurve.points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Rocket dot
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#49EACB";
    ctx.fill();

    // Big centered neon multiplier
    const label = current.toFixed(2) + "×";
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // text gradient
    const textGrad = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.6);
    textGrad.addColorStop(0, "#49EACB");
    textGrad.addColorStop(1, "#B8FFF9");
    ctx.fillStyle = textGrad;
    // glow outline
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(73,234,203,0.8)";
    ctx.strokeText(label, w / 2, h / 2);
    ctx.fillText(label, w / 2, h / 2);
  };
  drawCurve.points = drawCurve.points || [] as { x: number; y: number }[];

  // 4) Flash on crash
  const flashCrash = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.save();
    ctx.fillStyle = "rgba(234,73,73,0.4)";
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
