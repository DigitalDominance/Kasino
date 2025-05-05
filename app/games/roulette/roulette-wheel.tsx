"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

interface RouletteWheelProps {
  isPlaying: boolean
  onGameEnd: (result: number, winAmount: number) => void
  selectedBet: { type: string; amount: number } | null
}

const ROULETTE_NUMBERS = [
  32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26, 0,
]

const RED_NUMBERS = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3]

export function RouletteWheel({ isPlaying, onGameEnd, selectedBet }: RouletteWheelProps) {
  const [result, setResult] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [maskText, setMaskText] = useState("Place Your Bets")
  const [previousResults, setPreviousResults] = useState<Array<{ number: number; color: string }>>([])
  const [showReset, setShowReset] = useState(false)
  const [resetDisabled, setResetDisabled] = useState(false)
  const innerRef = useRef<HTMLUListElement>(null)
  const dataRef = useRef<HTMLDivElement>(null)
  const timer = 9000

  useEffect(() => {
    if (isPlaying && !spinning) {
      handleSpin()
    }
  }, [isPlaying, spinning])

  const handleSpin = () => {
    setSpinning(true)
    setShowReset(true)
    setResetDisabled(true)
    setResult(null)
    setMaskText("No More Bets")

    const randomNumber = Math.floor(Math.random() * 37)
    const color = RED_NUMBERS.includes(randomNumber) ? "red" : randomNumber === 0 ? "green" : "black"

    if (innerRef.current) {
      innerRef.current.setAttribute("data-spinto", randomNumber.toString())
      innerRef.current.classList.remove("rest")
    }

    setTimeout(() => {
      setMaskText("No More Bets")
    }, timer / 2)

    setTimeout(() => {
      setMaskText("Place Your Bets")
      setResult(randomNumber)
      if (dataRef.current) {
        dataRef.current.classList.add("reveal")
      }
      if (innerRef.current) {
        innerRef.current.classList.add("rest")
      }

      setPreviousResults((prev) => [{ number: randomNumber, color }, ...prev])
      calculateWinnings(randomNumber)
      setSpinning(false)
      setResetDisabled(false)
    }, timer)
  }

  const handleReset = () => {
    if (innerRef.current) {
      innerRef.current.setAttribute("data-spinto", "")
      innerRef.current.classList.remove("rest")
    }
    if (dataRef.current) {
      dataRef.current.classList.remove("reveal")
    }
    setShowReset(false)
    setResult(null)
  }

  const calculateWinnings = (winningNumber: number) => {
    if (!selectedBet) return onGameEnd(winningNumber, 0)

    const { type, amount } = selectedBet
    let winAmount = 0

    const isRed = RED_NUMBERS.includes(winningNumber)
    const isBlack = !isRed && winningNumber !== 0

    switch (type) {
      case "red":
        winAmount = isRed ? amount * 2 : 0
        break
      case "black":
        winAmount = isBlack ? amount * 2 : 0
        break
      case "even":
        winAmount = winningNumber !== 0 && winningNumber % 2 === 0 ? amount * 2 : 0
        break
      case "odd":
        winAmount = winningNumber !== 0 && winningNumber % 2 === 1 ? amount * 2 : 0
        break
      case "1st12":
        winAmount = winningNumber >= 1 && winningNumber <= 12 ? amount * 3 : 0
        break
      case "2nd12":
        winAmount = winningNumber >= 13 && winningNumber <= 24 ? amount * 3 : 0
        break
      case "3rd12":
        winAmount = winningNumber >= 25 && winningNumber <= 36 ? amount * 3 : 0
        break
      case "green":
        winAmount = winningNumber === 0 ? amount * 35 : 0
        break
    }

    onGameEnd(winningNumber, winAmount)
  }

  return (
    <div className="main">
      <Button
        type="button"
        className="btn"
        onClick={handleSpin}
        style={{ display: showReset ? "none" : "inline-block" }}
      >
        <span className="btn-label">Spin</span>
      </Button>
      <Button
        type="button"
        className={`btn btn-reset ${resetDisabled ? "disabled" : ""}`}
        onClick={handleReset}
        style={{ display: showReset ? "inline-block" : "none" }}
        disabled={resetDisabled}
      >
        <span className="btn-label">New Game</span>
      </Button>
      <div className="plate" id="plate">
        <ul className="inner" ref={innerRef}>
          {ROULETTE_NUMBERS.map((number) => (
            <li key={number} className="number">
              <label>
                <input type="radio" name="pit" value={number} />
                <span className="pit">{number}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="data" ref={dataRef}>
          <div className="data-inner">
            <div className="mask">{maskText}</div>
            <div
              className="result"
              style={{
                backgroundColor:
                  result !== null ? (RED_NUMBERS.includes(result) ? "red" : result === 0 ? "green" : "black") : "green",
              }}
            >
              <div className="result-number">{result !== null ? result : "00"}</div>
              <div className="result-color">
                {result !== null ? (RED_NUMBERS.includes(result) ? "red" : result === 0 ? "green" : "black") : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="previous-results">
        <ol className="previous-list">
          {previousResults.length === 0 ? (
            <li className="visuallyhidden placeholder">No results yet.</li>
          ) : (
            previousResults.map((result, index) => (
              <li key={index} className={`previous-result color-${result.color}`}>
                <span className="previous-number">{result.number}</span>
                <span className="previous-color">{result.color}</span>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  )
}

