"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Menu, Search, ChevronLeft, ChevronRight, X } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { LoadingAnimation } from "@/components/loading-animation"
import { WalletConnection } from "@/components/wallet-connection"

const glowAnimation = `
  @keyframes glow {
    0% { box-shadow: 0 0 5px rgba(73, 234, 203, 0.3), 0 0 10px rgba(73, 234, 203, 0.3), 0 0 15px rgba(73, 234, 203, 0.3); }
    50% { box-shadow: 0 0 10px rgba(73, 234, 203, 0.5), 0 0 20px rgba(73, 234, 203, 0.5), 0 0 30px rgba(73, 234, 203, 0.5); }
    100% { box-shadow: 0 0 5px rgba(73, 234, 203, 0.3), 0 0 10px rgba(73, 234, 203, 0.3), 0 0 15px rgba(73, 234, 203, 0.3); }
  }
`

const MotionCard = motion(Card)
const MotionButton = motion(Button)

export default function Page() {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // New mainBanners array using your public folder images
  const mainBanners = [
    "/roulettebanner.PNG",
    "/crashbanner.PNG",
  ]

  // Original banner data is no longer used.
  // const banners = [ ... ]

  const games = [
    { name: "Crash", players: 1234, slug: "crash" },
    { name: "Mines", players: 987, slug: "mines" },
    { name: "Roulette", players: 765, slug: "roulette" },
    { name: "Dice", players: 543, slug: "dice" },
    { name: "Coin Flip", players: 321, slug: "coinflip" },
  ]

  // New liveWins array with several examples for Crash and Roulette
  const liveWins = [
    {
      game: "Crash",
      image: "/crashcard.PNG",
      player: "CrashPlayer1",
      amount: "1,234.56",
      time: "2 minutes ago",
    },
    {
      game: "Crash",
      image: "/crashcard.PNG",
      player: "CrashPlayer2",
      amount: "2,345.67",
      time: "5 minutes ago",
    },
    {
      game: "Crash",
      image: "/crashcard.PNG",
      player: "CrashPlayer3",
      amount: "3,456.78",
      time: "10 minutes ago",
    },
    {
      game: "Roulette",
      image: "/roulettecard.PNG",
      player: "RoulettePlayer1",
      amount: "987.65",
      time: "3 minutes ago",
    },
    {
      game: "Roulette",
      image: "/roulettecard.PNG",
      player: "RoulettePlayer2",
      amount: "1,111.11",
      time: "7 minutes ago",
    },
    {
      game: "Roulette",
      image: "/roulettecard.PNG",
      player: "RoulettePlayer3",
      amount: "1,222.22",
      time: "12 minutes ago",
    },
  ]

  const nextBanner = () =>
    setCurrentBanner((prev) => (prev + 1) % mainBanners.length)
  const prevBanner = () =>
    setCurrentBanner((prev) => (prev - 1 + mainBanners.length) % mainBanners.length)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000) // 3-second delay for fadeout animation

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-black">
      <LoadingAnimation />
      <AnimatePresence mode="wait">
        {!isLoading && (
          <motion.div
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="min-h-screen bg-black text-white flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-[#49EACB]/10 backdrop-blur-sm sticky top-0 z-50">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-0"
              >
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
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="h-14 w-56 relative -ml-3 rounded-lg overflow-hidden hover:animate-glow"
                  style={{
                    animation: "none",
                    transition: "box-shadow 0.3s ease-in-out",
                    "&:hover": {
                      animation: "glow 2s infinite",
                      boxShadow:
                        "0 0 10px rgba(73, 234, 203, 0.5), 0 0 20px rgba(73, 234, 203, 0.5), 0 0 30px rgba(73, 234, 203, 0.5)",
                    },
                  }}
                >
                  <style jsx>{glowAnimation}</style>
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
                    alt="Kasino Logo"
                    fill
                    className="object-contain"
                  />
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-4"
              >
                <WalletConnection />
              </motion.div>
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
                    className="fixed top-[80px] left-0 w-80 h-[calc(100vh-80px)] border-r border-[#49EACB]/10 p-4 backdrop-blur-sm bg-black/95 z-40"
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
                      <Link
                        href="https://raffles.kaspercoin.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#8a2be2]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#8a2be2] to-[#8a2be2]/50 group-hover:shadow-[0_0_10px_rgba(138,43,226,0.3)]" />
                        <span className="group-hover:text-[#8a2be2]">Raffles</span>
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
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative mb-12 h-[26vh]"
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
                          layout="fill"
                          objectFit="cover"
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
                  transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <h2 className="text-2xl font-bold mb-6 text-[#49EACB]">Original Games</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {games.map((game, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                      >
                        <Link href={`/games/${game.slug}`} key={i}>
                          <MotionCard
                            className="group relative overflow-hidden border border-[#49EACB]/10 bg-[#49EACB]/5 backdrop-blur-sm"
                            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(73, 234, 203, 0.15)" }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="relative aspect-[4/3]">
                              <Image
                                src={
                                  game.slug === "crash"
                                    ? "/crashcard.PNG"
                                    : game.slug === "roulette"
                                    ? "/roulettecard.PNG"
                                    : "/placeholder.svg"
                                }
                                alt={`${game.name} thumbnail`}
                                layout="fill"
                                objectFit="cover"
                                className="transition-transform duration-300 group-hover:scale-110"
                              />
                              <div className="absolute inset-x-0 -bottom-4 top-0 bg-gradient-to-b from-transparent to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pb-6">
                                <MotionButton
                                  className="mx-4 mb-2 bg-[#49EACB] text-black font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300"
                                  whileHover={{ scale: 1.02 }}
                                >
                                  Play Now
                                </MotionButton>
                              </div>
                            </div>
                            <div className="p-4">
                              <h3 className="font-semibold mb-1 text-white group-hover:text-[#49EACB] transition-colors duration-300">
                                {game.name}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {game.players.toLocaleString()} Players
                              </p>
                            </div>
                          </MotionCard>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Live Wins */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                >
                  <h2 className="text-2xl font-bold mb-6 text-[#49EACB]">Live Wins</h2>
                  <ScrollArea>
                    <motion.div
                      className="flex gap-4 pb-4"
                      initial={{ x: -20 }}
                      animate={{ x: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      {liveWins.map((win, i) => (
                        <MotionCard
                          key={i}
                          className="flex-shrink-0 w-[280px] border border-[#49EACB]/10 bg-[#49EACB]/5 backdrop-blur-sm overflow-hidden"
                          whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(73, 234, 203, 0.15)" }}
                        >
                          <div className="relative aspect-[4/3]">
                            <Image
                              src={win.image}
                              alt={`${win.game} card`}
                              layout="fill"
                              objectFit="cover"
                              className="object-cover"
                            />
                            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#49EACB] text-black text-sm font-semibold">
                              LIVE
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="font-semibold mb-2">{win.player}</div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm text-[#49EACB]">{win.game} Game</div>
                              <div className="flex items-center gap-1.5">
                                <Image
                                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                  alt="KAS"
                                  width={16}
                                  height={16}
                                  className="rounded-full"
                                />
                                <span className="text-[#49EACB] font-bold">{win.amount}</span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-400">{win.time}</div>
                          </div>
                        </MotionCard>
                      ))}
                    </motion.div>
                    <ScrollBar orientation="horizontal" className="bg-[#49EACB]/10 hover:bg-[#49EACB]/20" />
                  </ScrollArea>
                </motion.div>
              </main>
            </div>

            {/* Footer */}
            <SiteFooter />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
