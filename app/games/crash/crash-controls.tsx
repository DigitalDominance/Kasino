"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";

interface CrashControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onPlaceBet: () => void;
  onCashout: () => void;
  resetGame: () => void;
  gameOver: boolean;
  crashPoint: number;
  winAmount: number;
  hideModal?: boolean;
  currentMultiplier: number;
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

export function CrashControls({
  betAmount,
  setBetAmount,
  isPlaying,
  isWalletConnected,
  balance,
  onPlaceBet,
  onCashout,
  resetGame,
  gameOver,
  crashPoint,
  winAmount,
  hideModal = false,
  currentMultiplier,
}: CrashControlsProps) {
  const { isConnected } = useWallet();
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

  const handlePlaceBet = () => {
    if (!isConnected) {
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
    onPlaceBet();
    setCooldown(10);
  };

  return (
    <>
      <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-4 relative">
        <div className="space-y-4">
          {/* Bet Amount Input */}
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
                disabled={!isWalletConnected || isPlaying}
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
                  setBetAmount(Math.max(1, current / 2).toString());
                }}
                disabled={!isWalletConnected || isPlaying}
              >
                ½
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => {
                  let current = Number(betAmount);
                  if (isNaN(current)) current = 1;
                  setBetAmount(Math.min(1000, current * 2).toString());
                }}
                disabled={!isWalletConnected || isPlaying}
              >
                2×
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() => setBetAmount("1")}
                disabled={!isWalletConnected || isPlaying}
              >
                Min
              </Button>
              <Button
                variant="outline"
                className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
                onClick={() =>
                  setBetAmount(Math.min(1000, balance).toString())
                }
                disabled={!isWalletConnected || isPlaying}
              >
                Max
              </Button>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {gameOver ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={resetGame}
              >
                Play Again
              </Button>
            ) : !isPlaying ? (
              <Button
                className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                onClick={handlePlaceBet}
                disabled={!isWalletConnected || cooldown > 0}
              >
                {!isWalletConnected
                  ? "Connect Wallet to Play"
                  : cooldown > 0
                  ? `Place Bet (${cooldown}s)`
                  : "Place Bet"}
              </Button>
            ) : (
              <Button
                className="w-full bg-green-500 text-white hover:bg-green-600"
                onClick={onCashout}
              >
                Cash Out
              </Button>
            )}
          </motion.div>

          {/* Game Over Modal */}
          {!hideModal && gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-50"
            >
              <div className="bg-white/10 border border-white/20 backdrop-blur-lg p-6 rounded-lg">
                <div className="flex items-center space-x-2">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                    alt="KAS"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-xl text-[#49EACB]">
                    {winAmount > 0
                      ? `Cashed out at ${currentMultiplier.toFixed(
                          2
                        )}x: You Won ${(Number(betAmount) * currentMultiplier).toFixed(2)} KAS!`
                      : `Crashed at ${crashPoint.toFixed(
                          2
                        )}x: You Lost ${Number(betAmount).toFixed(2)} KAS!`}
                  </span>
                </div>
                <Button
                  className="mt-4 w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
                  onClick={resetGame}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </Card>
      <ErrorAlert message={errorMessage || ""} onDismiss={() => setErrorMessage(null)} />
    </>
  );
}
