interface Props { label: string; value: number; max?: number; color?: string }

export default function ScoreBar({ label, value, max = 100, color = 'bg-blue-500' }: Props) {
  const pct = Math.min((value / max) * 100, 100)
  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-white">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
