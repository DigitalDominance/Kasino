"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface LootBox {
  name: string;
  slug: string;
  image: string;
  requiredLevel: number;
}

export function DailyLootPopup({
  show,
  onClose,
  userLevel,
}: {
  show: boolean;
  onClose: () => void;
  userLevel: number;
}) {
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const lootBoxes: LootBox[] = [
    { name: "Level 1 Daily Loot Box", slug: "Level1DailyLootBox", image: "/Level1Card.webp", requiredLevel: 1 },
    { name: "Level 10 Daily Loot Box", slug: "Level10DailyLootBox", image: "/Level10Card.webp", requiredLevel: 10 },
    // … through Level100
    { name: "Level 100 Daily Loot Box", slug: "Level100DailyLootBox", image: "/Level100Card.webp", requiredLevel: 100 },
  ];

  // load cooldowns from sessionStorage
  useEffect(() => {
    const now = Date.now();
    const cdMap: Record<string, number> = {};
    lootBoxes.forEach((box) => {
      const ts = sessionStorage.getItem(`lootbox_ts_${box.slug}`);
      if (ts) {
        const elapsed = now - +ts;
        const cd = 24 * 60 * 60 * 1000;
        if (elapsed < cd) cdMap[box.slug] = Math.ceil((cd - elapsed) / 1000);
      }
    });
    setCooldowns(cdMap);
  }, []);

  // tick down
  useEffect(() => {
    const iv = setInterval(() => {
      setCooldowns((prev) => {
        const next: typeof prev = {};
        Object.entries(prev).forEach(([k, v]) => {
          if (v > 0) next[k] = v - 1;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  const borderColor = (lvl: number) => {
    if (lvl < 25) return "#49EACB";
    if (lvl < 50) return "yellow";
    if (lvl < 75) return "orange";
    return "red";
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-black rounded-lg border-2 border-[#49EACB] p-6 max-w-4xl w-full mx-4 overflow-y-auto"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            <button
              className="absolute top-4 right-4 text-[#49EACB] text-2xl"
              onClick={onClose}
            >
              ×
            </button>
            <h2 className="text-2xl text-[#49EACB] font-bold text-center mb-4">
              Daily Free Loot Boxes
            </h2>
            <p className="text-white text-center mb-6">
              Available once every 24 hours
            </p>
            <div className="flex flex-col items-center mb-6">
              <p className="text-gray-300 mb-2">Your Current Level</p>
              <div
                className="rounded-full border-4 flex items-center justify-center text-white font-bold"
                style={{
                  width: 80,
                  height: 80,
                  borderColor: borderColor(userLevel),
                  boxShadow: `0 0 15px ${borderColor(userLevel)}`,
                  backgroundImage: "url('/xpimage.webp')",
                  backgroundSize: "cover",
                }}
              >
                {userLevel}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {lootBoxes.map((box) => {
                const locked = userLevel < box.requiredLevel;
                const cd = cooldowns[box.slug] || 0;
                return (
                  <Link key={box.slug} href={`/games/${box.slug}`} passHref>
                    <div
                      className={`relative bg-gray-900 rounded-lg overflow-hidden border-2 cursor-pointer`}
                      style={{
                        borderColor: locked
                          ? "red"
                          : cd > 0
                          ? "yellow"
                          : "#49EACB",
                      }}
                    >
                      {(locked || cd > 0) && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-10 text-center p-2">
                          {locked ? (
                            <p className="text-red-400">
                              Requires Level {box.requiredLevel}
                            </p>
                          ) : (
                            <>
                              <p className="text-yellow-400 font-bold">
                                On Cooldown
                              </p>
                              <p className="text-white text-sm">
                                {formatTime(cd)}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                      <div className="relative w-full h-24">
                        <Image
                          src={box.image}
                          alt={box.name}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div className="p-2 text-center">
                        <h3 className="text-white font-semibold text-sm">
                          {box.name}
                        </h3>
                        <p className="text-xs text-[#49EACB]">
                          Level {box.requiredLevel}+
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
