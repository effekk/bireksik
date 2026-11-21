// Logo: dolu üç oyuncu + bir boş (kesik çizgili) yer = "bir eksik"
export default function Logo({ size = 28, light = false }) {
  const c = light ? '#ffffff' : 'var(--pitch)'
  return (
    <span className="logo" style={{ color: light ? '#fff' : 'var(--ink)' }}>
      <svg width={size * 1.9} height={size} viewBox="0 0 57 30" aria-hidden="true">
        <circle cx="7" cy="15" r="6" fill={c} />
        <circle cx="21" cy="15" r="6" fill={c} />
        <circle cx="35" cy="15" r="6" fill={c} />
        <circle cx="50" cy="15" r="5.5" fill="none" stroke="var(--ball)" strokeWidth="2.2" strokeDasharray="3 2.4" />
      </svg>
      <span><b>Bir</b>Eksik</span>
    </span>
  )
}
