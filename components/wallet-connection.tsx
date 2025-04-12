"use client";

import { useState, useCallback } from "react";
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

  // Open the wallet selection modal
  const openWalletOptions = () => {
    setShowOptions(true);
  };

  // Close the wallet selection modal
  const closeWalletOptions = () => {
    setShowOptions(false);
  };

  // Current Kasware connection logic (with network and account checks)
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

  // EVM connection logic using WalletConnect provider
  const handleEvmConnect = async () => {
    setIsLoading(true);
    closeWalletOptions();
    try {
      const provider = new WalletConnectProvider({
        infuraId: "YOUR_INFURA_PROJECT_ID" // Replace with your Infura project ID or RPC configuration
      });
      // This displays the QR Code modal or deep linking options for EVM wallets
      await provider.enable();
      const web3 = new Web3(provider);
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        const address = accounts[0];
        // You can add additional checks here if needed
        await checkUserAccount(address);
      }
    } catch (error) {
      showNotification("Failed to connect EVM wallet. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Existing user account check logic
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

  // Existing network check for Kasware
  const checkNetwork = async () => {
    const kasware = (window).kasware;
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

  // Wrapped disconnect logic
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
    <div className="flex items-center space-x-4">
      <WalletStatus />
      {!isConnected ? (
        // Instead of triggering connection directly, open the wallet selection modal
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold"
            onClick={openWalletOptions}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Connect Wallet"}
          </Button>
        </motion.div>
      ) : (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold"
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Disconnect"}
          </Button>
        </motion.div>
      )}

      {showOptions && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Choose Wallet Type</h2>
            <div className="flex flex-col space-y-4">
              <div
                className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded transition-all"
                onClick={handleKaswareConnect}
              >
                <img src="/placeholder1.svg" alt="Kasware Wallet" className="w-10 h-10 mr-4" />
                <span>Kasware Wallet</span>
              </div>
              <div
                className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded transition-all"
                onClick={handleEvmConnect}
              >
                <img src="/placeholder2.svg" alt="EVM Wallet (WalletConnect)" className="w-10 h-10 mr-4" />
                <span>EVM Wallet (WalletConnect)</span>
              </div>
            </div>
            <button onClick={closeWalletOptions} className="mt-4 text-red-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
