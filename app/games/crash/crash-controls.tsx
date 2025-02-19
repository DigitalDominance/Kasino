"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";

interface CrashControlsProps {
  betAmount: string;
  setBetAmount: (amount: string) => void;
  autoCashout: string;
  setAutoCashout: (amount: string) => void;
  isPlaying: boolean;
  isWalletConnected: boolean;
  balance: number;
  onPlaceBet: () => void;
  onCashout: () => void;
  resetGame: () => void;
  gameOver: boolean;
  crashPoint: number;
}

export function CrashControls({
  betAmount,
  setBetAmount,
  autoCashout,
  setAutoCashout,
  isPlaying,
  isWalletConnected,
  balance,
  onPlaceBet,
  onCashout,
  resetGame,
  gameOver,
  crashPoint,
}: CrashControlsProps) {
  const { isConnected } = useWallet();
  const [hasAutoCashout, setHasAutoCashout] = useState(false);

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

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm p-4">
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
              disabled={!isConnected || isPlaying}
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <Image
                src="/kaspa-icon.png"
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
              disabled={!isConnected || isPlaying}
            >
              ½
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount((Number(betAmount) * 2).toString())}
              disabled={!isConnected || isPlaying}
            >
              2×
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount("0.00")}
              disabled={!isConnected || isPlaying}
            >
              Min
            </Button>
            <Button
              variant="outline"
              className="border-[#49EACB]/10 hover:bg-[#49EACB]/10"
              onClick={() => setBetAmount(balance.toString())}
              disabled={!isConnected || isPlaying}
            >
              Max
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-[#49EACB]">Auto Cashout</label>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#49EACB] hover:text-[#49EACB]/80 hover:bg-[#49EACB]/10"
              onClick={() => setHasAutoCashout(!hasAutoCashout)}
              disabled={!isConnected || isPlaying}
            >
              {hasAutoCashout ? "Disable" : "Enable"}
            </Button>
          </div>
          <Input
            type="number"
            value={autoCashout}
            onChange={(e) => setAutoCashout(e.target.value)}
            className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white"
            placeholder="e.g., 2.00"
            disabled={!hasAutoCashout || isPlaying}
          />
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {gameOver ? (
            <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" onClick={resetGame}>
              Play Again
            </Button>
          ) : !isPlaying ? (
            <Button className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" onClick={handlePlaceBet} disabled={!isConnected}>
              {!isConnected ? "Connect Wallet to Play" : "Place Bet"}
            </Button>
          ) : (
            <Button className="w-full bg-green-500 text-white hover:bg-green-600" onClick={onCashout}>
              Cash Out
            </Button>
          )}
        </motion.div>

        {gameOver && (
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">Game Over</div>
            <div className="text-xl text-[#49EACB]">Crashed @ {crashPoint.toFixed(2)}×</div>
          </div>
        )}
      </div>
    </Card>
  );
}
