import { Button } from "@/components/ui/button"

interface HowToPlayProps {
  onClose: () => void
}

export function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[#49EACB]">How to Play Mines</h3>
      <ol className="list-decimal list-inside space-y-2">
        <li>Enter your bet amount and click "Start New Game".</li>
        <li>A 5x5 grid will appear with hidden mines and diamonds.</li>
        <li>Click on tiles to reveal them. Diamonds increase your multiplier, mines end the game.</li>
        <li>Cash out at any time to secure your winnings.</li>
        <li>The more diamonds you reveal, the higher your potential payout!</li>
      </ol>
      <p className="text-sm text-gray-400">
        Remember, each game is provably fair and your chances of hitting a mine increase with each revealed diamond.
      </p>
      <Button onClick={onClose} className="w-full bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
        Got it!
      </Button>
    </div>
  )
}

