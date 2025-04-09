"use client";

import type React from "react";

import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { X, Eye, EyeOff } from "lucide-react";

export function AccountCreation({ onClose, walletAddress }: { onClose: () => void; walletAddress: string }) {
  const { createAccount } = useWallet();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState(""); // New referral code state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    if (!isValidEmail(email)) {
      setErrorMessage("Please enter a valid email address");
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Pass referralCode as the fourth parameter to createAccount
      const result = await createAccount(email, username, password, referralCode);
      if (result.success) {
        onClose();
      } else {
        setErrorMessage(result.error || "Failed to create account. Please try again.");
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
  };

  const displayAddress = `${walletAddress.slice(0, 10)}...${walletAddress.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 flex min-h-full items-center justify-center p-4 overflow-y-auto z-50 bg-black bg-opacity-70"
    >
      <div className="bg-[#49EACB]/10 border border-[#49EACB]/20 rounded-lg p-6 max-w-md w-full relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-[#49EACB] hover:bg-[#49EACB]/10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold text-[#49EACB] mb-4">Create Your Account</h2>
        <div className="text-sm text-[#49EACB]/80 mb-4 flex items-center justify-between">
          <span>Connected Wallet:</span>
          <span className="font-mono">{displayAddress}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white"
          />
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white"
          />
          {/* Referral Code Input Field */}
          <Input
            type="text"
            placeholder="Optional: Referral Code (100 XP Reward)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 text-[#49EACB] hover:bg-[#49EACB]/10"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 text-[#49EACB] hover:bg-[#49EACB]/10"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errorMessage && (
            <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">
              {errorMessage}
            </div>
          )}
          <Button type="submit" className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
