// BettingPage.tsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { XPDisplay } from "@/app/page";
import { Montserrat } from "next/font/google";
import { useWallet } from "@/contexts/WalletContext";
import { v4 as uuidv4 } from "uuid";
import { io } from "socket.io-client";

// Font
const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// Constants
const HOUSE_EDGE_PERCENT = 5;
const ODDS_API_HOST = "https://api.the-odds-api.com";
const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;
const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";

// Icon mapping for categories
const iconMap: { [key: string]: string } = {
  mma_mixed_martial_arts: "/kasinommaicon.webp",
  boxing_boxing: "/kasinoboxingicon.webp",
  basketball_nba: "/kasinobasketballicon.webp",
  baseball_mlb: "/kasinobaseballicon.webp",
  soccer_usa_mls: "/kasinosoccericon.webp",
};

// Display names for acronym sports
const displayNameMap: { [key: string]: string } = {
  mma_mixed_martial_arts: "Mixed Martial Arts",
  boxing_boxing: "Boxing",
  americanfootball_nfl: "National Football League",
  basketball_nba: "National Basketball Association",
  baseball_mlb: "Major League Baseball",
  tennis_atp_us_open: "Tennis (US Open)",
  soccer_usa_mls: "Major League Soccer",
};

// Helper: Adjust odds and round to two decimals.
function adjustOdds(apiOdds: number): number {
  const adjusted = apiOdds * (1 - HOUSE_EDGE_PERCENT / 100);
  return Number(adjusted.toFixed(2));
}

// Accepted sports in desired order (removed ncaaf)
const acceptedSports = [
  "mma_mixed_martial_arts",
  "boxing_boxing",
  "americanfootball_nfl",
  "basketball_nba",
  "baseball_mlb",
  "tennis_atp_us_open",
  "soccer_usa_mls",
];

// Format team names as "Team A vs Team B"
function formatEventTeams(away: string, home: string) {
  return `${away} vs ${home}`;
}

// Calculate average odds for each outcome across all h2h bookmakers.
function calculateAverageOdds(event: any): { [team: string]: number } {
  const oddsMap: { [team: string]: number[] } = {};
  if (event.bookmakers && event.bookmakers.length) {
    event.bookmakers.forEach((bm: any) => {
      if (bm.markets && bm.markets.length) {
        const h2hMarket = bm.markets.find((market: any) => market.key === "h2h");
        if (h2hMarket && h2hMarket.outcomes) {
          h2hMarket.outcomes.forEach((outcome: any) => {
            const team = outcome.name;
            const odd = adjustOdds(outcome.price);
            if (!oddsMap[team]) oddsMap[team] = [];
            oddsMap[team].push(odd);
          });
        }
      }
    });
  }
  const averages: { [team: string]: number } = {};
  for (const team in oddsMap) {
    const sum = oddsMap[team].reduce((a, b) => a + b, 0);
    const avg = sum / oddsMap[team].length;
    averages[team] = Number(avg.toFixed(2));
  }
  return averages;
}

// Group events by their local date string.
function groupEventsByDate(events: any[]) {
  return events.reduce((grouped: { [key: string]: any[] }, event) => {
    const dateStr = new Date(event.commence_time).toLocaleDateString();
    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push(event);
    return grouped;
  }, {});
}

// Determine winner based on scores (assumes head-to-head with exactly two outcomes).
function determineWinner(scores: any[]): { winner: string; scoreDisplay: string } {
  if (!scores || scores.length < 2) return { winner: "", scoreDisplay: "" };
  const score1 = parseFloat(scores[0].score);
  const score2 = parseFloat(scores[1].score);
  const winner = score1 > score2 ? scores[0].name : scores[1].name;
  const scoreDisplay = `${scores[0].name} ${scores[0].score} - ${scores[1].score} ${scores[1].name}`;
  return { winner, scoreDisplay };
}

// Check if an event has completed results in the scores data.
function isEventOver(event: any, eventResults: { [id: string]: any }): boolean {
  return eventResults[event.id] && eventResults[event.id].completed === true;
}

// Only show events that start within 7 days from now.
function isWithinOneWeek(commenceTime: string | Date): boolean {
  const eventTime = new Date(commenceTime).getTime();
  const now = Date.now();
  return eventTime <= now + 7 * 24 * 60 * 60 * 1000;
}

