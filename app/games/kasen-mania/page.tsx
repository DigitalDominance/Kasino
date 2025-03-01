"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";

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
        {/* Use a responsive grid:
            • On mobile: one column (order: game, How to Play, Chat/Wins)
            • On desktop: three columns (left: How to Play, center: game, right: Chat/Wins)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Container (order 1 on mobile, center on desktop) */}
          <div className="order-1 lg:order-2">
            <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
              {/* Use a tall container to mimic a portrait mobile screen */}
              <div className="w-full h-[80vh] lg:h-[90vh] relative bg-[#49EACB]/5 rounded-lg overflow-hidden">
                <iframe
                  src="/kasen-mania/index.html"
                  title="Kasen Mania Game"
                  className="w-full h-full"
                  frameBorder="0"
                />
              </div>
            </Card>
          </div>

          {/* How To Play (order 2 on mobile, left column on desktop) */}
          <div className="order-2 lg:order-1">
            <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-4">
              <h2 className="text-xl font-bold text-[#49EACB] mb-2">
                How to Play
              </h2>
              <ol className="list-decimal list-inside text-sm text-white space-y-1">
                <li>Connect your wallet.</li>
                <li>
                  Deposit credits with Kasware. (Your starting balance is 0
                  credits until you deposit.)
                </li>
                <li>Use the game’s built-in controls to place bets and play.</li>
                <li>Follow on-screen prompts to win credits.</li>
              </ol>
            </Card>
          </div>

          {/* Live Chat & Live Wins (order 3 for both mobile and desktop) */}
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
