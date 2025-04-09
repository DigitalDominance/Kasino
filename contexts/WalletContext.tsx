"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import axios from "axios";

interface WalletContextType {
  isConnected: boolean;
  username: string | null;
  balance: number;
  walletAddress: string | null;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  showNotification: (message: string, type: "success" | "error") => void;
  createAccount: (
    email: string,
    username: string,
    password: string,
    referredBy?: string
  ) => Promise<{ success: boolean; error?: string }>;
  login: (password: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        const accounts = await kasware.getAccounts();
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await checkUserAccount(accounts[0]);
          await checkNetwork();
          await updateBalance();
          setupEventListeners();
        }
      } catch (error) {
        console.error("Failed to get accounts:", error);
      }
    }
  };

  const setupEventListeners = () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      kasware.on("accountsChanged", handleAccountsChanged);
      kasware.on("networkChanged", handleNetworkChanged);
      kasware.on("balanceChanged", handleBalanceChanged);
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length > 0) {
      if (accounts[0] !== walletAddress) {
        showNotification("Wallet address changed. Please reconnect for security reasons.", "error");
        await disconnectWallet();
        router.push("/");
      }
    } else {
      await disconnectWallet();
      router.push("/");
    }
  };

  const handleNetworkChanged = async (network: string) => {
    if (network !== "kaspa_mainnet") {
      showNotification("Please switch to the Kaspa mainnet to continue playing.", "error");
      await disconnectWallet();
      router.push("/");
    }
  };

  const handleBalanceChanged = async (balanceData: any) => {
    setBalance(Number(balanceData.balance.mature) / Math.pow(10, 8));
  };

  const checkNetwork = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        const network = await kasware.getNetwork();
        if (network !== "kaspa_mainnet") {
          showNotification("Please switch to the Kaspa mainnet to play.", "error");
          await disconnectWallet();
          return false;
        }
        return true;
      } catch (error) {
        console.error("Failed to check network:", error);
        showNotification("Failed to check network. Please try again.", "error");
        return false;
      }
    }
    return false;
  };

  const checkUserAccount = async (address: string) => {
    try {
      // Fetch referral data from your external backend API
      const response = await axios.get(
        `https://kasino-backend-4818b4b69870.herokuapp.com/api/user?walletAddress=${encodeURIComponent(address)}`
      );
      if (response.data && response.data.user) {
        setUsername(response.data.user.username);
        setIsConnected(true);
      } else {
        showNotification("Please create an account to start playing!", "success");
      }
    } catch (error) {
      console.error("Error checking user account:", error);
    }
  };

  const createAccount = async (email: string, username: string, password: string, referredBy?: string) => {
    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, walletAddress, referredBy: referredBy || null }),
      });
      const data = await response.json();
      if (response.ok) {
        setUsername(data.username);
        setIsConnected(true);
        showNotification("Account created successfully! Let's play!", "success");
        return { success: true };
      } else {
        showNotification(data.error, "error");
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error creating account:", error);
      showNotification("Failed to create account. Please try again.", "error");
      return { success: false, error: "Failed to create account. Please try again." };
    }
  };

  const login = async (password: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, password }),
      });
      if (response.ok) {
        const userData = await response.json();
        setUsername(userData.username);
        setIsConnected(true);
        showNotification("Welcome back! Ready to play?", "success");
        return true;
      } else {
        const errorData = await response.json();
        showNotification(errorData.message, "error");
        return false;
      }
    } catch (error) {
      console.error("Error logging in:", error);
      showNotification("Failed to log in. Please try again.", "error");
      return false;
    }
  };

  const updateBalance = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        const balanceData = await kasware.getBalance();
        setBalance(Number(balanceData.total) / Math.pow(10, 8));
      } catch (error) {
        console.error("Failed to get balance:", error);
      }
    }
  };

  const connectWallet = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        const accounts = await kasware.requestAccounts();
        if (accounts.length > 0) {
          const isCorrectNetwork = await checkNetwork();
          if (!isCorrectNetwork) {
            return null;
          }
          setWalletAddress(accounts[0]);
          setupEventListeners();
          await updateBalance();
          return accounts[0];
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        showNotification("Failed to connect wallet. Please try again.", "error");
      }
    } else {
      console.error("Kasware wallet not found");
      showNotification("Kasware wallet not found. Please install it and try again.", "error");
    }
    return null;
  };

  const disconnectWallet = async () => {
    const kasware = (window as any).kasware;
    if (kasware) {
      try {
        await kasware.disconnect(window.location.origin);
        kasware.removeListener("accountsChanged", handleAccountsChanged);
        kasware.removeListener("networkChanged", handleNetworkChanged);
        kasware.removeListener("balanceChanged", handleBalanceChanged);
        setIsConnected(false);
        setUsername(null);
        setBalance(0);
        setWalletAddress(null);
      } catch (error) {
        console.error("Failed to disconnect wallet:", error);
        showNotification("Failed to disconnect wallet. Please try again.", "error");
      }
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        username,
        balance,
        walletAddress,
        connectWallet,
        disconnectWallet,
        showNotification,
        createAccount,
        login,
      }}
    >
      {children}
      {notification && <Notification message={notification.message} type={notification.type} />}
    </WalletContext.Provider>
  );
};

