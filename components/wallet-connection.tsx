"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet, WalletStatus } from "@/contexts/WalletContext";
import { useModal } from "@/contexts/ModalContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { debounce } from "underscore";
import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3 from "web3";

export function WalletConnection() {
  const { isConnected, connectWallet, disconnectWallet, showNotification } = useWallet();
  const { showModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

  // Close the dropdown if user clicks outside it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle the dropdown open/closed
  const openWalletOptions = () => {
    setShowOptions((prev) => !prev);
  };

  const closeWalletOptions = () => {
    setShowOptions(false);
  };

  // Kasware connection logic (using your current connectWallet logic)
  const handleKaswareConnect = async () => {
    setIsLoading(true);
    closeWalletOptions();
    try {
      const address = await connectWallet();
      if (address) {
        const isCorrectNetwork = await checkNetwork();
        if (isCorrectNetwork) {
          await checkUserAccount(address);
        }
      }
    } catch (error) {
      showNotification("Failed to connect wallet. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // EVM connection logic via WalletConnect (configured for Kaspa with chain id 12211)
  const handleEvmConnect = async () => {
    setIsLoading(true);
    closeWalletOptions();
    try {
      const provider = new WalletConnectProvider({
        rpc: { 12211: "https://rpc.kasplextest.xyz" },
        chainId: 12211,
      });
      // Prompts a QR code or deep link for EVM wallets (e.g., MetaMask, Trust Wallet, etc.)
      await provider.enable();
      const web3 = new Web3(provider);
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        const address = accounts[0];
        await checkUserAccount(address);
      }
    } catch (error) {
      showNotification("Failed to connect EVM wallet. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Check user account on your backend
  const checkUserAccount = async (address) => {
    try {
      const response = await fetch(`/api/user?walletAddress=${address}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData) {
          showModal("login", address);
        } else {
          showModal("account-creation", address);
        }
      } else {
        throw new Error("Failed to check user account");
      }
    } catch (error) {
      console.error("Error checking user account:", error);
      showNotification("Error checking user account. Please try again.", "error");
    }
  };

  // Check Kasware network
  const checkNetwork = async () => {
    const kasware = window.kasware;
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

  // Disconnect logic with debounce
  const handleDisconnect = useCallback(
    debounce(async () => {
      setIsLoading(true);
      try {
        await disconnectWallet();
      } catch (error) {
        showNotification("Failed to disconnect wallet. Please try again.", "error");
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [disconnectWallet, showNotification]
  );

  return (
    <div className="flex items-center space-x-4 relative">
      <WalletStatus />

      {/* CONNECT or DISCONNECT button */}
      {!isConnected ? (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={openWalletOptions}
            disabled={isLoading}
            className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Connect Wallet"}
          </Button>
        </motion.div>
      ) : (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Disconnect"}
          </Button>
        </motion.div>
      )}

      {/* Dropdown Menu */}
      {showOptions && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-2 w-64 z-50 bg-[#2F2F2F] text-white rounded-md shadow-lg p-4"
        >
          <h2 className="text-lg font-semibold mb-3">Choose Wallet Type</h2>
          <div
            className="flex items-center cursor-pointer hover:bg-[#3A3A3A] p-2 rounded transition-all"
            onClick={handleKaswareConnect}
          >
            <img
              src="/kaswarelogo.webp"
              alt="Kasware Wallet"
              className="w-8 h-8 mr-3"
            />
            <span>Kasware Wallet</span>
          </div>
          <div
            className="flex items-center cursor-pointer hover:bg-[#3A3A3A] p-2 rounded transition-all mt-2"
            onClick={handleEvmConnect}
          >
            <img
              src="/walletconnectlogo.webp"
              alt="EVM Wallet (WalletConnect)"
              className="w-8 h-8 mr-3"
            />
            <span>EVM Wallet (WalletConnect)</span>
          </div>
        </div>
      )}
    </div>
  );
}
