"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { createPortal } from "react-dom"
import axios from "axios"
import { useWallet } from "@/contexts/WalletContext"

/* XPDisplay Component with Daily Loot Boxes Popup */
export function XPDisplay({ className }: { className?: string }) {
  const { isConnected } = useWallet()
  const [userData, setUserData] = useState({ totalXp: 0, level: 0, gems: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [xpGain, setXpGain] = useState<number | null>(null)
  const [gemGain, setGemGain] = useState<number | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [showLevelUpPopup, setShowLevelUpPopup] = useState(false)
  const [showGemPopup, setShowGemPopup] = useState(false)
  const [showDailyLootPopup, setShowDailyLootPopup] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const [isLoadingCooldowns, setIsLoadingCooldowns] = useState(true)

  // Daily Loot Boxes data
  const dailyLootBoxes = [
    { name: "Level 1 Daily Loot Box", slug: "Level1DailyLootBox", image: "/Level1Card.webp", requiredLevel: 1 },
    { name: "Level 10 Daily Loot Box", slug: "Level10DailyLootBox", image: "/Level10Card.webp", requiredLevel: 10 },
    { name: "Level 20 Daily Loot Box", slug: "Level20DailyLootBox", image: "/Level20Card.webp", requiredLevel: 20 },
    { name: "Level 30 Daily Loot Box", slug: "Level30DailyLootBox", image: "/Level30Card.webp", requiredLevel: 30 },
    { name: "Level 40 Daily Loot Box", slug: "Level40DailyLootBox", image: "/Level40Card.webp", requiredLevel: 40 },
    { name: "Level 50 Daily Loot Box", slug: "Level50DailyLootBox", image: "/Level50Card.webp", requiredLevel: 50 },
    { name: "Level 60 Daily Loot Box", slug: "Level60DailyLootBox", image: "/Level60Card.webp", requiredLevel: 60 },
    { name: "Level 70 Daily Loot Box", slug: "Level70DailyLootBox", image: "/Level70Card.webp", requiredLevel: 70 },
    { name: "Level 80 Daily Loot Box", slug: "Level80DailyLootBox", image: "/Level80Card.webp", requiredLevel: 80 },
    { name: "Level 90 Daily Loot Box", slug: "Level90DailyLootBox", image: "/Level90Card.webp", requiredLevel: 90 },
    { name: "Level 100 Daily Loot Box", slug: "Level100DailyLootBox", image: "/Level100Card.webp", requiredLevel: 100 },
  ]

  // Set mounted after component mounts (client only)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load cooldowns from sessionStorage on mount
  useEffect(() => {
    const loadCooldowns = () => {
      const storedCooldowns: Record<string, number> = {}
      dailyLootBoxes.forEach((box) => {
        const storedTimestamp = sessionStorage.getItem(`dailyLootBoxTimestamp_${box.slug}`)
        if (storedTimestamp) {
          const elapsed = Date.now() - Number.parseInt(storedTimestamp)
          const cooldownPeriod = 24 * 60 * 60 * 1000 // 24 hours in ms
          if (elapsed < cooldownPeriod) {
            const remainingSeconds = Math.ceil((cooldownPeriod - elapsed) / 1000)
            storedCooldowns[box.slug] = remainingSeconds
          }
        }
      })
      setCooldowns(storedCooldowns)
      setIsLoadingCooldowns(false)
    }

    loadCooldowns()
  }, [])

  // Update cooldowns every second
  useEffect(() => {
    if (Object.keys(cooldowns).length === 0) return

    const interval = setInterval(() => {
      setCooldowns((prev) => {
        const updated = { ...prev }
        let changed = false

        for (const key in updated) {
          if (updated[key] > 0) {
            updated[key] -= 1
            changed = true
          }
        }

        return changed ? updated : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [cooldowns])

  // Persist last xp/level/gem via sessionStorage.
  const lastXpRef = useRef<number | null>(null)
  const lastLevelRef = useRef<number | null>(null)
  const lastGemRef = useRef<number | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://kasino-backend-4818b4b69870.herokuapp.com"

  useEffect(() => {
    const storedXp = sessionStorage.getItem("lastXp")
    const storedLevel = sessionStorage.getItem("lastLevel")
    const storedGem = sessionStorage.getItem("lastGem")
    if (storedXp !== null && storedLevel !== null && storedGem !== null) {
      lastXpRef.current = Number(storedXp)
      lastLevelRef.current = Number(storedLevel)
      lastGemRef.current = Number(storedGem)
    } else {
      lastXpRef.current = userData.totalXp
      lastLevelRef.current = userData.level
      lastGemRef.current = userData.gems
      sessionStorage.setItem("lastXp", userData.totalXp.toString())
      sessionStorage.setItem("lastLevel", userData.level.toString())
      sessionStorage.setItem("lastGem", userData.gems.toString())
    }
  }, [])

  useEffect(() => {
    const fetchXP = async () => {
      try {
        if (isConnected && (window as any).kasware && (window as any).kasware.getAccounts) {
          const accounts: string[] = await (window as any).kasware.getAccounts()
          if (!accounts || accounts.length === 0) return
          const walletAddress = accounts[0]
          const requestUrl = `${apiUrl}/api/user?walletAddress=${encodeURIComponent(walletAddress)}`
          const res = await axios.get(requestUrl)
          if (res.data.success && res.data.user) {
            setUserData({
              totalXp: res.data.user.totalXp || 0,
              level: res.data.user.level || 0,
              gems: res.data.user.gems || 0,
            })
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      }
    }

    fetchXP()
    const interval = setInterval(fetchXP, 5000)
    return () => clearInterval(interval)
  }, [isConnected, apiUrl])

  useEffect(() => {
    if (lastXpRef.current !== null && userData.totalXp > lastXpRef.current) {
      const gain = userData.totalXp - lastXpRef.current
      setXpGain(gain)
      lastXpRef.current = userData.totalXp
      sessionStorage.setItem("lastXp", userData.totalXp.toString())
      setTimeout(() => setXpGain(null), 2000)
    }
    if (lastLevelRef.current !== null && userData.level > lastLevelRef.current) {
      setIsFlipping(true)
      setShowLevelUpPopup(true)
      lastLevelRef.current = userData.level
      sessionStorage.setItem("lastLevel", userData.level.toString())
      setTimeout(() => {
        setIsFlipping(false)
        setShowLevelUpPopup(false)
      }, 1000)
    }
    if (lastGemRef.current !== null && userData.gems > lastGemRef.current) {
      const gain = userData.gems - lastGemRef.current
      setGemGain(gain)
      lastGemRef.current = userData.gems
      sessionStorage.setItem("lastGem", userData.gems.toString())
      setTimeout(() => setGemGain(null), 2000)
    }
  }, [userData])

  const displayLevel = userData.level
  const getThreshold = (level: number) => {
    const r = 1.08
    const a = (10000000 * (r - 1)) / (Math.pow(r, 100) - 1)
    let threshold = 0
    for (let i = 1; i <= level; i++) {
      threshold += a * Math.pow(r, i - 1)
    }
    return threshold
  }

  const currentThreshold = getThreshold(displayLevel)
  const nextThreshold = displayLevel < 100 ? getThreshold(displayLevel + 1) : currentThreshold
  const xpProgress = userData.totalXp - currentThreshold
  const xpNeeded = nextThreshold - currentThreshold
  const progressPercent = xpNeeded > 0 ? (xpProgress / xpNeeded) * 100 : 100

  let borderColorClass = ""
  if (displayLevel < 25) {
    borderColorClass = "border-[#49EACB] text-[#49EACB]"
  } else if (displayLevel < 50) {
    borderColorClass = "border-yellow-400 text-yellow-400"
  } else if (displayLevel < 75) {
    borderColorClass = "border-orange-500 text-orange-500"
  } else {
    borderColorClass = "border-red-500 text-red-500"
  }

  const levelStr = displayLevel.toString()
  const fontSize = levelStr.length > 2 ? "0.75rem" : levelStr.length > 1 ? "0.9rem" : "1.125rem"

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  return (
    <div
      className={`relative inline-flex items-center h-8 sm:h-12 sm:mr-2 ${className || ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* XP Circle - Clickable to show daily loot boxes */}
      <motion.div
        className={`relative rounded-full border-2 cursor-pointer ${borderColorClass} shadow-[0_0_10px_rgba(73,234,203,0.5)]`}
        style={{
          width: "36px",
          height: "36px",
          overflow: "hidden",
          "@media (min-width: 640px)": {
            width: "48px",
            height: "48px",
          },
        }}
        animate={isFlipping ? { rotateY: 360 } : { rotateY: 0 }}
        whileHover={{ scale: 1.1, boxShadow: "0 0 15px rgba(73,234,203,0.8)" }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        onClick={() => setShowDailyLootPopup(true)}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/xpimage.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          }}
        />
        <span
          style={{ fontSize: levelStr.length > 2 ? "0.65rem" : levelStr.length > 1 ? "0.8rem" : "1rem" }}
          className="relative flex items-center justify-center h-full w-full whitespace-nowrap z-10 sm:text-base"
        >
          {displayLevel}
        </span>
      </motion.div>

      {/* Gem Display */}
      <div
        onClick={() => setShowGemPopup(true)}
        className="flex items-center bg-gray-900 bg-opacity-60 backdrop-blur-md text-white px-2 sm:px-3 rounded ml-1 sm:ml-2 border border-[#49EACB] cursor-pointer h-8 sm:h-12 hover:bg-gray-800 hover:shadow-[0_0_10px_rgba(73,234,203,0.5)] transition-all duration-300"
      >
        <span className="mr-1 text-white text-sm sm:text-base font-bold">{userData.gems}</span>
        <Image src="/gem.webp" alt="Gem" width={20} height={20} className="sm:w-[28px] sm:h-[28px]" />
      </div>

      {/* Gem Gain Popup */}
      <AnimatePresence>
        {gemGain !== null && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: -30 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="absolute left-[-60px] top-full mt-1 bg-black/80 backdrop-blur-md border border-[#49EACB] rounded shadow-lg z-50 p-1 text-white w-auto text-xs px-2"
          >
            +{gemGain} {gemGain === 1 ? "GEM" : "GEMS"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Hover Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 right-full mr-2 hidden sm:block bg-black/90 backdrop-blur-md border border-[#49EACB] rounded-lg shadow-lg z-50 p-4 text-white w-64 text-sm"
          >
            {displayLevel < 100 ? (
              <>
                <div className="text-[#49EACB] mb-2 font-bold text-lg">Level {displayLevel}</div>
                <div className="text-[#49EACB] mb-1">
                  XP: {userData.totalXp.toLocaleString()} / {nextThreshold.toFixed(0)}
                </div>
                <div className="flex justify-between mb-1 text-xs">
                  <span>{xpProgress.toFixed(0)} XP</span>
                  <span>{xpNeeded.toFixed(0)} XP</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-1 overflow-hidden">
                  <div
                    style={{ width: `${progressPercent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-[#003f2f] via-[#49EACB] to-[#006d5b]"
                  ></div>
                </div>
                <div className="mt-1 text-center text-[#49EACB] font-bold">
                  {progressPercent.toFixed(1)}% to next level
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="text-[#49EACB] font-bold text-lg mb-2">Level {displayLevel}</div>
                <div className="text-white">Max Level Reached!</div>
                <div className="mt-2 text-[#49EACB]">Total XP: {userData.totalXp.toLocaleString()}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP Gain Popup */}
      <AnimatePresence>
        {xpGain !== null && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: -30 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="absolute left-[-60px] top-1/2 transform -translate-y-1/2 bg-black/80 backdrop-blur-md border border-[#49EACB] rounded shadow-lg z-50 p-1 text-white w-auto text-xs px-2"
          >
            +{xpGain} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Popup */}
      <AnimatePresence>
        {showLevelUpPopup && (
          <motion.div
            initial={{ opacity: 0, x: -20, y: -10 }}
            animate={{ opacity: 1, x: -30, y: -10 }}
            exit={{ opacity: 0, x: -50, y: -10 }}
            transition={{ duration: 0.5 }}
            className="absolute left-[-60px] top-0 bg-black/80 backdrop-blur-md border border-[#49EACB] rounded shadow-lg z-50 p-1 text-white w-auto text-xs px-2"
          >
            Leveled Up!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Loot Box Popup Modal rendered via a Portal (only on client) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showDailyLootPopup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >
                <div
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  onClick={() => setShowDailyLootPopup(false)}
                ></div>
                <motion.div
                  className="relative bg-black p-4 sm:p-6 rounded-lg border-2 border-[#49EACB] w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar z-10"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <motion.button
                    onClick={() => setShowDailyLootPopup(false)}
                    whileHover={{ scale: 1.2, backgroundColor: "rgba(73, 234, 203, 0.2)" }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-3 right-3 text-[#49EACB] font-bold text-xl bg-transparent rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    ×
                  </motion.button>
                  <div className="text-center mb-6">
                    <motion.h2
                      className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#49EACB] via-[#006d5b] to-[#49EACB] bg-clip-text text-transparent"
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Daily Free Loot Boxes
                    </motion.h2>

                    {/* Large display of current level */}
                    <motion.div
                      className="flex flex-col items-center my-4"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <p className="text-white text-base sm:text-lg mb-2">Your Current Level</p>
                      <motion.div
                        className={`relative rounded-full border-2 ${borderColorClass} shadow-[0_0_15px_rgba(73,234,203,0.5)]`}
                        style={{ width: "70px", height: "70px", overflow: "hidden" }}
                        whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(73,234,203,0.8)" }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: "url('/xpimage.webp')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            zIndex: 0,
                          }}
                        />
                        <span
                          style={{ fontSize: "1.5rem" }}
                          className="relative flex items-center justify-center h-full w-full z-10 font-bold"
                        >
                          {displayLevel}
                        </span>
                      </motion.div>
                    </motion.div>

                    <p className="text-gray-300 mt-2 text-sm sm:text-base">Available once every 24 hours</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 justify-items-center">
                    {dailyLootBoxes.map((box, index) => {
                      const isLocked = userData.level < box.requiredLevel
                      const isOnCooldown = cooldowns[box.slug] && cooldowns[box.slug] > 0
                      const cooldownTime = cooldowns[box.slug] || 0

                      return (
                        <Link href={`/games/${box.slug}`} key={box.slug} passHref>
                          <motion.div
                            className={`relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer border-2 ${
                              isLocked ? "border-red-500" : isOnCooldown ? "border-yellow-500" : "border-[#49EACB]"
                            } hover:shadow-lg transition-all duration-200 w-full max-w-[180px] flex flex-col`}
                            whileHover={{
                              scale: isLocked || isOnCooldown ? 1 : 1.05,
                              boxShadow: isLocked || isOnCooldown ? "none" : "0 0 20px rgba(73, 234, 203, 0.5)",
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                          >
                            {/* Overlay for locked or cooldown state */}
                            {(isLocked || isOnCooldown) && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 rounded-lg">
                                <div className="text-center p-2">
                                  {isLocked ? (
                                    <p className="text-red-400 font-bold">Requires Level {box.requiredLevel}</p>
                                  ) : (
                                    <>
                                      <p className="text-yellow-400 font-bold">On Cooldown</p>
                                      <p className="text-white text-sm">{formatTime(cooldownTime)}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="relative w-full h-28">
                              <Image
                                src={box.image || "/placeholder.svg"}
                                alt={box.name}
                                fill
                                style={{ objectFit: "cover" }}
                                className="rounded-t-md"
                              />
                            </div>
                            <div className="p-2 text-center bg-gray-800">
                              <h3 className="font-bold text-white text-sm">{box.name}</h3>
                              <p className="text-xs text-[#49EACB]">Level {box.requiredLevel}+</p>
                            </div>
                          </motion.div>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Gem Popup Modal rendered via a Portal (only on client) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showGemPopup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >
                <div
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  onClick={() => setShowGemPopup(false)}
                ></div>
                <motion.div
                  className="relative bg-black p-4 sm:p-6 rounded-lg border-2 border-[#49EACB] w-11/12 max-w-lg z-10"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <motion.button
                    onClick={() => setShowGemPopup(false)}
                    whileHover={{ scale: 1.2, backgroundColor: "rgba(73, 234, 203, 0.2)" }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-3 right-3 text-[#49EACB] font-bold text-xl bg-transparent rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    ×
                  </motion.button>
                  <div className="text-center mb-6">
                    <motion.h2
                      className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#49EACB] via-[#006d5b] to-[#49EACB] bg-clip-text text-transparent mb-4"
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Your Gems
                    </motion.h2>
                    <motion.div
                      className="flex justify-center items-center gap-3 bg-gray-900/50 p-4 rounded-lg border border-[#49EACB]/30 shadow-[0_0_15px_rgba(73,234,203,0.2)]"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      whileHover={{ boxShadow: "0 0 20px rgba(73,234,203,0.4)" }}
                    >
                      <span className="text-2xl sm:text-3xl font-bold text-white">{userData.gems}</span>
                      <Image src="/gem.webp" alt="Gem" width={40} height={40} className="sm:w-[50px] sm:h-[50px]" />
                    </motion.div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map((tier) => {
                      const requiredGems = tier === 1 ? 10 : tier === 2 ? 100 : tier === 3 ? 1000 : 10000
                      return (
                        <Link href={`https://www.kascasino.xyz/games/gemtier${tier}`} key={tier} passHref>
                          <motion.div
                            className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer border border-[#49EACB]/50 hover:shadow-lg transition-all duration-200"
                            whileHover={{
                              scale: 1.03,
                              boxShadow: "0 0 20px rgba(73,234,203,0.5)",
                              borderColor: "rgba(73,234,203,0.8)",
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 + tier * 0.1 }}
                          >
                            <div className="text-center p-2 bg-gradient-to-r from-[#003f2f] to-[#006d5b] font-bold text-white">
                              Gem Crate Tier {tier}
                            </div>
                            <div className="relative w-full h-32">
                              <Image
                                src={`/gemtier${tier}.webp`}
                                alt={`Gem Crate Tier ${tier}`}
                                fill
                                style={{ objectFit: "cover" }}
                              />
                            </div>
                            <div className="text-center p-3 bg-gray-800">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-bold text-white">Required:</span>
                                <span className="font-bold text-[#49EACB]">{requiredGems}</span>
                                <Image src="/gem.webp" alt="Gem" width={16} height={16} />
                              </div>
                            </div>
                          </motion.div>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}
