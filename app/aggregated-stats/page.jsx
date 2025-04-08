"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import Link from "next/link";
import Image from "next/image";
import { WalletConnection } from "@/components/wallet-connection";
import { XPDisplay } from "@/app/page";
import { SiteFooter } from "@/components/site-footer";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

const timeframeOptions = [
  { label: "Past Hour", value: "hour" },
  { label: "Past 24 Hours", value: "24hours" },
  { label: "Past 7 Days", value: "7days" },
  { label: "Past Month", value: "month" },
  { label: "All Time", value: "all" },
];

export default function AggregatedStatsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("24hours");
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  // Fetch aggregated stats using the new API endpoint
  const fetchAggregatedStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/api/aggregated-stats`, {
        params: { timeframe: selectedTimeframe },
      });
      if (res.data.success) {
        setStatsData(res.data.stats);
      } else {
        setStatsData(null);
      }
    } catch (error) {
      console.error("Error fetching aggregated stats:", error);
      setStatsData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAggregatedStats();
  }, [selectedTimeframe]);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white`}>
      {/* Navigation Header */}
      <header className="flex items-center justify-between p-4 border-b border-[#49EACB]/10 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/" className="flex items-center text-[#49EACB] hover:underline">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
            alt="Kasino Logo"
            width={120}
            height={50}
          />
        </Link>
        <div className="flex items-center gap-4">
          <XPDisplay />
          <WalletConnection />
        </div>
      </header>

      <main className="p-6">
        <h1 className="text-4xl font-bold mb-6 text-center animate-gradient">
          Aggregated Daily Stats
        </h1>

        {/* Timeframe Dropdown (Styled as a card-like element) */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="relative inline-block bg-gray-800 border border-[#49EACB] rounded-full px-4 py-2"
            whileHover={{ scale: 1.05 }}
          >
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="bg-transparent appearance-none text-white font-bold focus:outline-none"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#49EACB]">
              ▼
            </span>
          </motion.div>
        </div>

        {loading ? (
          <div className="text-center">Loading stats…</div>
        ) : statsData ? (
          <div className="space-y-8">
            {/* Platform Totals Card */}
            <motion.div
              className="p-8 border border-[#49EACB] rounded-xl shadow-2xl bg-gray-900 hover:shadow-3xl transition-all duration-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-6">Platform Totals</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xl text-green-500">
                    <span className="font-semibold">Total KAS Bet:</span>{" "}
                    <CountUp end={statsData.platform.totalKasBet} duration={1.5} separator="," />
                  </p>
                  <p className="text-xl text-green-500">
                    <span className="font-semibold">Total Plays:</span>{" "}
                    <CountUp end={statsData.platform.totalPlays} duration={1.5} separator="," />
                  </p>
                </div>
                <div>
                  <p className="text-xl text-green-500">
                    <span className="font-semibold">Total Win Amount:</span>{" "}
                    <CountUp end={statsData.platform.totalWinAmount} duration={1.5} separator="," decimals={2} />
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-2xl font-bold">
                  Profit / Loss:{" "}
                  <span
                    className={`${
                      statsData.platform.profitLoss < 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {Math.abs(statsData.platform.profitLoss).toFixed(2)}
                  </span>
                </p>
              </div>
            </motion.div>

            {/* Per-Game Stats Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {statsData.games.map((game, index) => (
                <motion.div
                  key={index}
                  className="p-6 border border-[#49EACB] rounded-xl shadow-lg bg-gray-800 hover:shadow-2xl transition-all duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <h3 className="text-2xl font-semibold mb-4">{game.gameName}</h3>
                  <div className="space-y-4">
                    <p className="text-lg text-green-500">
                      <span className="font-semibold">Total KAS Bet:</span>{" "}
                      <CountUp end={game.totalKasBet} duration={1.5} separator="," />
                    </p>
                    <p className="text-lg text-green-500">
                      <span className="font-semibold">Total Plays:</span>{" "}
                      <CountUp end={game.totalPlays} duration={1.5} separator="," />
                    </p>
                    <p className="text-lg text-green-500">
                      <span className="font-semibold">Total Win Amount:</span>{" "}
                      <CountUp end={game.totalWinAmount} duration={1.5} separator="," decimals={2} />
                    </p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xl font-bold">
                      Profit / Loss:{" "}
                      <span
                        className={`${
                          game.profitLoss < 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {Math.abs(game.profitLoss).toFixed(2)}
                      </span>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">No stats data available.</div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
