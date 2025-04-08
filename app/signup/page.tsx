"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";

const SignupPage: React.FC = () => {
  const { createAccount, showNotification, connectWallet, walletAddress } = useWallet();
  const router = useRouter();

  // Instead of useSearchParams, we use window.location.search to retrieve referral code.
  const [referralCode, setReferralCode] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || "";
      setReferralCode(ref);
    }
  }, []);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure wallet is connected before creating account
    if (!walletAddress) {
      const wallet = await connectWallet();
      if (!wallet) {
        showNotification("Please connect your wallet first", "error");
        return;
      }
    }

    // Call account creation function from context; walletAddress is already included in context.
    const result = await createAccount(email, username, password);
    if (result.success) {
      showNotification("Account created!", "success");
      // Redirect user to homepage.
      window.location.href = "/";
    } else {
      showNotification(result.error || "Account creation failed", "error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Header with custom logo, sidebar toggle, and connect wallet button */}
      <Header />

      {/* Signup Popup */}
      <div className="flex-grow flex items-center justify-center px-4">
        <AnimatePresence>
          <motion.div
            className="bg-gray-800 rounded-lg p-8 max-w-lg w-full shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl font-bold text-center mb-1">Create Your Account</h2>
            <p className="text-center text-sm text-gray-300 mb-4">Earn 5% On Each Bet</p>
            {referralCode && (
              <p className="text-center text-sm text-gray-300 mb-4">
                You're signing up with referral code:{" "}
                <span className="font-semibold text-[#49EACB]">{referralCode}</span>
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-white mb-1">Username</label>
                <input
                  type="text"
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-white mb-1">Password</label>
                <input
                  type="password"
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-white mb-1">Referral Code (Optional)</label>
                <input
                  type="text"
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code"
                />
              </div>
              <Button type="submit" className="w-full bg-[#49EACB] text-white hover:bg-[#49EACB]/80">
                Sign Up
              </Button>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
};

const Header: React.FC = () => {
  const { connectWallet, walletAddress } = useWallet();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleConnect = async () => {
    if (!walletAddress) {
      await connectWallet();
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-[#49EACB]/10 bg-black sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="text-[#49EACB] hover:bg-[#49EACB]/10 p-2 rounded"
        >
          {isSidebarOpen ? (
            <span>X</span>
          ) : (
            <span>≡</span>
          )}
        </motion.button>
        <Link href="/" className="flex items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
            alt="Kasino Logo"
            width={120}
            height={48}
            className="object-contain"
          />
        </Link>
      </div>
      <div>
        <Button onClick={handleConnect} className="bg-[#49EACB] text-white">
          {walletAddress ? walletAddress.slice(0, 6) + "..." : "Connect Wallet"}
        </Button>
      </div>
    </header>
  );
};

export default SignupPage;
