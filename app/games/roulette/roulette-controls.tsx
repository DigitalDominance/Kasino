"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import Image from "next/image";

interface RouletteControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onSpinRoulette: () => void;
  gameResult: number | null;
  winAmount: number | null;
  selectedBet: { type: string; amount: number } | null;
  setSelectedBet: (bet: { type: string; amount: number } | null) => void;
}

export function RouletteControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onSpinRoulette,
  gameResult,
  winAmount,
  selectedBet,
  setSelectedBet,
}: RouletteControlsProps) {
  const handleSpinRoulette = () => {
    if (!isWalletConnected) {
      alert("Please connect your wallet first");
      return;
    }
    if (!selectedBet || selectedBet.amount <= 0 || selectedBet.amount > balance) {
      alert("Invalid bet amount or bet type");
      return;
    }
    onSpinRoulette();
  };

  const handleBetTypeSelect = (betType: string) => {
    const amount = Number(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid bet amount");
      return;
    }
    setSelectedBet({ type: betType, amount });
  };

  const betTypes = [
    { name: "Red", type: "red", description: "Win on red (2x)" },
    { name: "Black", type: "black", description: "Win on black (2x)" },
    { name: "Odd", type: "odd", description: "Win on odd (2x)" },
    { name: "Even", type: "even", description: "Win on even (2x)" },
    { name: "1st 12", type: "1st12", description: "Win on 1-12 (3x)" },
    { name: "2nd 12", type: "2nd12", description: "Win on 13-24 (3x)" },
    { name: "3rd 12", type: "3rd12", description: "Win on 25-36 (3x)" },
    { name: "Number", type: "17", description: "Bet on a specific number (35x)" },
  ];

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-6 rounded-lg">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-[#49EACB]">Bet Amount</label>
          <div className="relative">
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pl-8"
              placeholder="0.00"
              disabled={isPlaying || !isWalletConnected}
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                alt="KAS"
                width={16}
                height={16}
                className="rounded-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#49EACB]">Bet Types</label>
          <div className="grid grid-cols-2 gap-2">
            {betTypes.map((bet) => (
              <Button
                key={bet.type}
                variant={selectedBet?.type === bet.type ? "default" : "outline"}
                className={`border-[#49EACB]/10 ${
                  selectedBet?.type === bet.type ? "bg-[#49EACB] text-black" : "hover:bg-[#49EACB]/10"
                }`}
                onClick={() => handleBetTypeSelect(bet.type)}
                disabled={isPlaying || !isWalletConnected}
              >
                {bet.name}
              </Button>
            ))}
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {gameResult !== null ? (
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-[#49EACB]">Result: {gameResult}</div>
              {winAmount !== null && winAmount > 0 ? (
                <div className="text-xl text-green-500">You won {winAmount.toFixed(2)} KAS!</div>
              ) : (
                <div className="text-xl text-red-500">You lost your bet.</div>
              )}
            </div>
          ) : null}
          {!isPlaying ? (
            <Button
              className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
              onClick={handleSpinRoulette}
              disabled={!isWalletConnected || !selectedBet}
            >
              {!isWalletConnected ? "Connect Wallet to Play" : "Place Bet to Start"}
            </Button>
          ) : (
            <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
              Spinning...
            </Button>
          )}
        </motion.div>
      </div>
    </Card>
  );
}
