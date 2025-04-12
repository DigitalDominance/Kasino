"use client"

import { useState, useCallback } from "react"
import { useWallet, WalletStatus } from "@/contexts/WalletContext"
import { useModal } from "@/contexts/ModalContext"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { debounce } from "underscore"

export function WalletConnection() {
  const { isConnected, connectWallet, disconnectWallet, showNotification } = useWallet()
  const { showModal } = useModal()
  const [isLoading, setIsLoading] = useState(false)

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
    <div className="flex items-center space-x-4">
      <WalletStatus />
      {!isConnected ? (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            className="bg-gradient-to-r from-[#49EACB] to-[#49EACB]/80 hover:opacity-90 text-black font-semibold"
            onClick={handleConnect}
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
    </div>
  )
}
