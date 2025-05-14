"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadFull } from "tsparticles";

export function LoadingAnimation() {
  const [showLoading, setShowLoading] = useState(true);
  const [engineReady, setEngineReady] = useState(false);

  // Hide after 2s
  useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Init tsParticles (with emitters) once
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadFull(engine); // full bundle includes emitters
    }).then(() => setEngineReady(true));
  }, []);

  const particlesOptions = {
    fullScreen: { enable: false },
    fpsLimit: 60,

    /* burst out of center */
    emitters: [
      {
        position: { x: 50, y: 50 },
        rate: { quantity: 5, delay: 0.1 },
        life: { count: 0, duration: 2 },
        size: { width: 0, height: 0 },
      },
    ],

    particles: {
      number: { value: 0 },
      color: { value: "#49EACB" },
      shape: { type: "circle" },
      opacity: {
        value: 0.2,
        random: { enable: true, minimumValue: 0.3 },
        animation: { enable: true, speed: 1, minimumValue: 0.1 },
      },
      size: {
        value: { min: 1, max: 4 },
        animation: { enable: true, speed: 3, minimumValue: 0.5 },
      },
      move: {
        enable: true,
        speed: 2,
        outModes: { default: "destroy" },
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
          {/* Particles behind everything (z-10) */}
          {engineReady && (
            <div className="absolute inset-0 z-10">
              <Particles
                id="loading-particles"
                options={particlesOptions}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Neon pulse overlay (z-20) */}
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

          {/* Logo on top (z-30) */}
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

          {/* Footer text (z-30) */}
          <motion.div
            className="absolute bottom-8 left-0 right-0 text-center z-30"
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
