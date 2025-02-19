import crypto from "crypto"

const MAX_CASHOUT = 4503599627370495 // 0xFFFFFFFFFFFFF

export function gameResultFromHash(hash: string): number {
  // Convert first 13 chars of hash to number between 0 and 1
  const hashNumber = Number.parseInt(hash.slice(0, 13), 16) / (Math.pow(2, 52) - 1)

  // Adjust distribution to have 60% chance of going above 1.5x and 40% chance of going above 2x
  if (hashNumber <= 0.4) {
    // 40% chance to be between 1.0x and 1.5x
    return 1 + hashNumber * 1.25
  } else if (hashNumber <= 0.6) {
    // 20% chance to be between 1.5x and 2.0x
    return 1.5 + (hashNumber - 0.4) * 2.5
  } else {
    // 40% chance to be above 2.0x, with decreasing probability for higher values
    return 2 + Math.pow((hashNumber - 0.6) / 0.4, 2) * 8
  }
}

export function saltHash(hash: string): string {
  return crypto.createHmac("sha256", "CRASH:0").update(hash).digest("hex")
}

export function generateGameHash(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex")
}

export function generateSeed(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function calculateMultiplier(elapsedMs: number): number {
  return Math.pow(Math.E, 0.00006 * elapsedMs)
}

