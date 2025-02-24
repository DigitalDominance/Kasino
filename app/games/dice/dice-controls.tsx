"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface DiceControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onRollDice: () => void;
  resetGame: () => void;
  gameResult: string | null;
  winAmount: number | null;
  selectedMultiplier: number;
  setSelectedMultiplier: (multiplier: number) => void;
}

const ErrorAlert = ({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) => {
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
            <button onClick={onDismiss} className="ml-4 font-bold text-white">
              X
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export function DiceControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onRollDice,
  resetGame,
  gameResult,
  winAmount,
  selectedMultiplier,
  setSelectedMultiplier,
}: DiceControlsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Auto-dismiss error alert after 3 seconds
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
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [cooldown]);

  const showError = (msg: string) => {
    setErrorMessage(msg);
  };

  const handleRollDice = () => {
    if (!isWalletConnected) {
      showError("Please connect your wallet first");
      return;
    }
    const bet = Number(betAmount);
    if (isNaN(bet)) {
      showError("Invalid bet amount");
      return;
    }
    if (bet < 1 || bet > 1000) {
      showError("Bet amount must be between 1 and 1000");
      return;
    }
    if (bet > balance) {
      showError("Insufficient balance");
      return;
    }
    onRollDice();
    setCooldown(10);
  };

  return (
    <>
      <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Bet Amount</label>
            <div className="relative">
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  let value = Number(e.target.value);
                  if (isNaN(value)) value = 1;
                  // Enforce minimum of 1 and maximum of 1000
                  value = Math.max(1, Math.min(1000, value));
                  setBetAmount(value.toString());
                }}
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
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => {
                  let current = Number(betAmount);
                  if (isNaN(current)) current = 1;
                  setBetAmount((current / 2).toString());
                }}
                disabled={isPlaying || !isWalletConnected}
              >
                ½
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => {
                  let current = Number(betAmount);
                  if (isNaN(current)) current = 1;
                  setBetAmount((current * 2).toString());
                }}
                disabled={isPlaying || !isWalletConnected}
              >
                2×
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount("1")}
                disabled={isPlaying || !isWalletConnected}
              >
                Min
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() =>
                  setBetAmount(Math.min(1000, balance).toString())
                }
                disabled={isPlaying || !isWalletConnected}
              >
                Max
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#49EACB]">Multiplier</label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 5, 10].map((multiplier) => (
                <Button
                  key={multiplier}
                  variant={
                    selectedMultiplier === multiplier ? "default" : "outline"
                  }
                  className={`border-[#49EACB]/10 ${
                    selectedMultiplier === multiplier
                      ? "bg-[#49EACB] text-black"
                      : "hover:bg-[#49EACB]/10"
                  }`}
                  onClick={() => setSelectedMultiplier(multiplier)}
                  disabled={isPlaying || !isWalletConnected}
                >
                  {multiplier}x
                </Button>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameResult !== null && (
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#49EACB]">
                  Result: {gameResult}
                </div>
                {winAmount !== null && winAmount > 0 ? (
                  <div className="text-xl text-green-500">
                    You won {winAmount.toFixed(8)} KAS!
                  </div>
                ) : (
                  <div className="text-xl text-red-500">You lost your bet.</div>
                )}
              </div>
            )}
            {!isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handleRollDice}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Roll Dice (${cooldown}s)`
                  : "Roll Dice"}
              </Button>
            ) : (
              <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled>
                Rolling...
              </Button>
            )}
          </motion.div>
        </div>
      </Card>
      <ErrorAlert
        message={errorMessage || ""}
        onDismiss={() => setErrorMessage(null)}
      />
    </>
  );
}
