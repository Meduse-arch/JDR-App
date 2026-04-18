export function RuneFond() {
  return (
    <svg
      className="pointer-events-none select-none absolute inset-0 w-full h-full"
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.028 }}
    >
      <g fill="none" stroke="rgba(200,168,75,1)" strokeWidth="1">
        <circle cx="300" cy="300" r="270" />
        <circle cx="300" cy="300" r="200" />
        <circle cx="300" cy="300" r="130" />
        <circle cx="300" cy="300" r="55" />
        {[0,45,90,135,180,225,270,315].map(a => {
          const rad = (a * Math.PI) / 180
          const x1 = 300 + 55 * Math.cos(rad)
          const y1 = 300 + 55 * Math.sin(rad)
          const x2 = 300 + 270 * Math.cos(rad)
          const y2 = 300 + 270 * Math.sin(rad)
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} />
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const a1 = (i * 45 - 22.5) * Math.PI / 180
          const a2 = ((i + 1) * 45 - 22.5) * Math.PI / 180
          return (
            <line key={`oct-${i}`}
              x1={300 + 200 * Math.cos(a1)} y1={300 + 200 * Math.sin(a1)}
              x2={300 + 200 * Math.cos(a2)} y2={300 + 200 * Math.sin(a2)}
            />
          )
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const a1 = (i * 60) * Math.PI / 180
          const a2 = ((i + 1) * 60) * Math.PI / 180
          return (
            <line key={`hex-${i}`}
              x1={300 + 130 * Math.cos(a1)} y1={300 + 130 * Math.sin(a1)}
              x2={300 + 130 * Math.cos(a2)} y2={300 + 130 * Math.sin(a2)}
            />
          )
        })}
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i * 15) * Math.PI / 180
          const r1 = 260, r2 = 270
          return (
            <line key={`tick-${i}`}
              x1={300 + r1 * Math.cos(a)} y1={300 + r1 * Math.sin(a)}
              x2={300 + r2 * Math.cos(a)} y2={300 + r2 * Math.sin(a)}
            />
          )
        })}
      </g>
    </svg>
  )
}
