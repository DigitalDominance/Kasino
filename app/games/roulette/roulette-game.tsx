"use client";

import { useEffect, useRef, useState } from "react";

// Define the roulette numbers and their colors.
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

export function RouletteGame({ isPlaying, selectedBet, onGameEnd, betAmount }: RouletteGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);

  // Easing function for a smooth ease-out animation.
  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

  // Determine the winning number based on the bet.
  const determineWinningNumber = (): number => {
    // 60% chance the house “forces” a loss for bets on color/odd/even.
    const r = Math.random();
    if (r < 0.6 && selectedBet) {
      // For color bets.
      if (selectedBet.type === "red" || selectedBet.type === "black") {
        // Return a number of the opposite color.
        const opp = ROULETTE_NUMBERS.filter((n) => n.color !== selectedBet.type && n.num !== 0);
        return opp[Math.floor(Math.random() * opp.length)].num;
      }
      // For odd/even bets.
      if (selectedBet.type === "odd" || selectedBet.type === "even") {
        const opp = ROULETTE_NUMBERS.filter((n) => {
          if (n.num === 0) return false;
          return selectedBet.type === "odd" ? n.num % 2 === 0 : n.num % 2 === 1;
        });
        return opp[Math.floor(Math.random() * opp.length)].num;
      }
      // For dozen bets, force a loss.
      if (["1st12", "2nd12", "3rd12"].includes(selectedBet.type)) {
        const targetRange =
          selectedBet.type === "1st12"
            ? { min: 1, max: 12 }
            : selectedBet.type === "2nd12"
            ? { min: 13, max: 24 }
            : { min: 25, max: 36 };
        // Return a number outside the selected dozen.
        const other = ROULETTE_NUMBERS.filter((n) => n.num < targetRange.min || n.num > targetRange.max);
        return other[Math.floor(Math.random() * other.length)].num;
      }
      // For a single number bet, force a loss by not returning the chosen number.
      if (!isNaN(Number(selectedBet.type))) {
        let randomNum: number;
        do {
          randomNum = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)].num;
        } while (randomNum === Number(selectedBet.type));
        return randomNum;
      }
    }
    // Else (40% chance or no bet) let the player win or just pick a random number.
    if (selectedBet) {
      if (selectedBet.type === "red" || selectedBet.type === "black") {
        const same = ROULETTE_NUMBERS.filter((n) => n.color === selectedBet.type);
        return same[Math.floor(Math.random() * same.length)].num;
      }
      if (selectedBet.type === "odd" || selectedBet.type === "even") {
        const same = ROULETTE_NUMBERS.filter((n) => {
          if (n.num === 0) return false;
          return selectedBet.type === "odd" ? n.num % 2 === 1 : n.num % 2 === 0;
        });
        return same[Math.floor(Math.random() * same.length)].num;
      }
      if (["1st12", "2nd12", "3rd12"].includes(selectedBet.type)) {
        const targetRange =
          selectedBet.type === "1st12"
            ? { min: 1, max: 12 }
            : selectedBet.type === "2nd12"
            ? { min: 13, max: 24 }
            : { min: 25, max: 36 };
        const inRange = ROULETTE_NUMBERS.filter((n) => n.num >= targetRange.min && n.num <= targetRange.max);
        return inRange[Math.floor(Math.random() * inRange.length)].num;
      }
      // For a single number bet, win if the selected number comes up.
      if (!isNaN(Number(selectedBet.type))) {
        return Number(selectedBet.type);
      }
    }
    // Fallback: return a random number.
    return ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)].num;
  };

  // Calculate winnings based on bet type.
  const calculateWinnings = (winningNumber: number): number => {
    let winAmount = 0;
    if (!selectedBet) return winAmount;
    const { type, amount } = selectedBet;
    if (type === "red" && ROULETTE_NUMBERS.find((n) => n.num === winningNumber)?.color === "red") {
      winAmount = amount * 2;
    } else if (type === "black" && ROULETTE_NUMBERS.find((n) => n.num === winningNumber)?.color === "black") {
      winAmount = amount * 2;
    } else if (
      type === "odd" &&
      winningNumber !== 0 &&
      winningNumber % 2 === 1
    ) {
      winAmount = amount * 2;
    } else if (
      type === "even" &&
      winningNumber !== 0 &&
      winningNumber % 2 === 0
    ) {
      winAmount = amount * 2;
    } else if (
      type === "1st12" &&
      winningNumber >= 1 &&
      winningNumber <= 12
    ) {
      winAmount = amount * 3;
    } else if (
      type === "2nd12" &&
      winningNumber >= 13 &&
      winningNumber <= 24
    ) {
      winAmount = amount * 3;
    } else if (
      type === "3rd12" &&
      winningNumber >= 25 &&
      winningNumber <= 36
    ) {
      winAmount = amount * 3;
    } else if (!isNaN(Number(type)) && Number(type) === winningNumber) {
      // Single–number bet (payout 35x)
      winAmount = amount * 35;
    }
    return winAmount;
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions.
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Animation settings.
    const spinDuration = 6000; // total spin time in ms
    const totalRotations = 8; // full rotations before slowing down

    // Determine the winning number and its index.
    const winningNumber = determineWinningNumber();
    const winningIndex = ROULETTE_NUMBERS.findIndex((n) => n.num === winningNumber);
    // Each segment occupies an angle of 360/37 degrees.
    const segmentAngle = 360 / ROULETTE_NUMBERS.length;
    // Calculate target rotation so that the winning segment lines up with the pointer at top (0°).
    // (We add a half–segment to center the segment.)
    const targetRotation = totalRotations * 360 + (winningIndex + 0.5) * segmentAngle;

    const startTime = performance.now();
    setSpinning(true);

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      const easedProgress = easeOutCubic(progress);
      const currentRotation = easedProgress * targetRotation;

      // Draw the wheel.
      drawWheel(ctx, currentRotation, size);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin complete.
        setSpinning(false);
        const winAmount = calculateWinnings(winningNumber);
        onGameEnd(winningNumber, winAmount);
      }
    };

    requestAnimationFrame(animate);
  }, [isPlaying]);

  // Function to draw the roulette wheel with a given rotation.
  const drawWheel = (ctx: CanvasRenderingContext2D, rotation: number, size: number) => {
    ctx.clearRect(0, 0, size, size);
    const radius = size / 2;
    const center = { x: radius, y: radius };

    // Draw each segment.
    ROULETTE_NUMBERS.forEach((segment, i) => {
      const startAngle = ((i * (360 / ROULETTE_NUMBERS.length) - rotation) * Math.PI) / 180;
      const endAngle = (((i + 1) * (360 / ROULETTE_NUMBERS.length) - rotation) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, radius, startAngle, endAngle);
      ctx.closePath();
      // Fill with the segment’s color.
      if (segment.color === "green") {
        ctx.fillStyle = "#008000";
      } else if (segment.color === "red") {
        ctx.fillStyle = "#e74c3c";
      } else {
        ctx.fillStyle = "#2c3e50";
      }
      ctx.fill();

      // Draw segment border.
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw number text.
      const textAngle = (startAngle + endAngle) / 2;
      const textRadius = radius * 0.7;
      const textX = center.x + textRadius * Math.cos(textAngle);
      const textY = center.y + textRadius * Math.sin(textAngle);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(segment.num.toString(), textX, textY);
    });

    // Draw the pointer (a simple triangle at the top).
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.moveTo(center.x - 10, 10);
    ctx.lineTo(center.x + 10, 10);
    ctx.lineTo(center.x, 30);
    ctx.closePath();
    ctx.fill();
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        backgroundColor: "#000",
      }}
    />
  );
}
