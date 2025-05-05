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

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// Constants
const HOUSE_EDGE_PERCENT = 5;
const ODDS_API_HOST = "https://api.the-odds-api.com";

// A simple helper: adjust odds by reducing the potential payout by 5%.
// (For American odds, full conversion is more involved; here we use a simplified multiplier.)
function adjustOdds(apiOdds: number): number {
  return apiOdds * (1 - HOUSE_EDGE_PERCENT / 100);
}

export default function BettingPage() {
  const { isConnected, balance } = useWallet();
  const [sports, setSports] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("mma_mixed_martial_arts");
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [betId, setBetId] = useState<string | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [resultState, setResultState] = useState<{ eventName: string; winAmount: number; win: boolean } | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // When the page loads, fetch sports (ensure MMA is first)
  useEffect(() => {
    axios
      .get(`${ODDS_API_HOST}/v4/sports/?apiKey=${process.env.NEXT_PUBLIC_ODDS_API_KEY}`)
      .then((res) => {
        const sorted = res.data.sort((a: any, b: any) => (a.key === "mma_mixed_martial_arts" ? -1 : 0));
        setSports(sorted);
      })
      .catch((err) => console.error("Error fetching sports:", err));
  }, []);

  // When selected sport changes, fetch events for that sport
  useEffect(() => {
    axios
      .get(
        `${ODDS_API_HOST}/v4/sports/${selectedSport}/odds?regions=us&oddsFormat=american&apiKey=${process.env.NEXT_PUBLIC_ODDS_API_KEY}`
      )
      .then((res) => {
        // For each event, adjust odds from the first bookmaker/market (you can expand this later)
        const adjustedEvents = res.data.map((event: any) => {
          event.bookmakers = event.bookmakers.map((bm: any) => {
            bm.markets = bm.markets.map((market: any) => {
              market.outcomes = market.outcomes.map((outcome: any) => ({
                ...outcome,
                price: adjustOdds(outcome.price),
              }));
              return market;
            });
            return bm;
          });
          return event;
        });
        setEvents(adjustedEvents);
      })
      .catch((err) => console.error("Error fetching events:", err));
  }, [selectedSport]);

  // When the bet modal is opened, load the user's existing bets for that event.
  useEffect(() => {
    async function loadMyBets() {
      if (!selectedEvent || !isConnected) return;
      try {
        const walletAddress = (await window.kasware.getAccounts())[0];
        const res = await axios.get("/api/betting/myBets", {
          params: { walletAddress, eventId: selectedEvent.id },
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
    }
  }, [betModalVisible, selectedEvent, isConnected]);

  // Place bet function: sends data to backend to store a new Bet record.
  const placeBet = async () => {
    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }
    if (betAmount < 1 || betAmount > balance) {
      alert("Invalid bet amount");
      return;
    }
    if (!selectedEvent) return;

    // For demonstration, use the first outcome from the first bookmaker as the chosen one.
    const chosenOutcome =
      selectedEvent.bookmakers[0].markets[0].outcomes[0].name || "Unknown";
    // Also store the odds used.
    const odds = selectedEvent.bookmakers[0].markets[0].outcomes[0].price;
    try {
      const walletAddress = (await window.kasware.getAccounts())[0];
      const res = await axios.post("/api/betting/place", {
        walletAddress,
        eventId: selectedEvent.id,
        sportKey: selectedSport,
        eventName: `${selectedEvent.away_team} @ ${selectedEvent.home_team}`,
        eventCommenceTime: selectedEvent.commence_time,
        betAmount,
        odds,
        chosenOutcome,
      });
      if (res.data.success) {
        setBetId(res.data.betId);
        setBetModalVisible(false);
        // Optionally, refresh my bets on success.
        setMyBets((prev) => [
          ...prev,
          {
            eventId: selectedEvent.id,
            eventName: `${selectedEvent.away_team} @ ${selectedEvent.home_team}`,
            betAmount,
            odds,
            chosenOutcome,
          },
        ]);
        // Start polling for payout result after delay
        setTimeout(() => {
          pollBetResult(res.data.betId);
        }, 5000);
      } else {
        alert("Failed to place bet on backend");
      }
    } catch (error: any) {
      console.error("Error placing bet:", error);
      alert("Error placing bet.");
    }
  };

  // Poll for the outcome of the bet.
  const pollBetResult = async (betId: string) => {
    setLoadingResult(true);
    try {
      const res = await axios.post("/api/betting/payout", { betId });
      if (res.data.success) {
        setResultState({
          eventName: res.data.bet.eventName,
          winAmount: res.data.bet.winAmount,
          win: res.data.bet.gameResult === "win",
        });
      } else {
        console.error("Bet payout failed:", res.data.message);
      }
    } catch (error: any) {
      console.error("Error resolving bet payout:", error);
    } finally {
      setLoadingResult(false);
    }
  };

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white p-6`}>
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
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

      {/* Sports Categories */}
      <div className="flex gap-4 mb-6">
        {sports.map((sport) => (
          <Button
            key={sport.key}
            onClick={() => setSelectedSport(sport.key)}
            className={selectedSport === sport.key ? "bg-[#49EACB] text-black" : "bg-gray-800"}
          >
            {sport.title}
          </Button>
        ))}
      </div>

      {/* Event Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {events.map((event) => (
          <Card
            key={event.id}
            className="p-4 bg-gray-900 border-gray-700 cursor-pointer hover:bg-gray-800"
            onClick={() => {
              setSelectedEvent(event);
              setBetModalVisible(true);
            }}
          >
            <h2 className="text-xl font-bold">
              {event.away_team} @ {event.home_team}
            </h2>
            <p>Commence Time: {new Date(event.commence_time).toLocaleString()}</p>
            {event.bookmakers[0] && event.bookmakers[0].markets[0] && (
              <div className="mt-2">
                {event.bookmakers[0].markets[0].outcomes.map((outcome: any) => (
                  <div key={outcome.name}>
                    {outcome.name}: {outcome.price > 0 ? `+${outcome.price}` : outcome.price}
                  </div>
                ))}
              </div>
            )}
            {/* Display any bets placed by the user for this event */}
            {/* Assume that myBets contains items with an eventId field */}
            {myBets.filter((bet) => bet.eventId === event.id).length > 0 && (
              <div className="mt-2 text-sm text-gray-300">
                <strong>Your Bets:</strong>
                {myBets
                  .filter((bet) => bet.eventId === event.id)
                  .map((bet, idx) => (
                    <div key={idx}>
                      {bet.betAmount} KAS at odds {bet.odds} on {bet.chosenOutcome}
                    </div>
                  ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Bet Modal */}
      <AnimatePresence>
        {betModalVisible && selectedEvent && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="bg-[#49EACB] p-6 rounded-lg w-96" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} transition={{ duration: 0.3 }}>
              <h2 className="text-2xl mb-4">
                {selectedEvent.away_team} @ {selectedEvent.home_team}
              </h2>
              <p className="mb-2">Commence Time: {new Date(selectedEvent.commence_time).toLocaleString()}</p>
              <div className="mb-4">
                {selectedEvent.bookmakers.map((bm: any) => (
                  <div key={bm.key}>
                    <strong>{bm.title}</strong>
                    {bm.markets.map((market: any) => (
                      <div key={market.key}>
                        {market.outcomes.map((outcome: any) => (
                          <div key={outcome.name}>
                            {outcome.name}: {outcome.price > 0 ? `+${outcome.price}` : outcome.price}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {/* Render any previously placed bets for this event */}
              {myBets.length > 0 && (
                <div className="mb-4 bg-gray-800 p-2 rounded">
                  <h3 className="text-lg font-bold">Your Existing Bets</h3>
                  {myBets.map((bet, idx) => (
                    <div key={idx} className="text-sm">
                      {bet.betAmount} KAS at odds {bet.odds} on {bet.chosenOutcome}
                    </div>
                  ))}
                </div>
              )}
              <input
                type="number"
                className="w-full p-2 mb-4 text-black"
                placeholder="Bet Amount (KAS)"
                onChange={(e) => setBetAmount(Number(e.target.value))}
              />
              <Button onClick={placeBet} className="w-full bg-black text-[#49EACB]">
                Place Bet
              </Button>
              <Button onClick={() => setBetModalVisible(false)} className="w-full mt-2 bg-black text-[#49EACB]">
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Notification */}
      <AnimatePresence>
        {resultState && (
          <motion.div
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 p-4 rounded-lg shadow-lg text-center"
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

      {loadingResult && (
        <div className="fixed bottom-6 right-6 bg-gray-800 p-2 rounded">
          <p>Processing result...</p>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
