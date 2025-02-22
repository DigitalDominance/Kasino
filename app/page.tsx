"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Menu, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { LoadingAnimation } from "@/components/loading-animation";
import { WalletConnection } from "@/components/wallet-connection";
import { Montserrat } from "next/font/google";
import { GiCheerful, GiStarFormation } from "react-icons/gi";

// ----------------------
// Wallet Context Setup
// ----------------------

interface WalletContextType {
  isConnected: boolean;
  username: string | null;
  balance: number;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  showNotification: (message: string, type: "success" | "error") => void;
  createAccount: (
    email: string,
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  login: (password: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkWalletConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkWalletConnection = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        const accounts = await kasware.getAccounts();
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await checkUserAccount(accounts[0]);
          await checkNetwork();
          await updateBalance();
          setupEventListeners();
        }
      } catch (error) {
        console.error("Failed to get accounts:", error);
      }
    }
  };

  const setupEventListeners = () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      kasware.on("accountsChanged", handleAccountsChanged);
      kasware.on("networkChanged", handleNetworkChanged);
      kasware.on("balanceChanged", handleBalanceChanged);
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length > 0) {
      if (accounts[0] !== walletAddress) {
        showNotification(
          "Wallet address changed. Please reconnect for security reasons.",
          "error"
        );
        await disconnectWallet();
        router.push("/");
      }
    } else {
      await disconnectWallet();
      router.push("/");
    }
  };

  const handleNetworkChanged = async (network: string) => {
    if (network !== "kaspa_mainnet") {
      showNotification(
        "Please switch to the Kaspa mainnet to continue playing.",
        "error"
      );
      await disconnectWallet();
      router.push("/");
    }
  };

  const handleBalanceChanged = async (balanceData: any) => {
    setBalance(Number(balanceData.balance.mature) / Math.pow(10, 8));
  };

  const checkNetwork = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        const network = await kasware.getNetwork();
        if (network !== "kaspa_mainnet") {
          showNotification(
            "Please switch to the Kaspa mainnet to play.",
            "error"
          );
          await disconnectWallet();
          return false;
        }
        return true;
      } catch (error) {
        console.error("Failed to check network:", error);
        showNotification("Failed to check network. Please try again.", "error");
        return false;
      }
    }
    return false;
  };

  const checkUserAccount = async (address: string) => {
    try {
      const response = await fetch(`/api/user?walletAddress=${address}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData) {
          setUsername(userData.username);
          setIsConnected(true);
        } else {
          showNotification("Please create an account to start playing!", "success");
        }
      } else {
        throw new Error("Failed to check user account");
      }
    } catch (error) {
      console.error("Error checking user account:", error);
    }
  };

  const createAccount = async (
    email: string,
    username: string,
    password: string
  ) => {
    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, walletAddress }),
      });
      const data = await response.json();
      if (response.ok) {
        setUsername(data.username);
        setIsConnected(true);
        showNotification("Account created successfully! Let's play!", "success");
        return { success: true };
      } else {
        showNotification(data.error, "error");
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error creating account:", error);
      showNotification("Failed to create account. Please try again.", "error");
      return { success: false, error: "Failed to create account. Please try again." };
    }
  };

  const login = async (password: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, password }),
      });
      if (response.ok) {
        const userData = await response.json();
        setUsername(userData.username);
        setIsConnected(true);
        showNotification("Welcome back! Ready to play?", "success");
        return true;
      } else {
        const errorData = await response.json();
        showNotification(errorData.message, "error");
        return false;
      }
    } catch (error) {
      console.error("Error logging in:", error);
      showNotification("Failed to log in. Please try again.", "error");
      return false;
    }
  };

  const updateBalance = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        const balanceData = await kasware.getBalance();
        setBalance(Number(balanceData.total) / Math.pow(10, 8));
      } catch (error) {
        console.error("Failed to get balance:", error);
      }
    }
  };

  const connectWallet = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        const accounts = await kasware.requestAccounts();
        if (accounts.length > 0) {
          const isCorrectNetwork = await checkNetwork();
          if (!isCorrectNetwork) {
            return null;
          }
          setWalletAddress(accounts[0]);
          setupEventListeners();
          await updateBalance();
          return accounts[0];
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        showNotification("Failed to connect wallet. Please try again.", "error");
      }
    } else {
      console.error("Kasware wallet not found");
      showNotification("Kasware wallet not found. Please install it and try again.", "error");
    }
    return null;
  };

  const disconnectWallet = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        await kasware.disconnect(window.location.origin);
        kasware.removeListener("accountsChanged", handleAccountsChanged);
        kasware.removeListener("networkChanged", handleNetworkChanged);
        kasware.removeListener("balanceChanged", handleBalanceChanged);
        setIsConnected(false);
        setUsername(null);
        setBalance(0);
        setWalletAddress(null);
      } catch (error) {
        console.error("Failed to disconnect wallet:", error);
        showNotification("Failed to disconnect wallet. Please try again.", "error");
      }
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        username,
        balance,
        connectWallet,
        disconnectWallet,
        showNotification,
        createAccount,
        login,
      }}
    >
      {children}
      {notification && (
        <Notification message={notification.message} type={notification.type} />
      )}
    </WalletContext.Provider>
  );
};

export const WalletStatus: React.FC = () => {
  const { isConnected, username, balance } = useWallet();
  if (!isConnected) return null;
  return (
    <div className="flex items-center space-x-2">
      <span className="text-[#49EACB] font-bold mr-2">{username}</span>
      <span className="text-[#49EACB]">{balance.toFixed(2)}</span>
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
        alt="KAS"
        width={16}
        height={16}
        className="rounded-full"
      />
    </div>
  );
};

export const Notification: React.FC<{
  message: string;
  type: "success" | "error";
}> = ({ message, type }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
        className={`fixed bottom-4 left-4 p-4 rounded-md shadow-md z-50 ${
          type === "success"
            ? "bg-gradient-to-r from-[#49EACB] via-black to-[#49EACB] text-black"
            : "bg-gradient-to-r from-red-600 via-black to-red-800 text-white"
        }`}
        style={{
          backgroundSize: "400% 400%",
          animation: "gradientMessage 8s ease infinite",
        }}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
};

// ----------------------
// Main Page Content
// ----------------------

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

const MotionCard = motion(Card);
const MotionButton = motion(Button);

function MainPageContent() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Banner images
  const mainBanners = ["/roulettebanner.webp", "/crashbanner.webp"];

  const games = [
    { name: "Crash", players: 1234, slug: "crash" },
    { name: "Mines", players: 987, slug: "mines" },
    { name: "Roulette", players: 765, slug: "roulette" },
    { name: "Dice", players: 543, slug: "dice" },
    { name: "Coin Flip", players: 321, slug: "coinflip" },
  ];

  const liveWins = [
    {
      game: "Crash",
      image: "/crashcard.webp",
      player: "CrashPlayer1",
      amount: "1,234.56",
      time: "2 minutes ago",
    },
    {
      game: "Crash",
      image: "/crashcard.webp",
      player: "CrashPlayer2",
      amount: "2,345.67",
      time: "5 minutes ago",
    },
    {
      game: "Crash",
      image: "/crashcard.webp",
      player: "CrashPlayer3",
      amount: "3,456.78",
      time: "10 minutes ago",
    },
    {
      game: "Roulette",
      image: "/roulettecard.webp",
      player: "RoulettePlayer1",
      amount: "987.65",
      time: "3 minutes ago",
    },
    {
      game: "Roulette",
      image: "/roulettecard.webp",
      player: "RoulettePlayer2",
      amount: "1,111.11",
      time: "7 minutes ago",
    },
    {
      game: "Roulette",
      image: "/roulettecard.webp",
      player: "RoulettePlayer3",
      amount: "1,222.22",
      time: "12 minutes ago",
    },
  ];

  const nextBanner = () =>
    setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
  const prevBanner = () =>
    setCurrentBanner(
      (prev) => (prev - 1 + mainBanners.length) % mainBanners.length
    );

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
          background: linear-gradient(
            270deg,
            #49eacb,
            #006d5b,
            #003f2f,
            #006d5b,
            #49eacb
          );
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
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
                          objectFit="contain"
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

                {/* Original Games */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                  className="mb-12"
                >
                  <h2 className="text-2xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-2">
                      <GiCheerful />
                    </span>
                    <span className="animate-gradient">Original Games</span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {games.map((game, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                      >
                        <Link href={`/games/${game.slug}`} key={i}>
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
                                src={
                                  game.slug === "crash"
                                    ? "/crashcard.webp"
                                    : game.slug === "roulette"
                                    ? "/roulettecard.webp"
                                    : "/placeholder.svg"
                                }
                                alt={`${game.name} thumbnail`}
                                fill
                                objectFit="cover"
                                style={{ bottom: "10px" }}
                                className="scale-100 transition-transform duration-300 group-hover:scale-110"
                              />
                              <div className="absolute inset-x-0 -bottom-4 top-0 bg-gradient-to-b from-transparent to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pb-6">
                                <MotionButton
                                  className="mx-4 mb-2 bg-[#49EACB] text-black font-semibold text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
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
                  <h2 className="text-2xl font-bold mb-6 flex items-center hover-effect transition-all duration-500">
                    <span className="icon-primary inline-block mr-2">
                      <GiStarFormation />
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
                      {liveWins.map((win, i) => (
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
                              src={win.image}
                              alt={`${win.game} card`}
                              fill
                              objectFit="cover"
                              style={{ bottom: "10px" }}
                              className="rounded-none scale-100 object-cover"
                            />
                            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#49EACB] text-black text-sm font-semibold">
                              LIVE
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="font-semibold mb-2">{win.player}</div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm text-[#49EACB]">
                                {win.game} Game
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
                                  {win.amount}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-400">{win.time}</div>
                          </div>
                        </MotionCard>
                      ))}
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

// ----------------------
// Page Export
// ----------------------

export default function PageWrapper() {
  return (
    <WalletProvider>
      <MainPageContent />
    </WalletProvider>
  );
}
