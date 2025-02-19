"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface RouletteGameProps {
  isPlaying: boolean
  onGameEnd: (result: number, winAmount: number) => void
  selectedBet: { type: string; amount: number } | null
}

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26,
]

const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3)
}

export function RouletteGame({ isPlaying, onGameEnd, selectedBet }: RouletteGameProps) {
  const [result, setResult] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [activeMarkers, setActiveMarkers] = useState<number[]>([])
  const wheelRef = useRef<SVGSVGElement>(null)
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isPlaying) {
      spinRoulette()
    } else {
      resetGame()
    }
  }, [isPlaying])

  const spinRoulette = () => {
    setSpinning(true)
    setResult(null)

    // Determine winning number with adjusted odds
    const randomResult = determineWinningNumber()

    // Calculate total rotation
    const totalRotations = 8 // Increased number of full rotations before stopping
    const resultIndex = ROULETTE_NUMBERS.indexOf(randomResult)
    const finalRotation = -360 * totalRotations - (360 * resultIndex) / 37

    // Start the color travel effect
    let currentIndex = 0
    const updateInterval = 16 // ms (increased for smoother animation)
    const spinDuration = 10000 // ms (increased for longer animation)
    const totalSteps = spinDuration / updateInterval

    spinIntervalRef.current = setInterval(() => {
      const progress = currentIndex / totalSteps
      const easedProgress = easeOutCubic(progress)
      const currentRotation = finalRotation * easedProgress

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentRotation}deg)`
      }

      const currentStep = Math.floor((ROULETTE_NUMBERS.length * easedProgress) % ROULETTE_NUMBERS.length)

      // Gradually reduce lit-up markers as the animation ends
      const markersToLight = progress > 0.8 ? Math.floor(5 * (1 - (progress - 0.8) / 0.2)) : 5

      setActiveMarkers(Array.from({ length: markersToLight }, (_, i) => (currentStep + i) % ROULETTE_NUMBERS.length))

      if (currentIndex >= totalSteps) {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current)
        }
        setSpinning(false)
        setResult(randomResult)
        setActiveMarkers([resultIndex])
        calculateWinnings(randomResult)
      }

      currentIndex++
    }, updateInterval)
  }

  const resetGame = () => {
    setActiveMarkers([])
    setResult(null)
    if (wheelRef.current) {
      wheelRef.current.style.transition = "none"
      wheelRef.current.style.transform = "rotate(0deg)"
    }
  }

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (result !== null) {
      const resultIndex = ROULETTE_NUMBERS.indexOf(result)
      setActiveMarkers([resultIndex])
    }
  }, [result])

  const determineWinningNumber = (): number => {
    const houseEdge = Math.random()
    if (houseEdge < 0.6) {
      // House wins (60% chance)
      if (selectedBet?.type === "red" || selectedBet?.type === "black") {
        return getOppositeColorNumber(selectedBet.type)
      } else if (selectedBet?.type === "odd" || selectedBet?.type === "even") {
        return getOppositeParityNumber(selectedBet.type)
      } else {
        return Math.floor(Math.random() * 37)
      }
    } else {
      // Player wins (40% chance)
      if (selectedBet?.type === "red" || selectedBet?.type === "black") {
        return getSameColorNumber(selectedBet.type)
      } else if (selectedBet?.type === "odd" || selectedBet?.type === "even") {
        return getSameParityNumber(selectedBet.type)
      } else {
        return Math.floor(Math.random() * 37)
      }
    }
  }

  const calculateWinnings = (result: number) => {
    let winAmount = 0

    if (selectedBet) {
      const { type, amount } = selectedBet
      if (type === result.toString()) {
        winAmount = amount * 35 // Single number bet
      } else if ((type === "red" && isRed(result)) || (type === "black" && isBlack(result))) {
        winAmount = amount * 2 // Color bet
      } else if (
        (type === "odd" && result % 2 !== 0 && result !== 0) ||
        (type === "even" && result % 2 === 0 && result !== 0)
      ) {
        winAmount = amount * 2 // Odd/Even bet
      } else if (
        (type === "1st12" && result >= 1 && result <= 12) ||
        (type === "2nd12" && result >= 13 && result <= 24) ||
        (type === "3rd12" && result >= 25 && result <= 36)
      ) {
        winAmount = amount * 3 // Dozen bet
      } else if (type === "green" && result === 0) {
        winAmount = amount * 10 // Green (0) bet
      }
    }

    onGameEnd(result, winAmount)
  }

  const isRed = (number: number) => {
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    return redNumbers.includes(number)
  }

  const isBlack = (number: number) => {
    return number !== 0 && !isRed(number)
  }

  const getOppositeColorNumber = (color: string) => {
    const oppositeNumbers =
      color === "red" ? ROULETTE_NUMBERS.filter((n) => isBlack(n)) : ROULETTE_NUMBERS.filter((n) => isRed(n))
    return oppositeNumbers[Math.floor(Math.random() * oppositeNumbers.length)]
  }

  const getSameColorNumber = (color: string) => {
    const sameColorNumbers =
      color === "red" ? ROULETTE_NUMBERS.filter((n) => isRed(n)) : ROULETTE_NUMBERS.filter((n) => isBlack(n))
    return sameColorNumbers[Math.floor(Math.random() * sameColorNumbers.length)]
  }

  const getOppositeParityNumber = (parity: string) => {
    const oppositeNumbers =
      parity === "odd"
        ? ROULETTE_NUMBERS.filter((n) => n % 2 === 0 && n !== 0)
        : ROULETTE_NUMBERS.filter((n) => n % 2 !== 0)
    return oppositeNumbers[Math.floor(Math.random() * oppositeNumbers.length)]
  }

  const getSameParityNumber = (parity: string) => {
    const sameParityNumbers =
      parity === "odd"
        ? ROULETTE_NUMBERS.filter((n) => n % 2 !== 0)
        : ROULETTE_NUMBERS.filter((n) => n % 2 === 0 && n !== 0)
    return sameParityNumbers[Math.floor(Math.random() * sameParityNumbers.length)]
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-[700px] h-[700px] mb-8 roulette-table p-4">
        <div className="relative w-full h-full">
          <svg ref={wheelRef} viewBox="0 0 100 100" className="w-full h-full">
            {/* Outer ring */}
            <circle cx="50" cy="50" r="49" fill="#1a1a1a" stroke="#c0c0c0" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="46" fill="#2c3e50" stroke="#c0c0c0" strokeWidth="0.25" />

            {/* Number segments */}
            {ROULETTE_NUMBERS.map((number, index) => {
              const angle = (index * 360) / 37
              const startAngle = angle * (Math.PI / 180)
              const endAngle = (angle + 360 / 37) * (Math.PI / 180)

              const x1 = 50 + 44 * Math.cos(startAngle)
              const y1 = 50 + 44 * Math.sin(startAngle)
              const x2 = 50 + 44 * Math.cos(endAngle)
              const y2 = 50 + 44 * Math.sin(endAngle)

              const largeArcFlag = 0

              const d = ["M", 50, 50, "L", x1, y1, "A", 44, 44, 0, largeArcFlag, 1, x2, y2, "Z"].join(" ")

              // Text position calculation
              const textAngle = (angle + 360 / 74) * (Math.PI / 180)
              const textRadius = 38
              const textX = 50 + textRadius * Math.cos(textAngle)
              const textY = 50 + textRadius * Math.sin(textAngle)

              // Marker position calculation
              const markerRadius = 45
              const markerX = 50 + markerRadius * Math.cos(textAngle)
              const markerY = 50 + markerRadius * Math.sin(textAngle)

              return (
                <g key={index}>
                  <path
                    d={d}
                    fill={number === 0 ? "#008000" : isRed(number) ? "#e74c3c" : "#2c3e50"}
                    stroke="#c0c0c0"
                    strokeWidth="0.1"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill="white"
                    fontSize="2.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${angle + 90}, ${textX}, ${textY})`}
                    className="roulette-text"
                  >
                    {number}
                  </text>
                  {/* Marker */}
                  <circle
                    cx={markerX}
                    cy={markerY}
                    r="0.75"
                    fill={activeMarkers.includes(index) ? "#ffff00" : "#c0c0c0"}
                    className="transition-all duration-200"
                  />
                </g>
              )
            })}

            {/* Center decorative elements */}
            <circle cx="50" cy="50" r="4" fill="#c0c0c0" />
            <circle cx="50" cy="50" r="3" fill="#2c3e50" />
            <circle cx="50" cy="50" r="1" fill="#c0c0c0" />
          </svg>
        </div>
      </div>

      <AnimatePresence>
        {result !== null && !spinning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <h3 className="text-3xl font-bold mb-4">
              <span
                className={`${isRed(result) ? "text-red-500" : isBlack(result) ? "text-gray-800" : "text-green-500"}`}
              >
                {result}
              </span>{" "}
              <span className="text-[#49EACB]">
                {isRed(result) ? "(Red)" : isBlack(result) ? "(Black)" : "(Green)"}
              </span>
            </h3>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

