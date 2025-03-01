"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

export default function KasenManiaPage() {
  const { isConnected } = useWallet();
  const [userWallet, setUserWallet] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [isDeposited, setIsDeposited] = useState(false);

  // API URL and treasury addresses
  const apiUrl = "https://kasino-backend-4818b4b69870.herokuapp.com/api";
  const treasuryAddressT1 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T1;
  const treasuryAddressT2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_T2;

  // Initialize global credits for Kasen Mania if not already defined.
  useEffect(() => {
    if (typeof window !== "undefined" && window.kasenManiaCredits == null) {
      window.kasenManiaCredits = 0;
    }
  }, []);

  // When the wallet connects, set the wallet address.
  useEffect(() => {
    async function getWallet() {
      if (isConnected && window.kasware) {
        const accounts = await window.kasware.getAccounts();
        setUserWallet(accounts[0] || null);
      }
    }
    getWallet();
  }, [isConnected]);

  // When the page loads (or when the wallet changes), fetch the persistent credits from your backend.
  useEffect(() => {
    async function fetchCredits() {
      if (isConnected && userWallet) {
        try {
          const res = await axios.get(`${apiUrl}/credits`, {
            params: { wallet: userWallet },
          });
          // Assume your API returns { credits: <number> }
          window.kasenManiaCredits = res.data.credits || 0;
        } catch (err) {
          console.error("Error fetching credits:", err);
          window.kasenManiaCredits = 0;
        }
      }
    }
    fetchCredits();
  }, [isConnected, userWallet]);

  // Deposit function using your Kasware logic.
  // On success, update the backend and global credits.
  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid deposit amount");
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
        amount * 1e8,
        { priorityFee: 10000 }
      );
      const parsedTx =
        typeof depositTx === "string" ? JSON.parse(depositTx) : depositTx;
      const txidString = parsedTx.id;
      setDepositTxid(txidString);

      // Record deposit on your backend (which updates MongoDB).
      await axios.post(`${apiUrl}/deposit`, {
        gameName: "kasenmania",
        uniqueHash,
        walletAddress: currentWalletAddress,
        depositAmount: amount,
        txid: txidString,
      });

      // Update global credits for Kasen Mania.
      window.kasenManiaCredits = amount;
      setIsDeposited(true);
    } catch (error: any) {
      console.error("Error during deposit:", error);
      alert("Error during deposit: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <motion.div whileHover={{ scale: 1.05 }}>
          <Link
            href="/"
            className="inline-flex items-center text-[#49EACB] hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Link>
        </motion.div>
        <WalletConnection />
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

      {/* Main Content */}
      <main className="flex-grow p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Left Column: Game Area */}
          <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm flex flex-col overflow-hidden">
            <div className="p-6 flex flex-col h-full">
              <h2 className="text-2xl font-bold text-[#49EACB] mb-4">
                Kasen Mania
              </h2>

              {/* Show deposit UI if credits are zero */}
              {window.kasenManiaCredits === 0 && (
                <div className="mb-4">
                  <p className="mb-2">
                    You have 0 credits. Please deposit funds to start playing.
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="bg-[#49EACB]/5 border border-[#49EACB]/10 text-white p-2 rounded"
                      placeholder="Deposit Amount"
                    />
                    <button
                      onClick={handleDeposit}
                      className="bg-[#49EACB] text-black px-4 py-2 rounded hover:bg-[#49EACB]/80"
                    >
                      Deposit
                    </button>
                  </div>
                </div>
              )}

              {/* Game Area: Load your HTML5 game via an iframe */}
              <div className="relative aspect-[16/9] bg-[#49EACB]/5 rounded-lg overflow-hidden">
                <iframe
                  src="/kasen-mania/index.html"
                  title="Kasen Mania Game"
                  className="w-full h-full"
                  frameBorder="0"
                />
              </div>
            </div>
          </Card>

          {/* Right Column: Live Chat & Live Wins */}
          <div className="space-y-6">
            <LiveChat textColor="#49EACB" />
            <LiveWins textColor="#49EACB" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
