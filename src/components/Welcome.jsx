import { useState } from 'react'
import Logo from './Logo.jsx'
import { GENDERS, POSITIONS, SPORTS } from '../data/mock.js'
import { cleanInstagram, SKILL_LEVELS } from '../lib/util.js'

const LEVEL_INIT = Object.fromEntries(SPORTS.map((s) => [s.key, 'Orta']))

// İlk giriş karşılama + kurulum ekranı.
// İsim ve oynanan sporlar burada bir kerede ayarlanır.
export default function Welcome({ onDone }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [sports, setSports] = useState(['padel', 'halisaha'])
  const [level, setLevel] = useState(LEVEL_INIT)
  const [positions, setPositions] = useState([])
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const first = name.trim().split(' ')[0]
  const toggleSport = (k) => setSports((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
  const togglePos = (p) => setPositions((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))
  const valid = name.trim().length >= 2 && sports.length >= 1

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true); setErr('')
    try {
      await onDone({
        name: name.trim(),
        age: age ? Number(age) : null,
        gender: gender || null,
        sports,
        level,
        positions: sports.includes('halisaha') ? positions : [],
        phone: phone.trim(),
        instagram: cleanInstagram(instagram),
      })
    } catch (e) {
      setErr(e?.message || 'Kaydedilemedi, tekrar dene.')
      setBusy(false)
    }
  }

  return (
    <div className="welcome">
      <div className="wel-card">
        <div className="wel-top"><Logo size={34} /></div>
        <h1 className="wel-hi">{first ? `Hoş geldin, ${first}! 👋` : 'BirEksik’e hoş geldin! 👋'}</h1>
        <p className="meta">Seni biraz tanıyalım ki maçlarda doğru kişilerle eşleşelim. Hepsini sonra profilinden değiştirebilirsin.</p>

        <label className="wel-field">Adın <small>(diğer oyuncular bu ismi görecek)</small>
          <input value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Örn: Efe K." />
        </label>

        <div className="wel-field two">
          <label>Yaşın <small>(isteğe bağlı)</small>
            <input type="number" inputMode="numeric" min={13} max={99} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Örn: 21" />
          </label>
          <label>Cinsiyet <small>(isteğe bağlı)</small>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Seçilmedi</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        </div>

        <label className="wel-field">Telefon <small>(maç hatırlatmaları için, isteğe bağlı)</small>
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" />
        </label>

        <label className="wel-field">Instagram <small>(isteğe bağlı — kiminle oynadığın görünsün)</small>
          <div className="ig-input"><span>@</span><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="kullanici.adi" autoCapitalize="none" autoCorrect="off" /></div>
        </label>

        <div className="wel-field">
          Hangi sporları oynuyorsun?
          <div className="wel-sports">
            {SPORTS.map((s) => {
              const on = sports.includes(s.key)
              return (
                <div key={s.key} className={'wel-sport ' + s.key + (on ? ' on' : '')}>
                  <button type="button" className="wel-sport-head" onClick={() => toggleSport(s.key)}>
                    <span className={'wel-check' + (on ? ' on' : '')} aria-hidden="true">{on ? '✓' : ''}</span>
                    <b>{s.label}</b>
                  </button>
                  {on && s.key !== 'kosu' && (
                    <div className="wel-sport-body">
                      <label>Seviyen
                        <select value={level[s.key]} onChange={(e) => setLevel((l) => ({ ...l, [s.key]: e.target.value }))}>
                          {SKILL_LEVELS.map((l) => <option key={l}>{l}</option>)}
                        </select>
                      </label>
                      {s.key === 'halisaha' && (
                        <div className="pos-block">
                          <span>Pozisyonların <small>(birden fazla seçebilirsin)</small></span>
                          <div className="pos-row">
                            {POSITIONS.map((p) => (
                              <button type="button" key={p} className={'pos-tag btn-like' + (positions.includes(p) ? ' on' : '')} onClick={() => togglePos(p)}>{p}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {err && <p className="err">{err}</p>}
        <button className="btn primary big wel-go" disabled={!valid || busy} onClick={submit}>
          {busy ? 'Kaydediliyor…' : 'Hadi başlayalım 🎾'}
        </button>
        <p className="meta small">En az adını ve bir spor seçmen yeterli.</p>
      </div>
    </div>
  )
}
