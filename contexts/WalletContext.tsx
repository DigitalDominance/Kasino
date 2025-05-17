"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import axios from "axios"
import { Edit2, Copy, Clock, AlertCircle, CheckCircle, X } from "lucide-react"

interface WalletContextType {
  isConnected: boolean
  username: string | null
  balance: number
  walletAddress: string | null
  connectWallet: () => Promise<string | null>
  disconnectWallet: () => Promise<void>
  showNotification: (message: string, type: "success" | "error") => void
  createAccount: (
    email: string,
    username: string,
    password: string,
    referredBy?: string,
  ) => Promise<{ success: boolean; error?: string }>
  login: (password: string) => Promise<boolean>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    const kasware = (window as any).kasware
    if (kasware) {
      try {
        const accounts = await kasware.getAccounts()
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          await checkUserAccount(accounts[0])
          await checkNetwork()
          await updateBalance()
          setupEventListeners()
        }
      } catch (error) {
        console.error("Failed to get accounts:", error)
      }
    }
  }

  const setupEventListeners = () => {
    const kasware = (window as any).kasware
    if (kasware) {
      kasware.on("accountsChanged", handleAccountsChanged)
      kasware.on("networkChanged", handleNetworkChanged)
      kasware.on("balanceChanged", handleBalanceChanged)
    }
  }

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length > 0) {
      if (accounts[0] !== walletAddress) {
        showNotification("Wallet address changed. Please reconnect for security reasons.", "error")
        await disconnectWallet()
        router.push("/")
      }
    } else {
      await disconnectWallet()
      router.push("/")
    }
  }

  const handleNetworkChanged = async (network: string) => {
    if (network !== "kaspa_mainnet") {
      showNotification("Please switch to the Kaspa mainnet to continue playing.", "error")
      await disconnectWallet()
      router.push("/")
    }
  }

  const handleBalanceChanged = async (balanceData: any) => {
    setBalance(Number(balanceData.balance.mature) / Math.pow(10, 8))
  }

  const checkNetwork = async () => {
    const kasware = (window as any).kasware
    if (kasware) {
      try {
        const network = await kasware.getNetwork()
        if (network !== "kaspa_mainnet") {
          showNotification("Please switch to the Kaspa mainnet to play.", "error")
          await disconnectWallet()
          return false
        }
        return true
      } catch (error) {
        console.error("Failed to check network:", error)
        showNotification("Failed to check network. Please try again.", "error")
        return false
      }
    }
    return false
  }

  const checkUserAccount = async (address: string) => {
    try {
      // Fetch referral data from your external backend API
      const response = await axios.get(
        `https://kasino-backend-4818b4b69870.herokuapp.com/api/user?walletAddress=${encodeURIComponent(address)}`,
      )
      if (response.data && response.data.user) {
        setUsername(response.data.user.username)
        setIsConnected(true)
      } else {
        showNotification("Please create an account to start playing!", "success")
      }
    } catch (error) {
      console.error("Error checking user account:", error)
    }
  }

  const createAccount = async (email: string, username: string, password: string, referredBy?: string) => {
    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, walletAddress, referredBy: referredBy || null }),
      })
      const data = await response.json()
      if (response.ok) {
        setUsername(data.username)
        setIsConnected(true)
        showNotification("Account created successfully! Let's play!", "success")
        return { success: true }
      } else {
        showNotification(data.error, "error")
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error("Error creating account:", error)
      showNotification("Failed to create account. Please try again.", "error")
      return { success: false, error: "Failed to create account. Please try again." }
    }
  }

  const login = async (password: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, password }),
      })
      if (response.ok) {
        const userData = await response.json()
        setUsername(userData.username)
        setIsConnected(true)
        showNotification("Welcome back! Ready to play?", "success")
        return true
      } else {
        const errorData = await response.json()
        showNotification(errorData.message, "error")
        return false
      }
    } catch (error) {
      console.error("Error logging in:", error)
      showNotification("Failed to log in. Please try again.", "error")
      return false
    }
  }

  const updateBalance = async () => {
    const kasware = (window as any).kasware
    if (kasware) {
      try {
        const balanceData = await kasware.getBalance()
        setBalance(Number(balanceData.total) / Math.pow(10, 8))
      } catch (error) {
        console.error("Failed to get balance:", error)
      }
    }
  }

  const connectWallet = async () => {
    const kasware = (window as any).kasware
    if (kasware) {
      try {
        const accounts = await kasware.requestAccounts()
        if (accounts.length > 0) {
          const isCorrectNetwork = await checkNetwork()
          if (!isCorrectNetwork) {
            return null
          }
          setWalletAddress(accounts[0])
          setupEventListeners()
          await updateBalance()
          return accounts[0]
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error)
        showNotification("Failed to connect wallet. Please try again.", "error")
      }
    } else {
      console.error("Kasware wallet not found")
      showNotification("Kasware wallet not found. Please install it and try again.", "error")
    }
    return null
  }

  const disconnectWallet = async () => {
    const kasware = (window as any).kasware
    if (kasware) {
      try {
        await kasware.disconnect(window.location.origin)
        kasware.removeListener("accountsChanged", handleAccountsChanged)
        kasware.removeListener("networkChanged", handleNetworkChanged)
        kasware.removeListener("balanceChanged", handleBalanceChanged)
        setIsConnected(false)
        setUsername(null)
        setBalance(0)
        setWalletAddress(null)
      } catch (error) {
        console.error("Failed to disconnect wallet:", error)
        showNotification("Failed to disconnect wallet. Please try again.", "error")
      }
    }
  }

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
    return emailRegex.test(email)
  }

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
  )
}

