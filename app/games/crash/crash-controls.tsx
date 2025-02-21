"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";

interface CrashControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onPlaceBet: () => void;
  onCashout: (manualMultiplier?: number) => void;
  resetGame: () => void;
  gameOver: boolean;
  crashPoint: number;
  winAmount: number;
  hideModal?: boolean;
  currentMultiplier: number;
}

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

  const handlePlaceBet = () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    if (Number(betAmount) <= 0) {
      alert("Invalid bet amount");
      return;
    }
    onPlaceBet();
  };

  // If winAmount is greater than 0, that means the user cashed out successfully.
  // Otherwise, they lost by crashing.
  const winMessage =
    winAmount > 0
      ? `Cashed out at ${currentMultiplier.toFixed(2)}x: You Won ${winAmount.toFixed(2)} KAS!`
      : `Crashed at ${crashPoint.toFixed(2)}x: You Lost ${Number(betAmount).toFixed(2)} KAS!`;

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-4 relative">
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
              disabled={!isWalletConnected || isPlaying}
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXdd3dVlow.webp"
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
              onClick={() => setBetAmount((Number(betAmount) / 2).toString())}
              disabled={!isWalletConnected || isPlaying}
            >
              ½
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount((Number(betAmount) * 2).toString())}
              disabled={!isWalletConnected || isPlaying}
            >
              2×
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount("0.00")}
              disabled={!isWalletConnected || isPlaying}
            >
              Min
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount(balance.toString())}
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
              disabled={!isWalletConnected}
            >
              {!isWalletConnected ? "Connect Wallet to Play" : "Place Bet"}
            </Button>
          ) : (
            <Button
              className="w-full bg-green-500 text-white hover:bg-green-600"
              onClick={() => onCashout(currentMultiplier)}
            >
              Cash Out
            </Button>
          )}
        </motion.div>

        {/* Only render the modal here if hideModal is false */}
        {!hideModal && gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center z-50"
          >
            <div className="bg-white/10 border border-white/20 backdrop-blur-lg p-6 rounded-lg">
              <div className="flex items-center space-x-2">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXdd3dVlow.webp"
                  alt="KAS"
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-xl text-[#49EACB]">{winMessage}</span>
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
  );
}
