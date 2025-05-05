// mines-logic.ts
export interface MinesTile {
  isSafe: boolean;
  revealed: boolean;
}

export interface MinesGame {
  gameId:         string;
  clientSeed:     string;
  serverSeedHash: string;
  tiles:          MinesTile[];
  multipliers:    number[];      // one multiplier per safe‐click, length = totalSafeTiles
  safeClicks:     number;
  betAmount:      number;
  isGameOver:     boolean;
}

// revealTile now just flips a single tile and bumps safeClicks
export function revealTile(game: MinesGame, index: number): MinesGame {
  if (game.isGameOver || game.tiles[index].revealed) return game;
  const tiles = [...game.tiles];
  tiles[index] = { ...tiles[index], revealed: true };

  let safeClicks = game.safeClicks;
  let isGameOver = game.isGameOver;

  if (!tiles[index].isSafe) {
    // hit a mine
    isGameOver = true;
  } else {
    safeClicks++;
  }

  return { ...game, tiles, safeClicks, isGameOver };
}

// compute payout locally from multipliers array
export function calculatePayout(game: MinesGame): number {
  if (game.safeClicks === 0) return 0;
  return game.betAmount * game.multipliers[game.safeClicks - 1];
}
