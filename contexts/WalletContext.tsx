"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface WalletContextType {
  isConnected: boolean;
  username: string | null;
  balance: number;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  showNotification: (message: string, type: "success" | "error") => void;
  createAccount: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
      const response = await fetch(`/api/user?walletAddress=${address}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData) {
          setUsername(userData.username);
          setIsConnected(true);
        } else {
          showNotification("Please create an account to start playing!", "success");
        }
      } else {
        throw new Error("Failed to check user account");
      }
    } catch (error) {
      console.error("Error checking user account:", error);
    }
  };

  const createAccount = async (email: string, username: string, password: string) => {
    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, walletAddress }),
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
  const { isConnected, username, balance } = useWallet();
  if (!isConnected) return null;
  return (
    <div className="flex items-center space-x-2">
      <span className="text-[#49EACB] font-bold mr-2">{username}</span>
      <span className="text-[#49EACB]">{balance.toFixed(2)}</span>
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
        alt="KAS"
        width={16}
        height={16}
        className="rounded-full"
      />
    </div>
  );
};

export const Notification: React.FC<{ message: string; type: "success" | "error" }> = ({ message, type }) => {
  // Determine the notification type: if the type is "error" OR the message includes "error", then use error styling.
  const notifType =
    type === "error" || message.toLowerCase().includes("error")
      ? "error"
      : "success";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
        className={`fixed bottom-4 left-4 p-4 rounded-md shadow-md z-50
          ${notifType === "success"
            ? "bg-gradient-to-r from-[#49EACB] via-black to-[#49EACB] text-black bg-success-notif"
            : "bg-gradient-to-r from-[#F87171] via-black to-[#991B1B] text-white bg-error-notif"}`}
        style={{
          backgroundSize: "400% 400%",
        }}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
};
