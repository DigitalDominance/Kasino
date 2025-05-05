"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ROULETTE_NUMBERS = [
  { num: 0, color: "green" },
  { num: 32, color: "red" },
  { num: 15, color: "black" },
  { num: 19, color: "red" },
  { num: 4, color: "black" },
  { num: 21, color: "red" },
  { num: 2, color: "black" },
  { num: 25, color: "red" },
  { num: 17, color: "black" },
  { num: 34, color: "red" },
  { num: 6, color: "black" },
  { num: 27, color: "red" },
  { num: 13, color: "black" },
  { num: 36, color: "red" },
  { num: 11, color: "black" },
  { num: 30, color: "red" },
  { num: 8, color: "black" },
  { num: 23, color: "red" },
  { num: 10, color: "black" },
  { num: 5, color: "red" },
  { num: 24, color: "black" },
  { num: 16, color: "red" },
  { num: 33, color: "black" },
  { num: 1, color: "red" },
  { num: 20, color: "black" },
  { num: 14, color: "red" },
  { num: 31, color: "black" },
  { num: 9, color: "red" },
  { num: 22, color: "black" },
  { num: 18, color: "red" },
  { num: 29, color: "black" },
  { num: 7, color: "red" },
  { num: 28, color: "black" },
  { num: 12, color: "red" },
  { num: 35, color: "black" },
  { num: 3, color: "red" },
  { num: 26, color: "black" },
];

interface Props {
  isPlaying: boolean;
  winningNumber: number | null;
}

export function RouletteGame({ isPlaying, winningNumber }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);

  // Spin the wheel for exactly 3 rotations (6 s), aligned so that `winningNumber` lands under the pointer.
  useEffect(() => {
    if (!isPlaying || winningNumber === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const spinDuration = 6000;
    const rotations = 3;
    const segmentAngle = 360 / ROULETTE_NUMBERS.length;
    const pointerAngle = 270;

    const winningIndex = ROULETTE_NUMBERS.findIndex((n) => n.num === winningNumber);
    const finalRotation =
      rotations * 360 +
      ((winningIndex + 0.5) * segmentAngle - pointerAngle);

    const start = performance.now();
    setSpinning(true);

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const frame = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(elapsed / spinDuration, 1);
      const deg = easeOutCubic(pct) * finalRotation;
      drawWheel(ctx, deg, size);
      if (pct < 1) requestAnimationFrame(frame);
      else setSpinning(false);
    };
    requestAnimationFrame(frame);
  }, [isPlaying, winningNumber]);

  // Draw helper (same as before)
  const drawWheel = (
    ctx: CanvasRenderingContext2D,
    rotation: number,
    size: number
  ) => {
    ctx.clearRect(0, 0, size, size);
    const radius = size / 2;
    const center = { x: radius, y: radius };

    ROULETTE_NUMBERS.forEach((seg, i) => {
      const startA = ((i * (360 / ROULETTE_NUMBERS.length) - rotation) * Math.PI) / 180;
      const endA = (((i + 1) * (360 / ROULETTE_NUMBERS.length) - rotation) * Math.PI) / 180;
      // segment fill
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, radius, startA, endA);
      ctx.closePath();
      ctx.fillStyle = seg.color === "green" ? "#008000" : seg.color === "red" ? "#e74c3c" : "#2c3e50";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // number text
      const midA = (startA + endA) / 2;
      const textR = radius * 0.65;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(seg.num.toString(), center.x + textR * Math.cos(midA), center.y + textR * Math.sin(midA));

      // outer marker
      const markR = radius * 0.9;
      ctx.beginPath();
      ctx.arc(center.x + markR * Math.cos(midA), center.y + markR * Math.sin(midA), 4, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = "#49EACB";
      ctx.fill();
    });

    // pointer
    ctx.fillStyle = "#49EACB";
    ctx.beginPath();
    ctx.moveTo(center.x - 12, 5);
    ctx.lineTo(center.x + 12, 5);
    ctx.lineTo(center.x, 25);
    ctx.closePath();
    ctx.fill();
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        maxWidth: "400px",
        height: "400px",
        borderRadius: "8px",
        backgroundColor: "transparent",
      }}
    />
  );
}
