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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo in the center */}
          <div className="relative w-64 h-64">
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
                alt="Kasino Logo"
                layout="fill"
                objectFit="contain"
              />
            </motion.div>
          </div>

          {/* sweeping neon-green grid overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #49EACB 1px, transparent 1px), linear-gradient(to bottom, #49EACB 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
            initial={{ opacity: 1, backgroundPosition: "0px 0px" }}
            animate={{
              backgroundPosition: ["0px 0px", "-20px -20px"],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 2, ease: "linear" }}
          />

          {/* footer text */}
          <motion.div
            className="absolute bottom-8 left-0 right-0 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
            <p className="text-[#B6B6B6] text-sm">Please Play Responsibly</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
