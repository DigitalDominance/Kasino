"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function LoadingAnimation() {
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // helper to generate some spark particles
  const sparks = Array.from({ length: 20 }).map((_, i) => ({
    key: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 1.5
  }));

  return (
    <AnimatePresence>
      {showLoading && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo + pulsing rings */}
          <div className="relative w-64 h-64 flex items-center justify-center overflow-visible">
            {/* Logo */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
                alt="Kasino Logo"
                layout="fill"
                objectFit="contain"
              />
            </motion.div>
            {/* Pulsing rings */}
            {[0,1,2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-[#49EACB]"
                style={{ width: 200, height: 200 }}
                initial={{ opacity: 0 }}
                animate={{
                  scale: [1, 2 + i * 0.5],
                  opacity: [0.6, 0]
                }}
                transition={{
                  delay: i * 0.3,
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>

          {/* Overlay flash */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-full h-full bg-[#49EACB] opacity-30" />
          </motion.div>

          {/* Sparks */}
          {sparks.map(({ key, left, delay }) => (
            <motion.div
              key={key}
              className="absolute bottom-0 w-1 h-1 bg-[#49EACB] rounded-full"
              style={{ left }}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -150, opacity: 0 }}
              transition={{
                delay,
                duration: 1.2 + Math.random() * 0.8,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Bottom text + bars */}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2">
            <p className="text-[#B6B6B6] text-sm">Please Play Responsibly</p>
            <div className="flex space-x-1">
              {[0,1,2,3,4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-[#49EACB]"
                  initial={{ height: 8 }}
                  animate={{ height: [8, 20 + i * 5, 8] }}
                  transition={{
                    delay: i * 0.1,
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
