"use client"

import type React from "react"

import { useState } from "react"
import { useWallet } from "@/contexts/WalletContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { X, Eye, EyeOff } from "lucide-react"

export function Login({ onClose, walletAddress }: { onClose: () => void; walletAddress: string }) {
  const { login } = useWallet()
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")
    try {
      const success = await login(password)
      if (success) {
        onClose()
      } else {
        setErrorMessage("Incorrect password. Please try again.")
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const displayAddress = `${walletAddress.slice(0, 10)}...${walletAddress.slice(-4)}`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 flex min-h-full items-center justify-center p-4 overflow-y-auto bg-black bg-opacity-70 z-50"
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
        <h2 className="text-2xl font-bold text-[#49EACB] mb-4">Welcome Back!</h2>
        <div className="text-sm text-[#49EACB]/80 mb-4 flex items-center justify-between">
          <span>Connected Wallet:</span>
          <span className="font-mono">{displayAddress}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {errorMessage && (
            <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">
              {errorMessage}
            </div>
          )}
          <Button type="submit" className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </motion.div>
  )
}

