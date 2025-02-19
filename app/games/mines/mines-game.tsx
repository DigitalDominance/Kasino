import type { MinesTile } from "./mines-logic"

export interface MinesGame {
  tiles: MinesTile[]
  revealedSeed: string
  clientSeed: string
  gameNonce: number
  numMines: number
  betAmount: number
  currentMultiplier: number
  isGameOver: boolean
}

