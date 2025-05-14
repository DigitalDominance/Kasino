"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Menu, Search, ChevronLeft, ChevronRight, X, Users, Trophy, Zap, Flame } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { LoadingAnimation } from "@/components/loading-animation"
import { WalletConnection } from "@/components/wallet-connection"
import { Montserrat } from "next/font/google"
import { GiSwordClash, GiPokerHand } from "react-icons/gi"
import { FaTelegramPlane, FaGem, FaUsers, FaChess, FaDice } from "react-icons/fa"
import { createPortal } from "react-dom"
import { XPDisplay } from "@/components/xp-display" // Assuming this is exported from the main page

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
})

// For framer-motion
const MotionCard = motion(Card)
const MotionButton = motion(Button)

interface MultiplayerGame {
  name: string
  slug: string
  image: string
  players: number
  activeTables: number
  description: string
  category: "card" | "dice" | "strategy" | "tournament"
  featured?: boolean
}

interface LiveMatch {
  id: string
  game: string
  players: string[]
  stake: number
  status: "active" | "waiting" | "completed"
  timestamp: string
}

interface Tournament {
  id: string
  name: string
  game: string
  entryFee: number
  prizePool: number
  players: number
  maxPlayers: number
  startTime: string
  status: "upcoming" | "active" | "completed"
}

export default function MultiplayerGamesPage() {
  return <MultiplayerGamesContent />
}

