import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Player {
  username: string
  bet: number
  cashout: number | null
  profit: number | null
}

interface PlayerListProps {
  players: Player[]
}

export function PlayerList({ players }: PlayerListProps) {
  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-[#49EACB] mb-4">Players</h3>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {players.map((player, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-[#49EACB]/10 last:border-0"
              >
                <div className="flex-1">
                  <div className="font-medium">{player.username}</div>
                  <div className="text-sm text-[#49EACB]">{player.bet.toFixed(2)} KAS</div>
                </div>
                <div className="text-right">
                  {player.cashout ? (
                    <div className="font-medium">{player.cashout.toFixed(2)}×</div>
                  ) : (
                    <div className="text-[#49EACB]">Playing</div>
                  )}
                  {player.profit !== null && (
                    <div className={player.profit >= 0 ? "text-green-400" : "text-red-400"}>
                      {player.profit >= 0 ? "+" : ""}
                      {player.profit.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  )
}

