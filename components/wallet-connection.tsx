"use client"

import { useState, useCallback, useEffect } from "react"
import { useWallet, WalletStatus } from "@/contexts/WalletContext"
import { useModal } from "@/contexts/ModalContext"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { debounce } from "underscore"

export function WalletConnection({ className }: { className?: string }) {
  const { isConnected, connectWallet, disconnectWallet, showNotification } = useWallet()
  const { showModal } = useModal()
  const [isLoading, setIsLoading] = useState(false)

  // Lock scrolling while the announcement is displayed
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const handleConnect = useCallback(
    debounce(async () => {
      setIsLoading(true)
      try {
        const address = await connectWallet()
        if (address) {
          const isCorrectNetwork = await checkNetwork()
          if (isCorrectNetwork) {
            await checkUserAccount(address)
          }
        }
      } catch (error) {
        showNotification("Failed to connect wallet. Please try again.", "error")
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [],
  )

  const handleDisconnect = useCallback(
    debounce(async () => {
      setIsLoading(true)
      try {
        await disconnectWallet()
      } catch (error) {
        showNotification("Failed to disconnect wallet. Please try again.", "error")
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [],
  )

  const checkUserAccount = async (address: string) => {
    try {
      const response = await fetch(`/api/user?walletAddress=${address}`)
      if (response.ok) {
        const userData = await response.json()
        if (userData) {
          showModal("login", address)
        } else {
          showModal("account-creation", address)
        }
      } else {
        throw new Error("Failed to check user account")
      }
    } catch (error) {
      console.error("Error checking user account:", error)
      showNotification("Error checking user account. Please try again.", "error")
    }
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

  return (
    <>
      {/* Unbypassable full-screen announcement */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="mx-4 w-full max-w-lg rounded-2xl border border-[#49EACB]/40 bg-neutral-900 p-6 text-center shadow-2xl">
          <div className="mb-3 inline-block rounded-full border border-[#49EACB]/30 px-3 py-1 text-xs tracking-wide text-[#49EACB]">
            Announcement
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Beta testing is now over.</h2>
          <p className="mx-auto max-w-md text-sm text-neutral-200">
            Thank you to all our testers. We will soon be licensed and live.
          </p>
          {/* Intentionally no close or action buttons to prevent bypass */}
        </div>
      </div>

      {/* Underlying UI (blocked by the modal above) */}
      <div className={`flex items-center space-x-4 ${className || ""}`} aria-hidden>
        <WalletStatus />
        {!isConnected ? (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : "Connect Wallet"}
            </Button>
          </motion.div>
        ) : (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : "Disconnect"}
            </Button>
          </motion.div>
        )}
      </div>
    </>
  )
}
