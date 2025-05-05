// app/games/dice/dice-game.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isPlaying: boolean;           // true during the "rolling" phase
  userDice: [number, number];   // final faces
  houseDice: [number, number];  // final faces
}

export function DiceGame({ isPlaying, userDice, houseDice }: Props) {
  const [rolling, setRolling] = useState(false);
  const [showFinal, setShowFinal] = useState(false);

  // two temp states that cycle random faces while rolling
  const [tempUser, setTempUser] = useState<[number, number]>([1, 1]);
  const [tempHouse, setTempHouse] = useState<[number, number]>([1, 1]);

  // shuffle interval
  useEffect(() => {
    let handle: NodeJS.Timeout;
    if (rolling) {
      handle = setInterval(() => {
        setTempUser([
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ]);
        setTempHouse([
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ]);
      }, 100);
    }
    return () => clearInterval(handle);
  }, [rolling]);

  // kick off rolling → stop → show final
  useEffect(() => {
    if (isPlaying) {
      setRolling(true);
      setShowFinal(false);
      const t = setTimeout(() => {
        setRolling(false);
        // immediately show the real faces
        setShowFinal(true);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [isPlaying]);

  const patterns: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [
      [0, 0],
      [2, 2],
    ],
    3: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    4: [
      [0, 0],
      [0, 2],
      [2, 0],
      [2, 2],
    ],
    5: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 2],
    ],
    6: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 2],
    ],
  };

  const renderSpots = (value: number) =>
    (patterns[value] || []).map(([r, c], i) => (
      <div key={i} style={{ gridRow: r + 1, gridColumn: c + 1 }}>
        <div className="w-4 h-4 bg-black rounded-full" />
      </div>
    ));

  const Die = ({
    face,
    rotateDir,
  }: {
    face: number;
    rotateDir: number;
  }) => (
    <motion.div
      initial={false}
      animate={
        rolling
          ? { rotate: rotateDir * 360 }
          : showFinal
          ? { rotate: 0, scale: [1, 1.05, 1] }
          : {}
      }
      transition={
        rolling
          ? { repeat: Infinity, duration: 0.6, ease: "linear" as const }
          : showFinal
          ? { type: "spring" as const, stiffness: 300, damping: 20 }
          : {}
      }
      className="w-28 h-28 bg-gradient-to-br from-[#49EACB]/30 to-[#00FFC0]/30
                 rounded-2xl flex items-center justify-center
                 ring-4 ring-[#49EACB] shadow-xl"
    >
      <div className="grid grid-rows-3 grid-cols-3 gap-2 p-4 h-full w-full">
        {renderSpots(face)}
      </div>
    </motion.div>
  );

  // before rolling starts
  if (!rolling && !showFinal) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl text-[#49EACB]">
          Place your bet, select a multiplier, and roll the dice!
        </p>
      </div>
    );
  }

  // while rolling or showing final
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <AnimatePresence>
        {(rolling || showFinal) && (
          <div className="flex justify-center w-full mb-8 space-x-16">
            {/* User Dice */}
            <div className="flex flex-col items-center">
              <p className="text-[#49EACB] mb-4 text-2xl">Your Dice</p>
              <div className="flex space-x-4">
                <Die
                  face={rolling ? tempUser[0] : userDice[0]}
                  rotateDir={1}
                />
                <Die
                  face={rolling ? tempUser[1] : userDice[1]}
                  rotateDir={-1}
                />
              </div>
              {showFinal && (
                <p className="text-[#49EACB] mt-2 text-xl">
                  Total: {userDice[0] + userDice[1]}
                </p>
              )}
            </div>

            {/* House Dice */}
            <div className="flex flex-col items-center">
              <p className="text-[#49EACB] mb-4 text-2xl">House Dice</p>
              <div className="flex space-x-4">
                <Die
                  face={rolling ? tempHouse[0] : houseDice[0]}
                  rotateDir={-1}
                />
                <Die
                  face={rolling ? tempHouse[1] : houseDice[1]}
                  rotateDir={1}
                />
              </div>
              {showFinal && (
                <p className="text-[#49EACB] mt-2 text-xl">
                  Total: {houseDice[0] + houseDice[1]}
                </p>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
