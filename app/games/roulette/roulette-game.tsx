"use client";

import { useEffect, useRef, useState } from "react";

// Define roulette numbers and colors.
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

interface RouletteGameProps {
  isPlaying: boolean;
  selectedBet: { type: string; amount: number } | null;
  onGameEnd: (result: number, winAmount: number) => void;
  betAmount: number;
}

// Ease–out cubic easing function.
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function RouletteGame({ isPlaying, selectedBet, onGameEnd, betAmount }: RouletteGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);

  // Determine the winning number with forced probabilities for "1st12"/"2nd12"/"3rd12" and "green".
  const determineWinningNumber = (): number => {
    if (!selectedBet) {
      return ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)].num;
    }
    const r = Math.random();
    // For red, black, odd, even use existing house-edge logic.
    if (selectedBet.type === "red" || selectedBet.type === "black" ||
        selectedBet.type === "odd" || selectedBet.type === "even") {
      if (r < 0.6) {
        // Force a loss.
        if (selectedBet.type === "red" || selectedBet.type === "black") {
          const opp = ROULETTE_NUMBERS.filter((n) => n.color !== selectedBet.type && n.num !== 0);
          return opp[Math.floor(Math.random() * opp.length)].num;
        } else {
          const opp = ROULETTE_NUMBERS.filter((n) => {
            if (n.num === 0) return false;
            return selectedBet.type === "odd" ? n.num % 2 === 0 : n.num % 2 === 1;
          });
          return opp[Math.floor(Math.random() * opp.length)].num;
        }
      } else {
        // Let the player win naturally.
        if (selectedBet.type === "red" || selectedBet.type === "black") {
          const same = ROULETTE_NUMBERS.filter((n) => n.color === selectedBet.type);
          return same[Math.floor(Math.random() * same.length)].num;
        } else {
          const same = ROULETTE_NUMBERS.filter((n) => {
            if (n.num === 0) return false;
            return selectedBet.type === "odd" ? n.num % 2 === 1 : n.num % 2 === 0;
          });
          return same[Math.floor(Math.random() * same.length)].num;
        }
      }
    }
    // For 1-12, 13-24, 25-36 – force win with 1 in 5 chance.
    if (["1st12", "2nd12", "3rd12"].includes(selectedBet.type)) {
      let range: { min: number; max: number };
      if (selectedBet.type === "1st12") range = { min: 1, max: 12 };
      else if (selectedBet.type === "2nd12") range = { min: 13, max: 24 };
      else range = { min: 25, max: 36 };

      if (Math.random() < 0.2) {
        // Win: choose randomly from the range.
        const inRange = ROULETTE_NUMBERS.filter((n) => n.num >= range.min && n.num <= range.max);
        return inRange[Math.floor(Math.random() * inRange.length)].num;
      } else {
        // Lose: choose randomly from outside the range.
        const outRange = ROULETTE_NUMBERS.filter((n) => n.num < range.min || n.num > range.max);
        return outRange[Math.floor(Math.random() * outRange.length)].num;
      }
    }
    // For green – force win with 1 in 37 chance.
    if (selectedBet.type === "green") {
      if (Math.random() < 1 / 37) {
        return 0;
      } else {
        const nonGreen = ROULETTE_NUMBERS.filter((n) => n.num !== 0);
        return nonGreen[Math.floor(Math.random() * nonGreen.length)].num;
      }
    }
    // Fallback:
    return ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)].num;
  };

  // Calculate winnings with updated rewards.
  const calculateWinnings = (winningNumber: number): number => {
    let winAmount = 0;
    if (!selectedBet) return winAmount;
    const { type, amount } = selectedBet;
    if (type === "red" && ROULETTE_NUMBERS.find((n) => n.num === winningNumber)?.color === "red") {
      winAmount = amount * 2;
    } else if (type === "black" && ROULETTE_NUMBERS.find((n) => n.num === winningNumber)?.color === "black") {
      winAmount = amount * 2;
    } else if (type === "odd" && winningNumber !== 0 && winningNumber % 2 === 1) {
      winAmount = amount * 2;
    } else if (type === "even" && winningNumber !== 0 && winningNumber % 2 === 0) {
      winAmount = amount * 2;
    } else if (type === "1st12" && winningNumber >= 1 && winningNumber <= 12) {
      winAmount = amount * 3;
    } else if (type === "2nd12" && winningNumber >= 13 && winningNumber <= 24) {
      winAmount = amount * 3;
    } else if (type === "3rd12" && winningNumber >= 25 && winningNumber <= 36) {
      winAmount = amount * 3;
    } else if (type === "green" && winningNumber === 0) {
      winAmount = amount * 10;
    }
    return winAmount;
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure canvas is square.
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Use exactly 3 full rotations.
    const spinDuration = 6000; // ms
    const rotations = 3;
    const segmentAngle = 360 / ROULETTE_NUMBERS.length;
    const pointerAngle = 270; // Top center

    const winningNumber = determineWinningNumber();
    const winningIndex = ROULETTE_NUMBERS.findIndex((n) => n.num === winningNumber);
    // Final rotation so the winning segment's center lands exactly at pointerAngle.
    const finalRotation = rotations * 360 + ((winningIndex + 0.5) * segmentAngle - pointerAngle);

    const startTime = performance.now();
    setSpinning(true);

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      const easedProgress = easeOutCubic(progress);
      const currentRotation = easedProgress * finalRotation;

      drawWheel(ctx, currentRotation, size);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const winAmt = calculateWinnings(winningNumber);
        onGameEnd(winningNumber, winAmt);
      }
    };

    requestAnimationFrame(animate);
  }, [isPlaying]);

  // Draw the wheel (markers shifted 15px upward).
  const drawWheel = (ctx: CanvasRenderingContext2D, rotation: number, size: number) => {
    ctx.clearRect(0, 0, size, size);
    const radius = size / 2;
    const center = { x: radius, y: radius };

    ROULETTE_NUMBERS.forEach((segment, i) => {
      const startAngle = ((i * (360 / ROULETTE_NUMBERS.length) - rotation) * Math.PI) / 180;
      const endAngle = (((i + 1) * (360 / ROULETTE_NUMBERS.length) - rotation) * Math.PI) / 180;
      
      // Draw segment.
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle =
        segment.color === "green" ? "#008000" : segment.color === "red" ? "#e74c3c" : "#2c3e50";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw number text.
      const textAngle = (startAngle + endAngle) / 2;
      const textRadius = radius * 0.65;
      const textX = center.x + textRadius * Math.cos(textAngle);
      const textY = center.y + textRadius * Math.sin(textAngle);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(segment.num.toString(), textX, textY);

      // Draw marker (glamour) along outer edge – shifted 15px upward.
      const markerRadius = radius * 0.9;
      const markerX = center.x + markerRadius * Math.cos(textAngle);
      const markerY = center.y + markerRadius * Math.sin(textAngle) - 15;
      ctx.beginPath();
      ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#49EACB";
      ctx.fill();
    });

    // Draw fixed pointer at top center.
    ctx.fillStyle = "#49EACB";
    ctx.beginPath();
    ctx.moveTo(center.x - 12, 20);
    ctx.lineTo(center.x + 12, 20);
    ctx.lineTo(center.x, 40);
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
