"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Menu, Search, ChevronLeft, ChevronRight, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { SiteFooter } from "@/components/site-footer"

const MotionCard = motion(Card)
const MotionButton = motion(Button)

export default function Page() {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Renamed to mainBanners for clarity – these images are loaded from your public folder.
  const mainBanners = [
    "/roulettebanner.PNG",
    "/crashbanner.PNG",
  ]

  // Game cards for Original Games section with only the specified images.
  const gameCards = [
    { name: "Roulette", image: "/roulettecard.PNG" },
    { name: "Crash", image: "/crashcard.PNG" },
  ]

  const nextBanner = () =>
    setCurrentBanner((prev) => (prev + 1) % mainBanners.length)
  const prevBanner = () =>
    setCurrentBanner((prev) => (prev - 1 + mainBanners.length) % mainBanners.length)

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[#49EACB]/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <MotionButton
            variant="ghost"
            size="icon"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-[#49EACB] hover:bg-[#49EACB]/10"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </MotionButton>
          <span className="text-2xl font-bold text-[#49EACB]">Kasino</span>
        </div>
        <div className="flex items-center gap-4">
          <MotionButton
            variant="outline"
            className="border-[#49EACB] bg-black text-[#49EACB] hover:bg-[#49EACB]/10 transition-all duration-300"
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(73,234,203,0.3)" }}
          >
            Sign up
          </MotionButton>
          <MotionButton
            className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold"
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(73,234,203,0.3)" }}
          >
            Connect
          </MotionButton>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-[65px] left-0 w-80 h-[calc(100vh-65px)] border-r border-[#49EACB]/10 p-4 backdrop-blur-sm bg-black/95 z-40"
            >
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#49EACB]/60" />
                <input
                  placeholder="Search"
                  className="w-full bg-[#49EACB]/5 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#49EACB]/30 border border-[#49EACB]/10 transition-all duration-300"
                />
              </div>
              <div className="mt-4 space-y-2">
                <Link
                  href="#"
                  className="flex items-center gap-3 p-2 rounded hover:bg-[#49EACB]/5 transition-all duration-300 group"
                >
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-[#49EACB] to-[#49EACB]/50 group-hover:shadow-[0_0_10px_rgba(73,234,203,0.3)]" />
                  <span className="group-hover:text-[#49EACB]">Casino</span>
                </Link>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-hidden">
          {/* Banner Carousel */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative mb-12 h-[300px]"
          >
            <div className="relative w-full h-full overflow-hidden rounded-lg">
              {mainBanners.map((banner, index) => (
                <motion.div
                  key={index}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: index === currentBanner ? 1 : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Image
                    src={banner}
                    alt="Main Banner"
                    fill
                    className="object-cover"
                  />
                </motion.div>
              ))}
            </div>
            <button
              onClick={prevBanner}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={nextBanner}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronRight />
            </button>
          </motion.div>

          {/* Original Games */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold mb-6 text-[#49EACB]">Original Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gameCards.map((game, i) => (
                <MotionCard
                  key={i}
                  className="group relative overflow-hidden border border-[#49EACB]/10 bg-transparent"
                  whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(73,234,203,0.15)" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={game.image}
                      alt={`${game.name} Game`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <MotionButton
                      className="absolute bottom-4 left-4 right-4 bg-[#49EACB] text-black font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      Play Now
                    </MotionButton>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-1 text-white group-hover:text-[#49EACB] transition-colors duration-300">
                      {game.name}
                    </h3>
                    <p className="text-sm text-gray-400">1,234 Players</p>
                  </div>
                </MotionCard>
              ))}
            </div>
          </motion.div>

          {/* Live Wins (remains unchanged) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-[#49EACB]">Live Wins</h2>
            <ScrollArea>
              <div className="flex gap-4 pb-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <MotionCard
                    key={i}
                    className="flex-shrink-0 w-[280px] border border-[#49EACB]/10 bg-[#49EACB]/5 backdrop-blur-sm overflow-hidden"
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 0 20px rgba(73,234,203,0.15)",
                    }}
                  >
                    <div className="relative aspect-video">
                      <Image
                        src="/placeholder.svg"
                        alt="Game thumbnail"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#49EACB] text-black text-sm font-semibold">
                        LIVE
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-semibold mb-2">Player123</div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm text-[#49EACB]">Crash Game</div>
                        <div className="flex items-center gap-1.5">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                            alt="KAS"
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                          <span className="text-[#49EACB] font-bold">
                            1,234.56
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">2 minutes ago</div>
                    </div>
                  </MotionCard>
                ))}
              </div>
              <ScrollBar
                orientation="horizontal"
                className="bg-[#49EACB]/10 hover:bg-[#49EACB]/20"
              />
            </ScrollArea>
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