export const WalletStatus: React.FC = () => {
  const { isConnected, username, balance, walletAddress, showNotification } = useWallet()
  const [referralPopupVisible, setReferralPopupVisible] = useState(false)
  const [referralData, setReferralData] = useState<{
    referralCount: number
    referralBonus: number
    referralCode: string
    referredBy?: string | null
    lastReferralEdit?: Date | null
  } | null>(null)
  const [hoverTooltipVisible, setHoverTooltipVisible] = useState(false)

  // Fetch full user data including referral fields from the proper backend API
  useEffect(() => {
    const fetchReferralData = async () => {
      if (walletAddress) {
        try {
          const res = await axios.get(
            `https://kasino-backend-4818b4b69870.herokuapp.com/api/user?walletAddress=${encodeURIComponent(
              walletAddress,
            )}`,
          )
          if (res.data && res.data.user) {
            setReferralData({
              referralCount: res.data.user.referralCount || 0,
              referralBonus: res.data.user.referralBonus || 0,
              referralCode: res.data.user.referralCode || "",
              referredBy: res.data.user.referredBy || null,
              lastReferralEdit: res.data.user.lastReferralEdit ? new Date(res.data.user.lastReferralEdit) : null,
            })
          }
        } catch (error) {
          console.error("Error fetching referral data", error)
        }
      }
    }
    if (isConnected) {
      fetchReferralData()
    }
  }, [isConnected, walletAddress])

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
            walletAddress={walletAddress}
          />
        )}
      </AnimatePresence>
    </>
  ) : null
}

export const Notification: React.FC<{ message: string; type: "success" | "error" }> = ({ message, type }) => {
  const notifType = type === "error" || message.toLowerCase().includes("error") ? "error" : "success"
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
        className={`fixed bottom-4 left-4 p-4 rounded-md shadow-md z-50
          ${
            notifType === "success"
              ? "bg-gradient-to-r from-[#49EACB] via-black to-[#49EACB] text-white"
              : "bg-gradient-to-r from-[#F87171] via-black to-[#991B1B] text-white"
          }`}
        style={{
          backgroundSize: "400% 400%",
        }}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  )
}

interface ReferralPopupProps {
  referralData: {
    referralCount: number
    referralBonus: number
    referralCode: string
    referredBy?: string | null
    lastReferralEdit?: Date | null
  } | null
  onClose: () => void
  showNotification: (message: string, type: "success" | "error") => void
  walletAddress: string | null
}

