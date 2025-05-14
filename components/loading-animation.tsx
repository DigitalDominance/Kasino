"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
// 👇 the new imports
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export function LoadingAnimation() {
  const [showLoading, setShowLoading] = useState(true);
  const [engineReady, setEngineReady] = useState(false);

  // hide after 2s
  useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // init tsParticles only once
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      // only load the slim bundle (neon circles/waves/etc)
      await loadSlim(engine);
    }).then(() => setEngineReady(true));
  }, []);

  const particlesOptions = {
    fullScreen: { enable: false },
    fpsLimit: 60,
    particles: {
      number: { value: 100, density: { enable: true, area: 600 } },
      color: { value: "#49EACB" },
      shape: { type: "circle" },
      opacity: {
        value: 0.7,
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
          {/* particles only once engine is ready */}
          {engineReady && (
            <div className="absolute inset-0 z-10">
              <Particles
                id="loading-particles"
                options={particlesOptions}
                className="w-full h-full"
              />
            </div>
          )}

          {/* logo sits on top of particles */}
          <motion.div
            className="relative w-64 h-64 z-20 flex items-center justify-center"
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

          {/* neon pulse overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none bg-[#49EACB]/20 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* footer text */}
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
