"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import "react-datepicker/dist/react-datepicker.css";

// Timeframe options – these will determine the date range to fetch and aggregate daily stats.
const timeframes = [
  { label: "Past Hour", value: "hour" },
  { label: "Past 24 Hours", value: "24hours" },
  { label: "Past 7 Days", value: "7days" },
  { label: "Past Month", value: "month" },
  { label: "All Time", value: "all" },
];

export default function StatsDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("24hours");
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate start and end dates based on the selected timeframe.
  const getDateRange = () => {
    const now = new Date();
    let startDate;
    switch (selectedTimeframe) {
      case "hour":
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24hours":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "all":
        // For "all time" we assume stats exist from a known start date.
        startDate = new Date("2023-01-01T00:00:00Z");
        break;
      default:
        startDate = now;
    }
    return { startDate, endDate: now };
  };

  // This function fetches daily stats for each day within the selected range
  // and aggregates both the platform totals and each game's stats.
  const fetchAggregatedStats = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange();

    // Generate an array of dates (one per day) between startDate and endDate.
    let current = new Date(startDate);
    const dates = [];
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    // For each date, try to fetch its daily stats.
    const statsArray = await Promise.all(
      dates.map(async (date) => {
        const formattedDate = date.toISOString().split("T")[0];
        try {
          const res = await axios.get(`${apiUrl}/api/daily-stats?date=${formattedDate}`);
          if (res.data && res.data.success) {
            return res.data.stats;
          }
        } catch (e) {
          // A day might not have stats. Simply return null.
          return null;
        }
        return null;
      })
    );

    const validStats = statsArray.filter((doc) => doc !== null);

    // Aggregate platform data.
    const aggregatedPlatform = validStats.reduce(
      (agg, doc) => {
        agg.totalKasBet += doc.platform.totalKasBet;
        agg.totalPlays += doc.platform.totalPlays;
        agg.totalWinAmount += doc.platform.totalWinAmount;
        agg.totalLossAmount += doc.platform.totalLossAmount;
        agg.winsCount += doc.platform.winsCount;
        agg.lossesCount += doc.platform.lossesCount;
        agg.profitLoss += doc.platform.profitLoss;
        return agg;
      },
      {
        totalKasBet: 0,
        totalPlays: 0,
        totalWinAmount: 0,
        totalLossAmount: 0,
        winsCount: 0,
        lossesCount: 0,
        profitLoss: 0,
      }
    );

    // Aggregate per-game stats (grouped by gameName).
    const aggregatedGames = {};
    validStats.forEach((doc) => {
      doc.games.forEach((gameStat) => {
        if (!aggregatedGames[gameStat.gameName]) {
          aggregatedGames[gameStat.gameName] = { ...gameStat };
        } else {
          aggregatedGames[gameStat.gameName].totalKasBet += gameStat.totalKasBet;
          aggregatedGames[gameStat.gameName].totalPlays += gameStat.totalPlays;
          aggregatedGames[gameStat.gameName].totalWinAmount += gameStat.totalWinAmount;
          aggregatedGames[gameStat.gameName].totalLossAmount += gameStat.totalLossAmount;
          aggregatedGames[gameStat.gameName].winsCount += gameStat.winsCount;
          aggregatedGames[gameStat.gameName].lossesCount += gameStat.lossesCount;
          aggregatedGames[gameStat.gameName].profitLoss += gameStat.profitLoss;
        }
      });
    });

    setStatsData({
      platform: aggregatedPlatform,
      games: Object.values(aggregatedGames),
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchAggregatedStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeframe]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl font-bold mb-6 text-center animate-gradient">
        Kasino Daily Stats Dashboard
      </h1>
      {/* Timeframe Selector */}
      <div className="flex justify-center mb-8 space-x-4">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            className={`px-4 py-2 rounded transition-colors duration-300 ${
              selectedTimeframe === tf.value
                ? "bg-[#49EACB] text-black"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
            onClick={() => setSelectedTimeframe(tf.value)}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center">Loading stats…</div>
      ) : statsData ? (
        <div className="space-y-8">
          {/* Platform Totals */}
          <motion.div
            className="p-6 border border-[#49EACB] rounded-lg shadow-lg bg-gray-900"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4">Platform Totals</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-lg">
                  <span className="font-semibold">Total KAS Bet:</span>{" "}
                  <CountUp end={statsData.platform.totalKasBet} duration={1.5} separator="," />
                </p>
                <p className="text-lg">
                  <span className="font-semibold">Total Plays:</span>{" "}
                  <CountUp end={statsData.platform.totalPlays} duration={1.5} separator="," />
                </p>
              </div>
              <div>
                <p className="text-lg">
                  <span className="font-semibold">Total Win Amount:</span>{" "}
                  <CountUp end={statsData.platform.totalWinAmount} duration={1.5} separator="," decimals={2} />
                </p>
                <p className="text-lg">
                  <span className="font-semibold">Total Loss Amount:</span>{" "}
                  <CountUp end={statsData.platform.totalLossAmount} duration={1.5} separator="," decimals={2} />
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xl font-bold">
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

          {/* Per-Game Stats */}
          <motion.div
            className="p-6 border border-[#49EACB] rounded-lg shadow-lg bg-gray-900"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-4">Per-Game Stats</h2>
            {statsData.games.map((game, index) => (
              <motion.div
                key={index}
                className="p-4 mb-4 border rounded bg-gray-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <h3 className="text-xl font-semibold mb-2">{game.gameName}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p>
                      <span className="font-semibold">Total KAS Bet:</span>{" "}
                      <CountUp end={game.totalKasBet} duration={1.5} separator="," />
                    </p>
                    <p>
                      <span className="font-semibold">Total Plays:</span>{" "}
                      <CountUp end={game.totalPlays} duration={1.5} separator="," />
                    </p>
                  </div>
                  <div>
                    <p>
                      <span className="font-semibold">Total Win Amount:</span>{" "}
                      <CountUp end={game.totalWinAmount} duration={1.5} separator="," decimals={2} />
                    </p>
                    <p>
                      <span className="font-semibold">Total Loss Amount:</span>{" "}
                      <CountUp end={game.totalLossAmount} duration={1.5} separator="," decimals={2} />
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-lg font-bold">
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
          </motion.div>
        </div>
      ) : (
        <div className="text-center">No stats data available.</div>
      )}
    </div>
  );
}
