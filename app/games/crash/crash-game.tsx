"use client";

import { useRef, useEffect, useState } from "react";

// Constants for the curve (feel free to adjust)
const height = 2000;
const coeffB = 0.5;
const coeffA = height * 0.16;

// Load assets (make sure these files exist in your public folder)
let rocketImage: HTMLImageElement;
let explodeImage: HTMLImageElement;
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
  betAmount: number;
  autoCashOut?: number; // if provided, auto-cashout multiplier
  onGameEnd: (finalMultiplier: number, winAmount: number) => void;
  onCashout: (cashoutMultiplier: number) => void;
}

export function CrashGame({
  betAmount,
  autoCashOut,
  onGameEnd,
  onCashout,
}: CrashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("Waiting");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [crashMultiplier, setCrashMultiplier] = useState<number>(1);
  const requestRef = useRef<number>();

  // When the game starts, pick a random crash multiplier and begin the animation.
  useEffect(() => {
    // Start immediately on mount.
    setGameStatus("Running");
    // For simulation: choose a crash multiplier between 1.5 and 100, biased toward lower values.
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

      // Check for auto-cashout if provided
      if (autoCashOut && newMultiplier >= autoCashOut) {
        setGameStatus("CashedOut");
        onCashout(newMultiplier);
        cancelAnimationFrame(requestRef.current);
        return;
      }

      // If multiplier reaches or exceeds the crash point, the game crashes.
      if (newMultiplier >= crash) {
        setGameStatus("Crashed");
        onGameEnd(crash, 0); // win amount is zero if you crash
        cancelAnimationFrame(requestRef.current);
        return;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
    // We run this effect only once when the component mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Drawing Functions ---

  const drawRocketPath = (
    context: CanvasRenderingContext2D,
    elapsed: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const gradient = context.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, "red");
    gradient.addColorStop(1, "yellow");
    context.strokeStyle = gradient;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, canvasHeight);
    const step = 10;
    for (let t = 0; t < elapsed / 10; t += step) {
      const x = t;
      const y = canvasHeight - curveFunction(t / 1000);
      context.lineTo(x, y);
    }
    context.stroke();
  };

  const drawRocket = (
    context: CanvasRenderingContext2D,
    elapsed: number,
    x: number,
    y: number
  ) => {
    // Calculate the angle from the derivative of the curve.
    const d1 = curveFunction(elapsed / 1000);
    const d2 = curveFunction((elapsed + 10) / 1000);
    const slope = (d2 - d1) / 10;
    const angle = -Math.atan(slope);

    context.translate(x, y);
    context.rotate(angle);
    context.drawImage(rocketImage, -rocketWidth / 2, -rocketHeight / 2, rocketWidth, rocketHeight);
    context.rotate(-angle);
    context.translate(-x, -y);
  };

  const drawCrashedRocket = (context: CanvasRenderingContext2D, x: number, y: number) => {
    context.translate(x, y);
    context.drawImage(explodeImage, -rocketWidth / 2, -rocketHeight / 2, rocketWidth, rocketHeight);
    context.translate(-x, -y);
  };

  const drawMultiplier = (
    context: CanvasRenderingContext2D,
    text: string,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    context.font = "60px Arial";
    let fillStyle = "white";
    const num = parseFloat(text);
    if (num > 5) fillStyle = "red";
    else if (num > 2) fillStyle = "yellow";
    context.fillStyle = fillStyle;
    const textWidth = context.measureText(text).width;
    context.fillText(text, canvasWidth / 2 - textWidth / 2, canvasHeight / 2);
  };

  // Main render function for canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height: canvasHeight } = canvas;
    context.clearRect(0, 0, width, canvasHeight);

    // Draw the rocket path.
    drawRocketPath(context, timeElapsed, width, canvasHeight);

    // Determine the rocket's position.
    // For this example, horizontal position increases with time (capped by canvas width),
    // and vertical position is determined by the curve.
    const maxX = width - rocketWidth;
    const x = Math.min((timeElapsed / 1000) * 10, maxX); // adjust factor for desired speed
    const y = canvasHeight - curveFunction(timeElapsed / 1000);

    context.save();
    if (gameStatus === "Crashed") {
      drawCrashedRocket(context, x, y);
    } else {
      drawRocket(context, timeElapsed, x, y);
    }
    context.restore();

    // Draw the current multiplier.
    drawMultiplier(context, multiplier.toFixed(2) + "x", width, canvasHeight);
  };

  // Update the canvas on every frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    renderCanvas();
    // We use timeElapsed, multiplier, and gameStatus as dependencies.
  }, [timeElapsed, multiplier, gameStatus]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "400px",
        background: "black",
        borderRadius: "8px",
      }}
    />
  );
}
