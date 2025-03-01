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

      {/* Main content with two columns */}
      <main className="flex-grow p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Left Column: Game Area */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
            {/* 
              On mobile, the container is full width with a 16:9 aspect ratio.
              On desktop (lg and up), we force fixed dimensions (1024x576) so that
              the Construct game loads in desktop mode.
            */}
            <div className="w-full aspect-video lg:w-[1024px] lg:h-[576px] relative bg-[#49EACB]/5 rounded-lg overflow-hidden">
              <iframe
                src="/kasen-mania/index.html"
                title="Kasen Mania Game"
                className="w-full h-full"
                frameBorder="0"
              />
            </div>
          </Card>

          {/* Right Column: Live Chat & Live Wins */}
          <div className="space-y-6">
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
