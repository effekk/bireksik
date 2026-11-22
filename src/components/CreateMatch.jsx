import { useState, useEffect } from 'react'
import { LEVELS, MODES, POSITIONS, SPORTS, applyTheme } from '../data/mock.js'
import { VENUES } from '../data/venues.js'
import VenueSelect from './VenueSelect.jsx'

import { dayLabel } from '../lib/api.js'

// Önümüzdeki 14 gün: { value: '2026-11-20', label: 'Bugün' }
const pad = (n) => String(n).padStart(2, '0')
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function nextDays(n = 14) {
  const out = []
  const t = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i)
    const lbl = dayLabel(d)
    out.push({ value: isoDate(d), label: i < 2 ? lbl : `${d.toLocaleDateString('tr-TR', { weekday: 'long' })}, ${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}` })
  }
  return out
}
const DEFAULTS = {
  padel: { size: 4, ready: 3, team: 2 },
  halisaha: { size: 14, ready: 10, team: 7 },
  tenis: { size: 2, ready: 1, team: 2 },
  voleybol: { size: 12, ready: 6, team: 6 },
  basket: { size: 10, ready: 5, team: 5 },
  kosu: { size: 6, ready: 1, team: 2 },
}
// Koşu tempo aralıkları (dk/km)
const PACES = ['4-7 dk/km', '8-11 dk/km', '12-15 dk/km']

