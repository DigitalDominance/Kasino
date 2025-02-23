"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

export function SiteFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="border-t border-[#49EACB]/10 bg-gradient-to-b from-black to-black/95 backdrop-blur-sm relative"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#49EACB]/5 to-transparent pointer-events-none" />
      <div className="container mx-auto px-6 py-12 relative">
        <div className="flex flex-col items-center justify-center gap-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="relative w-56 h-16 hover:drop-shadow-[0_0_15px_rgba(73,234,203,0.3)]"
          >
            <Link href="https://www.kascasino.xyz/" target="_blank" rel="noopener noreferrer">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
                alt="Kasino Logo"
                fill
                className="object-contain"
              />
            </Link>
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-sm text-[#49EACB]">
              Kasino by KASPER<span className="ml-0.5">© 2025</span>
            </p>
            <p className="text-xs text-[#B6B6B6] mt-1 hover:text-[#B6B6B6] transition-colors">
              Please Play Responsibly. All Rights Reserved.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.footer>
  )
}

