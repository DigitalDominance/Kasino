"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/contexts/WalletContext";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./styles.css";

export default function KasenManiaPage() {
  const { isConnected, balance } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [gameResult, setGameResult] = useState(null);
  const [winAmount, setWinAmount] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [depositTxid, setDepositTxid] = useState(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  const handleStartGame = async () => {
    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert("Invalid bet amount");
      return;
    }
    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }
    try {
      const uniqueHash = uuidv4();
      const accounts = await window.kasware.getAccounts();
      const currentWalletAddress = accounts[0];
      if (!currentWalletAddress) {
        alert("No wallet address found");
        return;
      }
      const chosenTreasury =
        Math.random() < 0.5 ? treasuryAddressT1 : treasuryAddressT2;
      if (!chosenTreasury) {
        alert("Treasury address not configured");
        return;
      }

      const depositTx = await window.kasware.sendKaspa(
        chosenTreasury,
        bet * 1e8,
        { priorityFee: 10000 }
      );
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      const startRes = await axios.post(`${apiUrl}/game/start`, {
        gameName: "kasenmania",
        uniqueHash,
        walletAddress: currentWalletAddress,
        betAmount: bet,
        txid: txidString,
      });
      if (startRes.data.success) {
        setGameId(startRes.data.gameId);
      } else {
        alert("Failed to start game on backend");
        return;
      }
      setIsPlaying(true);
    } catch (error) {
      console.error("Error starting game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  const handleGameEnd = async (result, winAmt) => {
    setGameResult(result);
    setWinAmount(winAmt);
    setIsPlaying(false);
    if (gameId) {
      try {
        await axios.post(`${apiUrl}/game/end`, {
          gameId,
          result: result === "You Win" ? "win" : "lose",
          winAmount: winAmt,
        });
      } catch (error) {
        console.error("Error ending game on backend:", error);
      }
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameResult(null);
    setWinAmount(null);
    setGameId(null);
    setDepositTxid(null);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex items-center justify-between p-6">
        <motion.div whileHover={{ scale: 1.05 }}>
          <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Link>
        </motion.div>
        <motion.div>
          <WalletConnection />
        </motion.div>
      </header>

      {depositTxid && (
        <div className="p-4">
          <p className="text-sm" style={{ color: "#B6B6B6" }}>
            Deposit TXID:{" "}
            <a
              className="txid-link"
              style={{
                background: "linear-gradient(90deg, #B6B6B6, #49EACB)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              href={`https://kas.fyi/transaction/${depositTxid}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {depositTxid}
            </a>
          </p>
        </div>
      )}

      <main className="flex-grow p-6 flex flex-col items-center">
        <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6 w-full max-w-3xl">
          <h2 className="text-2xl font-bold text-[#49EACB] mb-4">Kasen Mania</h2>
          {/* Game Area: Load your HTML5 game via an iframe */}
          <div className="aspect-video bg-[#49EACB]/5 rounded-lg overflow-hidden mb-6">
            <iframe
              src="/games/kasen-mania/index.html"
              title="Kasen Mania Game"
              className="w-full h-full"
              frameBorder="0"
            />
          </div>

          {/* Optional: If you need to include extra controls (like bet amount and start game button) */}
          {!isPlaying && (
            <div className="mt-4 flex flex-col items-center space-y-2">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="bg-[#49EACB]/5 border border-[#49EACB]/10 text-white p-2 rounded"
                placeholder="Enter Bet Amount"
                disabled={!isConnected}
              />
              <Button
                onClick={handleStartGame}
                className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                disabled={!isConnected}
              >
                Start Game
              </Button>
              {gameResult && (
                <div className="mt-2 text-xl">
                  {gameResult === "You Win" ? (
                    <span className="text-green-500">You won {winAmount} KAS!</span>
                  ) : (
                    <span className="text-red-500">You lost your bet.</span>
                  )}
                  <Button
                    onClick={resetGame}
                    className="mt-2 bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                  >
                    Play Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Live Chat and Live Wins remain, pulled in from your main page */}
        <div className="mt-6 space-y-6 w-full max-w-3xl">
          <LiveChat textColor="#49EACB" />
          <LiveWins textColor="#49EACB" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
