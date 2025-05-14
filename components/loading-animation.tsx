"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export function LoadingAnimation() {
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const initParticles = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  const particlesOptions = {
    fullScreen: { enable: false },
    fpsLimit: 60,
    particles: {
      number: {
        value: 120,
        density: { enable: true, area: 600 },
      },
      color: { value: "#49EACB" },
      shape: { type: "circle" },
      opacity: {
        value: 0.8,
        random: { enable: true, minimumValue: 0.3 },
        animation: { enable: true, speed: 1.2, minimumValue: 0.1, sync: false },
      },
      size: {
        value: { min: 1, max: 4 },
        animation: { enable: true, speed: 3, minimumValue: 0.5, sync: false },
      },
      move: {
        enable: true,
        speed: 1.5,
        direction: "none",
        random: true,
        outModes: { default: "out" },
      },
    },
    interactivity: {
      detectsOn: "canvas",
      events: { onHover: { enable: false }, onClick: { enable: false } },
    },
    detectRetina: true,
  };

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
          {/* Logo at z-30 */}
          <motion.div
            className="relative w-64 h-64 flex items-center justify-center z-30"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
              alt="Kasino Logo"
              fill
              className="object-contain"
            />
          </motion.div>

          {/* Particles on top at z-40 */}
          <div className="absolute inset-0 z-40">
            <Particles
              id="loading-particles"
              init={initParticles}
              options={particlesOptions}
              className="w-full h-full"
            />
          </div>

          {/* Neon pulse overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none bg-[#49EACB]/20 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Footer text */}
          <motion.div
            className="absolute bottom-8 left-0 right-0 text-center z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <p className="text-[#B6B6B6] text-sm">Please Play Responsibly</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
