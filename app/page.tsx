"use client";

import { useState, useEffect, useRef } from "react";
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
import { GiCheerful, GiStarFormation, GiPresent } from "react-icons/gi";
import { FaTelegramPlane, FaUserAlt } from "react-icons/fa";
import axios from "axios";
import { useWallet } from "@/contexts/WalletContext";
import { createPortal } from "react-dom";

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

  // Live wins, win counter, high scores
  const [liveWins, setLiveWins] = useState<Win[]>([]);
  const [winCounter, setWinCounter] = useState<any[]>([]);
  const [highScores, setHighScores] = useState<{ [key: string]: number }>({});

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  // Banners
  const mainBanners = [
    "/roulettebanner.webp",
    "/kasenpromo.png",
    "/minesbanner.webp",
    "/crashbanner.webp",
    "/dicecoinflipcombobanner.webp",
  ];

  // Original Games - New order:
  // Crash, Mines, Kaspa Tower Climb, Upgrade, Plinko, Guess The Cup, Roulette, Dice, Coin Flip
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
  ];

  // Character Games
  const characterGames = [
    { name: "Kasper Loot Box", slug: "lootbox", image: "/kasperlootboxcard.webp" },
    { name: "Kasen Mania", slug: "kasen-mania", image: "/kasenmaniacard.webp" },
  ];

  const nextBanner = () =>
    setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
  const prevBanner = () =>
    setCurrentBanner((prev) => (prev - 1 + mainBanners.length) % mainBanners.length);

  useEffect(() => {
    const rotation = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
    }, 4000);
    return () => clearInterval(rotation);
  }, [mainBanners.length]);

  // Resolve wallet addresses to usernames for live wins
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
          const resolvedWins = await Promise.all(
            res.data.wins.map(resolveUsername)
          );
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

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

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
                  className="text-[#49eacb] hover:bg-[#49eacb]/10"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                >
                  {isSidebarOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
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
                      {/* New Guide Link */}
                      <Link
                        href="https://www.kascasino.xyz/guide"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#00aaff]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00aaff] to-[#00aaff]/50 group-hover:shadow-[0_0_10px_rgba(0,170,255,0.3)]" />
                        <span className="group-hover:text-[#00aaff]">Guide</span>
                      </Link>
                      <Link
                        href="#"
                        className="flex items-center gap-3 p-2 rounded hover:bg-[#49EACB]/5 transition-all duration-300 group"
                      >
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#49eacb] to-[#49eacb]/50 group-hover:shadow-[0_0_10px_rgba(73,234,203,0.3)]" />
                        <span className="group-hover:text-[#49eacb]">Casino</span>
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
                    <div
                      className="absolute telegram-icon left-0 w-full px-4"
                      style={{ bottom: "1rem" }}
                    >
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
                          style={{ objectFit: "contain" }}
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

                {/* Original Games */}
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
                  <div className="flex flex-wrap items-start gap-4">
                    {games.map((game, i) => {
                      let dataKey = game.slug.toLowerCase();
                      if (dataKey === "kaspatowerclimb") dataKey = "kaspa tower climb";
                      if (dataKey === "kaspacupgame") dataKey = "guess the cup";
                      if (dataKey === "ghostjump") dataKey = "ghost jump";
                      if (dataKey === "kaspiancross") dataKey = "kaspian cross";
                      const totalWins =
                        winCounter.find(
                          (counter) => counter._id.toLowerCase() === dataKey
                        )?.totalWins || 0;
                      const rawScore = highScores[dataKey] || 0;
                      const highScoreVal =
                        rawScore > 0 ? rawScore.toFixed(2) : "N/A";
                      return (
                        <motion.div
                          key={i}
                          className="w-[calc(50%-0.5rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1rem)] max-w-[400px]"
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
                              <div className="relative aspect-[4/2.5] mt-1">
                                <Image
                                  src={game.image}
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

                {/* Character Games */}
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
                  <div className="flex flex-wrap items-start gap-4">
                    {characterGames.map((game, i) => {
                      let dataKey = game.slug.toLowerCase();
                      if (dataKey === "lootbox") dataKey = "kasper loot box";
                      else if (dataKey === "kasen-mania") dataKey = "kasen mania";
                      const totalWins =
                        winCounter.find(
                          (counter) => counter._id.toLowerCase() === dataKey
                        )?.totalWins || 0;
                      const rawScore = highScores[dataKey] || 0;
                      const highScoreVal =
                        rawScore > 0 ? rawScore.toFixed(2) : "N/A";
                      return (
                        <motion.div
                          key={i}
                          className="w-[calc(50%-0.5rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1rem)] max-w-[400px]"
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
                              <div className="relative aspect-[4/2.5] mt-1">
                                <Image
                                  src={game.image}
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

                {/* Live Wins */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
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
                        let cardImage = "/placeholder.svg";
                        const lwGame = win.game.toLowerCase();
                        if (lwGame === "crash") cardImage = "/crashcard.webp";
                        else if (lwGame === "mines") cardImage = "/minescard.webp";
                        else if (lwGame === "kaspian cross")
                          cardImage = "/kaspiancrosscard.webp";
                        else if (lwGame === "ghost jump")
                          cardImage = "/ghostjumpcard.webp";
                        else if (lwGame === "upgrade")
                          cardImage = "/upgradecard.webp";
                        else if (lwGame === "kaspa tower climb")
                          cardImage = "/kaspatowerclimbcard.webp";
                        else if (lwGame === "plinko") cardImage = "/plinkocard.webp";
                        else if (lwGame === "roulette")
                          cardImage = "/roulettecard.webp";
                        else if (lwGame === "dice") cardImage = "/dicecard.webp";
                        else if (lwGame === "coinflip")
                          cardImage = "/coinflipcard.webp";
                        else if (lwGame === "guess the cup")
                          cardImage = "/guessthecupcard.webp";
                        else if (lwGame === "kasper loot box")
                          cardImage = "/kasperlootboxcard.webp";
                        else if (lwGame === "kasen mania")
                          cardImage = "/kasenmaniacard.webp";
                        return (
                          <MotionCard
                            key={i}
                            className="flex-shrink-0 w-[280px] max-md:w-[180px] border-none bg-transparent overflow-hidden"
                            whileHover={{
                              scale: 1.02,
                              boxShadow: "0 0 20px rgba(73,234,203,0.15)",
                            }}
                          >
                            <div className="relative aspect-[4/3] mt-1">
                              <Image
                                src={cardImage}
                                alt={`${win.game} card`}
                                fill
                                style={{ objectFit: "cover" }}
                                className="rounded-none scale-100"
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
                              <div className="text-sm text-gray-400">{win.username}</div>
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

            <SiteFooter />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* XPDisplay Component with Daily Loot Boxes Popup */
export function XPDisplay() {
  const { isConnected } = useWallet();
  const [userData, setUserData] = useState({ totalXp: 0, level: 0, gems: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [gemGain, setGemGain] = useState<number | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showLevelUpPopup, setShowLevelUpPopup] = useState(false);
  const [showGemPopup, setShowGemPopup] = useState(false);
  const [showDailyLootPopup, setShowDailyLootPopup] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [isLoadingCooldowns, setIsLoadingCooldowns] = useState(true);

  // Daily Loot Boxes data
  const dailyLootBoxes = [
    { name: "Level 1 Daily Loot Box", slug: "Level1DailyLootBox", image: "/Level1Card.webp", requiredLevel: 1 },
    { name: "Level 10 Daily Loot Box", slug: "Level10DailyLootBox", image: "/Level10Card.webp", requiredLevel: 10 },
    { name: "Level 20 Daily Loot Box", slug: "Level20DailyLootBox", image: "/Level20Card.webp", requiredLevel: 20 },
    { name: "Level 30 Daily Loot Box", slug: "Level30DailyLootBox", image: "/Level30Card.webp", requiredLevel: 30 },
    { name: "Level 40 Daily Loot Box", slug: "Level40DailyLootBox", image: "/Level40Card.webp", requiredLevel: 40 },
    { name: "Level 50 Daily Loot Box", slug: "Level50DailyLootBox", image: "/Level50Card.webp", requiredLevel: 50 },
    { name: "Level 60 Daily Loot Box", slug: "Level60DailyLootBox", image: "/Level60Card.webp", requiredLevel: 60 },
    { name: "Level 70 Daily Loot Box", slug: "Level70DailyLootBox", image: "/Level70Card.webp", requiredLevel: 70 },
    { name: "Level 80 Daily Loot Box", slug: "Level80DailyLootBox", image: "/Level80Card.webp", requiredLevel: 80 },
    { name: "Level 90 Daily Loot Box", slug: "Level90DailyLootBox", image: "/Level90Card.webp", requiredLevel: 90 },
    { name: "Level 100 Daily Loot Box", slug: "Level100DailyLootBox", image: "/Level100Card.webp", requiredLevel: 100 },
  ];

  // Set mounted after component mounts (client only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load cooldowns from sessionStorage on mount
  useEffect(() => {
    const loadCooldowns = () => {
      const storedCooldowns: Record<string, number> = {};
      dailyLootBoxes.forEach((box) => {
        const storedTimestamp = sessionStorage.getItem(
          `dailyLootBoxTimestamp_${box.slug}`
        );
        if (storedTimestamp) {
          const elapsed = Date.now() - parseInt(storedTimestamp);
          const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in ms
          if (elapsed < cooldownPeriod) {
            const remainingSeconds = Math.ceil((cooldownPeriod - elapsed) / 1000);
            storedCooldowns[box.slug] = remainingSeconds;
          }
        }
      });
      setCooldowns(storedCooldowns);
      setIsLoadingCooldowns(false);
    };

    loadCooldowns();
  }, []);

  // Update cooldowns every second
  useEffect(() => {
    if (Object.keys(cooldowns).length === 0) return;

    const interval = setInterval(() => {
      setCooldowns((prev) => {
        const updated = { ...prev };
        let changed = false;

        for (const key in updated) {
          if (updated[key] > 0) {
            updated[key] -= 1;
            changed = true;
          }
        }

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldowns]);

  // Persist last xp/level/gem via sessionStorage.
  const lastXpRef = useRef<number | null>(null);
  const lastLevelRef = useRef<number | null>(null);
  const lastGemRef = useRef<number | null>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  useEffect(() => {
    const storedXp = sessionStorage.getItem("lastXp");
    const storedLevel = sessionStorage.getItem("lastLevel");
    const storedGem = sessionStorage.getItem("lastGem");
    if (storedXp !== null && storedLevel !== null && storedGem !== null) {
      lastXpRef.current = Number(storedXp);
      lastLevelRef.current = Number(storedLevel);
      lastGemRef.current = Number(storedGem);
    } else {
      lastXpRef.current = userData.totalXp;
      lastLevelRef.current = userData.level;
      lastGemRef.current = userData.gems;
      sessionStorage.setItem("lastXp", userData.totalXp.toString());
      sessionStorage.setItem("lastLevel", userData.level.toString());
      sessionStorage.setItem("lastGem", userData.gems.toString());
    }
  }, []);

  useEffect(() => {
    const fetchXP = async () => {
      try {
        if (isConnected && (window as any).kasware && (window as any).kasware.getAccounts) {
          const accounts: string[] = await (window as any).kasware.getAccounts();
          if (!accounts || accounts.length === 0) return;
          const walletAddress = accounts[0];
          const requestUrl = `${apiUrl}/api/user?walletAddress=${encodeURIComponent(
            walletAddress
          )}`;
          const res = await axios.get(requestUrl);
          if (res.data.success && res.data.user) {
            setUserData({
              totalXp: res.data.user.totalXp || 0,
              level: res.data.user.level || 0,
              gems: res.data.user.gems || 0,
            });
          }
        }
      } catch (err) {
        // Error handling omitted.
      }
    };

    fetchXP();
    const interval = setInterval(fetchXP, 5000);
    return () => clearInterval(interval);
  }, [isConnected, apiUrl]);

  useEffect(() => {
    if (lastXpRef.current !== null && userData.totalXp > lastXpRef.current) {
      const gain = userData.totalXp - lastXpRef.current;
      setXpGain(gain);
      lastXpRef.current = userData.totalXp;
      sessionStorage.setItem("lastXp", userData.totalXp.toString());
      setTimeout(() => setXpGain(null), 2000);
    }
    if (lastLevelRef.current !== null && userData.level > lastLevelRef.current) {
      setIsFlipping(true);
      setShowLevelUpPopup(true);
      lastLevelRef.current = userData.level;
      sessionStorage.setItem("lastLevel", userData.level.toString());
      setTimeout(() => {
        setIsFlipping(false);
        setShowLevelUpPopup(false);
      }, 1000);
    }
    if (lastGemRef.current !== null && userData.gems > lastGemRef.current) {
      const gain = userData.gems - lastGemRef.current;
      setGemGain(gain);
      lastGemRef.current = userData.gems;
      sessionStorage.setItem("lastGem", userData.gems.toString());
      setTimeout(() => setGemGain(null), 2000);
    }
  }, [userData]);

  const displayLevel = userData.level;
  const getThreshold = (level: number) => {
    const r = 1.08;
    const a = (10000000 * (r - 1)) / (Math.pow(r, 100) - 1);
    let threshold = 0;
    for (let i = 1; i <= level; i++) {
      threshold += a * Math.pow(r, i - 1);
    }
    return threshold;
  };

  const currentThreshold = getThreshold(displayLevel);
  const nextThreshold =
    displayLevel < 100 ? getThreshold(displayLevel + 1) : currentThreshold;
  const xpProgress = userData.totalXp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progressPercent = xpNeeded > 0 ? (xpProgress / xpNeeded) * 100 : 100;

  let borderColorClass = "";
  if (displayLevel < 25) {
    borderColorClass = "border-[#49EACB] text-[#49EACB]";
  } else if (displayLevel < 50) {
    borderColorClass = "border-yellow-400 text-yellow-400";
  } else if (displayLevel < 75) {
    borderColorClass = "border-orange-500 text-orange-500";
  } else {
    borderColorClass = "border-red-500 text-red-500";
  }

  const levelStr = displayLevel.toString();
  const fontSize =
    levelStr.length > 2 ? "0.75rem" : levelStr.length > 1 ? "0.9rem" : "1.125rem";

  // Popup styling classes.
  const hoverPopupClass =
    "absolute bg-gray-800/80 backdrop-blur-md border border-teal-500 rounded shadow-lg z-50 p-4 text-white w-64 text-sm";
  const smallPopupClass =
    "absolute bg-gray-800/80 backdrop-blur-md border border-teal-500 rounded shadow-lg z-50 p-1 text-white w-48 text-xs";

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div
      className="relative inline-flex items-center h-12"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ minWidth: "max-content" }}
    >
      {/* XP Circle - Clickable to show daily loot boxes */}
      <motion.div
        className={`relative rounded-full border-2 cursor-pointer ${borderColorClass}`}
        style={{ width: "48px", height: "48px", overflow: "hidden" }}
        animate={isFlipping ? { rotateY: 360 } : { rotateY: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        onClick={() => setShowDailyLootPopup(true)}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/xpimage.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          }}
        />
        <span
          style={{ fontSize }}
          className="relative flex items-center justify-center h-full w-full whitespace-nowrap z-10"
        >
          {displayLevel}
        </span>
      </motion.div>

      {/* Gem Display */}
      <div
        onClick={() => setShowGemPopup(true)}
        className="flex items-center bg-gray-900 bg-opacity-60 backdrop-blur-md text-white px-3 rounded ml-2 border border-[#49EACB] cursor-pointer"
        style={{ height: "48px" }}
      >
        <span className="mr-1 text-white text-l font-bold">{userData.gems}</span>
        <Image src="/gem.webp" alt="Gem" width={28} height={28} />
      </div>

      {/* Gem Gain Popup */}
      <AnimatePresence>
        {gemGain !== null && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: -30 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className={`${smallPopupClass} left-[-60px] top-full mt-1`}
          >
            +{gemGain} {gemGain === 1 ? "GEM" : "GEMS"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Popup */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className={`${hoverPopupClass} top-0 right-full mr-2`}
          >
            {displayLevel < 100 ? (
              <>
                <div className="text-teal-300 mb-1">
                  XP: {userData.totalXp} / {nextThreshold.toFixed(0)}
                </div>
                <div className="flex justify-between mb-1">
                  <span>{xpProgress.toFixed(0)} XP</span>
                  <span>{xpNeeded.toFixed(0)} XP</span>
                </div>
                <div className="w-full bg-gray-700 rounded h-1">
                  <div
                    style={{ width: `${progressPercent}%` }}
                    className="bg-teal-500 h-1 rounded"
                  ></div>
                </div>
                <div className="mt-1 text-center">
                  {progressPercent.toFixed(1)}% to next level
                </div>
              </>
            ) : (
              <div className="text-center">Max Level Reached!</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP Gain Popup */}
      <AnimatePresence>
        {xpGain !== null && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: -30 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className={`${smallPopupClass} left-[-60px] top-1/2 transform -translate-y-1/2`}
          >
            +{xpGain} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Popup */}
      <AnimatePresence>
        {showLevelUpPopup && (
          <motion.div
            initial={{ opacity: 0, x: -20, y: -10 }}
            animate={{ opacity: 1, x: -30, y: -10 }}
            exit={{ opacity: 0, x: -50, y: -10 }}
            transition={{ duration: 0.5 }}
            className={`${smallPopupClass} left-[-60px] top-0`}
          >
            Leveled Up!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Loot Box Popup Modal rendered via a Portal (only on client) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showDailyLootPopup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 flex items-center justify-center z-50"
              >
                {/* 
                  ADDED custom-scrollbar + overflow-y-auto for a custom-colored scrollbar 
                  REMOVED h-80 from each lootbox card so they auto-size with no extra space
                */}
                <div className="relative bg-gray-800 p-6 rounded-lg border-2 border-[#49EACB] w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <motion.button
                    onClick={() => setShowDailyLootPopup(false)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-2 right-2 text-[#49EACB] font-bold"
                  >
                    X
                  </motion.button>
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-[#49EACB]">
                      Daily Free Loot Boxes
                    </h2>

                    {/* Large display of current level */}
                    <div className="flex flex-col items-center my-4">
                      <p className="text-white text-lg mb-2">Your Current Level</p>
                      <motion.div
                        className={`relative rounded-full border-2 ${borderColorClass}`}
                        style={{ width: "80px", height: "80px", overflow: "hidden" }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: "url('/xpimage.webp')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            zIndex: 0,
                          }}
                        />
                        <span
                          style={{ fontSize: "1.5rem" }}
                          className="relative flex items-center justify-center h-full w-full z-10"
                        >
                          {displayLevel}
                        </span>
                      </motion.div>
                    </div>

                    <p className="text-gray-300 mt-2">Available once every 24 hours</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 justify-items-center">
                    {dailyLootBoxes.map((box) => {
                      const isLocked = userData.level < box.requiredLevel;
                      const isOnCooldown = cooldowns[box.slug] && cooldowns[box.slug] > 0;
                      const cooldownTime = cooldowns[box.slug] || 0;

                      return (
                        <Link href={`/games/${box.slug}`} key={box.slug} passHref>
                          <motion.div
                            className={`relative bg-gray-900 rounded-lg p-2 cursor-pointer border ${
                              isLocked
                                ? "border-red-500"
                                : isOnCooldown
                                ? "border-yellow-500"
                                : "border-[#49EACB]"
                            } hover:shadow-lg transition-all duration-200 w-64 flex flex-col`}
                            whileHover={{
                              scale: isLocked || isOnCooldown ? 1 : 1.05,
                            }}
                          >
                            {/* Overlay for locked or cooldown state */}
                            {(isLocked || isOnCooldown) && (
                              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 rounded-lg">
                                <div className="text-center p-2">
                                  {isLocked ? (
                                    <p className="text-red-400 font-bold">
                                      Requires Level {box.requiredLevel}
                                    </p>
                                  ) : (
                                    <>
                                      <p className="text-yellow-400 font-bold">
                                        On Cooldown
                                      </p>
                                      <p className="text-white text-sm">
                                        {formatTime(cooldownTime)}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="relative w-full h-40">
                              <Image
                                src={box.image}
                                alt={box.name}
                                fill
                                style={{ objectFit: "cover" }}
                                className="rounded-md"
                              />
                            </div>
                            <div className="mt-2 text-center">
                              <h3 className="font-bold text-white">{box.name}</h3>
                              <p className="text-sm text-gray-300">
                                Level {box.requiredLevel}+
                              </p>
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Gem Popup Modal rendered via a Portal (only on client) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showGemPopup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 flex items-center justify-center z-50"
              >
                <div className="relative bg-gray-800 p-6 rounded-lg border-2 border-[#49EACB] w-11/12 max-w-lg">
                  <motion.button
                    onClick={() => setShowGemPopup(false)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-2 right-2 text-[#49EACB] font-bold"
                  >
                    X
                  </motion.button>
                  <div className="text-center mb-4">
                    <div className="flex justify-center items-center gap-2">
                      <span className="text-xl font-bold text-white">
                        {userData.gems}
                      </span>
                      <Image src="/gem.webp" alt="Gem" width={40} height={40} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((tier) => {
                      const requiredGems =
                        tier === 1 ? 10 : tier === 2 ? 100 : tier === 3 ? 1000 : 10000;
                      return (
                        <Link
                          href={`https://www.kascasino.xyz/games/gemtier${tier}`}
                          key={tier}
                          passHref
                        >
                          <motion.div
                            className="bg-gray-900 rounded-lg p-2 cursor-pointer border border-[#49EACB] hover:shadow-lg transition-all duration-200"
                            whileHover={{ scale: 1.05 }}
                          >
                            <div className="text-center mb-2 font-bold text-white">
                              Gem Crate Tier {tier}
                            </div>
                            <div className="relative w-full h-32">
                              <Image
                                src={`/gemtier${tier}.webp`}
                                alt={`Gem Crate Tier ${tier}`}
                                fill
                                style={{ objectFit: "cover" }}
                                className="rounded-md"
                              />
                            </div>
                            <div className="text-center mt-2">
                              <span className="font-bold text-white">
                                Gems Required:
                              </span>{" "}
                              <span className="font-bold text-[#49EACB]">
                                {requiredGems}
                              </span>
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
