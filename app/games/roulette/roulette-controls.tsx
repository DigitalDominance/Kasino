"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
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

interface BetTypeButtonProps {
  bet: { name: string; type: string; description: string };
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function BetTypeButton({ bet, selected, onClick, disabled }: BetTypeButtonProps) {
  const [hover, setHover] = useState(false);
  return (
    <div className="relative">
      <Button
        variant={selected ? "default" : "outline"}
        className="w-full border-[#49EACB]/10 px-2 py-1 sm:px-4 sm:py-2 text-center"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onClick}
        disabled={disabled}
      >
        {bet.name}
      </Button>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs rounded border border-[#49EACB] bg-black bg-opacity-70 text-[#49EACB]"
            style={{ zIndex: 50 }}
          >
            {bet.description}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ErrorAlert = ({ message, onDismiss }: { message: string; onDismiss: () => void; }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed bottom-4 left-4 bg-gradient-to-r from-red-700 to-black text-white px-4 py-2 rounded shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span>{message}</span>
            <button onClick={onDismiss} className="ml-4 font-bold text-white">X</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Auto-dismiss error after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Countdown effect for cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const intervalId = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  const showError = (msg: string) => {
    setErrorMessage(msg);
  };

  const handleSpinRoulette = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    if (!selectedBet || selectedBet.amount < 1 || selectedBet.amount > 1000 || selectedBet.amount > balance) {
      showError("Bet amount must be between 1 and 1000");
      return;
    }
    onSpinRoulette();
    setCooldown(10);
  };

  const handleBetTypeSelect = (betType: string) => {
    const amount = Number(betAmount);
    if (isNaN(amount) || amount < 1 || amount > 1000) {
      showError("Bet amount must be between 1 and 1000");
      return;
    }
    setSelectedBet({ type: betType, amount });
  };

  const betTypes = [
    { name: "Red", type: "red", description: "2x" },
    { name: "Black", type: "black", description: "2x" },
    { name: "Odd", type: "odd", description: "2x" },
    { name: "Even", type: "even", description: "2x" },
    { name: "1-12", type: "1st12", description: "3x" },
    { name: "13-24", type: "2nd12", description: "3x" },
    { name: "25-36", type: "3rd12", description: "3x" },
    { name: "Green", type: "green", description: "10x" },
  ];

  return (
    <>
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
                <BetTypeButton
                  key={bet.type}
                  bet={bet}
                  selected={selectedBet?.type === bet.type}
                  onClick={() => handleBetTypeSelect(bet.type)}
                  disabled={isPlaying || !isWalletConnected}
                />
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult !== null && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">Result: {gameResult}</div>
                {winAmount !== null && winAmount > 0 ? (
                  <div className="text-xl text-green-500">You won {winAmount.toFixed(2)} KAS!</div>
                ) : (
                  <div className="text-xl text-red-500">You lost your bet.</div>
                )}
              </div>
            )}
            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleSpinRoulette}
                disabled={!isWalletConnected || !selectedBet || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Spin Roulette (${cooldown}s)`
                  : "Spin Roulette"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                Spinning...
              </Button>
            )}
          </motion.div>
        </div>
      </Card>
      <ErrorAlert message={errorMessage || ""} onDismiss={() => setErrorMessage(null)} />
    </>
  );
}