export default function CreateMatch({ onCreate }) {
  const days = nextDays()
  const [f, setF] = useState({
    sport: 'padel', mode: 'players', day: isoDate(new Date()), time: '19:00',
    place: '', level: 'Orta', size: 4, ready: 3, team: 2, minTrust: 0, note: '', wa: '', wanted: {},
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const num = (v) => Number(v) || 0

  const setSport = (sport) =>
    setF((s) => ({ ...s, sport, mode: 'players', place: '', wanted: {}, level: sport === 'kosu' ? '8-11 dk/km' : 'Orta', ...DEFAULTS[sport] }))

  const isKosu = f.sport === 'kosu'

  // İlan açarken seçilen spora göre temayı kaydır
  useEffect(() => {
    applyTheme(f.sport)
    return () => applyTheme(null)
  }, [f.sport])

  // Takım modunda maç büyüklüğü takım × 2; oyuncu modunda aranan = toplam − hazır
  const isTeam = f.mode === 'team'
  const teamSize = f.sport === 'padel' ? 2 : num(f.team)
  const size = isTeam ? teamSize * 2 : f.sport === 'padel' ? 4 : num(f.size)
  const ready = isTeam ? teamSize : num(f.ready)
  const seeking = size - ready
  const usesPos = f.sport === 'halisaha' && !isTeam
  const posTotal = usesPos ? Object.values(f.wanted).reduce((a, b) => a + b, 0) : 0
  const setWanted = (p, n) => setF((s) => ({ ...s, wanted: { ...s.wanted, [p]: Math.max(0, n) } }))
  const startsAt = new Date(`${f.day}T${f.time || '00:00'}`)
  const inFuture = startsAt.getTime() > Date.now() + 5 * 60000
  const valid = seeking >= 1 && ready >= 1 && size >= 2 && posTotal <= seeking && inFuture && f.place.trim()

  const waOk = f.wa === '' || /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(f.wa.trim())

  const submit = (e) => {
    e.preventDefault()
    if (!waOk || !valid) return
    onCreate({
      sport: f.sport, mode: f.mode, startsAt, place: f.place, level: f.level,
      size, ready, minTrust: num(f.minTrust), note: f.note.trim(), wa: f.wa.trim(),
      ...(usesPos && posTotal ? { wanted: Object.fromEntries(Object.entries(f.wanted).filter(([, n]) => n > 0)) } : {}),
    })
  }

  return (
    <form className="form" onSubmit={submit}>
      <h1>Maç aç</h1>

      <div className="seg" role="radiogroup" aria-label="Spor">
        {SPORTS.map((s) => (
          <button type="button" key={s.key} className={'seg-btn ' + s.key + (f.sport === s.key ? ' on' : '')} onClick={() => setSport(s.key)}>{s.label}</button>
        ))}
      </div>

      {!isKosu && <div className="mode-pick" role="radiogroup" aria-label="Ne arıyorsun">
        {MODES[f.sport].map((m) => (
          <button type="button" key={m.key} className={'mode-btn' + (f.mode === m.key ? ' on' : '')} onClick={() => set('mode', m.key)}>
            <b>{m.label}</b>
            <small>
              {m.key === 'players'
                ? 'Eksik kadar kişi ara. Katılan tek ya da arkadaşıyla gelebilir.'
                : f.sport === 'padel' ? 'Siz ikiniz hazırsınız, karşınıza bir ikili arıyorsunuz.' : 'Takımın hazır. Rakip takımın kaptanı bütün takımı tek seferde ekler.'}
            </small>
          </button>
        ))}
      </div>}

      {!isKosu && (isTeam ? (
        f.sport === 'halisaha' && (
          <label>Takımın kaç kişi?
            <input type="number" min={4} max={11} value={f.team} onChange={(e) => set('team', e.target.value)} />
          </label>
        )
      ) : (
        <div className="two">
          {f.sport !== 'padel' && (
            <label>Toplam kaç kişi oynanacak?
              <input type="number" min={2} max={22} value={f.size} onChange={(e) => set('size', e.target.value)} />
            </label>
          )}
          <label>Sende kaç kişi hazır? (sen dahil)
            <input type="number" min={1} max={size - 1} value={f.ready} onChange={(e) => set('ready', e.target.value)} />
          </label>
        </div>
      ))}

      <div className={'summary' + (valid ? '' : ' bad')}>
        {valid
          ? isKosu
            ? <>İlan açılınca <b>seninle koşmak isteyenler</b> sana katılır. Kaç kişi istediğini belirtmene gerek yok.</>
            : isTeam
            ? <>İlanda <b>{teamSize} kişilik bir rakip {f.sport === 'padel' ? 'ikili' : 'takım'}</b> aranacak. Maç toplam {size} kişi.</>
            : <>İlanda <b>{seeking} kişi</b> aranacak. Hazır olan {ready} kişinin uygulamadan katılmasına gerek yok.</>
          : !inFuture ? 'Saat geçmiş görünüyor. İleri bir saat seç.' : posTotal > seeking ? `Aranan pozisyon sayısı (${posTotal}) aranan kişi sayısından (${seeking}) fazla olamaz.` : !f.place.trim() ? (isKosu ? 'Nerede koşacağını yaz.' : 'Bir saha seç (ilçe veya isimle arayabilirsin).') : 'Hazır olan kişi sayısı toplamdan az olmalı.'}
      </div>

      {usesPos && seeking >= 1 && (
        <fieldset className="pos-want">
          <legend>Eksik pozisyonlar <span>(isteğe bağlı)</span></legend>
          <div className="pos-grid">
            {POSITIONS.map((p) => {
              const n = f.wanted[p] || 0
              return (
                <div key={p} className={'pos-cell' + (n ? ' on' : '')}>
                  <span>{p}</span>
                  <div className="stepper sm">
                    <button type="button" onClick={() => setWanted(p, n - 1)} disabled={n === 0} aria-label={p + ' azalt'}>−</button>
                    <b>{n}</b>
                    <button type="button" onClick={() => setWanted(p, n + 1)} disabled={posTotal >= seeking} aria-label={p + ' arttır'}>+</button>
                  </div>
                </div>
              )
            })}
          </div>
          <small className="meta">
            {posTotal === 0 ? 'Seçmezsen pozisyon fark etmez.' : seeking - posTotal > 0 ? `Kalan ${seeking - posTotal} kişi için pozisyon fark etmez.` : 'Bütün yerler belirli pozisyonlara ayrıldı.'}
          </small>
        </fieldset>
      )}

      <div className="two">
        <label>Gün
          <select value={f.day} onChange={(e) => set('day', e.target.value)}>
            {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </label>
        <label>Saat
          <input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} required />
        </label>
      </div>

      <div className="two">
        <label>{isKosu ? 'Nerede koşacaksın?' : 'Yer'}
          {isKosu
            ? <input type="text" maxLength={80} value={f.place} onChange={(e) => set('place', e.target.value)} placeholder="Örn: Bostanlı sahili, Kültürpark" />
            : <VenueSelect list={VENUES[f.sport]} value={f.place} onChange={(v) => set('place', v)} />}
        </label>
        <label>{isKosu ? 'Tempo aralığı' : 'Seviye'}
          <select value={f.level} onChange={(e) => set('level', e.target.value)}>
            {(isKosu ? PACES : LEVELS).map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
      </div>

      <label>Puan şartı: <b>{num(f.minTrust) ? `en az ${f.minTrust}` : 'yok, herkes katılabilir'}</b>
        <input type="range" min={0} max={90} step={10} value={f.minTrust} onChange={(e) => set('minTrust', e.target.value)} />
      </label>

      <label>Not (isteğe bağlı)
        <textarea rows={3} maxLength={160} placeholder="Örn: Fazladan raketim var" value={f.note} onChange={(e) => set('note', e.target.value)} />
      </label>

      <label>WhatsApp grup linki (isteğe bağlı)
        <input type="url" inputMode="url" placeholder="https://chat.whatsapp.com/..." value={f.wa} onChange={(e) => set('wa', e.target.value)} aria-invalid={!waOk} />
        <span className={'field-hint' + (waOk ? '' : ' err')}>
          {waOk ? 'Sadece maça katılanlar görür. WhatsApp’ta grup → Gruba davet et → Bağlantıyı kopyala.' : 'Bu bir WhatsApp grup linki gibi görünmüyor.'}
        </span>
      </label>

      <button className="btn primary big" type="submit" disabled={!valid}>Maçı aç</button>
    </form>
  )
}
