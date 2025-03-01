"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { FaTwitter, FaTelegramPlane, FaGlobe } from "react-icons/fa";

export default function KasenManiaPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <motion.div whileHover={{ scale: 1.05 }}>
          <Link
            href="/"
            className="inline-flex items-center text-[#49EACB] hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Link>
        </motion.div>
        <WalletConnection />
      </header>

      {/* Main content */}
      <main className="flex-grow p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          {/* Desktop: fixed-height container sharing space evenly */}
          <div className="hidden lg:flex flex-col gap-6 h-[90vh] order-2 lg:order-1">
            {/* KASEN Promo Card */}
            <Card className="bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm flex-1 p-6 flex flex-col items-center text-center">
              <motion.h2
                className="text-2xl font-bold mb-4 text-transparent bg-clip-text"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                style={{
                  backgroundImage:
                    "linear-gradient(270deg, #600000, #FF0000, #FF7373)",
                  backgroundSize: "200% 200%",
                }}
              >
                KASEN Project
              </motion.h2>
              <img
                src="/placeholder.svg"
                alt="Kasen Project"
                className="w-1/2 h-auto mb-4"
              />
              <p className="text-sm text-white mb-4">
                This game is a collaborative effort with KASEN, a pioneer in KRC721 &
                KRC20. Their creative vision and innovative approach have added extra fun
                to our casino experience. Discover more about their project through the links below.
              </p>
              <div className="flex justify-center space-x-4 text-xl">
                <motion.a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.2 }}
                  className="text-[#FF0000] hover:text-[#FF7373]"
                >
                  <FaTwitter />
                </motion.a>
                <motion.a
                  href="https://telegram.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.2 }}
                  className="text-[#FF0000] hover:text-[#FF7373]"
                >
                  <FaTelegramPlane />
                </motion.a>
                <motion.a
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.2 }}
                  className="text-[#FF0000] hover:text-[#FF7373]"
                >
                  <FaGlobe />
                </motion.a>
              </div>
            </Card>

            {/* How To Play Card for Desktop */}
            <Card className="bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm flex-1 p-4">
              <h2 className="text-xl font-bold text-[#49EACB] mb-2">How to Play</h2>
              <ol className="list-decimal list-inside text-sm text-white space-y-1">
                <li>Connect your wallet.</li>
                <li>
                  Deposit credits with Kasware. (Your starting balance is 0 credits until you deposit.)
                </li>
                <li>Use the game’s built-in controls to place bets and play.</li>
                <li>Follow on-screen prompts to win credits.</li>
              </ol>
            </Card>
          </div>

          {/* Mobile Left Column: Stack cards normally */}
          <div className="lg:hidden order-2">
            <div className="space-y-6">
              {/* KASEN Promo Card */}
              <Card className="bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-6 flex flex-col items-center text-center">
                <motion.h2
                  className="text-2xl font-bold mb-4 text-transparent bg-clip-text"
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                  style={{
                    backgroundImage:
                      "linear-gradient(270deg, #600000, #FF0000, #FF7373)",
                    backgroundSize: "200% 200%",
                  }}
                >
                  KASEN Project
                </motion.h2>
                <img
                  src="/placeholder.svg"
                  alt="Kasen Project"
                  className="w-1/2 h-auto mb-4 mx-auto"
                />
                <p className="text-sm text-white mb-4">
                  This game is a collaborative effort with KASEN, a pioneer in KRC721 &
                  KRC20. Their creative vision and innovative approach have added extra fun
                  to our casino experience. Discover more about their project through the links below.
                </p>
                <div className="flex justify-center space-x-4 text-xl">
                  <motion.a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2 }}
                    className="text-[#FF0000] hover:text-[#FF7373]"
                  >
                    <FaTwitter />
                  </motion.a>
                  <motion.a
                    href="https://telegram.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2 }}
                    className="text-[#FF0000] hover:text-[#FF7373]"
                  >
                    <FaTelegramPlane />
                  </motion.a>
                  <motion.a
                    href="https://example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2 }}
                    className="text-[#FF0000] hover:text-[#FF7373]"
                  >
                    <FaGlobe />
                  </motion.a>
                </div>
              </Card>

              {/* How To Play Card for Mobile */}
              <Card className="bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm p-4">
                <h2 className="text-xl font-bold text-[#49EACB] mb-2">How to Play</h2>
                <ol className="list-decimal list-inside text-sm text-white space-y-1">
                  <li>Connect your wallet.</li>
                  <li>
                    Deposit credits with Kasware. (Your starting balance is 0 credits until you deposit.)
                  </li>
                  <li>Use the game’s built-in controls to place bets and play.</li>
                  <li>Follow on-screen prompts to win credits.</li>
                </ol>
              </Card>
            </div>
          </div>

          {/* Center: Game Container */}
          <div className="order-1 lg:order-2">
            <Card className="bg-[#49EACB]/5 border border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
              <div className="w-full h-[100vh] lg:h-[90vh] relative bg-[#49EACB]/5 rounded-lg overflow-hidden">
                <iframe
                  src="/kasen-mania/index.html"
                  title="Kasen Mania Game"
                  className="w-full h-full"
                  frameBorder="0"
                />
              </div>
            </Card>
          </div>

          {/* Right Column: Live Chat & Live Wins */}
          <div className="order-3">
            <div className="space-y-6">
              <LiveChat textColor="#49EACB" />
              <LiveWins textColor="#49EACB" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