function MultiplayerGamesContent() {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showAgePopup, setShowAgePopup] = useState(false)
  const [ageChecked, setAgeChecked] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [mounted, setMounted] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

  // Multiplayer Banners
  const multiplayerBanners = [
    "/placeholder.svg?key=ldwol",
    "/placeholder.svg?key=pb4zl",
    "/placeholder.svg?key=alkvp",
    "/placeholder.svg?key=tsl7s",
  ]

  // Multiplayer Games
  const multiplayerGames: MultiplayerGame[] = [
    {
      name: "Poker Room",
      slug: "poker",
      image: "/placeholder.svg?key=senxl",
      players: 243,
      activeTables: 42,
      description: "Texas Hold'em, Omaha, and more poker variants with various stakes",
      category: "card",
      featured: true,
    },
    {
      name: "Blackjack Arena",
      slug: "blackjack-arena",
      image: "/placeholder.svg?height=250&width=400&query=multiplayer blackjack table with teal accents",
      players: 156,
      activeTables: 28,
      description: "Play against other players in this multiplayer blackjack variant",
      category: "card",
    },
    {
      name: "Dice Duel",
      slug: "dice-duel",
      image: "/placeholder.svg?height=250&width=400&query=glowing dice with teal accents",
      players: 89,
      activeTables: 15,
      description: "Head-to-head dice battles with customizable rules",
      category: "dice",
      featured: true,
    },
    {
      name: "Kaspa Chess",
      slug: "kaspa-chess",
      image: "/placeholder.svg?height=250&width=400&query=chess board with teal and black pieces",
      players: 67,
      activeTables: 22,
      description: "Classic chess with Kaspa-themed pieces and wager options",
      category: "strategy",
    },
    {
      name: "Tournament Royale",
      slug: "tournament-royale",
      image: "/placeholder.svg?height=250&width=400&query=tournament bracket with teal trophy",
      players: 312,
      activeTables: 8,
      description: "Multi-round elimination tournaments with massive prize pools",
      category: "tournament",
      featured: true,
    },
    {
      name: "Baccarat Battles",
      slug: "baccarat-battles",
      image: "/placeholder.svg?height=250&width=400&query=baccarat table with teal cards",
      players: 78,
      activeTables: 12,
      description: "Multiplayer baccarat with side bets and team play",
      category: "card",
    },
    {
      name: "Kaspa Dominoes",
      slug: "kaspa-dominoes",
      image: "/placeholder.svg?height=250&width=400&query=dominoes with teal dots",
      players: 45,
      activeTables: 9,
      description: "Classic dominoes with Kaspa-themed tiles and multiplayer modes",
      category: "strategy",
    },
    {
      name: "Craps Showdown",
      slug: "craps-showdown",
      image: "/placeholder.svg?height=250&width=400&query=craps table with teal dice",
      players: 92,
      activeTables: 14,
      description: "Team-based craps with progressive jackpots",
      category: "dice",
    },
    {
      name: "Roulette Rivals",
      slug: "roulette-rivals",
      image: "/placeholder.svg?height=250&width=400&query=multiplayer roulette wheel with teal accents",
      players: 124,
      activeTables: 18,
      description: "Competitive roulette with team strategies and leaderboards",
      category: "strategy",
    },
    {
      name: "Weekly Championship",
      slug: "weekly-championship",
      image: "/placeholder.svg?height=250&width=400&query=tournament podium with teal lighting",
      players: 256,
      activeTables: 4,
      description: "Weekly tournaments across multiple games with qualification rounds",
      category: "tournament",
    },
  ]

  // Mock live matches data
  const mockLiveMatches: LiveMatch[] = [
    {
      id: "match1",
      game: "Poker Room",
      players: ["Player1", "Player2", "Player3", "Player4"],
      stake: 250,
      status: "active",
      timestamp: new Date().toISOString(),
    },
    {
      id: "match2",
      game: "Dice Duel",
      players: ["Player5", "Player6"],
      stake: 100,
      status: "active",
      timestamp: new Date().toISOString(),
    },
    {
      id: "match3",
      game: "Kaspa Chess",
      players: ["Player7", "Player8"],
      stake: 500,
      status: "active",
      timestamp: new Date().toISOString(),
    },
    {
      id: "match4",
      game: "Blackjack Arena",
      players: ["Player9", "Player10", "Player11"],
      stake: 150,
      status: "waiting",
      timestamp: new Date().toISOString(),
    },
    {
      id: "match5",
      game: "Roulette Rivals",
      players: ["Player12", "Player13", "Player14", "Player15"],
      stake: 300,
      status: "active",
      timestamp: new Date().toISOString(),
    },
  ]

  // Mock tournament data
  const mockTournaments: Tournament[] = [
    {
      id: "t1",
      name: "Weekend Poker Championship",
      game: "Poker Room",
      entryFee: 50,
      prizePool: 5000,
      players: 76,
      maxPlayers: 100,
      startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      status: "upcoming",
    },
    {
      id: "t2",
      name: "Dice Masters Showdown",
      game: "Dice Duel",
      entryFee: 25,
      prizePool: 2500,
      players: 32,
      maxPlayers: 32,
      startTime: new Date().toISOString(),
      status: "active",
    },
    {
      id: "t3",
      name: "Strategic Minds Cup",
      game: "Kaspa Chess",
      entryFee: 100,
      prizePool: 10000,
      players: 16,
      maxPlayers: 16,
      startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      status: "active",
    },
    {
      id: "t4",
      name: "Monthly Mega Tournament",
      game: "Tournament Royale",
      entryFee: 200,
      prizePool: 50000,
      players: 128,
      maxPlayers: 256,
      startTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
      status: "upcoming",
    },
  ]

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % multiplayerBanners.length)
  const prevBanner = () =>
    setCurrentBanner((prev) => (prev - 1 + multiplayerBanners.length) % multiplayerBanners.length)

  useEffect(() => {
    const rotation = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % multiplayerBanners.length)
    }, 4000)
    return () => clearInterval(rotation)
  }, [multiplayerBanners.length])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      setShowAgePopup(true)
    }
  }, [isLoading])

  useEffect(() => {
    setMounted(true)
    // Initialize with mock data
    setLiveMatches(mockLiveMatches)
    setTournaments(mockTournaments)
  }, [])

  // Filter games by category
  const filteredGames = activeCategory
    ? multiplayerGames.filter((game) => game.category === activeCategory)
    : multiplayerGames

  // Get featured games
  const featuredGames = multiplayerGames.filter((game) => game.featured)

  return (
    <div className={`${montserrat.className} min-h-screen bg-black`}>
      <style jsx global>{`
        @keyframes gradientAnimation {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient {
          background: linear-gradient(270deg, #49eacb, #006d5b, #003f2f, #006d5b, #49eacb);
          background-size: 400% 400%;
          animation: gradientAnimation 8s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hover-effect:hover {
          filter: drop-shadow(0 0 8px #49eacb);
        }
        .nav-hover {
          transition: filter 0.3s ease;
        }
        .nav-hover:hover {
          filter: drop-shadow(0 0 8px #49eacb);
        }
        .icon-primary {
          color: #49eacb;
          fill: #49eacb;
        }
        /* Custom scrollbar styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #49eacb;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3bc9b6;
        }
        @media (max-width: 768px) {
          .telegram-icon {
            bottom: 15vh !important;
          }
        }
        /* Pulse animation for live indicators */
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(73, 234, 203, 0.7);
          }
          
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(73, 234, 203, 0);
          }
          
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(73, 234, 203, 0);
          }
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        /* Floating animation for cards */
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        .float {
          animation: float 6s ease-in-out infinite;
        }
        /* Glow effect for active elements */
        .glow-effect {
          box-shadow: 0 0 15px rgba(73, 234, 203, 0.5);
          transition: box-shadow 0.3s ease;
        }
        .glow-effect:hover {
          box-shadow: 0 0 25px rgba(73, 234, 203, 0.8);
        }
        /* Category pill active state */
        .category-pill {
          transition: all 0.3s ease;
        }
        .category-pill.active {
          background-color: #49eacb;
          color: #000;
          font-weight: bold;
        }
      `}</style>

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
            {/* AGE CONFIRMATION POPUP */}
            {showAgePopup &&
              createPortal(
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
                  >
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="bg-black border-2 border-[#49EACB] rounded-lg p-6 text-center max-w-xs w-full"
                    >
                      <h2 className="text-2xl font-bold text-[#49EACB] mb-4">CONFIRM AGE</h2>
                      <Image src="/18.webp" alt="18+" width={100} height={100} className="mx-auto mb-4" />
                      <div className="flex items-center justify-center mb-4">
                        <input
                          id="age-checkbox"
                          type="checkbox"
                          className="mr-2"
                          checked={ageChecked}
                          onChange={() => setAgeChecked(!ageChecked)}
                        />
                        <label htmlFor="age-checkbox" className="text-white">
                          I Am 18 Years Of Age Or Older
                        </label>
                      </div>
                      <Button
                        onClick={() => setShowAgePopup(false)}
                        disabled={!ageChecked}
                        className="bg-[#49EACB] text-black font-semibold"
                      >
                        Close
                      </Button>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>,
                document.body,
              )}

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
                  className="text-[#49eacb] hover:bg-[#49eacb]/10"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                >
                  {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </MotionButton>
                <motion.div
                  className="h-14 w-56 relative -ml-3 rounded-lg overflow-hidden nav-hover"
                  style={{ transition: "box-shadow 0.3s ease-in-out" }}
                >
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
                <XPDisplay />
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
                      {/* Guide Link */}
                      <Link
                        href="https://www.kascasino.xyz/guide"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#00aaff]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00aaff] to-[#00aaff]/50 group-hover:shadow-[0_0_10px_rgba(0,170,255,0.3)]" />
                        <span className="group-hover:text-[#00aaff]">Guide</span>
                      </Link>
                      {/* Sportsbook Link */}
                      <Link
                        href="https://www.kascasino.xyz/bet"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#ff00ff]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#ff00ff] to-[#ff00ff]/50 group-hover:shadow-[0_0_10px_rgba(255,0,255,0.3)]" />
                        <span className="group-hover:text-[#ff00ff]">Sportsbook</span>
                      </Link>
                      {/* Casino Link */}
                      <Link
                        href="#"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#49EACB]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#49eacb] to-[#49eacb]/50 group-hover:shadow-[0_0_10px_rgba(73,234,203,0.3)]" />
                        <span className="group-hover:text-[#49eacb]">Casino</span>
                      </Link>
                      {/* Multiplayer Link - Active */}
                      <Link
                        href="#"
                        className="flex items-center gap-3 p-2 rounded bg-[#49EACB]/10 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#49eacb] to-[#49eacb]/50 shadow-[0_0_10px_rgba(73,234,203,0.3)]" />
                        <span className="text-[#49eacb]">Multiplayer</span>
                      </Link>
                      {/* Raffles Link */}
                      <Link
                        href="https://raffles.kaspercoin.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#8a2be2]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#8a2be2] to-[#8a2be2]/50 group-hover:shadow-[0_0_10px_rgba(138,43,226,0.3)]" />
                        <span className="group-hover:text-[#8a2be2]">Raffles</span>
                      </Link>
                      {/* Support Link */}
                      <Link
                        href="https://t.me/KasCasinoXYZ/2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#8b0000]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#8b0000] to-black group-hover:shadow-[0_0_10px_rgba(139,0,0,0.3)]" />
                        <span className="group-hover:text-[#8b0000]">Support</span>
                      </Link>
                    </div>
                    <div className="absolute telegram-icon left-0 w-full px-4" style={{ bottom: "1rem" }}>
                      <Link
                        href="https://t.me/KasCasinoXYZ"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#49EACB] hover:shadow-[0_0_10px_rgba(73,234,203,0.3)]">
                          <FaTelegramPlane size={20} color="black" />
                        </div>
                      </Link>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>

              {/* Main Content */}
              <main className="flex-1 p-6 overflow-hidden">
                {/* Multiplayer Banner */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative mb-6 sm:mb-12 w-full -mt-6 sm:mt-0"
                  style={{ aspectRatio: "1920 / 500" }}
                >
                  <div className="relative w-full h-full overflow-hidden rounded-lg border border-[#49EACB]/10">
                    {multiplayerBanners.map((banner, index) => (
                      <motion.div
                        key={index}
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: index === currentBanner ? 1 : 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Image
                          src={banner || "/placeholder.svg"}
                          alt="Multiplayer Banner"
                          fill
                          style={{ objectFit: "cover" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-center p-8 md:p-12">
                          <motion.h1
                            className="text-3xl md:text-5xl font-bold mb-4 text-white"
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                          >
                            MULTIPLAYER <span className="text-[#49EACB]">ARENA</span>
                          </motion.h1>
                          <motion.p
                            className="text-lg md:text-xl text-gray-200 max-w-md mb-6"
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                          >
                            Challenge players from around the world in real-time PVP games and tournaments
                          </motion.p>
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.8 }}
                          >
                            <Button className="bg-[#49EACB] text-black font-bold hover:bg-[#49EACB]/80 hover:shadow-[0_0_15px_rgba(73,234,203,0.5)]">
                              Join a Game
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <button
                    onClick={prevBanner}
                    className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-1 sm:p-2 rounded-full hover:bg-black/70 transition-colors text-xs sm:text-base"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={nextBanner}
                    className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-1 sm:p-2 rounded-full hover:bg-black/70 transition-colors text-xs sm:text-base"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </motion.div>

                {/* Live Stats Bar */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="bg-gradient-to-r from-[#003f2f] via-[#006d5b] to-[#003f2f] rounded-lg p-4 mb-8 shadow-lg"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <div className="bg-[#49EACB]/20 p-2 rounded-full">
                        <Users className="w-6 h-6 text-[#49EACB]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-200">Online Players</p>
                        <p className="text-xl font-bold text-white">1,248</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <div className="bg-[#49EACB]/20 p-2 rounded-full">
                        <Zap className="w-6 h-6 text-[#49EACB]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-200">Active Tables</p>
                        <p className="text-xl font-bold text-white">172</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <div className="bg-[#49EACB]/20 p-2 rounded-full">
                        <Trophy className="w-6 h-6 text-[#49EACB]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-200">Tournaments</p>
                        <p className="text-xl font-bold text-white">14</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <div className="bg-[#49EACB]/20 p-2 rounded-full">
                        <Flame className="w-6 h-6 text-[#49EACB]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-200">Total Prize Pool</p>
                        <div className="flex items-center">
                          <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                            alt="KAS"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          <p className="text-xl font-bold text-white">67,500</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Category Filter */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="mb-8"
                >
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      onClick={() => setActiveCategory(null)}
                      className={`category-pill ${activeCategory === null ? "active" : "bg-gray-800 text-white hover:bg-gray-700"}`}
                    >
                      All Games
                    </Button>
                    <Button
                      onClick={() => setActiveCategory("card")}
                      className={`category-pill ${activeCategory === "card" ? "active" : "bg-gray-800 text-white hover:bg-gray-700"}`}
                    >
                      <GiPokerHand className="mr-2" /> Card Games
                    </Button>
                    <Button
                      onClick={() => setActiveCategory("dice")}
                      className={`category-pill ${activeCategory === "dice" ? "active" : "bg-gray-800 text-white hover:bg-gray-700"}`}
                    >
                      <FaDice className="mr-2" /> Dice Games
                    </Button>
                    <Button
                      onClick={() => setActiveCategory("strategy")}
                      className={`category-pill ${activeCategory === "strategy" ? "active" : "bg-gray-800 text-white hover:bg-gray-700"}`}
                    >
                      <FaChess className="mr-2" /> Strategy Games
                    </Button>
                    <Button
                      onClick={() => setActiveCategory("tournament")}
                      className={`category-pill ${activeCategory === "tournament" ? "active" : "bg-gray-800 text-white hover:bg-gray-700"}`}
                    >
                      <Trophy className="mr-2" /> Tournaments
                    </Button>
                  </div>
                </motion.div>

                {/* Featured Games */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                      <FaGem />
                    </span>
                    <span className="animate-gradient">Featured Games</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {featuredGames.map((game, i) => (
                      <motion.div
                        key={i}
                        className="float"
                        style={{ animationDelay: `${i * 0.2}s` }}
                        whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                      >
                        <Link href={`/games/${game.slug}`}>
                          <MotionCard className="overflow-hidden border-none bg-transparent h-full glow-effect">
                            <div className="relative aspect-video">
                              <Image
                                src={game.image || "/placeholder.svg"}
                                alt={`${game.name} thumbnail`}
                                fill
                                style={{ objectFit: "cover" }}
                                className="rounded-t-lg"
                              />
                              <div className="absolute top-2 right-2 bg-[#49EACB] text-black text-xs font-bold px-2 py-1 rounded-full flex items-center">
                                <div className="w-2 h-2 bg-black rounded-full mr-1 pulse"></div>
                                FEATURED
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                                <h3 className="text-xl font-bold text-white">{game.name}</h3>
                                <p className="text-[#49EACB]">
                                  {game.category.charAt(0).toUpperCase() + game.category.slice(1)}
                                </p>
                              </div>
                            </div>
                            <div className="p-4 bg-gray-900">
                              <p className="text-gray-300 mb-3">{game.description}</p>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-[#49EACB]" />
                                  <span className="text-white">{game.players} Players</span>
                                </div>
                                <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80">Play Now</Button>
                              </div>
                            </div>
                          </MotionCard>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* All Multiplayer Games */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                      <GiSwordClash />
                    </span>
                    <span className="animate-gradient">
                      {activeCategory
                        ? `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Games`
                        : "All Multiplayer Games"}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredGames.map((game, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                        className="h-full"
                      >
                        <Link href={`/games/${game.slug}`}>
                          <MotionCard
                            className="group relative overflow-hidden border-none bg-transparent h-full"
                            whileHover={{
                              scale: 1.05,
                              boxShadow: "0 0 30px rgba(73, 234, 203, 0.15)",
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="relative aspect-[4/2.5] mt-1">
                              <Image
                                src={game.image || "/placeholder.svg"}
                                alt={`${game.name} thumbnail`}
                                fill
                                style={{ objectFit: "cover" }}
                                className="scale-100 transition-transform duration-300 group-hover:scale-110"
                              />
                              <div className="absolute inset-x-0 -bottom-5 top-0 bg-gradient-to-b from-transparent to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pb-6">
                                <MotionButton
                                  className="mx-4 mb-4 bg-[#49EACB] text-black font-semibold text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
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
                              <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-400">
                                  Tables: <span className="text-[#49EACB] font-bold">{game.activeTables}</span>
                                </p>
                                <p className="text-sm text-gray-400">
                                  Players: <span className="text-[#49EACB] font-bold">{game.players}</span>
                                </p>
                              </div>
                            </div>
                          </MotionCard>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Live Matches */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                      <Zap />
                    </span>
                    <span className="animate-gradient">Live Matches</span>
                  </h2>
                  <ScrollArea className="custom-scrollbar">
                    <motion.div
                      className="flex gap-4 pb-4"
                      initial={{ x: -20 }}
                      animate={{ x: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      {liveMatches.map((match, i) => {
                        // Find the corresponding game to get the image
                        const gameData = multiplayerGames.find((g) => g.name === match.game) || {
                          image: "/placeholder.svg?height=250&width=400&query=multiplayer game table with teal accents",
                        }

                        return (
                          <MotionCard
                            key={i}
                            className="flex-shrink-0 w-[280px] max-md:w-[220px] border-none bg-transparent overflow-hidden"
                            whileHover={{
                              scale: 1.02,
                              boxShadow: "0 0 20px rgba(73,234,203,0.15)",
                            }}
                          >
                            <div className="relative aspect-[4/3] mt-1">
                              <Image
                                src={gameData.image || "/placeholder.svg"}
                                alt={`${match.game} match`}
                                fill
                                style={{ objectFit: "cover" }}
                                className="rounded-none scale-100"
                              />
                              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#49EACB] text-black text-sm font-semibold flex items-center">
                                <div className="w-2 h-2 bg-black rounded-full mr-1 pulse"></div>
                                LIVE
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm text-[#49EACB]">{match.game.toUpperCase()}</div>
                                <div className="flex items-center gap-1.5">
                                  <Image
                                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                    alt="KAS"
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                  />
                                  <span className="text-[#49EACB] font-bold">{match.stake.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-400">
                                {match.players.length} Players •{" "}
                                {match.status === "waiting" ? "Waiting" : "In Progress"}
                              </div>
                              <Button
                                className="w-full mt-2 bg-[#49EACB]/10 hover:bg-[#49EACB]/20 text-[#49EACB] border border-[#49EACB]/30"
                                size="sm"
                              >
                                {match.status === "waiting" ? "Join Table" : "Watch Game"}
                              </Button>
                            </div>
                          </MotionCard>
                        )
                      })}
                    </motion.div>
                    <ScrollBar orientation="horizontal" className="bg-[#49EACB]/10 hover:bg-[#49EACB]/20" />
                  </ScrollArea>
                </motion.div>

                {/* Tournaments */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                      <Trophy />
                    </span>
                    <span className="animate-gradient">Tournaments</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tournaments.map((tournament, i) => {
                      const isActive = tournament.status === "active"
                      const isUpcoming = tournament.status === "upcoming"
                      const startTime = new Date(tournament.startTime)
                      const formattedTime = startTime.toLocaleString()

                      // Find the corresponding game to get the image
                      const gameData = multiplayerGames.find((g) => g.name === tournament.game) || {
                        image: "/placeholder.svg?height=250&width=400&query=tournament podium with teal lighting",
                      }

                      return (
                        <MotionCard
                          key={i}
                          className={`overflow-hidden border-none ${isActive ? "bg-gradient-to-r from-[#003f2f]/50 to-[#006d5b]/50" : "bg-transparent"}`}
                          whileHover={{
                            scale: 1.02,
                            boxShadow: "0 0 20px rgba(73,234,203,0.15)",
                          }}
                        >
                          <div className="flex flex-col md:flex-row">
                            <div className="relative w-full md:w-1/3 aspect-square md:aspect-auto">
                              <Image
                                src={gameData.image || "/placeholder.svg"}
                                alt={tournament.name}
                                fill
                                style={{ objectFit: "cover" }}
                              />
                              <div
                                className={`absolute top-2 right-2 px-2 py-1 rounded text-sm font-semibold ${
                                  isActive
                                    ? "bg-[#49EACB] text-black"
                                    : isUpcoming
                                      ? "bg-yellow-500 text-black"
                                      : "bg-gray-500 text-white"
                                }`}
                              >
                                {isActive && (
                                  <div className="flex items-center">
                                    <div className="w-2 h-2 bg-black rounded-full mr-1 pulse"></div>
                                    LIVE
                                  </div>
                                )}
                                {isUpcoming && "UPCOMING"}
                                {!isActive && !isUpcoming && "COMPLETED"}
                              </div>
                            </div>
                            <div className="p-4 md:w-2/3">
                              <h3 className="text-lg font-bold text-white mb-2">{tournament.name}</h3>
                              <p className="text-[#49EACB] text-sm mb-2">{tournament.game}</p>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                                <div>
                                  <p className="text-xs text-gray-400">Entry Fee</p>
                                  <div className="flex items-center">
                                    <Image
                                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                      alt="KAS"
                                      width={14}
                                      height={14}
                                      className="mr-1"
                                    />
                                    <p className="text-white font-bold">{tournament.entryFee}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Prize Pool</p>
                                  <div className="flex items-center">
                                    <Image
                                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                      alt="KAS"
                                      width={14}
                                      height={14}
                                      className="mr-1"
                                    />
                                    <p className="text-white font-bold">{tournament.prizePool.toLocaleString()}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Players</p>
                                  <p className="text-white">
                                    {tournament.players}/{tournament.maxPlayers}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">{isUpcoming ? "Starts" : "Started"}</p>
                                  <p className="text-white text-xs">{formattedTime}</p>
                                </div>
                              </div>

                              <Button
                                className={`w-full ${
                                  isActive
                                    ? "bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                                    : isUpcoming
                                      ? "bg-[#49EACB]/80 text-black hover:bg-[#49EACB]"
                                      : "bg-gray-700 text-white hover:bg-gray-600"
                                }`}
                              >
                                {isActive ? "Join Now" : isUpcoming ? "Register" : "View Results"}
                              </Button>
                            </div>
                          </div>
                        </MotionCard>
                      )
                    })}
                  </div>
                  <div className="flex justify-center mt-6">
                    <Button className="bg-[#49EACB]/10 hover:bg-[#49EACB]/20 text-[#49EACB] border border-[#49EACB]/30">
                      View All Tournaments
                    </Button>
                  </div>
                </motion.div>

                {/* Join the Community */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <div className="relative overflow-hidden rounded-lg border border-[#49EACB]/20 bg-gradient-to-r from-[#003f2f] to-[#006d5b] p-6 md:p-8">
                    <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
                      <div className="relative w-full h-full">
                        <Image
                          src="/placeholder.svg?height=400&width=400&query=abstract gaming pattern with teal accents"
                          alt="Background Pattern"
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    </div>

                    <div className="relative z-10 max-w-3xl">
                      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Join Our Multiplayer Community</h2>
                      <p className="text-gray-200 mb-6">
                        Connect with players, join tournaments, and stay updated on the latest multiplayer events. Join
                        our Telegram group to chat with other players and get exclusive access to private tournaments.
                      </p>

                      <div className="flex flex-wrap gap-4">
                        <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 flex items-center gap-2">
                          <FaTelegramPlane size={18} />
                          Join Telegram
                        </Button>
                        <Button className="bg-black/30 text-white border border-[#49EACB]/30 hover:bg-black/50 flex items-center gap-2">
                          <Trophy size={18} />
                          Tournament Schedule
                        </Button>
                        <Button className="bg-black/30 text-white border border-[#49EACB]/30 hover:bg-black/50 flex items-center gap-2">
                          <FaUsers size={18} />
                          Find Players
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </main>
            </div>

            <SiteFooter />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
