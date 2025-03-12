"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Menu, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { LoadingAnimation } from "@/components/loading-animation";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import { GiCheerful } from "react-icons/gi";
import { FaTelegramPlane, FaGlobe, FaTwitter, FaUserAlt } from "react-icons/fa";
import axios from "axios";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// For framer-motion
const MotionCard = motion(Card);
const MotionButton = motion(Button);

interface Win {
  username: string;
  amount: number;
  game: string;
  timestamp: string;
}

export default function MainPage() {
  return <MainPageContent />;
}

function MainPageContent() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveWins, setLiveWins] = useState<Win[]>([]);
  const [winCounter, setWinCounter] = useState<any[]>([]);
  const [highScores, setHighScores] = useState<{ [key: string]: number }>({});

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  // Banner images (with Kasen promo banner at index 1)
  const mainBanners = [
    "/roulettebanner.webp",
    "/kasenpromo.png",
    "/minesbanner.webp",
    "/crashbanner.webp",
    "/dicecoinflipcombobanner.webp",
  ];

  // Original Games
  const games = [
    { name: "Mines", slug: "mines", image: "/minescard.webp" },
    { name: "Crash", slug: "crash", image: "/crashcard.webp" },
    { name: "Roulette", slug: "roulette", image: "/roulettecard.webp" },
    { name: "Dice", slug: "dice", image: "/dicecard.webp" },
    { name: "Coin Flip", slug: "coinflip", image: "/coinflipcard.webp" },
  ];

  // Character Games
  const characterGames = [
    { name: "Kasper Loot Box", slug: "lootbox", image: "/placeholder.svg" },
    { name: "Kasen Mania", slug: "kasen-mania", image: "/kasenmaniacard.webp" },
  ];

  // Carousel controls
  const nextBanner = () =>
    setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
  const prevBanner = () =>
    setCurrentBanner((prev) => (prev - 1 + mainBanners.length) % mainBanners.length);

  // Resolve wallet addresses to usernames if needed
  const resolveUsername = async (win: Win): Promise<Win> => {
    if (win.username.startsWith("kaspa:")) {
      try {
        const res = await axios.get(
          `/api/user?walletAddress=${encodeURIComponent(win.username)}`
        );
        if (res.data && res.data.username) {
          return { ...win, username: res.data.username };
        }
      } catch (err) {
        console.error("Error resolving username for wallet", win.username, err);
      }
    }
    return win;
  };

  // Fetch live wins
  useEffect(() => {
    const fetchWins = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/latest-wins`);
        if (res.data.success) {
          const resolvedWins = await Promise.all(res.data.wins.map(resolveUsername));
          setLiveWins(resolvedWins.slice(0, 10));
        }
      } catch (error) {
        console.error("Error fetching latest wins:", error);
      }
    };
    fetchWins();
    const interval = setInterval(fetchWins, 8000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Fetch win counter
  useEffect(() => {
    const fetchWinCounter = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/win-counter`);
        if (res.data.success) {
          setWinCounter(res.data.winCounter);
        }
      } catch (error) {
        console.error("Error fetching win counter:", error);
      }
    };
    fetchWinCounter();
    const interval = setInterval(fetchWinCounter, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Fetch high scores
  useEffect(() => {
    const fetchHighScores = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/highscores`);
        if (res.data.success) {
          setHighScores(res.data.highscores);
        }
      } catch (error) {
        console.error("Error fetching high scores:", error);
      }
    };
    fetchHighScores();
    const interval = setInterval(fetchHighScores, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Fake loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black`}>
      <style jsx global>{`
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
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
        @media (max-width: 768px) {
          .telegram-icon {
            bottom: 15vh !important;
          }
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
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#49EACB]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#8a2be2] to-[#8a2be2]/50 group-hover:shadow-[0_0_10px_rgba(138,43,226,0.3)]" />
                        <span className="group-hover:text-[#8a2be2]">Raffles</span>
                      </Link>
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
                {/* Banner Carousel */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative mb-6 sm:mb-12 w-full -mt-6 sm:mt-0"
                  style={{ aspectRatio: "1920 / 500" }}
                >
                  <div className="relative w-full h-full overflow-hidden rounded-lg border border-[#49EACB]/10">
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
                          className="object-contain"
                        />
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

                {/* Original Games Section */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                      <GiCheerful />
                    </span>
                    <span className="animate-gradient">Original Games</span>
                  </h2>
                  {/* Horizontal flow with flex (no grid) */}
                  <div className="flex flex-wrap items-start gap-3">
                    {games.map((game, i) => {
                      // REVERTED: use slug for matching
                      const totalWins =
                        winCounter.find(
                          (c: any) =>
                            c._id.toLowerCase() === game.slug
                        )?.totalWins || 0;

                      const rawScore = highScores[game.slug] || 0;
                      const highScoreVal = rawScore > 0 ? rawScore.toFixed(2) : "N/A";

                      return (
                        <motion.div
                          key={i}
                          // Responsive: width = 25vw, min=250px, max=400px
                          className="w-[25vw] min-w-[250px] max-w-[400px]"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                        >
                          <Link href={`/games/${game.slug}`}>
                            <MotionCard
                              className="group relative overflow-hidden border-none bg-transparent"
                              whileHover={{
                                scale: 1.05,
                                boxShadow: "0 0 30px rgba(73, 234, 203, 0.15)",
                              }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="relative aspect-[4/3] mt-1">
                                <Image
                                  src={game.image}
                                  alt={`${game.name} thumbnail`}
                                  fill
                                  style={{ bottom: "10px" }}
                                  className="object-cover scale-100 transition-transform duration-300 group-hover:scale-110"
                                />
                                {/* Hover overlay */}
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
                                <p className="text-sm text-gray-400">
                                  Wins:{" "}
                                  <span className="text-[#49EACB] font-bold">
                                    {totalWins}
                                  </span>
                                </p>
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="text-sm text-gray-400">
                                    High Score:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Image
                                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                      alt="KAS"
                                      width={16}
                                      height={16}
                                      className="rounded-full"
                                    />
                                    <span className="text-sm text-[#49EACB] font-bold">
                                      {highScoreVal}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </MotionCard>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Character Games Section */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                      <FaUserAlt />
                    </span>
                    <span className="animate-gradient">Character Games</span>
                  </h2>
                  {/* Another horizontal flow with flex */}
                  <div className="flex flex-wrap items-start gap-3">
                    {characterGames.map((game, i) => {
                      // REVERTED: use slug for matching
                      const totalWins =
                        winCounter.find(
                          (c: any) =>
                            c._id.toLowerCase() === game.slug
                        )?.totalWins || 0;

                      const rawScore = highScores[game.slug] || 0;
                      const highScoreVal = rawScore > 0 ? rawScore.toFixed(2) : "N/A";

                      return (
                        <motion.div
                          key={i}
                          className="w-[25vw] min-w-[250px] max-w-[400px]"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 + 0.4, duration: 0.5 }}
                        >
                          <Link href={`/games/${game.slug}`}>
                            <MotionCard
                              className="group relative overflow-hidden border-none bg-transparent"
                              whileHover={{
                                scale: 1.05,
                                boxShadow: "0 0 30px rgba(73, 234, 203, 0.15)",
                              }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="relative aspect-[4/3] mt-1">
                                <Image
                                  src={game.image}
                                  alt={`${game.name} thumbnail`}
                                  fill
                                  style={{ bottom: "10px" }}
                                  className="object-cover scale-100 transition-transform duration-300 group-hover:scale-110"
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
                                <p className="text-sm text-gray-400">
                                  Wins:{" "}
                                  <span className="text-[#49EACB] font-bold">
                                    {totalWins}
                                  </span>
                                </p>
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="text-sm text-gray-400">
                                    High Score:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Image
                                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                      alt="KAS"
                                      width={16}
                                      height={16}
                                      className="rounded-full"
                                    />
                                    <span className="text-sm text-[#49EACB] font-bold">
                                      {highScoreVal}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </MotionCard>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Live Wins Section */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-3 text-3xl md:text-4xl">
                      <GiCheerful />
                    </span>
                    <span className="animate-gradient">Live Wins</span>
                  </h2>
                  <ScrollArea>
                    <motion.div
                      className="flex gap-4 pb-4"
                      initial={{ x: -20 }}
                      animate={{ x: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      {liveWins.map((win, i) => {
                        let cardImage = "/placeholder.svg";
                        const lowerGame = win.game.toLowerCase();
                        if (lowerGame === "crash") cardImage = "/crashcard.webp";
                        else if (lowerGame === "roulette") cardImage = "/roulettecard.webp";
                        else if (lowerGame === "coinflip") cardImage = "/coinflipcard.webp";
                        else if (lowerGame === "dice") cardImage = "/dicecard.webp";
                        else if (lowerGame === "mines") cardImage = "/minescard.webp";
                        // For "Kasper Loot Box", "Kasen Mania", etc. you can add logic if you have images

                        return (
                          <MotionCard
                            key={i}
                            className="flex-shrink-0 w-[280px] max-md:w-[180px] border-none bg-transparent overflow-hidden"
                            whileHover={{
                              scale: 1.02,
                              boxShadow: "0 0 20px rgba(73, 234, 203, 0.15)",
                            }}
                          >
                            <div className="relative aspect-[4/3] mt-1">
                              <Image
                                src={cardImage}
                                alt={`${win.game} card`}
                                fill
                                style={{ bottom: "10px" }}
                                className="rounded-none scale-100 object-cover"
                              />
                              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#49EACB] text-black text-sm font-semibold">
                                LIVE
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm text-[#49EACB]">
                                  {win.game.toUpperCase()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Image
                                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                                    alt="KAS"
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                  />
                                  <span className="text-[#49EACB] font-bold">
                                    {win.amount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-400">
                                {win.username}
                              </div>
                            </div>
                          </MotionCard>
                        );
                      })}
                    </motion.div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
