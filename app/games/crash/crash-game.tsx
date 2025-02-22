// ----- Inside the canvas drawing useEffect -----

// Initialize randomized composite curve if not already set.
if (!controlPointsRef.current) {
  const margin = 20;
  // Define 5 key points.
  const P0 = { x: margin, y: height - margin };
  const P0_1 = {
    x: margin + (width - 2 * margin) * (0.1 + Math.random() * 0.1),
    y: height - margin - Math.random() * 20,
  };
  const P1 = {
    x: margin + (width - 2 * margin) * (0.3 + Math.random() * 0.2),
    y: height - margin - Math.random() * 30,
  };
  const P2 = {
    x: margin + (width - 2 * margin) * (0.6 + Math.random() * 0.2),
    y: height * (0.3 + Math.random() * 0.3),
  };
  const P3 = {
    x: margin + (width - 2 * margin) * (0.9 + Math.random() * 0.1),
    y: margin + Math.random() * 20,
  };

  // Generate randomized control points for each segment.
  // Segment 1: from P0 to P0_1.
  const CP0 = {
    x: P0.x + (P0_1.x - P0.x) * (0.3 + Math.random() * 0.2),
    y: P0.y - Math.random() * 10,
  };
  const CP1 = {
    x: P0.x + (P0_1.x - P0.x) * (0.7 + Math.random() * 0.2),
    y: P0_1.y + Math.random() * 10,
  };

  // Segment 2: from P0_1 to P1.
  const CP0_2 = {
    x: P0_1.x + (P1.x - P0_1.x) * (0.3 + Math.random() * 0.2),
    y: P0_1.y - Math.random() * 10,
  };
  const CP1_2 = {
    x: P0_1.x + (P1.x - P0_1.x) * (0.7 + Math.random() * 0.2),
    y: P1.y + Math.random() * 10,
  };

  // Segment 3: from P1 to P2.
  const CP0_3 = {
    x: P1.x + (P2.x - P1.x) * (0.3 + Math.random() * 0.2),
    y: P1.y - Math.random() * 10,
  };
  const CP1_3 = {
    x: P1.x + (P2.x - P1.x) * (0.7 + Math.random() * 0.2),
    y: P2.y + Math.random() * 10,
  };

  // Segment 4: from P2 to P3.
  const CP0_4 = {
    x: P2.x + (P3.x - P2.x) * (0.3 + Math.random() * 0.2),
    y: P2.y - Math.random() * 10,
  };
  const CP1_4 = {
    x: P2.x + (P3.x - P2.x) * (0.7 + Math.random() * 0.2),
    y: P3.y + Math.random() * 10,
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
// Updated to account for extra segments.
// For crash points:
// • 1x – 1.25x: follow segment 1 (P0 → P0_1)
// • 1.25x – 1.5x: follow segments 1 & 2 (ending at P1)
// • 1.5x – 2x: map to segment 3 (ending at P2)
// • 2x – 3x: map to segment 4 (ending at P3)
// • >3x: follow full curve then extend upward.
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
    extension = (multiplier - 3) * 50; // Adjust the extension factor as needed.
  }
}

// --- Draw the trajectory line using the composite curve ---
ctx.save();
ctx.strokeStyle = "#00FF00";
ctx.lineWidth = 4;
ctx.lineCap = "round";
ctx.beginPath();
const segments = 30;
if (cp > 3 && multiplier > 3) {
  // Draw the full composite curve then the extension.
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const { x, y } = compositeBezier(t);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const extendedTip = { x: P3.x, y: P3.y - extension };
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

// --- Determine the rocket tip position using the composite curve ---
let tip = { x: 0, y: 0 };
if (cp > 3 && multiplier > 3) {
  tip = { x: P3.x, y: P3.y - extension };
} else {
  tip = compositeBezier(tProgress);
}
