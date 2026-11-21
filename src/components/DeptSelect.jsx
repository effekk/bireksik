import { useEffect, useRef, useState } from 'react'
import { DEPARTMENTS } from '../data/departments.js'

// Türkçe duyarlı arama (İ/ı dahil)
const norm = (s) => (s || '').toLocaleLowerCase('tr').replace(/̇/g, '')

// Bölüm yazmak yerine listeden, arama kutusuyla seçilir
export default function DeptSelect({ value, onChange, placeholder = 'Bölümünü ara ve seç' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const nq = norm(q.trim())
  const groups = DEPARTMENTS
    .map((g) => ({ ...g, items: g.items.filter((it) => norm(it).includes(nq)) }))
    .filter((g) => g.items.length)

  const pick = (it) => { onChange(it); setOpen(false); setQ('') }

  return (
    <div className="dept" ref={box}>
      <button type="button" className={'dept-btn' + (value ? ' has' : '')} onClick={() => setOpen((o) => !o)}>
        <span>{value || placeholder}</span>
        <span className="dept-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="dept-pop">
          <input
            autoFocus
            className="dept-search"
            placeholder="Yaz ve ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="dept-list">
            {groups.length === 0 && <p className="dept-empty">Sonuç bulunamadı</p>}
            {groups.map((g) => (
              <div key={g.faculty} className="dept-group">
                <div className="dept-fac">{g.faculty}</div>
                {g.items.map((it) => (
                  <button
                    type="button"
                    key={it}
                    className={'dept-opt' + (it === value ? ' on' : '')}
                    onClick={() => pick(it)}
                  >
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