export const WalletStatus: React.FC = () => {
  const { isConnected, username, balance, walletAddress, showNotification } = useWallet();
  const [referralPopupVisible, setReferralPopupVisible] = useState(false);
  const [referralData, setReferralData] = useState<{
    referralCount: number;
    referralBonus: number;
    referralCode: string;
    referredBy?: string | null;
  } | null>(null);
  const [hoverTooltipVisible, setHoverTooltipVisible] = useState(false);

  // Fetch full user data including referral fields from the proper backend API
  useEffect(() => {
    const fetchReferralData = async () => {
      if (walletAddress) {
        try {
          const res = await axios.get(
            `https://kasino-backend-4818b4b69870.herokuapp.com/api/user?walletAddress=${encodeURIComponent(walletAddress)}`
          );
          if (res.data && res.data.user) {
            setReferralData({
              referralCount: res.data.user.referralCount || 0,
              referralBonus: res.data.user.referralBonus || 0,
              referralCode: res.data.user.referralCode || "",
              referredBy: res.data.user.referredBy || null,
            });
          }
        } catch (error) {
          console.error("Error fetching referral data", error);
        }
      }
    };
    if (isConnected) {
      fetchReferralData();
    }
  }, [isConnected, walletAddress]);

  return isConnected ? (
    <>
      <div
        className="flex items-center space-x-2 cursor-pointer relative"
        onMouseEnter={() => setHoverTooltipVisible(true)}
        onMouseLeave={() => setHoverTooltipVisible(false)}
        onClick={() => setReferralPopupVisible(true)}
      >
        <span className="text-[#49EACB] font-bold mr-2">{username}</span>
        <span className="text-[#49EACB]">{balance.toFixed(2)}</span>
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
          alt="KAS"
          width={16}
          height={16}
          className="rounded-full"
        />
        {hoverTooltipVisible && !referralPopupVisible && (
          <motion.div
            className="absolute bottom-full mb-2 px-2 py-1 rounded bg-gray-900 text-xs text-white"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            Click Me!
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {referralPopupVisible && (
          <ReferralPopup
            referralData={referralData}
            onClose={() => setReferralPopupVisible(false)}
            showNotification={showNotification}
          />
        )}
      </AnimatePresence>
    </>
  ) : null;
};

export const Notification: React.FC<{ message: string; type: "success" | "error" }> = ({ message, type }) => {
  const notifType = type === "error" || message.toLowerCase().includes("error") ? "error" : "success";
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
        className={`fixed bottom-4 left-4 p-4 rounded-md shadow-md z-50
          ${notifType === "success"
            ? "bg-gradient-to-r from-[#49EACB] via-black to-[#49EACB] text-white"
            : "bg-gradient-to-r from-[#F87171] via-black to-[#991B1B] text-white"}`}
        style={{
          backgroundSize: "400% 400%",
        }}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
};

interface ReferralPopupProps {
  referralData: {
    referralCount: number;
    referralBonus: number;
    referralCode: string;
    referredBy?: string | null;
  } | null;
  onClose: () => void;
  showNotification: (message: string, type: "success" | "error") => void;
}

const ReferralPopup: React.FC<ReferralPopupProps> = ({ referralData, onClose, showNotification }) => {
  const { walletAddress } = useWallet();
  const [payoutStatus, setPayoutStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [inputReferralCode, setInputReferralCode] = useState("");
  const [claimStatus, setClaimStatus] = useState<"idle" | "processing" | "claimed">("idle");
  const [showWithdrawTooltip, setShowWithdrawTooltip] = useState(false);

  const copyReferralLink = () => {
    if (referralData) {
      const referralLink = `https://www.kascasino.xyz/signup?ref=${referralData.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      showNotification("Referral link copied!", "success");
    }
  };

  const copyReferralCode = () => {
    if (referralData) {
      navigator.clipboard.writeText(referralData.referralCode);
      showNotification("Referral code copied!", "success");
    }
  };

  const handleWithdraw = async () => {
    if (referralData && referralData.referralBonus >= 5 && walletAddress) {
      setPayoutStatus("processing");
      try {
        const res = await axios.post("https://kasino-backend-4818b4b69870.herokuapp.com/api/referral/payout", { walletAddress });
        if (res.data.success) {
          setPayoutStatus("completed");
          showNotification("Payout completed!", "success");
        } else {
          setPayoutStatus("failed");
          showNotification("Payout failed. Please try again.", "error");
        }
      } catch (error) {
        setPayoutStatus("failed");
        showNotification("Payout failed. Please try again.", "error");
      }
    }
  };

  const handleClaimReferral = async () => {
    if (!referralData || !walletAddress) return;
    // Prevent self-claim: user's own referral code should not be claimable.
    if (inputReferralCode.trim() === referralData.referralCode) {
      showNotification("You cannot claim your own referral code.", "error");
      return;
    }
    if (claimStatus === "idle" && inputReferralCode.trim() !== "") {
      setClaimStatus("processing");
      try {
        const res = await axios.post("https://kasino-backend-4818b4b69870.herokuapp.com/api/referral/claim", {
          walletAddress,
          referralCode: inputReferralCode.trim(),
        });
        if (res.data.success) {
          setClaimStatus("claimed");
          showNotification("Referral code claimed!", "success");
        } else {
          setClaimStatus("idle");
          showNotification(res.data.message || res.data.error, "error");
        }
      } catch (error) {
        setClaimStatus("idle");
        showNotification("Failed to claim referral code.", "error");
      }
    }
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-gray-800 rounded-lg p-6 w-11/12 max-w-lg relative"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-[#49EACB] font-bold"
        >
          X
        </button>
        {/* CHANGED TEXT BELOW */}
        <h2 className="text-2xl font-extrabold text-white text-center mb-1">Your Referrals</h2>
        <p className="text-center text-sm text-gray-400 mb-4">
          {/* from: 'Earn 5% On Each Bet' to: */}
          Earn 2% On Your Friends Bets
        </p>
        {referralData ? (
          <>
            <div className="mb-4">
              <p className="text-gray-300">
                Referred:{" "}
                <span className="text-[#49EACB] font-semibold">
                  {referralData.referralCount}
                </span>{" "}
                People
              </p>
              <p className="text-gray-300">
                Referral Bonus:{" "}
                <span className="text-[#49EACB] font-semibold">
                  {referralData.referralBonus.toFixed(2)}
                </span>{" "}
                KAS
              </p>
            </div>
            <div className="mb-4">
              <div
                className="relative inline-block"
                onMouseEnter={() => {
                  if (referralData.referralBonus < 5) setShowWithdrawTooltip(true);
                }}
                onMouseLeave={() => setShowWithdrawTooltip(false)}
              >
                <button
                  onClick={handleWithdraw}
                  disabled={referralData.referralBonus < 5 || payoutStatus === "processing"}
                  // ADDED EXTRA HORIZONTAL PADDING HERE (px-6):
                  className={`w-full py-2 px-6 rounded bg-[#49EACB] text-black font-semibold transition-transform duration-200 ${
                    referralData.referralBonus < 5
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-lg hover:scale-105"
                  }`}
                >
                  {payoutStatus === "processing"
                    ? "Processing..."
                    : payoutStatus === "completed"
                    ? "Payout Completed"
                    : payoutStatus === "failed"
                    ? "Payout Failed – Retry"
                    : "Withdraw Bonus"}
                </button>
                {showWithdrawTooltip && referralData.referralBonus < 5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    // ADDED WHITESPACE-NOWRAP TO KEEP TEXT IN ONE LINE:
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 border border-[#49EACB] rounded shadow text-white text-sm whitespace-nowrap"
                  >
                    Minimum 5 KAS Earned Required
                  </motion.div>
                )}
              </div>
            </div>
            <div className="mb-4">
              {referralData.referredBy ? (
                <p className="text-gray-300">You have already claimed a referral code.</p>
              ) : (
                <div>
                  <p className="text-gray-300 mb-1">
                    Enter a Referral Code (100 XP Reward):
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputReferralCode}
                      onChange={(e) => setInputReferralCode(e.target.value)}
                      className="flex-1 p-2 rounded bg-gray-700 text-white border border-[#49EACB]"
                      disabled={claimStatus === "claimed"}
                    />
                    <button
                      onClick={handleClaimReferral}
                      disabled={
                        claimStatus === "processing" ||
                        claimStatus === "claimed" ||
                        inputReferralCode.trim() === ""
                      }
                      className="px-3 py-2 rounded bg-[#49EACB] text-white font-semibold disabled:opacity-50 transition-transform duration-200 hover:scale-105"
                    >
                      {claimStatus === "processing" ? "Processing..." : "Claim"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-1 text-white">Your Referral Link</h3>
              <div
                onClick={copyReferralLink}
                className="p-3 border border-[#49EACB] rounded cursor-pointer transition-all duration-200 text-center text-white font-bold transform hover:scale-105 hover:shadow-lg"
              >
                {`https://www.kascasino.xyz/signup?ref=${referralData.referralCode}`}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1 text-white">Your Referral Code</h3>
              <div
                onClick={copyReferralCode}
                className="p-3 border border-[#49EACB] rounded cursor-pointer transition-all duration-200 text-center text-white font-bold transform hover:scale-105 hover:shadow-lg"
              >
                {referralData.referralCode}
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-300">Loading referral data...</p>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default WalletProvider;
