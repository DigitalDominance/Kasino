"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Menu, ChevronLeft, ChevronRight, X, Zap, Trophy, Flame } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { LoadingAnimation } from "@/components/loading-animation"
import { WalletConnection } from "@/components/wallet-connection"
import { Montserrat } from "next/font/google"
import { GiCheerful, GiStarFormation, GiPresent, GiCardRandom } from "react-icons/gi"
import { FaTelegramPlane, FaUserAlt, FaGem, FaGamepad } from "react-icons/fa"
import axios from "axios"
import { createPortal } from "react-dom"
import { XPDisplay } from "@/components/xp-display"
import { TutorialSystem } from "@/components/tutorial-system"
import { useWallet } from "@/contexts/WalletContext"

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
})

// For framer-motion
const MotionCard = motion(Card)
const MotionButton = motion(Button)

interface Win {
  username: string
  amount: number
  game: string
  timestamp: string
}

interface GameStats {
  uniquePlayers: number
  gamesPlayed: number
  totalDailyWins: number
  totalKasWon: number
}

export default function MainPage() {
  return <MainPageContent />
}

function MainPageContent() {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showAgePopup, setShowAgePopup] = useState(false)
  const [ageChecked, setAgeChecked] = useState(false)
  const [liveWins, setLiveWins] = useState<Win[]>([])
  const [winCounter, setWinCounter] = useState<any[]>([])
  const [highScores, setHighScores] = useState<{ [key: string]: number }>({})
  const [gameStats, setGameStats] = useState<GameStats>({
    uniquePlayers: 0,
    gamesPlayed: 0,
    totalDailyWins: 0,
    totalKasWon: 0,
  })
  const sidebarButtonRef = useRef<HTMLButtonElement>(null)
  const xpDisplayRef = useRef<HTMLElement | null>(null)
  const walletStatusRef = useRef<HTMLElement | null>(null)
  const { walletAddress } = useWallet()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

  // Banners
  const mainBanners = [
    "/roulettebanner.webp",
    "/kasenpromo.png",
    "/minesbanner.webp",
    "/crashbanner.webp",
    "/dicecoinflipcombobanner.webp",
  ]

  // Original Games
  const games = [
    { name: "Ghost Jump", slug: "ghostjump", image: "/ghostjumpcard.webp" },
    { name: "Kaspian Cross", slug: "kaspiancross", image: "/kaspiancrosscard.webp" },
    { name: "Crash", slug: "crash", image: "/crashcard.webp" },
    { name: "Mines", slug: "mines", image: "/minescard.webp" },
    { name: "Upgrade", slug: "Upgrade", image: "/upgradecard.webp" },
    { name: "Kaspa Tower Climb", slug: "kaspatowerclimb", image: "/kaspatowerclimbcard.webp" },
    { name: "Plinko", slug: "plinko", image: "/plinkocard.webp" },
    { name: "Guess The Cup", slug: "kaspacupgame", image: "/guessthecupcard.webp" },
    { name: "Roulette", slug: "roulette", image: "/roulettecard.webp" },
    { name: "Dice", slug: "dice", image: "/dicecard.webp" },
    { name: "Coin Flip", slug: "coinflip", image: "/coinflipcard.webp" },
  ]

  // Character Games
  const characterGames = [
    { name: "Kasper Loot Box", slug: "lootbox", image: "/kasperlootboxcard.webp" },
    { name: "Kasen Mania", slug: "kasen-mania", image: "/kasenmaniacard.webp" },
  ]

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % mainBanners.length)
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + mainBanners.length) % mainBanners.length)

  useEffect(() => {
    const rotation = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % mainBanners.length)
    }, 4000)
    return () => clearInterval(rotation)
  }, [mainBanners.length])

  // Resolve wallet addresses to usernames for live wins
  const resolveUsername = async (win: Win): Promise<Win> => {
    if (win.username.startsWith("kaspa:")) {
      try {
        const res = await axios.get(`/api/user?walletAddress=${encodeURIComponent(win.username)}`)
        if (res.data && res.data.username) {
          return { ...win, username: res.data.username }
        }
      } catch (err) {
        console.error("Error resolving username for wallet", win.username, err)
      }
    }
    return win
  }

  // Fetch live wins
  useEffect(() => {
    const fetchWins = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/latest-wins`)
        if (res.data.success) {
          const resolvedWins = await Promise.all(res.data.wins.map(resolveUsername))
          setLiveWins(resolvedWins.slice(0, 10))
        }
      } catch (error) {
        console.error("Error fetching latest wins:", error)
      }
    }
    fetchWins()
    const interval = setInterval(fetchWins, 8000)
    return () => clearInterval(interval)
  }, [apiUrl])

  useEffect(() => {
    const fetchDisplayStats = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/display-stats`)
        if (res.data.success) {
          setGameStats(res.data.data)
        }
      } catch (error) {
        console.error("Error fetching display stats:", error)
      }
    }

    fetchDisplayStats()
    const interval = setInterval(fetchDisplayStats, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [apiUrl])

  // Fetch high scores
  useEffect(() => {
    const fetchHighScores = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/highscores`)
        if (res.data.success) {
          setHighScores(res.data.highscores)
        }
      } catch (error) {
        console.error("Error fetching high scores:", error)
      }
    }
    fetchHighScores()
    const interval = setInterval(fetchHighScores, 10000)
    return () => clearInterval(interval)
  }, [apiUrl])

  // Fetch win counts
  useEffect(() => {
    const fetchWinCounts = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/win-counter`)
        if (res.data.success) {
          console.log("Win counter data:", res.data.counts)
          setWinCounter(res.data.counts || [])
        } else {
          // If API returns success: false, initialize with empty array
          setWinCounter([])
        }
      } catch (error) {
        console.error("Error fetching win counts:", error)
        // Initialize with empty array on error
        setWinCounter([])
      }
    }
    fetchWinCounts()
    const interval = setInterval(fetchWinCounts, 10000)
    return () => clearInterval(interval)
  }, [apiUrl])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Show age popup after loading completes
  useEffect(() => {
    if (!isLoading) {
      setShowAgePopup(true)
    }
  }, [isLoading])

  // Check if large screen on mount and when window resizes
  useEffect(() => {
    const checkIfLargeScreen = () => {
      // Only check if it's a large screen
      setIsDesktop(window.innerWidth >= 1920)
    }

    // Initial check
    checkIfLargeScreen()

    // Add event listener
    window.addEventListener("resize", checkIfLargeScreen)

    // Cleanup
    return () => window.removeEventListener("resize", checkIfLargeScreen)
  }, [])

  // Store references to the XP display and wallet status elements
  useEffect(() => {
    if (document) {
      xpDisplayRef.current = document.querySelector(".xp-display-trigger")
      walletStatusRef.current = document.querySelector(".wallet-status-trigger")
    }
  }, [isLoading])

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  // Handle daily rewards button click
  const handleDailyRewardsClick = () => {
    if (xpDisplayRef.current) {
      xpDisplayRef.current.click()
    }
  }

  // Handle referral program button click
  const handleReferralProgramClick = () => {
    if (walletStatusRef.current) {
      walletStatusRef.current.click()
    }
  }

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
        /* Responsive adjustments */
        @media (min-width: 1600px) {
          .container-xl {
            max-width: 1400px;
            margin: 0 auto;
          }
        }
        @media (min-width: 2000px) {
          .container-xl {
            max-width: 1800px;
          }
        }
        /* Number counter animation */
        @keyframes countUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .count-animation {
          animation: countUp 0.5s ease-out forwards;
        }
        /* Pulse slow animation for side gradients */
        @keyframes pulseSlow {
          0% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 0.3;
          }
        }
        .animate-pulse-slow {
          animation: pulseSlow 4s ease-in-out infinite;
        }
      `}</style>

      <LoadingAnimation />

      {/* Simple Tutorial Tooltip */}
      <TutorialSystem sidebarButtonRef={sidebarButtonRef} />

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
            <header className="flex items-center justify-between p-2 sm:p-4 border-b border-[#49EACB]/10 backdrop-blur-sm sticky top-0 z-50">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-0 shrink-0"
              >
                <MotionButton
                  ref={sidebarButtonRef}
                  variant="ghost"
                  size="icon"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[#49eacb] hover:bg-[#49eacb]/10"
                  onClick={handleSidebarToggle}
                >
                  {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </MotionButton>
                <motion.div
                  className="h-8 sm:h-14 w-28 sm:w-56 relative -ml-3 rounded-lg overflow-hidden nav-hover"
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
                className="flex items-center gap-1 sm:gap-4 shrink-0"
              >
                <XPDisplay className="xp-display-trigger" />
                <div className="wallet-status-trigger">
                  <WalletConnection className="wallet-connection-trigger" />
                </div>
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
                    className="fixed top-[80px] left-0 w-80 h-[calc(100vh-80px)] border-r border-[#49EACB]/10 p-4 backdrop-blur-sm bg-black/95 z-[100]"
                  >
                    <div className="mt-4 space-y-2">
                      {/* Guide Link */}
                      <Link
                        href="https://www.kascasino.xyz/guide"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#00aaff]/5 transition-all duration-300 group pointer-events-auto"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00aaff] to-[#00aaff]/50 group-hover:shadow-[0_0_10px_rgba(0,170,255,0.3)]" />
                        <span className="group-hover:text-[#00aaff]">Guide</span>
                      </Link>
                      {/* Multiplayer Link */}
                      <div className="relative">
                        <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-[#49EACB]">
                          <p className="text-xl font-bold text-[#49EACB]">Coming Soon</p>
                        </div>
                        <div className="pointer-events-none">
                          <Link href="#" onClick={(e) => e.preventDefault()}>
                            <div className="flex items-center gap-3 p-2 rounded hover:bg-[#49EACB]/5 transition-all duration-300 group pointer-events-auto">
                              <div className="w-5 h-5 rounded bg-gradient-to-br from-[#49eacb] to-[#49eacb]/50 group-hover:shadow-[0_0_10px_rgba(73,234,203,0.3)]" />
                              <span className="group-hover:text-[#49eacb]">Multiplayer</span>
                            </div>
                          </Link>
                        </div>
                      </div>
                      {/* Sportsbook Link */}
                      <Link
                        href="https://www.kascasino.xyz/bet"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#ff00ff]/5 transition-all duration-300 group pointer-events-auto"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#ff00ff] to-[#ff00ff]/50 group-hover:shadow-[0_0_10px_rgba(255,0,255,0.3)]" />
                        <span className="group-hover:text-[#ff00ff]">Sportsbook</span>
                      </Link>
                      {/* Raffles Link */}
                      <Link
                        href="https://raffles.kaspercoin.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#8a2be2]/5 transition-all duration-300 group pointer-events-auto"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#8a2be2] to-[#8a2be2]/50 group-hover:shadow-[0_0_10px_rgba(138,43,226,0.3)]" />
                        <span className="group-hover:text-[#8a2be2]">Raffles</span>
                      </Link>
                      {/* Support Link */}
                      <Link
                        href="https://t.me/KasCasinoXYZ/2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#8b0000]/5 transition-all duration-300 group pointer-events-auto"
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
              <main className="flex-1 p-3 sm:p-6 overflow-hidden relative">
                {/* Side gradients */}
                <div className="hidden lg:block absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#49EACB]/20 to-transparent pointer-events-none animate-pulse-slow"></div>
                <div className="hidden lg:block absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#49EACB]/20 to-transparent pointer-events-none animate-pulse-slow"></div>

                <div className="container-xl">
                  {/* Main Banner */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative mb-6 sm:mb-12 w-full mt-4 sm:mt-0"
                    style={{ aspectRatio: "1920 / 500", minHeight: "280px" }}
                  >
                    <div className="relative w-full h-full overflow-hidden rounded-lg border border-[#49EACB]">
                      {mainBanners.map((banner, index) => (
                        <motion.div
                          key={index}
                          className="absolute inset-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: index === currentBanner ? 1 : 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Image
                            src={banner || "/placeholder.svg"}
                            alt="Main Banner"
                            fill
                            style={{ objectFit: "contain" }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-center items-center text-center p-4 sm:p-8">
                            <motion.div
                              initial={{ y: 30, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.3, duration: 0.5 }}
                              className="max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto"
                            >
                              <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-4">
                                Welcome to <span className="text-[#49EACB]">Kasino</span>
                              </h2>
                              <p className="text-xs sm:text-base md:text-lg lg:text-xl text-gray-200 mb-2 sm:mb-6 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto">
                                Play, win, and earn rewards with our exciting casino games
                              </p>
                              <Button className="bg-[#49EACB] text-black font-bold hover:bg-[#49EACB]/80 hover:shadow-[0_0_15px_rgba(73,234,203,0.5)] text-xs sm:text-sm md:text-base lg:text-lg py-1 sm:py-2 h-auto sm:h-10 md:h-12 lg:h-14 px-4 md:px-6 lg:px-8 absolute sm:relative bottom-4 sm:bottom-auto hidden sm:inline-block">
                                Play Now
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

                  {/* Stats Bar */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="bg-gradient-to-r from-[#003f2f] via-[#006d5b] to-[#003f2f] rounded-lg p-4 md:p-6 lg:p-8 mb-8 shadow-lg"
                  >
                    <h3 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-3 md:mb-5 lg:mb-6 text-center">
                      Daily Stats
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
                      <div className="flex items-center justify-center gap-3 md:gap-4 lg:gap-5">
                        <div className="bg-[#49EACB]/20 p-2 md:p-3 lg:p-4 rounded-full">
                          <Zap className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-[#49EACB]" />
                        </div>
                        <div>
                          <p className="text-sm md:text-base lg:text-lg xl:text-xl text-gray-200">Total Players</p>
                          <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
                            {gameStats.uniquePlayers.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3 md:gap-4 lg:gap-5">
                        <div className="bg-[#49EACB]/20 p-2 md:p-3 lg:p-4 rounded-full">
                          <FaGamepad className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-[#49EACB]" />
                        </div>
                        <div>
                          <p className="text-sm md:text-base lg:text-lg xl:text-xl text-gray-200">Games Played</p>
                          <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
                            {gameStats.gamesPlayed.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3 md:gap-4 lg:gap-5">
                        <div className="bg-[#49EACB]/20 p-2 md:p-3 lg:p-4 rounded-full">
                          <Trophy className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-[#49EACB]" />
                        </div>
                        <div>
                          <p className="text-sm md:text-base lg:text-lg xl:text-xl text-gray-200">Total Daily Wins</p>
                          <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
                            {gameStats.totalDailyWins.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3 md:gap-4 lg:gap-5">
                        <div className="bg-[#49EACB]/20 p-2 md:p-3 lg:p-4 rounded-full">
                          <Flame className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-[#49EACB]" />
                        </div>
                        <div>
                          <p className="text-sm md:text-base lg:text-lg xl:text-xl text-gray-200">Total KAS Won</p>
                          <div className="flex items-center">
                            <Image
                              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                              alt="KAS"
                              width={20}
                              height={20}
                              className="mr-1 md:w-6 md:h-6 lg:w-8 lg:h-8"
                            />
                            <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
                              {gameStats.totalKasWon.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-gray-400 text-xs md:text-sm lg:text-base mt-3 md:mt-5 lg:mt-6">
                      Please Play Responsibly
                    </p>
                  </motion.div>

                  {/* Featured Section */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    className="mb-12"
                  >
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                      <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                        <FaGem />
                      </span>
                      <span className="animate-gradient">Featured</span>
                    </h2>
                    <div className="flex flex-wrap items-start gap-4">
                      <motion.div
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1rem)] max-w-[400px]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                      >
                        <Link href="https://www.kascasino.xyz/bet">
                          <MotionCard
                            className="group relative overflow-hidden border border-[#49EACB] bg-black h-full glow-effect"
                            whileHover={{
                              scale: 1.05,
                              boxShadow: "0 0 30px rgba(73, 234, 203, 0.3)",
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="relative aspect-[4/2.5]">
                              <Image
                                src="/betcard.webp"
                                alt="Sportsbook thumbnail"
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
                                Sportsbook
                              </h3>
                              <p className="text-sm text-gray-400 flex items-center">
                                Bet with{" "}
                                <Image
                                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                  alt="KAS"
                                  width={16}
                                  height={16}
                                  className="mx-1 inline-block"
                                />{" "}
                                on your favorite sports and events
                              </p>
                            </div>
                          </MotionCard>
                        </Link>
                      </motion.div>

                      <motion.div
                        className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1rem)] max-w-[400px]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                      >
                        <div className="relative">
                          <MotionCard
                            className="group relative overflow-hidden border border-[#49EACB] bg-black h-full glow-effect pointer-events-none"
                            whileHover={{
                              scale: 1.05,
                              boxShadow: "0 0 30px rgba(73, 234, 203, 0.3)",
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="relative aspect-[4/2.5]">
                              <Image
                                src="/placeholder.svg?key=qcmav"
                                alt="Multiplayer thumbnail"
                                fill
                                style={{ objectFit: "cover" }}
                                className="scale-100 transition-transform duration-300 group-hover:scale-110"
                              />
                              {/* Coming Soon Overlay - centered in the image area only */}
                              <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-[#49EACB]">
                                <p className="text-xl font-bold text-[#49EACB]">Coming Soon</p>
                              </div>
                            </div>
                            <div className="p-4 relative z-20">
                              <h3 className="font-semibold mb-1 text-white group-hover:text-[#49EACB] transition-colors duration-300">
                                Multiplayer Games
                              </h3>
                              <p className="text-sm text-gray-400">Challenge players in real-time PVP games</p>
                            </div>
                          </MotionCard>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Original Games */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                    className="mb-12"
                  >
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                      <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                        <GiCheerful />
                      </span>
                      <span className="animate-gradient">Original Games</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                      {games.map((game, i) => {
                        let dataKey = game.slug.toLowerCase()
                        if (dataKey === "kaspatowerclimb") dataKey = "kaspa tower climb"
                        if (dataKey === "kaspacupgame") dataKey = "guess the cup"
                        if (dataKey === "ghostjump") dataKey = "ghost jump"
                        if (dataKey === "kaspiancross") dataKey = "kaspian cross"

                        // More flexible matching logic that checks for various formats
                        const totalWins =
                          winCounter.find((counter) => {
                            if (!counter._id) return false
                            const counterId = counter._id.toLowerCase()

                            // Check for exact match
                            if (counterId === dataKey) return true

                            // Check for capitalized version
                            if (
                              counterId ===
                              dataKey
                                .split(" ")
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(" ")
                                .toLowerCase()
                            )
                              return true

                            // Check for specific cases
                            if (
                              dataKey === "guess the cup" &&
                              (counterId === "guess the cup" || counterId === "kaspa cup game")
                            )
                              return true
                            if (
                              dataKey === "kasper loot box" &&
                              (counterId === "kasper loot box" || counterId === "loot box")
                            )
                              return true

                            return false
                          })?.totalWins || 0

                        const rawScore = highScores[dataKey] || 0
                        const highScoreVal = rawScore > 0 ? rawScore.toFixed(2) : "N/A"
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 + 0.3, duration: 0.5 }}
                            className="h-full"
                          >
                            <Link href={`/games/${game.slug}`}>
                              <MotionCard
                                className="group relative overflow-hidden border border-[#49EACB] bg-black h-full"
                                whileHover={{
                                  scale: 1.05,
                                  boxShadow: "0 0 30px rgba(73, 234, 203, 0.3)",
                                }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className="relative aspect-[4/2.5]">
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
                                <div className="p-3">
                                  <h3 className="font-semibold mb-1 text-white group-hover:text-[#49EACB] transition-colors duration-300 text-sm md:text-base">
                                    {game.name}
                                  </h3>
                                  <p className="text-xs md:text-sm text-gray-400">
                                    Wins: <span className="text-[#49EACB] font-bold">{totalWins}</span>
                                  </p>
                                  <div className="mt-1 flex items-center gap-1">
                                    <span className="text-xs md:text-sm text-gray-400">High Score:</span>
                                    <div className="flex items-center gap-1">
                                      <Image
                                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                        alt="KAS"
                                        width={14}
                                        height={14}
                                        className="rounded-full"
                                      />
                                      <span className="text-xs md:text-sm text-[#49EACB] font-bold">
                                        {highScoreVal}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </MotionCard>
                            </Link>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>

                  {/* Character Games */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="mb-12"
                  >
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                      <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                        <FaUserAlt />
                      </span>
                      <span className="animate-gradient">Character Games</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {characterGames.map((game, i) => {
                        let dataKey = game.slug.toLowerCase()
                        if (dataKey === "lootbox") dataKey = "kasper loot box"
                        else if (dataKey === "kasen-mania") dataKey = "kasen mania"

                        // More flexible matching logic that checks for various formats
                        const totalWins =
                          winCounter.find((counter) => {
                            if (!counter._id) return false
                            const counterId = counter._id.toLowerCase()

                            // Check for exact match
                            if (counterId === dataKey) return true

                            // Check for capitalized version
                            if (
                              counterId ===
                              dataKey
                                .split(" ")
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(" ")
                                .toLowerCase()
                            )
                              return true

                            // Check for specific cases
                            if (
                              dataKey === "kasper loot box" &&
                              (counterId === "kasper loot box" || counterId === "loot box")
                            )
                              return true
                            if (
                              dataKey === "kasen mania" &&
                              (counterId === "kasen mania" || counterId === "kasen-mania")
                            )
                              return true

                            return false
                          })?.totalWins || 0

                        const rawScore = highScores[dataKey] || 0
                        const highScoreVal = rawScore > 0 ? rawScore.toFixed(2) : "N/A"
                        return (
                          <motion.div
                            key={i}
                            className="float"
                            style={{ animationDelay: `${i * 0.2}s` }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                          >
                            <Link href={`/games/${game.slug}`}>
                              <MotionCard
                                className="group relative overflow-hidden border border-[#49EACB] bg-black h-full glow-effect"
                                whileHover={{
                                  scale: 1.05,
                                  boxShadow: "0 0 30px rgba(73, 234, 203, 0.3)",
                                }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className="relative aspect-video">
                                  <Image
                                    src={game.image || "/placeholder.svg"}
                                    alt={`${game.name} thumbnail`}
                                    fill
                                    style={{ objectFit: "cover" }}
                                    className="scale-100 transition-transform duration-300 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent p-4 flex items-end group-hover:translate-y-[5px] transition-transform duration-300">
                                    <h3 className="text-xl font-bold text-white">{game.name}</h3>
                                  </div>
                                </div>
                                <div className="p-4 bg-gray-900">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm text-gray-400">
                                      Wins: <span className="text-[#49EACB] font-bold">{totalWins}</span>
                                    </p>
                                    <div className="flex items-center gap-1">
                                      <Image
                                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                        alt="KAS"
                                        width={16}
                                        height={16}
                                        className="rounded-full"
                                      />
                                      <span className="text-sm text-[#49EACB] font-bold">{highScoreVal}</span>
                                    </div>
                                  </div>
                                  <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
                                    Play Now
                                  </Button>
                                </div>
                              </MotionCard>
                            </Link>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>

                  {/* Live Wins */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                    className="mb-12"
                  >
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                      <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                        <GiStarFormation />
                      </span>
                      <span className="animate-gradient">Live Wins</span>
                    </h2>
                    <ScrollArea className="custom-scrollbar">
                      <motion.div
                        className="flex gap-4 pb-4"
                        initial={{ x: -20 }}
                        animate={{ x: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      >
                        {liveWins.map((win, i) => {
                          let cardImage = "/placeholder.svg"
                          const lwGame = win.game.toLowerCase()
                          if (lwGame === "crash") cardImage = "/crashcard.webp"
                          else if (lwGame === "mines") cardImage = "/minescard.webp"
                          else if (lwGame === "kaspian cross") cardImage = "/kaspiancrosscard.webp"
                          else if (lwGame === "ghost jump") cardImage = "/ghostjumpcard.webp"
                          else if (lwGame === "upgrade") cardImage = "/upgradecard.webp"
                          else if (lwGame === "kaspa tower climb") cardImage = "/kaspatowerclimbcard.webp"
                          else if (lwGame === "plinko") cardImage = "/plinkocard.webp"
                          else if (lwGame === "roulette") cardImage = "/roulettecard.webp"
                          else if (lwGame === "dice") cardImage = "/dicecard.webp"
                          else if (lwGame === "coinflip") cardImage = "/coinflipcard.webp"
                          else if (lwGame === "guess the cup") cardImage = "/guessthecupcard.webp"
                          else if (lwGame === "kasper loot box") cardImage = "/kasperlootboxcard.webp"
                          else if (lwGame === "kasen mania") cardImage = "/kasenmaniacard.webp"
                          return (
                            <MotionCard
                              key={i}
                              className="flex-shrink-0 w-[280px] max-md:w-[220px] border border-[#49EACB] bg-black overflow-hidden"
                              whileHover={{
                                scale: 1.02,
                                boxShadow: "0 0 20px rgba(73,234,203,0.5)",
                              }}
                            >
                              <div className="relative aspect-[4/3]">
                                <Image
                                  src={cardImage || "/placeholder.svg"}
                                  alt={`${win.game} card`}
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
                                  <div className="text-sm text-[#49EACB]">{win.game.toUpperCase()}</div>
                                  <div className="flex items-center gap-1.5">
                                    <Image
                                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                      alt="KAS"
                                      width={16}
                                      height={16}
                                      className="rounded-full"
                                    />
                                    <span className="text-[#49EACB] font-bold">{win.amount.toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-400">{win.username}</div>
                              </div>
                            </MotionCard>
                          )
                        })}
                      </motion.div>
                      <ScrollBar orientation="horizontal" className="bg-[#49EACB]/10 hover:bg-[#49EACB]/20" />
                    </ScrollArea>
                  </motion.div>

                  {/* Join the Community */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                    className="mb-12"
                  >
                    <div className="relative overflow-hidden rounded-lg border border-[#49EACB]/20 bg-gradient-to-r from-[#003f2f] to-[#006d5b] p-6 md:p-8">
                      <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
                        <div className="relative w-full h-full">
                          <Image
                            src="/placeholder.svg?key=iv33u"
                            alt="Background Pattern"
                            fill
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      </div>

                      <div className="relative z-10 max-w-3xl">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Join Our Community</h2>
                        <p className="text-gray-200 mb-6">
                          Connect with players, join tournaments, and stay updated on the latest events. Join our
                          Telegram group to chat with other players and get exclusive access to promotions.
                        </p>

                        <div className="flex flex-wrap gap-4">
                          <Link href="https://t.me/KasCasinoXYZ" target="_blank" rel="noopener noreferrer">
                            <Button className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80 flex items-center gap-2">
                              <FaTelegramPlane size={18} />
                              Join Telegram
                            </Button>
                          </Link>
                          <Button
                            className="bg-black/30 text-white border border-[#49EACB]/30 hover:bg-black/50 flex items-center gap-2"
                            onClick={handleDailyRewardsClick}
                          >
                            <GiCardRandom size={18} />
                            Daily Rewards
                          </Button>
                          <Button
                            className="bg-black/30 text-white border border-[#49EACB]/30 hover:bg-black/50 flex items-center gap-2"
                            onClick={handleReferralProgramClick}
                          >
                            <GiPresent size={18} />
                            Referral Program
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </main>
            </div>

            <SiteFooter />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
