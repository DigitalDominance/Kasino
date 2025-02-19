import _ from "underscore"

export interface MinesTile {
  type: "mine" | "diamond"
  revealed: boolean
}

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

async function generateHmac(seed: string, update: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(update), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(seed))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function saltWithClientSeed(seed: string, update: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(seed + update)
  const hashBuffer = await crypto.subtle.digest("SHA-512", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function seedToBytes(hash: string): number[] {
  return _.chunk(hash.split(""), 2).map((bytePair) => {
    const twoBytes = bytePair.join("")
    return Number.parseInt(twoBytes, 16)
  })
}

function bytesToNumbers(byteArr: number[], groupSize: number, hashLength: number): number[] {
  return _.chunk(byteArr, 4).map((numArr) => {
    const numA = numArr[0] / Math.pow(hashLength, 1)
    const numB = numArr[1] / Math.pow(hashLength, 2)
    const numC = numArr[2] / Math.pow(hashLength, 3)
    const numD = numArr[3] / Math.pow(hashLength, 4)
    return numA + numB + numC + numD
  })
}

async function buildGroup(groupSize: number, hash: string): Promise<number[]> {
  let randomNumbers: number[] = []
  let shuffleNonce = 0

  do {
    const newHash = await generateHmac(hash, shuffleNonce.toString())
    const tempArr = seedToBytes(newHash)
    const randomArr = randomNumbers.concat(bytesToNumbers(tempArr, groupSize, newHash.length * 4))
    randomNumbers = randomArr
    shuffleNonce += 1
  } while (randomNumbers.length < groupSize)

  if (randomNumbers.length > groupSize) {
    randomNumbers = randomNumbers.slice(0, groupSize)
  }

  return shuffleGroup(randomNumbers, groupSize)
}

function shuffleGroup(randomNumbers: number[], groupSize: number): number[] {
  const shuffledNumbers = _.range(groupSize)

  let randIndex = 0
  for (let i = groupSize - 1; i > 0; i--) {
    const j = Math.floor(randomNumbers[randIndex] * (i + 1))

    const tmp = shuffledNumbers[j]
    shuffledNumbers[j] = shuffledNumbers[i]
    shuffledNumbers[i] = tmp
    randIndex += 1
  }
  return shuffledNumbers
}

function setOrderedGroup(minesCount: number, shuffledGroup: number[]): MinesTile[] {
  const orderedGroup: MinesTile[] = new Array(25).fill(null).map(() => ({ type: "diamond", revealed: false }))

  if (minesCount < 1) {
    minesCount = 1
  }

  if (minesCount > 24) {
    minesCount = 24
  }

  shuffledGroup.slice(0, minesCount).forEach((index) => {
    orderedGroup[index].type = "mine"
  })

  return orderedGroup
}

export async function verifyMines(game: MinesGame): Promise<MinesTile[]> {
  const noncedSeed = `${game.clientSeed} - ${game.gameNonce}`
  const hash = await saltWithClientSeed(game.revealedSeed, noncedSeed)
  const shuffledGroup = await buildGroup(25, hash)
  return setOrderedGroup(game.numMines, shuffledGroup)
}

export function initializeMinesGame(numMines = 5, betAmount = 0): MinesGame {
  return {
    tiles: new Array(25).fill(null).map(() => ({ type: "diamond", revealed: false })),
    revealedSeed: crypto.randomUUID(),
    clientSeed: crypto.randomUUID(),
    gameNonce: 0,
    numMines,
    betAmount,
    currentMultiplier: 1,
    isGameOver: false,
  }
}

export async function revealTile(game: MinesGame, index: number): Promise<MinesGame> {
  const verifiedTiles = await verifyMines(game)
  const newTiles = [...game.tiles]
  newTiles[index] = { ...verifiedTiles[index], revealed: true }

  let newMultiplier = game.currentMultiplier
  let isGameOver = game.isGameOver

  if (verifiedTiles[index].type === "mine") {
    isGameOver = true
  } else {
    // Calculate new multiplier (this is a simple example, you may want to adjust the formula)
    newMultiplier *= 1.1
  }

  return { ...game, tiles: newTiles, currentMultiplier: newMultiplier, isGameOver }
}

export function calculatePayout(game: MinesGame): number {
  // Return payout in KAS units (divided by 10^8)
  return (game.betAmount * game.currentMultiplier) / Math.pow(10, 8)
}

