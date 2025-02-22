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

  // Refs for images.
  const rocketImg = useRef<HTMLImageElement | null>(null);
  const explosionImg = useRef<HTMLImageElement | null>(null);

  // Load images client-side.
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

  // Camera offset ref for smooth following.
  const cameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Compute the crash multiplier only once per round.
  const crashPointRef = useRef<number | null>(null);

  // Updated: Ref for composite control points for the rocket's path.
  const controlPointsRef = useRef<{
    P0: { x: number; y: number };
    P0_1: { x: number; y: number };
    P1: { x: number; y: number };
    P2: { x: number; y: number };
    P3: { x: number; y: number };
    CP0: { x: number; y: number };
    CP1: { x: number; y: number };
    CP0_2: { x: number; y: number };
    CP1_2: { x: number; y: number };
    CP0_3: { x: number; y: number };
    CP1_3: { x: number; y: number };
    CP0_4: { x: number; y: number };
    CP1_4: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    setHasCrashed(false);

    // Generate crash point only once per round.
    if (crashPointRef.current === null) {
      const r = Math.random();
      let crashPoint;
      if (r < 0.3) {
        // 30% chance: crash between 1.0 and 1.2x
        crashPoint = 1 + Math.random() * 0.2;
      } else if (r < 0.6) {
        // Next 30%: crash between 1.2 and 1.5x
        crashPoint = 1.2 + Math.random() * 0.3;
      } else if (r < 0.9) {
        // Next 30%: crash between 1.5 and 2.0x
        crashPoint = 1.5 + Math.random() * 0.5;
      } else if (r < 0.96) {
        // Next 6%: crash between 2.0 and 3.0x
        crashPoint = 2.0 + Math.random() * 1.0;
      } else if (r < 0.985) {
        // Next 2.5%: crash between 3.0 and 5.0x
        crashPoint = 3.0 + Math.random() * 2.0;
      } else if (r < 0.9975) {
        // Next 1.25%: crash between 5.0 and 7.5x
        crashPoint = 5.0 + Math.random() * 2.5;
      } else {
        // Last 0.25%: crash above 7.5x (exponential growth up to 100x)
        const expR = Math.random();
        crashPoint = 7.5 * Math.exp(expR * Math.log(100 / 7.5));
      }
      crashPointRef.current = crashPoint;
      console.log("Crash point generated, game started!");

    }



    const start = performance.now();
    const growthRate = 0.1; // Adjust as needed

    const animate = (time: number) => {
      const elapsed = time - start;
      const currentMultiplier = Math.exp(growthRate * (elapsed / 1000));
      setMultiplier(currentMultiplier);
      if (onMultiplierChange) onMultiplierChange(currentMultiplier);
      // Crash when multiplier reaches crash point.
      const cp = crashPointRef.current;
      if (cp && currentMultiplier >= cp) {
        setMultiplier(cp);
        setHasCrashed(true);
        onGameEnd(cp, 0);
        return;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
      crashPointRef.current = null;
      controlPointsRef.current = null; // Reset curve for next round.
    };
  }, [isPlaying]);

  // Cubic Bézier helper.
  const cubicBezier = (
    P0: { x: number; y: number },
    P1: { x: number; y: number },
    P2: { x: number; y: number },
    P3: { x: number; y: number },
    t: number
  ) => {
    const mt = 1 - t;
    return {
      x:
        mt * mt * mt * P0.x +
        3 * mt * mt * t * P1.x +
        3 * mt * t * t * P2.x +
        t * t * t * P3.x,
      y:
        mt * mt * mt * P0.y +
        3 * mt * mt * t * P1.y +
        3 * mt * t * t * P2.y +
        t * t * t * P3.y,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas.
    ctx.clearRect(0, 0, width, height);

    // --- Draw multiplier text (centered) ---
    ctx.save();
    ctx.font = "48px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(multiplier.toFixed(2) + "x", width / 2, height / 2);
    ctx.restore();

    // --- Initialize composite curve if not already set. ---
    if (!controlPointsRef.current) {
      const margin = 20;
      // Define key points with fixed vertical differences for a smooth upward curve.
      const P0 = { x: margin, y: height - margin };
      const P0_1 = {
        x: margin + (width - 2 * margin) * (0.15 + Math.random() * 0.05),
        y: height - margin - 80, // 80 pixels above P0
      };
      const P1 = {
        x: margin + (width - 2 * margin) * (0.35 + Math.random() * 0.1),
        y: height - margin - 150, // 70 pixels above P0_1
      };
      const P2 = {
        x: margin + (width - 2 * margin) * (0.65 + Math.random() * 0.1),
        y: height - margin - 250, // 100 pixels above P1
      };
      const P3 = {
        x: margin + (width - 2 * margin) * (0.85 + Math.random() * 0.05),
        y: margin, // reaches the top
      };
    
      // Define control points for each segment using fixed interpolation for smooth transitions.
      const CP0 = {
        x: P0.x + (P0_1.x - P0.x) * 0.3,
        y: P0.y - (P0.y - P0_1.y) * 0.3,
      };
      const CP1 = {
        x: P0.x + (P0_1.x - P0.x) * 0.7,
        y: P0.y - (P0.y - P0_1.y) * 0.7,
      };
    
      const CP0_2 = {
        x: P0_1.x + (P1.x - P0_1.x) * 0.3,
        y: P0_1.y - (P0_1.y - P1.y) * 0.3,
      };
      const CP1_2 = {
        x: P0_1.x + (P1.x - P0_1.x) * 0.7,
        y: P0_1.y - (P0_1.y - P1.y) * 0.7,
      };
    
      const CP0_3 = {
        x: P1.x + (P2.x - P1.x) * 0.3,
        y: P1.y - (P1.y - P2.y) * 0.3,
      };
      const CP1_3 = {
        x: P1.x + (P2.x - P1.x) * 0.7,
        y: P1.y - (P1.y - P2.y) * 0.7,
      };
    
      const CP0_4 = {
        x: P2.x + (P3.x - P2.x) * 0.3,
        y: P2.y - (P2.y - P3.y) * 0.3,
      };
      const CP1_4 = {
        x: P2.x + (P3.x - P2.x) * 0.7,
        y: P2.y - (P2.y - P3.y) * 0.7,
      };
    
      controlPointsRef.current = {
        P0,
        P0_1,
        P1,
        P2,
        P3,
        CP0,
        CP1,
        CP0_2,
        CP1_2,
        CP0_3,
        CP1_3,
        CP0_4,
        CP1_4,
      };
    }

    const {
      P0,
      P0_1,
      P1,
      P2,
      P3,
      CP0,
      CP1,
      CP0_2,
      CP1_2,
      CP0_3,
      CP1_3,
      CP0_4,
      CP1_4,
    } = controlPointsRef.current!;

    // Composite Bézier helper – splits the overall parameter (t: 0 to 1) into 4 segments.
    const compositeBezier = (t: number) => {
      if (t <= 0.2) {
        const t1 = t / 0.2;
        return cubicBezier(P0, CP0, CP1, P0_1, t1);
      } else if (t <= 0.33) {
        const t1 = (t - 0.2) / (0.33 - 0.2);
        return cubicBezier(P0_1, CP0_2, CP1_2, P1, t1);
      } else if (t <= 0.66) {
        const t1 = (t - 0.33) / (0.66 - 0.33);
        return cubicBezier(P1, CP0_3, CP1_3, P2, t1);
      } else {
        const t1 = (t - 0.66) / (1 - 0.66);
        return cubicBezier(P2, CP0_4, CP1_4, P3, t1);
      }
    };

    // --- Determine how far along the path to draw ---
    // For crash points:
    // • 1x – 1.25x: follow segment 1 (P0 → P0_1)
    // • 1.25x – 1.5x: follow segments 1 & 2 (ending at P1)
    // • 1.5x – 2x: map to segment 3 (ending at P2)
    // • 2x – 3x: map to segment 4 (ending at P3)
    // • >3x: follow full curve then extend along the tangent.
    const cp = crashPointRef.current || 1;
    let tProgress = 0;
    let extension = 0;
    if (cp <= 1.25) {
      const targetT = 0.2;
      if (multiplier <= cp) {
        tProgress = ((multiplier - 1) / (cp - 1)) * targetT;
      } else {
        tProgress = targetT;
      }
    } else if (cp <= 1.5) {
      const baseT = 0.2;
      const targetT = 0.33;
      if (multiplier <= cp) {
        tProgress = baseT + ((multiplier - 1.25) / (cp - 1.25)) * (targetT - baseT);
      } else {
        tProgress = targetT;
      }
    } else if (cp <= 2) {
      const targetT = 0.66;
      if (multiplier <= cp) {
        tProgress = ((multiplier - 1) / (cp - 1)) * targetT;
      } else {
        tProgress = targetT;
      }
    } else if (cp <= 3) {
      const targetT = 1.0;
      if (multiplier <= cp) {
        tProgress = ((multiplier - 1) / (cp - 1)) * targetT;
      } else {
        tProgress = targetT;
      }
    } else {
      if (multiplier <= 3) {
        tProgress = ((multiplier - 1) / (3 - 1)) * 1.0;
      } else {
        tProgress = 1.0;
        extension = (multiplier - 3) * 80; // Adjust extension factor as needed.
      }
    }

    // --- Compute the rocket tip position using the composite curve ---
    let tip = { x: 0, y: 0 };
    if (cp > 3 && multiplier > 3) {
      // Compute the tangent of the last segment at t=1 using CP1_4.
      const tangent = { x: P3.x - CP1_4.x, y: P3.y - CP1_4.y };
      const length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1;
      const normTangent = { x: tangent.x / length, y: tangent.y / length };
      tip = { x: P3.x + normTangent.x * extension, y: P3.y + normTangent.y * extension };
    } else {
      tip = compositeBezier(tProgress);
    }

    // --- Compute camera offset for dynamic zoom ---
    let scale = 1;
    if (multiplier > 3) {
      scale = 3 / multiplier; // Adjust zoom rate as needed.
      const desired = { x: width / 2, y: height * 0.7 };
      const targetOffset = { x: desired.x - tip.x, y: desired.y - tip.y };
      // Slow down horizontal camera movement by using a smaller interpolation factor.
      cameraOffsetRef.current.x += 0.0005 * (targetOffset.x - cameraOffsetRef.current.x);
      cameraOffsetRef.current.y += 0.005 * (targetOffset.y - cameraOffsetRef.current.y);
    }
    const cameraOffset = cameraOffsetRef.current;

    // --- Begin drawing the world (trajectory & rocket) with camera transform ---
    ctx.save();
    if (multiplier > 3) {
      // Apply scaling and translation to keep the rocket and line in view.
      ctx.scale(scale, scale);
      ctx.translate(cameraOffset.x / scale, cameraOffset.y / scale);
    }

    // Draw the trajectory line.
    ctx.save();
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    const segments = 60;
    if (cp > 3 && multiplier > 3) {
      // Draw the full composite curve then the extension along the tangent.
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const { x, y } = compositeBezier(t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const tangent = { x: P3.x - CP1_4.x, y: P3.y - CP1_4.y };
      const length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1;
      const normTangent = { x: tangent.x / length, y: tangent.y / length };
      const extendedTip = { x: P3.x + normTangent.x * extension, y: P3.y + normTangent.y * extension };
      ctx.lineTo(extendedTip.x, extendedTip.y);
    } else {
      // Draw only the composite curve up to tProgress.
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * tProgress;
        const { x, y } = compositeBezier(t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();

    // Draw the rocket (or explosion) image at the tip.
    const img = hasCrashed ? explosionImg.current : rocketImg.current;
    if (img) {
      const imgSize = 40;
      ctx.drawImage(img, tip.x - imgSize / 2, tip.y - imgSize / 2, imgSize, imgSize);
    }
    ctx.restore();

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
