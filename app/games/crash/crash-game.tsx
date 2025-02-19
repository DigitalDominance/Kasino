"use client";

import { useRef, useEffect, useState } from "react";

// Constants for the curve (adjust as needed)
const height = 2000;
const coeffB = 0.5;
const coeffA = height * 0.16;

// Load assets – ensure these files exist in your public folder.
let rocketImage: HTMLImageElement, explodeImage: HTMLImageElement;
if (typeof window !== "undefined") {
  rocketImage = new Image();
  rocketImage.src = "/rocket.svg";
  explodeImage = new Image();
  explodeImage.src = "/explode.svg";
}

const rocketWidth = 220;
const rocketHeight = 220;

function curveFunction(t: number) {
  return coeffA * (Math.exp(coeffB * t) - 1);
}

export type GameStatus = "Waiting" | "Running" | "Crashed" | "CashedOut";

interface CrashGameProps {
  isPlaying: boolean;
  betAmount: number;
  autoCashOut?: number; // if provided, auto-cashout multiplier
  onGameEnd: (finalMultiplier: number, winAmount: number) => void;
  onCashoutSuccess: (cashoutMultiplier: number, winAmount: number) => void;
  onManualCashout: () => void;
}

export function CrashGame({
  isPlaying,
  betAmount,
  autoCashOut,
  onGameEnd,
  onCashoutSuccess,
  onManualCashout,
}: CrashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("Waiting");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [crashMultiplier, setCrashMultiplier] = useState<number>(1);
  const requestRef = useRef<number>();

  // Start the game animation only when isPlaying becomes true.
  useEffect(() => {
    if (!isPlaying) {
      setGameStatus("Waiting");
      setTimeElapsed(0);
      setMultiplier(1);
      return;
    }
    // Start the game
    setGameStatus("Running");
    // Choose a random crash multiplier between 1.5 and 100 (biased toward lower values)
    const random = Math.random();
    const crash = Math.max(1.5, Math.min(100, 1.5 + random * 98));
    setCrashMultiplier(crash);

    const start = performance.now();
    const growthRate = 0.00006; // multiplier = exp(growthRate * elapsed)
    const animate = (time: number) => {
      const elapsed = time - start;
      setTimeElapsed(elapsed);
      const newMultiplier = Math.exp(growthRate * elapsed);
      setMultiplier(newMultiplier);

      // Auto cashout check
      if (autoCashOut && newMultiplier >= autoCashOut) {
        setGameStatus("CashedOut");
        onCashoutSuccess(newMultiplier, betAmount * newMultiplier);
        cancelAnimationFrame(requestRef.current);
        return;
      }
      // Crash condition
      if (newMultiplier >= crash) {
        setGameStatus("Crashed");
        onGameEnd(crash, 0); // no win if crashed
        cancelAnimationFrame(requestRef.current);
        return;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, autoCashOut, betAmount, onCashoutSuccess, onGameEnd]);

  // Render the canvas contents
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height: canvasHeight } = canvas;
    context.clearRect(0, 0, width, canvasHeight);

    // If the game hasn't started, show a waiting message.
    if (!isPlaying) {
      context.fillStyle = "white";
      context.font = "30px Arial";
      const text = "Place your bet to start playing";
      const textWidth = context.measureText(text).width;
      context.fillText(text, width / 2 - textWidth / 2, canvasHeight / 2);
      return;
    }

    // Draw the rocket path using your accent color.
    const gradient = context.createLinearGradient(0, 0, width, canvasHeight);
    gradient.addColorStop(0, "#49EACB");
    gradient.addColorStop(1, "#111"); // dark shade to blend with black background
    context.strokeStyle = gradient;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, canvasHeight);
    const step = 10;
    for (let t = 0; t < timeElapsed / 10; t += step) {
      const x = t;
      const y = canvasHeight - curveFunction(t / 1000);
      context.lineTo(x, y);
    }
    context.stroke();

    // Determine the rocket's position along the curve.
    const maxX = width - rocketWidth;
    const x = Math.min((timeElapsed / 1000) * 10, maxX);
    const y = canvasHeight - curveFunction(timeElapsed / 1000);

    context.save();
    if (gameStatus === "Crashed") {
      context.translate(x, y);
      context.drawImage(explodeImage, -rocketWidth / 2, -rocketHeight / 2, rocketWidth, rocketHeight);
      context.translate(-x, -y);
    } else {
      // Compute angle from curve derivative.
      const d1 = curveFunction(timeElapsed / 1000);
      const d2 = curveFunction((timeElapsed + 10) / 1000);
      const slope = (d2 - d1) / 10;
      const angle = -Math.atan(slope);
      context.translate(x, y);
      context.rotate(angle);
      context.drawImage(rocketImage, -rocketWidth / 2, -rocketHeight / 2, rocketWidth, rocketHeight);
      context.rotate(-angle);
      context.translate(-x, -y);
    }
    context.restore();

    // Draw the multiplier in a style matching your website.
    context.font = "60px Arial";
    let fillStyle = "white";
    const m = parseFloat(multiplier.toFixed(2));
    if (m > 5) fillStyle = "red";
    else if (m > 2) fillStyle = "yellow";
    context.fillStyle = fillStyle;
    const text = m.toFixed(2) + "x";
    const textWidth = context.measureText(text).width;
    context.fillText(text, width / 2 - textWidth / 2, canvasHeight / 2);
  };

  useEffect(() => {
    renderCanvas();
  }, [timeElapsed, multiplier, gameStatus, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%", // fill the container completely
        display: "block",
        background: "black",
        borderRadius: "8px",
      }}
    />
  );
}
