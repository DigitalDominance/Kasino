"use client";

import { useRef, useEffect, useState } from "react";

export type GameStatus = "Waiting" | "Running" | "Crashed" | "CashedOut";

interface CrashGameProps {
  isPlaying: boolean;
  crashPoint: number | null;
  betAmount: number;
  onGameEnd: (finalMultiplier: number, winAmount: number) => void;
  onCashoutSuccess: (cashoutMultiplier: number, winAmount: number) => void;
  onManualCashout: () => void;
  onMultiplierChange?: (multiplier: number) => void;
}

export function CrashGame({
  isPlaying,
  crashPoint,
  betAmount,
  onGameEnd,
  onCashoutSuccess,
  onManualCashout,
  onMultiplierChange,
}: CrashGameProps) {
  // only render once the round is actually playing
  if (!isPlaying) return null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [hasCrashed, setHasCrashed] = useState(false);
  const requestRef = useRef<number>();
  const crashPointRef = useRef<number | null>(crashPoint);

  const rocketImg = useRef<HTMLImageElement | null>(null);
  const explosionImg = useRef<HTMLImageElement | null>(null);
  const cameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const controlPointsRef = useRef<null | {
    P0:any; P0_1:any; P1:any; P2:any; P3:any;
    CP0:any; CP1:any; CP0_2:any; CP1_2:any; CP0_3:any; CP1_3:any; CP0_4:any; CP1_4:any;
  }>(null);

  // load images
  useEffect(() => {
    const rocket = new Image();
    rocket.src = "/rocket.svg";
    rocketImg.current = rocket;
    const explosion = new Image();
    explosion.src = "/explode.svg";
    explosionImg.current = explosion;
  }, []);

  // run the crash animation exactly once using crashPointRef
  useEffect(() => {
    if (crashPointRef.current == null) return;
    setHasCrashed(false);
    const start = performance.now();
    const growthRate = 0.1;

    const animate = (time: number) => {
      const elapsed = time - start;
      const curr = Math.exp(growthRate * (elapsed/1000));
      setMultiplier(curr);
      onMultiplierChange?.(curr);

      if (curr >= crashPointRef.current!) {
        setMultiplier(crashPointRef.current!);
        setHasCrashed(true);
        onGameEnd(crashPointRef.current!, 0);
        return;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [onGameEnd]);

  // cubic bezier helper
  const cubicBezier = (P0:any,P1:any,P2:any,P3:any,t:number) => {
    const mt = 1-t;
    return {
      x: mt*mt*mt*P0.x + 3*mt*mt*t*P1.x + 3*mt*t*t*P2.x + t*t*t*P3.x,
      y: mt*mt*mt*P0.y + 3*mt*mt*t*P1.y + 3*mt*t*t*P2.y + t*t*t*P3.y
    };
  };

  // draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    ctx.scale(dpr,dpr);

    ctx.clearRect(0,0,w,h);
    // multiplier text
    ctx.save();
    ctx.font = "48px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(multiplier.toFixed(2)+"x", w/2, h/2);
    ctx.restore();

    // init control points once
    if (!controlPointsRef.current) {
      const m = 20;
      const P0   = { x:m, y:h-m };
      const P0_1 = { x:m+(w-2*m)*(0.15+Math.random()*0.05), y:h-m-80 };
      const P1   = { x:m+(w-2*m)*(0.35+Math.random()*0.1),    y:h-m-150 };
      const P2   = { x:m+(w-2*m)*(0.65+Math.random()*0.1),    y:h-m-250 };
      const P3   = { x:m+(w-2*m)*(0.85+Math.random()*0.05),   y:m };
      const CP0  = { x:P0.x+(P0_1.x-P0.x)*0.3, y:P0.y-(P0.y-P0_1.y)*0.3 };
      const CP1  = { x:P0.x+(P0_1.x-P0.x)*0.7, y:P0.y-(P0.y-P0_1.y)*0.7 };
      const CP0_2= { x:P0_1.x+(P1.x-P0_1.x)*0.3, y:P0_1.y-(P0_1.y-P1.y)*0.3 };
      const CP1_2= { x:P0_1.x+(P1.x-P0_1.x)*0.7, y:P0_1.y-(P0_1.y-P1.y)*0.7 };
      const CP0_3= { x:P1.x+(P2.x-P1.x)*0.3,    y:P1.y-(P1.y-P2.y)*0.3 };
      const CP1_3= { x:P1.x+(P2.x-P1.x)*0.7,    y:P1.y-(P1.y-P2.y)*0.7 };
      const CP0_4= { x:P2.x+(P3.x-P2.x)*0.3,    y:P2.y-(P2.y-P3.y)*0.3 };
      const CP1_4= { x:P2.x+(P3.x-P2.x)*0.7,    y:P2.y-(P2.y-P3.y)*0.7 };
      controlPointsRef.current = { P0,P0_1,P1,P2,P3,CP0,CP1,CP0_2,CP1_2,CP0_3,CP1_3,CP0_4,CP1_4 };
    }
    const C = controlPointsRef.current;

    // composite Bézier
    const compositeBezier = (t:number) => {
      if (t<=0.2)       return cubicBezier(C.P0,C.CP0,C.CP1,C.P0_1, t/0.2);
      else if (t<=0.33) return cubicBezier(C.P0_1,C.CP0_2,C.CP1_2,C.P1, (t-0.2)/0.13);
      else if (t<=0.66) return cubicBezier(C.P1,C.CP0_3,C.CP1_3,C.P2, (t-0.33)/0.33);
      else              return cubicBezier(C.P2,C.CP0_4,C.CP1_4,C.P3, (t-0.66)/0.34);
    };

    // param tProgress
    const cpv = crashPointRef.current!;
    let tProg=0, ext=0;
    if (cpv<=1.25) {
      const tar=0.2;
      tProg = multiplier<=cpv ? ((multiplier-1)/(cpv-1))*tar : tar;
    } else if (cpv<=1.5) {
      const base=0.2, tar=0.33;
      tProg = multiplier<=cpv ? base+((multiplier-1.25)/(cpv-1.25))*(tar-base) : tar;
    } else if (cpv<=2) {
      const tar=0.66;
      tProg = multiplier<=cpv ? ((multiplier-1)/(cpv-1))*tar : tar;
    } else if (cpv<=3) {
      const tar=1;
      tProg = multiplier<=cpv ? ((multiplier-1)/(cpv-1))*tar : tar;
    } else {
      if (multiplier<=3) tProg=((multiplier-1)/2)*1;
      else {
        tProg=1;
        ext=(multiplier-3)*80;
      }
    }

    // rocket tip
    let tip = {x:0,y:0};
    if (cpv>3 && multiplier>3) {
      const tan={ x:C.P3.x-C.CP1_4.x, y:C.P3.y-C.CP1_4.y };
      const ln=Math.hypot(tan.x,tan.y)||1;
      const nt={ x:tan.x/ln, y:tan.y/ln };
      tip={ x:C.P3.x+nt.x*ext, y:C.P3.y+nt.y*ext };
    } else {
      tip = compositeBezier(tProg);
    }

    // camera for >3x
    if (multiplier>3) {
      const scale=3/multiplier;
      const desired={ x:w/2, y:h*0.7 };
      const toff={ x:desired.x-tip.x, y:desired.y-tip.y };
      cameraOffsetRef.current.x += 0.0005*(toff.x-cameraOffsetRef.current.x);
      cameraOffsetRef.current.y += 0.005*(toff.y-cameraOffsetRef.current.y);
      ctx.scale(scale,scale);
      ctx.translate(cameraOffsetRef.current.x/scale, cameraOffsetRef.current.y/scale);
    }

    // draw trajectory
    ctx.save();
    ctx.strokeStyle="#00FF00";
    ctx.lineWidth=4;
    ctx.lineCap="round";
    ctx.beginPath();
    const segs=60;
    if (cpv>3 && multiplier>3) {
      for (let i=0;i<=segs;i++){
        const p=compositeBezier(i/segs);
        if(i===0) ctx.moveTo(p.x,p.y);
        else      ctx.lineTo(p.x,p.y);
      }
      const tan={ x:C.P3.x-C.CP1_4.x, y:C.P3.y-C.CP1_4.y };
      const ln=Math.hypot(tan.x,tan.y)||1;
      const nt={ x:tan.x/ln, y:tan.y/ln };
      const et={ x:C.P3.x+nt.x*ext, y:C.P3.y+nt.y*ext };
      ctx.lineTo(et.x,et.y);
    } else {
      for (let i=0;i<=segs;i++){
        const t=(i/segs)*tProg;
        const p=compositeBezier(t);
        if(i===0) ctx.moveTo(p.x,p.y);
        else      ctx.lineTo(p.x,p.y);
      }
    }
    ctx.stroke();
    ctx.restore();

    // draw rocket or explosion
    const img = hasCrashed ? explosionImg.current! : rocketImg.current!;
    ctx.drawImage(img, tip.x-20, tip.y-20, 40, 40);
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

