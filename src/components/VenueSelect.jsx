import { useEffect, useRef, useState } from 'react'

// Türkçe duyarlı arama
const norm = (s) => (s || '').toLocaleLowerCase('tr').replace(/̇/g, '')

// İlçeye göre gruplanmış, aranabilir saha seçici.
// list: [{ ilce, items: [...] }]  ·  listede yoksa "kendim yazayım" ile elle eklenir.
export default function VenueSelect({ list = [], value, onChange, placeholder = 'İlçe veya saha ara' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef(null)

  // Spor (liste) değişince aramayı sıfırla
  useEffect(() => { setQ('') }, [list])

  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const nq = norm(q.trim())
  const groups = list
    .map((g) => ({ ...g, items: g.items.filter((it) => norm(it).includes(nq) || norm(g.ilce).includes(nq)) }))
    .filter((g) => g.items.length)

  const allItems = list.flatMap((g) => g.items)
  const exact = allItems.some((it) => norm(it) === nq)
  const custom = q.trim() && !exact ? q.trim() : null

  const pick = (it) => { onChange(it); setOpen(false); setQ('') }

  return (
    <div className="dept" ref={box}>
      <button type="button" className={'dept-btn' + (value ? ' has' : '')} onClick={() => setOpen((o) => !o)}>
        <span>{value || placeholder}</span>
        <span className="dept-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="dept-pop">
          <input autoFocus className="dept-search" placeholder="Saha adı ya da ilçe yaz…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="dept-list">
            {custom && (
              <button type="button" className="dept-opt add" onClick={() => pick(custom)}>
                “{custom}” — kendim ekle
              </button>
            )}
            {groups.length === 0 && !custom && <p className="dept-empty">Sonuç yok. Yazıp "kendim ekle" ile ekleyebilirsin.</p>}
            {groups.map((g) => (
              <div key={g.ilce} className="dept-group">
                <div className="dept-fac">{g.ilce}</div>
                {g.items.map((it) => (
                  <button type="button" key={it} className={'dept-opt' + (it === value ? ' on' : '')} onClick={() => pick(it)}>
                    {it}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
