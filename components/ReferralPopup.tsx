"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Image from "next/image";

interface ReferralData {
  referralCount: number;
  referralBonus: number;
  referralCode: string;
  referredBy?: string | null;
}

export function ReferralPopup({
  show,
  onClose,
  walletAddr,
  data,
  notify,
}: {
  show: boolean;
  onClose: () => void;
  walletAddr: string | null;
  data: ReferralData | null;
  notify: (msg: string, type: "success" | "error") => void;
}) {
  const [payoutStatus, setPayoutStatus] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [inputCode, setInputCode] = useState("");
  const [claimStatus, setClaimStatus] = useState<"idle" | "processing" | "claimed">("idle");
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (show) {
      setPayoutStatus("idle");
      setClaimStatus("idle");
      setInputCode("");
    }
  }, [show]);

  const copyLink = () => {
    if (!data) return;
    const link = `https://www.kascasino.xyz/signup?ref=${data.referralCode}`;
    navigator.clipboard.writeText(link);
    notify("Referral link copied!", "success");
  };

  const copyCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralCode);
    notify("Referral code copied!", "success");
  };

  const doWithdraw = async () => {
    if (!walletAddr || !data || data.referralBonus < 5) return;
    setPayoutStatus("processing");
    try {
      const res = await axios.post(
        "https://kasino-backend-4818b4b69870.herokuapp.com/api/referral/payout",
        { walletAddress: walletAddr }
      );
      if (res.data.success) {
        setPayoutStatus("completed");
        notify("Payout completed!", "success");
      } else {
        throw new Error(res.data.error || "Payout failed");
      }
    } catch (e) {
      console.error(e);
      setPayoutStatus("failed");
      notify("Payout failed. Please try again.", "error");
    }
  };

  const doClaim = async () => {
    if (!walletAddr || !data) return;
    if (inputCode.trim() === data.referralCode) {
      notify("You cannot claim your own code.", "error");
      return;
    }
    setClaimStatus("processing");
    try {
      const res = await axios.post(
        "https://kasino-backend-4818b4b69870.herokuapp.com/api/referral/claim",
        { walletAddress: walletAddr, referralCode: inputCode.trim() }
      );
      if (res.data.success) {
        setClaimStatus("claimed");
        notify("Referral code claimed!", "success");
      } else {
        throw new Error(res.data.error || res.data.message);
      }
    } catch (e) {
      console.error(e);
      setClaimStatus("idle");
      notify("Failed to claim code.", "error");
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-800 rounded-lg p-6 max-w-lg w-full relative"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            <button
              className="absolute top-4 right-4 text-[#49EACB] text-2xl"
              onClick={onClose}
            >
              ×
            </button>
            <h2 className="text-2xl text-white font-bold text-center mb-1">
              Your Referrals
            </h2>
            <p className="text-center text-gray-400 mb-4">Earn 2% on your friends’ bets</p>

            {data ? (
              <>
                <div className="mb-4 space-y-1">
                  <p className="text-gray-300">
                    Referred:{" "}
                    <span className="text-[#49EACB] font-semibold">
                      {data.referralCount}
                    </span>{" "}
                    people
                  </p>
                  <p className="text-gray-300">
                    Bonus:{" "}
                    <span className="text-[#49EACB] font-semibold">
                      {data.referralBonus.toFixed(2)}
                    </span>{" "}
                    KAS
                  </p>
                </div>

                <div className="mb-4 relative">
                  <button
                    onClick={doWithdraw}
                    disabled={data.referralBonus < 5 || payoutStatus === "processing"}
                    onMouseEnter={() => { if (data.referralBonus < 5) setShowTip(true) }}
                    onMouseLeave={() => setShowTip(false)}
                    className={`w-full py-2 rounded text-black font-semibold ${
                      data.referralBonus < 5
                        ? "bg-gray-600 cursor-not-allowed opacity-50"
                        : "bg-[#49EACB] hover:scale-105"
                    }`}
                  >
                    {payoutStatus === "processing"
                      ? "Processing..."
                      : payoutStatus === "completed"
                      ? "Payout Completed"
                      : payoutStatus === "failed"
                      ? "Retry Payout"
                      : "Withdraw Bonus"}
                  </button>
                  {showTip && data.referralBonus < 5 && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-sm bg-gray-800 text-white p-2 rounded">
                      Need at least 5 KAS
                    </div>
                  )}
                </div>

                {data.referredBy ? (
                  <p className="text-gray-300 mb-4">You have already claimed a code.</p>
                ) : (
                  <div className="mb-4 space-y-2">
                    <p className="text-gray-300">
                      Enter a Referral Code (100 XP reward):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="flex-1 p-2 rounded bg-gray-700 text-white border border-[#49EACB]"
                        disabled={claimStatus !== "idle"}
                      />
                      <button
                        onClick={doClaim}
                        disabled={inputCode.trim() === "" || claimStatus === "processing"}
                        className="px-4 rounded bg-[#49EACB] text-white disabled:opacity-50"
                      >
                        {claimStatus === "processing" ? "Processing..." : "Claim"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-white font-bold mb-1">Your Referral Link</h3>
                  <div
                    onClick={copyLink}
                    className="p-3 bg-gray-700 text-white text-center rounded cursor-pointer hover:shadow-lg"
                  >
                    https://www.kascasino.xyz/signup?ref={data.referralCode}
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-1">Your Referral Code</h3>
                  <div
                    onClick={copyCode}
                    className="p-3 bg-gray-700 text-white text-center rounded cursor-pointer hover:shadow-lg"
                  >
                    {data.referralCode}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-300 text-center">Loading…</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