const ReferralPopup: React.FC<ReferralPopupProps> = ({ referralData, onClose, showNotification, walletAddress }) => {
  const [payoutStatus, setPayoutStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle")
  const [inputReferralCode, setInputReferralCode] = useState("")
  const [claimStatus, setClaimStatus] = useState<"idle" | "processing" | "claimed">("idle")
  const [showWithdrawTooltip, setShowWithdrawTooltip] = useState(false)
  const [isEditingCode, setIsEditingCode] = useState(false)
  const [newReferralCode, setNewReferralCode] = useState("")
  const [editStatus, setEditStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [editErrorMessage, setEditErrorMessage] = useState("")
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showEditTooltip, setShowEditTooltip] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Local state to refresh bonus display
  const [currentReferralBonus, setCurrentReferralBonus] = useState<number>(referralData?.referralBonus ?? 0)

  useEffect(() => {
    setCurrentReferralBonus(referralData?.referralBonus ?? 0)

    // Calculate time remaining for edit cooldown
    if (referralData?.lastReferralEdit) {
      const lastEdit = new Date(referralData.lastReferralEdit).getTime()
      const now = Date.now()
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
      const remainingMs = THIRTY_DAYS_MS - (now - lastEdit)

      if (remainingMs > 0) {
        setTimeRemaining(remainingMs)

        // Start countdown timer
        intervalRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev === null || prev <= 1000) {
              if (intervalRef.current) clearInterval(intervalRef.current)
              return 0
            }
            return prev - 1000
          })
        }, 1000)
      } else {
        setTimeRemaining(0)
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [referralData])

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "Available now"

    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `${days}d ${hours}h remaining`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    } else {
      const seconds = Math.floor((ms % (1000 * 60)) / 1000)
      return `${minutes}m ${seconds}s remaining`
    }
  }

  const copyReferralLink = () => {
    if (referralData) {
      const referralLink = `https://www.kascasino.xyz/signup?ref=${referralData.referralCode}`
      navigator.clipboard.writeText(referralLink)
      showNotification("Referral link copied!", "success")
    }
  }

  const copyReferralCode = () => {
    if (referralData) {
      navigator.clipboard.writeText(referralData.referralCode)
      showNotification("Referral code copied!", "success")
    }
  }

  const handleWithdraw = async () => {
    if (referralData && currentReferralBonus >= 5 && walletAddress) {
      setPayoutStatus("processing")
      try {
        const res = await axios.post("https://kasino-backend-4818b4b69870.herokuapp.com/api/referral/payout", {
          walletAddress,
        })
        if (res.data.success) {
          setPayoutStatus("completed")
          // reset bonus display
          setCurrentReferralBonus(0)
          showNotification("Payout completed!", "success")
        } else {
          setPayoutStatus("failed")
          showNotification("Payout failed. Please try again.", "error")
        }
      } catch (error) {
        setPayoutStatus("failed")
        showNotification("Payout failed. Please try again.", "error")
      }
    }
  }

  const handleClaimReferral = async () => {
    if (!referralData || !walletAddress) return
    // Prevent self-claim
    if (inputReferralCode.trim() === referralData.referralCode) {
      showNotification("You cannot claim your own referral code.", "error")
      return
    }
    if (claimStatus === "idle" && inputReferralCode.trim() !== "") {
      setClaimStatus("processing")
      try {
        const res = await axios.post("https://kasino-backend-4818b4b69870.herokuapp.com/api/referral/claim", {
          walletAddress,
          referralCode: inputReferralCode.trim(),
        })
        if (res.data.success) {
          setClaimStatus("claimed")
          showNotification("Referral code claimed!", "success")
        } else {
          setClaimStatus("idle")
          showNotification(res.data.message || res.data.error, "error")
        }
      } catch (error) {
        setClaimStatus("idle")
        showNotification("Failed to claim referral code.", "error")
      }
    }
  }

  const handleEditReferralCode = () => {
    if (timeRemaining && timeRemaining > 0) return
    setIsEditingCode(true)
    setNewReferralCode(referralData?.referralCode || "")
  }

  const cancelEditReferralCode = () => {
    setIsEditingCode(false)
    setNewReferralCode("")
    setEditStatus("idle")
    setEditErrorMessage("")
  }

  const saveReferralCode = async () => {
    if (!walletAddress || !newReferralCode || editStatus === "processing") return

    setEditStatus("processing")
    setEditErrorMessage("")

    try {
      const res = await axios.post("https://kasino-backend-4818b4b69870.herokuapp.com/api/referral/edit", {
        walletAddress,
        newCode: newReferralCode,
      })

      if (res.data.success) {
        setEditStatus("success")
        showNotification("Referral code updated successfully!", "success")

        // Update the referral data with the new code
        if (referralData) {
          setReferralData({
            ...referralData,
            referralCode: res.data.referralCode,
            lastReferralEdit: new Date(),
          })
        }

        // Reset edit mode after a short delay
        setTimeout(() => {
          setIsEditingCode(false)
          setEditStatus("idle")
        }, 1500)

        // Set the cooldown timer
        setTimeRemaining(30 * 24 * 60 * 60 * 1000)
      } else {
        setEditStatus("error")
        setEditErrorMessage(res.data.message || "Failed to update referral code.")
      }
    } catch (error: any) {
      setEditStatus("error")
      if (error.response && error.response.data && error.response.data.message) {
        setEditErrorMessage(error.response.data.message)
      } else {
        setEditErrorMessage("Failed to update referral code. Please try again.")
      }
    }
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        className="bg-gradient-to-b from-gray-900 to-black rounded-xl p-8 w-11/12 max-w-lg relative border border-[#49EACB]/30 shadow-[0_0_15px_rgba(73,234,203,0.3)]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-[#49EACB] mb-2">Your Referrals</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-[#49EACB]/0 via-[#49EACB] to-[#49EACB]/0 mx-auto"></div>
          <p className="text-gray-300 mt-2 text-sm">Earn 2% on your friends' bets</p>
        </div>

        {referralData ? (
          <>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">People Referred</p>
                <p className="text-3xl font-bold text-[#49EACB]">{referralData.referralCount}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Bonus Earned</p>
                <p className="text-3xl font-bold text-[#49EACB]">
                  {currentReferralBonus.toFixed(2)} <span className="text-sm">KAS</span>
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div
                className="relative inline-block w-full"
                onMouseEnter={() => {
                  if (currentReferralBonus < 5) setShowWithdrawTooltip(true)
                }}
                onMouseLeave={() => setShowWithdrawTooltip(false)}
              >
                <button
                  onClick={handleWithdraw}
                  disabled={currentReferralBonus < 5 || payoutStatus === "processing"}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                    currentReferralBonus < 5
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#49EACB] to-[#3AAFB9] text-black hover:shadow-[0_0_15px_rgba(73,234,203,0.5)] hover:scale-[1.02]"
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
                {showWithdrawTooltip && currentReferralBonus < 5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 border border-[#49EACB] rounded shadow text-white text-sm whitespace-nowrap"
                  >
                    Minimum 5 KAS Earned Required
                  </motion.div>
                )}
              </div>
            </div>

            {/* Referral Code Section */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2 text-white flex items-center">
                Your Referral Code
                {!isEditingCode && (
                  <div className="relative ml-2">
                    <button
                      onClick={handleEditReferralCode}
                      disabled={timeRemaining !== null && timeRemaining > 0}
                      onMouseEnter={() => timeRemaining !== null && timeRemaining > 0 && setShowEditTooltip(true)}
                      onMouseLeave={() => setShowEditTooltip(false)}
                      className={`p-1 rounded-full ${
                        timeRemaining !== null && timeRemaining > 0
                          ? "text-gray-500 cursor-not-allowed"
                          : "text-[#49EACB] hover:bg-[#49EACB]/10"
                      }`}
                    >
                      <Edit2 size={16} />
                    </button>

                    {showEditTooltip && timeRemaining !== null && timeRemaining > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-full ml-2 top-0 p-2 bg-gray-800 border border-[#49EACB] rounded shadow text-white text-xs whitespace-nowrap z-10"
                      >
                        <div className="flex items-center">
                          <Clock size={12} className="mr-1 text-[#49EACB]" />
                          {formatTimeRemaining(timeRemaining)}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </h3>

              {isEditingCode ? (
                <div className="space-y-2">
                  <div className="flex">
                    <input
                      type="text"
                      value={newReferralCode}
                      onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="flex-1 p-3 rounded-l-lg bg-gray-800 text-white border border-r-0 border-[#49EACB]/50 focus:border-[#49EACB] focus:outline-none focus:ring-1 focus:ring-[#49EACB] placeholder-gray-500 font-mono"
                      placeholder="6 characters"
                      disabled={editStatus === "processing" || editStatus === "success"}
                    />
                    <div className="flex">
                      <button
                        onClick={saveReferralCode}
                        disabled={
                          !newReferralCode ||
                          newReferralCode.length !== 6 ||
                          editStatus === "processing" ||
                          editStatus === "success"
                        }
                        className={`px-4 ${
                          !newReferralCode ||
                          newReferralCode.length !== 6 ||
                          editStatus === "processing" ||
                          editStatus === "success"
                            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                            : "bg-[#49EACB] text-black hover:bg-[#3AAFB9]"
                        } transition-colors`}
                      >
                        {editStatus === "processing" ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Saving
                          </span>
                        ) : editStatus === "success" ? (
                          <CheckCircle size={18} />
                        ) : (
                          "Save"
                        )}
                      </button>
                      <button
                        onClick={cancelEditReferralCode}
                        className="px-4 bg-gray-700 text-white hover:bg-gray-600 rounded-r-lg transition-colors"
                        disabled={editStatus === "processing" || editStatus === "success"}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {editErrorMessage && (
                    <div className="text-red-400 text-sm flex items-center mt-1">
                      <AlertCircle size={14} className="mr-1" />
                      {editErrorMessage}
                    </div>
                  )}

                  <div className="text-gray-400 text-xs">
                    <p>• Must be exactly 6 letters or numbers</p>
                    <p>• Can only be changed once every 30 days</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div
                    onClick={copyReferralCode}
                    className="flex-1 p-3 bg-gray-800/80 border border-[#49EACB]/30 rounded-l-lg cursor-pointer transition-all duration-200 text-center text-white font-mono hover:bg-gray-800 hover:border-[#49EACB]/50"
                  >
                    {referralData.referralCode}
                  </div>
                  <button
                    onClick={copyReferralCode}
                    className="p-3 bg-[#49EACB]/10 border border-l-0 border-[#49EACB]/30 rounded-r-lg text-[#49EACB] hover:bg-[#49EACB]/20 transition-colors"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Referral Link Section */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2 text-white">Your Referral Link</h3>
              <div className="flex items-center">
                <div
                  onClick={copyReferralLink}
                  className="flex-1 p-3 bg-gray-800/80 border border-[#49EACB]/30 rounded-l-lg cursor-pointer transition-all duration-200 text-center text-white text-sm truncate hover:bg-gray-800 hover:border-[#49EACB]/50"
                >
                  {`https://www.kascasino.xyz/signup?ref=${referralData.referralCode}`}
                </div>
                <button
                  onClick={copyReferralLink}
                  className="p-3 bg-[#49EACB]/10 border border-l-0 border-[#49EACB]/30 rounded-r-lg text-[#49EACB] hover:bg-[#49EACB]/20 transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            {/* Claim Referral Section */}
            {!referralData.referredBy ? (
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-2 text-white">Claim a Referral Code</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputReferralCode}
                    onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="flex-1 p-3 rounded-l-lg bg-gray-800 text-white border border-[#49EACB]/50 focus:border-[#49EACB] focus:outline-none focus:ring-1 focus:ring-[#49EACB] placeholder-gray-500"
                    placeholder="Enter referral code"
                    disabled={claimStatus === "claimed"}
                  />
                  <button
                    onClick={handleClaimReferral}
                    disabled={
                      claimStatus === "processing" || claimStatus === "claimed" || inputReferralCode.trim() === ""
                    }
                    className={`px-6 rounded-r-lg font-semibold ${
                      claimStatus === "processing" || claimStatus === "claimed" || inputReferralCode.trim() === ""
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-[#49EACB] text-black hover:bg-[#3AAFB9]"
                    } transition-colors`}
                  >
                    {claimStatus === "processing" ? "Processing..." : claimStatus === "claimed" ? "Claimed" : "Claim"}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-2">Earn 100 XP by claiming a friend's referral code</p>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-gray-300 text-sm">
                  You were referred by: <span className="text-[#49EACB] font-mono">{referralData.referredBy}</span>
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#49EACB]"></div>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  )
}

export default WalletProvider
