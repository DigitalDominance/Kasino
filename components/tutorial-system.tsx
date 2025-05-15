"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

export function TutorialSystem({
  sidebarButtonRef,
}: {
  sidebarButtonRef: React.RefObject<HTMLButtonElement>
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if user has seen the tooltip before
    const hasSeenTooltip = localStorage.getItem("hasSeenTooltip")

    if (!hasSeenTooltip) {
      // Show tooltip after a short delay
      const tooltipTimer = setTimeout(() => {
        setShowTooltip(true)
      }, 2000)

      return () => clearTimeout(tooltipTimer)
    }
  }, [])

  const closeTooltip = () => {
    setShowTooltip(false)
    // Remember that user has seen the tooltip
    localStorage.setItem("hasSeenTooltip", "true")
  }

  if (!mounted) return null

  return (
    <>
      {/* Simple Tooltip */}
      <AnimatePresence>
        {showTooltip && sidebarButtonRef.current && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed z-[90] bg-black/80 backdrop-blur-sm border border-[#49EACB] rounded-lg p-3 text-white text-sm shadow-lg"
            style={{
              top: sidebarButtonRef.current.getBoundingClientRect().bottom + 5,
              left: sidebarButtonRef.current.getBoundingClientRect().left,
              width: "200px",
            }}
          >
            <div className="absolute -top-2 left-4 w-4 h-4 bg-black/80 border-t border-l border-[#49EACB] transform rotate-45"></div>
            <p className="mb-2">Click here and visit our guide to learn how to play!</p>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="border-[#49EACB] text-[#49EACB] hover:bg-[#49EACB]/10 text-xs"
                onClick={closeTooltip}
              >
                Got it
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
