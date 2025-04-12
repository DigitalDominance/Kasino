"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet, WalletStatus } from "@/contexts/WalletContext";
import { useModal } from "@/contexts/ModalContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { debounce } from "underscore";

export function WalletConnection() {
  const { isConnected, connectWallet, disconnectWallet, showNotification } = useWallet();
  const { showModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showEvmModal, setShowEvmModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close the main dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle the main dropdown
  const openWalletOptions = () => {
    setShowOptions((prev) => !prev);
  };

  const closeWalletOptions = () => {
    setShowOptions(false);
  };

  // Toggle the EVM wallet modal (sub-dropdown)
  const openEvmWalletModal = () => {
    setShowEvmModal(true);
  };

  const closeEvmWalletModal = () => {
    setShowEvmModal(false);
  };

  // Kasware connection logic (using your existing connectWallet logic)
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

  // Helper: Construct deep link URL based on wallet type and connection URI.
  // (This function is here for completeness if a fallback is ever needed on mobile)
  const getDeepLinkUrl = (walletType, uri) => {
    const encodedUri = encodeURIComponent(uri);
    switch (walletType) {
      case "metamask":
        return `metamask://wc?uri=${encodedUri}`;
      case "trust":
        return `trust://wc?uri=${encodedUri}`;
      case "uniswap":
        return `uniswap://wc?uri=${encodedUri}`;
      default:
        return "";
    }
  };

  // Custom EVM wallet connection via WalletKit using One‑click Auth
  const handleSelectEvmWallet = async (walletType) => {
    setIsLoading(true);
    closeEvmWalletModal();
    try {
      // Dynamically import Core and WalletKit if not already initialized
      if (!window.walletKit) {
        const { Core } = await import("@walletconnect/core");
        const { WalletKit } = await import("@reown/walletkit");
        const core = new Core({
          projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        });
        // Initialize WalletKit with your metadata and shared core instance
        window.walletKit = await WalletKit.init({
          core,
          metadata: {
            name: "KasCasino Wallet",
            description: "Wallet for KasCasino",
            url: "https://www.kascasino.xyz",
            icons: ["https://your_wallet_icon.png"],
            redirect: {
              native: "",  // set your native scheme if necessary
              universal: ""
            },
          },
          logger: "debug", // Prevent undefined logger errors
          wallets: ["metamask", "trust", "uniswap"],
        });

        // Subscribe to one-click authentication requests.
        window.walletKit.on("session_authenticate", async (payload) => {
          // Here you would normally process the authentication payload:
          // 1. Populate the auth payload.
          // 2. Format the SIWE message.
          // 3. Sign the message using the wallet extension.
          // 4. Approve the authentication request.
          // For demonstration, we immediately approve with a placeholder signature.
          console.log("Received authentication request:", payload);
          const { getSdkError } = await import("@walletconnect/utils");
          // Replace the auth object below with a real signed auth object.
          const authObject = { t: "eip191", s: "signature_placeholder" };
          await window.walletKit.approveSessionAuthenticate({
            id: payload.id,
            auths: [authObject],
          });
        });
      }
      const walletKit = window.walletKit;

      // On desktop with chrome extensions (e.g., MetaMask), use one‑click auth:
      if (window.ethereum) {
        // This triggers the wallet’s extension popup for one-click authorization.
        const session = await walletKit.connect({ wallet: walletType });
        if (session && session.accounts && session.accounts.length > 0) {
          const address = session.accounts[0]; // for extensions, session.accounts is typically an array of addresses
          await checkUserAccount(address);
        }
      } else {
        // Fallback (for mobile) if needed:
        const { uri } = await walletKit.core.pairing.create();
        if (!uri) {
          showNotification("Failed to initialize connection.", "error");
          setIsLoading(false);
          return;
        }
        const deepLinkUrl = getDeepLinkUrl(walletType, uri);
        window.location.href = deepLinkUrl;
      }
    } catch (error) {
      console.error("Error using WalletKit:", error);
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

      {/* Connect or Disconnect Button */}
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

      {/* Main Dropdown Menu */}
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
            <img src="/kaswarelogo.webp" alt="Kasware Wallet" className="w-8 h-8 mr-3" />
            <span>Kasware Wallet</span>
          </div>
          <div
            className="flex items-center cursor-pointer hover:bg-[#3A3A3A] p-2 rounded transition-all mt-2"
            onClick={openEvmWalletModal}
          >
            <img src="/walletconnectlogo.webp" alt="EVM Wallet (WalletConnect)" className="w-8 h-8 mr-3" />
            <span>EVM Wallet (WalletConnect)</span>
          </div>
        </div>
      )}

      {/* EVM Wallet Options Sub-Dropdown */}
      {showEvmModal && (
        <div className="absolute top-full right-0 mt-2 w-64 z-50 bg-[#2F2F2F] text-white rounded-md shadow-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Select EVM Wallet</h2>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => handleSelectEvmWallet("metamask")}
              className="flex items-center p-2 hover:bg-[#3A3A3A] rounded"
            >
              <img src="/metamask-logo.webp" alt="MetaMask" className="w-8 h-8 mr-3" />
              <span>MetaMask</span>
            </button>
            <button
              onClick={() => handleSelectEvmWallet("trust")}
              className="flex items-center p-2 hover:bg-[#3A3A3A] rounded"
            >
              <img src="/trustwallet-logo.webp" alt="Trust Wallet" className="w-8 h-8 mr-3" />
              <span>Trust Wallet</span>
            </button>
            <button
              onClick={() => handleSelectEvmWallet("uniswap")}
              className="flex items-center p-2 hover:bg-[#3A3A3A] rounded"
            >
              <img src="/uniswap-logo.webp" alt="Uniswap Wallet" className="w-8 h-8 mr-3" />
              <span>Uniswap Wallet</span>
            </button>
          </div>
          <button onClick={closeEvmWalletModal} className="mt-4 text-red-400 hover:underline">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
