export interface MinesTile {
  revealed: boolean;
  isSafe?: boolean;
}

export interface MinesGame {
  gameId:         string;
  clientSeed:     string;
  serverSeedHash: string;
  tiles:          MinesTile[];
  multipliers:    number[];
  safeClicks:     number;
  betAmount:      number;
  isGameOver:     boolean;
}

// Called when API tells us safe/lose:
export function revealTile(
  game: MinesGame,
  index: number,
  isSafe: boolean
): MinesGame {
  const tiles = [...game.tiles];
  tiles[index] = { revealed: true, isSafe };
  const safeClicks = game.safeClicks + (isSafe ? 1 : 0);
  const isGameOver = game.isGameOver || !isSafe;
  return { ...game, tiles, safeClicks, isGameOver };
}

// For cash-out:
export function calculatePayout(game: MinesGame): number {
  if (game.safeClicks === 0) return 0;
  return game.betAmount * game.multipliers[game.safeClicks - 1];
}