export default function BettingPage() {
  const { isConnected, balance } = useWallet();
  const [sports, setSports] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("mma_mixed_martial_arts");
  const [events, setEvents] = useState<any[]>([]);
  const [eventResults, setEventResults] = useState<{ [id: string]: any }>({});
  const [resultState, setResultState] = useState<{ eventName: string; winAmount: number; win: boolean } | null>(null);
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  // Socket for bet resolution notifications
  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ||
        "https://kasino-backend-4818b4b69870.herokuapp.com"
    );
    socket.on("betResolved", (data: { eventName: string; winAmount: number; win: boolean }) => {
      setResultState({
        eventName: data.eventName,
        winAmount: data.winAmount,
        win: data.win,
      });
    });
    return () => {
      socket.off("betResolved");
      socket.disconnect();
    };
  }, []);

  // Banner image source from public folder.
  const bannerSrc = "/sportsbetbanner.webp";

  // Fetch sports on mount.
  useEffect(() => {
    axios
      .get(`${ODDS_API_HOST}/v4/sports/?apiKey=${process.env.NEXT_PUBLIC_ODDS_API_KEY}`)
      .then((res) => {
        const filtered = res.data
          .filter((sport: any) => sport.active && acceptedSports.includes(sport.key))
          .sort((a: any, b: any) => acceptedSports.indexOf(a.key) - acceptedSports.indexOf(b.key));
        setSports(filtered);
        if (filtered.length > 0) setSelectedSport(filtered[0].key);
      })
      .catch((err) => console.error("Error fetching sports:", err));
  }, []);

  // Fetch events for the selected sport.
  useEffect(() => {
    if (!selectedSport) return;
    axios
      .get(
        `${ODDS_API_HOST}/v4/sports/${selectedSport}/odds?regions=us&markets=h2h&oddsFormat=american&apiKey=${process.env.NEXT_PUBLIC_ODDS_API_KEY}`
      )
      .then((res) => {
        const processed = res.data.map((event: any) => {
          const averages = calculateAverageOdds(event);
          return { ...event, avgOdds: averages };
        });
        setEvents(processed);
      })
      .catch((err) => console.error("Error fetching events:", err));
  }, [selectedSport]);

  // Fetch scores to see if events are completed.
  useEffect(() => {
    const eventsNeedingResults = events.filter((event: any) => !eventResults[event.id]);
    if (eventsNeedingResults.length > 0) {
      const eventIds = eventsNeedingResults.map((e: any) => e.id).join(",");
      axios
        .get(
          `${ODDS_API_HOST}/v4/sports/${selectedSport}/scores/?apiKey=${process.env.NEXT_PUBLIC_ODDS_API_KEY}&eventIds=${eventIds}&daysFrom=1&dateFormat=iso`
        )
        .then((res) => {
          const scoresData = res.data;
          const newResults: { [id: string]: any } = { ...eventResults };
          scoresData.forEach((scoreData: any) => {
            newResults[scoreData.id] = scoreData;
          });
          setEventResults(newResults);
        })
        .catch((err) => console.error("Error fetching event results:", err));
    }
  }, [events, selectedSport, eventResults]);

  // When the bet modal is open, load existing bets for the event.
  useEffect(() => {
    async function loadMyBets() {
      if (!selectedEvent || !isConnected) return;
      try {
        const accounts = await window.kasware.getAccounts();
        const currentWalletAddress = accounts[0];
        const res = await axios.get(`${apiUrl}/betting/myBets`, {
          params: { walletAddress: currentWalletAddress, eventId: selectedEvent.id },
        });
        if (res.data.success) {
          setMyBets(res.data.bets);
        }
      } catch (err) {
        console.error("Error fetching my bets:", err);
      }
    }
    if (betModalVisible) {
      loadMyBets();
      setSelectedOutcome(null);
    }
  }, [betModalVisible, selectedEvent, isConnected]);

  // Place a bet.
  const placeBet = async () => {
    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }
    if (betAmount < 1 || betAmount > balance) {
      alert("Invalid bet amount");
      return;
    }
    if (!selectedEvent || !selectedOutcome) {
      alert("Please select an outcome");
      return;
    }
    if (isEventOver(selectedEvent, eventResults)) {
      alert("This event is over. You cannot place a bet.");
      return;
    }
    try {
      const accounts = await window.kasware.getAccounts();
      const currentWalletAddress = accounts[0];
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      const chosenTreasury = Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }
      const depositTx = await window.kasware.sendKaspa(chosenTreasury, betAmount * 1e8, {
        priorityFee: 10000,
      });
      const parsedTx = typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      const odds = selectedEvent.avgOdds[selectedOutcome];
      const result = await axios.post(`${apiUrl}/betting/place`, {
        walletAddress: currentWalletAddress,
        eventId: selectedEvent.id,
        sportKey: selectedSport,
        eventName: formatEventTeams(selectedEvent.away_team, selectedEvent.home_team),
        eventCommenceTime: selectedEvent.commence_time,
        betAmount,
        odds,
        chosenOutcome: selectedOutcome,
        txid: txidString,
      });
      if (result.data.success) {
        setBetModalVisible(false);
        setMyBets((prev: any[]) => [
          ...prev,
          {
            eventId: selectedEvent.id,
            eventName: formatEventTeams(selectedEvent.away_team, selectedEvent.home_team),
            betAmount,
            odds,
            chosenOutcome: selectedOutcome,
          },
        ]);
      } else {
        alert("Failed to place bet on backend");
      }
    } catch (error: any) {
      console.error("Error placing bet:", error);
      alert("Error placing bet.");
    }
  };

  // Group events by local date.
  const groupedEvents = groupEventsByDate(events);
  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Generate display for an event if it's over.
  function getEventResultDisplay(event: any) {
    const scoreData = eventResults[event.id];
    if (scoreData && scoreData.completed && scoreData.scores && scoreData.scores.length >= 2) {
      const { scoreDisplay } = determineWinner(scoreData.scores);
      return scoreDisplay;
    }
    return "Result Unavailable";
  }

  // Close the modal.
  const closeModal = () => setBetModalVisible(false);

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white p-6`}>
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </motion.div>
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <XPDisplay />
          <WalletConnection />
        </motion.div>
      </header>

      {/* Banner below the nav, above category buttons */}
      <div className="mb-6">
        <Image
          src={bannerSrc}
          alt="Banner"
          width={1200}
          height={200}
          className="w-full object-cover"
        />
      </div>

      {/* Top category buttons */}
      <div className="flex gap-2 mb-6">
        {sports.map((sport) => {
          const isSelected = selectedSport === sport.key;
          const btnClass = isSelected
            ? "bg-[#49EACB] text-black px-20 py-9 text-4xl"
            : "bg-gray-800 text-white px-20 py-9 text-4xl";
          return (
            <Button
              key={sport.key}
              onClick={() => setSelectedSport(sport.key)}
              className={btnClass}
            >
              <span className="flex items-center">
                {sport.title}
                {iconMap[sport.key] && (
                  <Image
                    src={iconMap[sport.key]}
                    alt={`${sport.title} icon`}
                    width={50}
                    height={50}
                    className="ml-2"
                  />
                )}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Sport heading with animation */}
      <AnimatePresence exitBeforeEnter>
        <motion.h1
          key={selectedSport}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold mb-4 text-[#49EACB]"
        >
          {displayNameMap[selectedSport] ||
            sports.find((s) => s.key === selectedSport)?.title}
        </motion.h1>
      </AnimatePresence>

      {/* Display events grouped by date with loading animation */}
      <AnimatePresence exitBeforeEnter>
        <motion.div
          key={selectedSport}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          {sortedDates.map((dateStr) => {
            const relevantEvents = groupedEvents[dateStr].filter(
              (event: any) =>
                event.sport_key === selectedSport && isWithinOneWeek(event.commence_time)
            );
            if (relevantEvents.length === 0) return null;

            return (
              <section key={dateStr} className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-white">{dateStr}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {relevantEvents.map((event: any) => {
                    const over = isEventOver(event, eventResults);
                    const eventTime = new Date(event.commence_time).getTime();
                    const now = Date.now();
                    const ongoing = eventTime <= now && !over;
                    const borderColor = over ? "border-red-500" : "border-[#49EACB]";
                    const cursorClass = !over && !ongoing
                      ? "cursor-pointer hover:bg-gray-700"
                      : "cursor-not-allowed";

                    return (
                      <Card
                        key={event.id}
                        className={`p-4 bg-gray-800 ${borderColor} ${cursorClass} text-white`}
                        onClick={() => {
                          if (!over && !ongoing) {
                            setSelectedEvent(event);
                            setSelectedOutcome(null);
                            setDepositTxid(null);
                            setBetModalVisible(true);
                          }
                        }}
                      >
                        <h3 className="text-2xl font-bold">
                          {formatEventTeams(event.away_team, event.home_team)}
                        </h3>
                        <p className="text-base">
                          Commence Time: {new Date(event.commence_time).toLocaleString()}
                        </p>
                        <div className="mt-2">
                          {ongoing ? (
                            <p className="text-lg font-semibold text-[#49EACB]">
                              Event In Progress
                            </p>
                          ) : over ? (
                            <p className="text-lg font-semibold">
                              Result:{" "}
                              {eventResults[event.id] && eventResults[event.id].completed
                                ? getEventResultDisplay(event)
                                : "Pending"}
                            </p>
                          ) : (
                            Object.keys(event.avgOdds || {}).map((team) => (
                              <p key={team} className="text-lg">
                                {team}:{" "}
                                {event.avgOdds[team] > 0
                                  ? `+${event.avgOdds[team]}`
                                  : event.avgOdds[team]}
                              </p>
                            ))
                          )}
                        </div>
                        {myBets.filter((bet: any) => bet.eventId === event.id).length > 0 && (
                          <div className="mt-2 text-sm text-gray-300">
                            <strong>Your Bets:</strong>
                            {myBets
                              .filter((bet: any) => bet.eventId === event.id)
                              .map((bet: any, idx: number) => (
                                <div key={idx}>
                                  {bet.betAmount} KAS at odds {bet.odds.toFixed(2)} on{" "}
                                  {bet.chosenOutcome}
                                </div>
                              ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Bet Modal */}
      <AnimatePresence>
        {betModalVisible && selectedEvent && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#1c1c1c] w-[28rem] max-w-full p-6 border border-[#49EACB] rounded-lg relative"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                className="absolute top-3 right-3 text-[#49EACB] text-2xl"
                onClick={closeModal}
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                &times;
              </motion.button>

              <h2 className="text-3xl mb-4 text-white">
                {formatEventTeams(selectedEvent.away_team, selectedEvent.home_team)}
              </h2>
              <p className="mb-2 text-white">
                Commence Time: {new Date(selectedEvent.commence_time).toLocaleString()}
              </p>

              {depositTxid && (
                <p className="mb-4 text-sm text-white break-words">
                  Deposit TXID:{" "}
                  <a
                    href={`https://kas.fyi/transaction/${depositTxid}`}
                    className="underline text-[#49EACB]"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {depositTxid}
                  </a>
                </p>
              )}

              {(() => {
                const selectedOver = isEventOver(selectedEvent, eventResults);
                const selectedCommence = new Date(selectedEvent.commence_time).getTime();
                const selectedOngoing = selectedCommence <= Date.now() && !selectedOver;

                if (selectedOver) {
                  return (
                    <div className="mb-6">
                      <p className="text-lg font-semibold text-red-500">Event Over!</p>
                      <p className="text-lg text-white">
                        Result:{" "}
                        {eventResults[selectedEvent.id] && eventResults[selectedEvent.id].completed
                          ? determineWinner(eventResults[selectedEvent.id].scores).scoreDisplay
                          : "Pending"}
                      </p>
                    </div>
                  );
                } else if (selectedOngoing) {
                  return (
                    <div className="mb-6">
                      <p className="text-lg font-semibold text-[#49EACB]">Event In Progress</p>
                    </div>
                  );
                } else {
                  return (
                    <>
                      <div className="mb-6">
                        <p className="text-white mb-2 text-xl">Choose Your Outcome:</p>
                        <div className="flex flex-col gap-3">
                          {(() => {
                            const averages = calculateAverageOdds(selectedEvent);
                            return Object.keys(averages).map((team) => (
                              <Button
                                key={team}
                                variant={selectedOutcome === team ? "default" : "outline"}
                                className={
                                  selectedOutcome === team
                                    ? "w-full py-4 text-2xl bg-[#49EACB] text-black font-bold"
                                    : "w-full py-4 text-2xl border-[#49EACB] text-black hover:bg-[#49EACB]/40"
                                }
                                onClick={() => setSelectedOutcome(team)}
                              >
                                {team}: {averages[team] > 0 ? `+${averages[team]}` : averages[team]}
                              </Button>
                            ));
                          })()}
                        </div>
                      </div>
                      <div className="mb-4">
                        <input
                          type="number"
                          className="w-full p-2 text-black rounded text-xl"
                          placeholder="Bet Amount (KAS)"
                          onChange={(e) => setBetAmount(Number(e.target.value))}
                        />
                      </div>
                      <Button
                        onClick={placeBet}
                        className="w-full py-4 text-2xl bg-[#49EACB] text-black font-bold hover:bg-[#49EACB]/80"
                      >
                        Place Bet
                      </Button>
                    </>
                  );
                }
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Notification */}
      <AnimatePresence>
        {resultState && (
          <motion.div
            className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 p-4 rounded-lg shadow-lg text-center text-white z-50 ${
              resultState.win ? "bg-green-600" : "bg-red-600"
            }`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5 }}
          >
            {resultState.win ? (
              <div>
                <h2 className="text-xl font-bold">Congratulations!</h2>
                <p>
                  You won on {resultState.eventName} with a payout of {resultState.winAmount} KAS.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold">Better luck next time!</h2>
                <p>You lost your bet on {resultState.eventName}.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SiteFooter />
    </div>
  );
}
