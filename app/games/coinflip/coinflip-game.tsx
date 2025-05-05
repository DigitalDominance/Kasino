"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

interface Props {
  isPlaying: boolean;
  result: "win" | "lose" | null;
  selectedSymbol: "sun" | "moon";
  onGameEnd: () => void;
}

export function CoinFlipGame({
  isPlaying,
  result,
  selectedSymbol,
  onGameEnd,
}: Props) {
  const [userCoin, setUserCoin] = useState<"sun" | "moon">("sun");
  const [houseCoin, setHouseCoin] = useState<"sun" | "moon">("sun");
  const [flipping, setFlipping] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const started = useRef(false);

  useEffect(() => {
    if (!isPlaying || started.current) return;
    started.current = true;

    // start quick flip animation
    setFlipping(true);
    setShowResult(false);
    const interval = setInterval(() => {
      setUserCoin(Math.random() < 0.5 ? "sun" : "moon");
      setHouseCoin(Math.random() < 0.5 ? "sun" : "moon");
    }, 100);

    // after 2s, finalize based on result
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (result === "win") {
        setUserCoin(selectedSymbol);
        setHouseCoin(selectedSymbol === "sun" ? "moon" : "sun");
      } else {
        setHouseCoin(selectedSymbol);
        setUserCoin(selectedSymbol === "sun" ? "moon" : "sun");
      }
      setFlipping(false);
      setShowResult(true);
      onGameEnd();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPlaying, result, selectedSymbol, onGameEnd]);

  const renderCoin = (side: "sun" | "moon", highlight: boolean) => (
    <motion.div
      className={`w-40 h-40 rounded-full ${
        highlight ? "ring-4 ring-green-500" : "bg-[#49EACB]/30"
      } flex items-center justify-center`}
      animate={flipping ? { rotateY: 360 } : {}}
      transition={{ repeat: flipping ? Infinity : 0, duration: 0.6 }}
    >
      {side === "sun" ? (
        <Sun className="w-24 h-24 text-black" />
      ) : (
        <Moon className="w-24 h-24 text-black" />
      )}
    </motion.div>
  );

  if (!isPlaying && !showResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl text-[#49EACB]">
          Place your bet, pick “Choose Winning Symbol,” then flip!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex justify-center w-full mb-8 space-x-16">
        <div className="flex flex-col items-center">
          <p className="text-[#49EACB] mb-4 text-2xl">Your Coin</p>
          {renderCoin(userCoin, showResult && result === "win")}
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[#49EACB] mb-4 text-2xl">House Coin</p>
          {renderCoin(houseCoin, showResult && result === "lose")}
        </div>
      </div>
    </div>
  );
}
