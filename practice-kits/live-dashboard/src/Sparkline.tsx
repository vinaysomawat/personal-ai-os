export function Sparkline({ values, width = 240, height = 48 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} />
  const max = Math.max(...values)
  const min = Math.min(...values)
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / (max - min || 1)) * height}`)
    .join(' ')
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke="#4f46e5" strokeWidth="2" />
    </svg>
  )
}
