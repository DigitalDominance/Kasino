"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import axios from "axios";

const SignupPage: React.FC = () => {
  const { createAccount, showNotification } = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get referral from query if available
  const referralFromQuery = searchParams.get("ref") || "";
  
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(referralFromQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Call account creation function from context
    const result = await createAccount(email, username, password);
    if (result.success) {
      showNotification("Account created!", "success");
      // Redirect to homepage using our URL
      window.location.href = "/";
    } else {
      showNotification(result.error || "Account creation failed", "error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Navigation */}
      <header className="flex items-center justify-between p-4 border-b border-[#49EACB]/10 bg-black">
        <Link href="/" className="text-[#49EACB] font-bold hover:underline">
          Kasino
        </Link>
        <WalletConnection />
      </header>

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

export default SignupPage;
