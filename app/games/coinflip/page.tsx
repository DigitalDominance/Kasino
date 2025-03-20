"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { CoinFlipGame } from "./coinflip-game";
import { CoinFlipControls } from "./coinflip-controls";
import { LiveChat } from "../mines/live-chat";
import { LiveWins } from "../mines/live-wins";
import { WalletConnection } from "@/components/wallet-connection";
// Import XPDisplay the same way as in the nav for other games
import { XPDisplay } from "@/app/page";
import { useWallet } from "@/contexts/WalletContext";
import { Montserrat } from "next/font/google";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./styles.css";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

function CoinFlipContent() {
  const { isConnected, balance, walletAddress } = useWallet();
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState("0.00");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [selectedMultiplier, setSelectedMultiplier] = useState(2);
  const [selectedSymbol, setSelectedSymbol] = useState<"sun" | "moon">("sun");
  const [gameId, setGameId] = useState<string | null>(null);
  const [depositTxid, setDepositTxid] = useState<string | null>(null);

  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  const handleFlipCoin = async () => {
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
        gameName: "coinflip",
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
    } catch (error: any) {
      console.error("Error starting game:", error);
      alert("Error starting game: " + error.message);
    }
  };

  const handleGameEnd = async (result: string, winAmt: number) => {
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
    <div className={`${montserrat.className} min-h-screen bg-black text-white flex flex-col`}>
      <div className="flex-grow p-6">
        <header className="flex items-center justify-between mb-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="inline-flex items-center text-[#49EACB] hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Link>
          </motion.div>
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* XPDisplay is now integrated into the nav */}
            <XPDisplay />
            <WalletConnection />
          </motion.div>
        </header>

        {depositTxid && (
          <p className="mb-4 text-sm" style={{ color: "#B6B6B6" }}>
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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#49EACB]">Coin Flip Game</h2>
                <Button variant="ghost" size="sm" className="text-[#49EACB]" onClick={() => setShowHowToPlay(true)}>
                  <Info className="w-4 h-4 mr-2" />
                  How to Play
                </Button>
              </div>
              <div className="flex-grow relative aspect-[16/9] bg-[#49EACB]/5 rounded-lg mb-6 overflow-hidden p-4">
                <CoinFlipGame
                  isPlaying={isPlaying}
                  onGameEnd={handleGameEnd}
                  betAmount={Number(betAmount)}
                  selectedMultiplier={selectedMultiplier}
                  selectedSymbol={selectedSymbol}
                />
              </div>
            </div>
          </Card>
          <div className="space-y-6">
            <CoinFlipControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              isPlaying={isPlaying}
              isWalletConnected={isConnected}
              balance={balance}
              onFlipCoin={handleFlipCoin}
              resetGame={resetGame}
              gameResult={gameResult}
              winAmount={winAmount}
              selectedMultiplier={selectedMultiplier}
              setSelectedMultiplier={setSelectedMultiplier}
              selectedSymbol={selectedSymbol}
              setSelectedSymbol={setSelectedSymbol}
            />
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </div>
      <SiteFooter />

      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#49EACB] mb-4">How to Play Coin Flip</h3>
            <ol className="list-decimal list-inside space-y-2 text-white">
              <li>Enter your bet amount.</li>
              <li>Select a multiplier (2x, 5x, or 10x).</li>
              <li>Choose your symbol (Sun or Moon).</li>
              <li>Click "Flip Coin" to start the game.</li>
              <li>Both you and the house will flip a coin.</li>
              <li>Your coin is on the left, and the house's coin is on the right.</li>
              <li>If your coin shows your chosen symbol, you win!</li>
              <li>If you win, you'll receive your bet amount multiplied by the selected multiplier.</li>
              <li>
                The game odds are as follows:
                <ul className="list-disc list-inside ml-4">
                  <li>2x multiplier: 40% chance to win</li>
                  <li>5x multiplier: 10% chance to win</li>
                  <li>10x multiplier: 5% chance to win</li>
                </ul>
              </li>
            </ol>
            <p className="mt-4 text-white">Good luck and may the odds be in your favor!</p>
            <Button onClick={() => setShowHowToPlay(false)} className="w-full mt-6 bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoinFlipPage() {
  return <CoinFlipContent />;
}
