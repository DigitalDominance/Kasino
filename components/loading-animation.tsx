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

  return (
    <AnimatePresence>
      {showLoading && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Logo Container */}
          <div className="relative w-64 h-64">
            {/* Base Logo */}
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
              alt="Kasino Logo"
              layout="fill"
              objectFit="contain"
            />

            {/* Glitch Flicker Overlay */}
            <motion.div
              className="absolute inset-0 bg-[#49EACB]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0, 0.5, 0] }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                repeatDelay: 1.2,
                ease: "easeInOut",
              }}
              style={{ mixBlendMode: "screen" }}
            />

            {/* Neon Scan‐Line */}
            <motion.div
              className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#49EACB] to-transparent"
              initial={{ y: -5 }}
              animate={{ y: ["-5px", "100%"] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>

          {/* Bottom Text */}
          <motion.div
            className="absolute bottom-8 left-0 right-0 text-center"
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
