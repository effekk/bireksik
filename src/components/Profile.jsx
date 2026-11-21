import { ME, POSITIONS, USERS } from '../data/mock.js'
import DeptSelect from './DeptSelect.jsx'
import { cleanInstagram, instaUrl, SKILL_LEVELS } from '../lib/util.js'
import { loadMyProfileExtras, setNotePublic, waSendCode, waVerifyCode } from '../lib/api.js'
import { trError } from '../lib/supabase.js'
import { KUDOS, KUDOS_BY_KEY } from '../lib/kudos.js'
import { useEffect, useRef, useState } from 'react'
import { PENALTIES, trustTier } from '../lib/trust.js'
import Avatar, { usePhotos } from './Avatar.jsx'

const MAX_MB = 5

function PhotoPicker() {
  const { photos, setPhoto } = usePhotos()
  const input = useRef(null)
  const [err, setErr] = useState('')
  const has = photos[ME.id] !== undefined ? Boolean(photos[ME.id]) : Boolean(ME.photo)

  const pick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setErr('Lütfen bir fotoğraf seç.')
    if (file.size > MAX_MB * 1024 * 1024) return setErr(`Fotoğraf ${MAX_MB} MB'tan küçük olmalı.`)
    setErr('')
    setPhoto(ME.id, file)
  }

  return (
    <div className="photo-pick">
      <button type="button" className="photo-btn" onClick={() => input.current?.click()} aria-label="Profil fotoğrafını değiştir">
        <Avatar user={ME} className="xl" />
        <span className="cam" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      <div className="photo-actions">
        <button type="button" className="link" onClick={() => input.current?.click()}>{has ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}</button>
        {has && <button type="button" className="link muted" onClick={() => setPhoto(ME.id, null)}>Kaldır</button>}
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  )
}

function KudosPanel({ notes, setNotes }) {
  const [err, setErr] = useState('')
  const total = Object.values(ME.kudos || {}).reduce((a, b) => a + b, 0)
  const flip = async (id) => {
    const n = notes.find((x) => x.id === id)
    setNotes((ns) => ns.map((x) => (x.id === id ? { ...x, public: !x.public } : x)))
    try { await setNotePublic(n.matchId, n.from, !n.public) } catch (e) {
      setErr(trError(e))
      setNotes((ns) => ns.map((x) => (x.id === id ? { ...x, public: n.public } : x)))
    }
  }

  return (
    <section className="panel kpanel">
      <h2>Aldığın takdirler <span className="kcount">{total}</span></h2>
      <div className="kbadges">
        {KUDOS.map((k) => (
          <div key={k.key} className={'kbadge' + (ME.kudos[k.key] ? '' : ' zero')}>
            <span className="kb-icon" aria-hidden="true">{k.icon}</span>
            <b>{ME.kudos[k.key] || 0}</b>
            <span>{k.label}</span>
          </div>
        ))}
      </div>

      <h3 className="ksub">Sana bırakılan notlar</h3>
      <p className="meta small">Notları sadece sen görürsün. Açtığın notlar profilinde herkese görünür.</p>
      <ul className="knotes">
        {notes.filter((n) => n.text).map((n) => (
          <li key={n.id}>
            <div>
              <p>“{n.text}”</p>
              <small>{USERS[n.from]?.name || 'Bir oyuncu'} · {n.tags.map((t) => KUDOS_BY_KEY[t].label).join(', ')}</small>
            </div>
            <label className="switch">
              <input type="checkbox" checked={n.public} onChange={() => flip(n.id)} />
              <span>{n.public ? 'Profilde' : 'Gizli'}</span>
            </label>
          </li>
        ))}
      </ul>
      {notes.filter((n) => n.text).length === 0 && <p className="meta small">Henüz not yok. Maçlardan sonra oyuncular sana not bırakabilir.</p>}
      {err && <p className="err">{err}</p>}
      <p className="meta small">Takdirler Güven Puanını etkilemez.</p>
    </section>
  )
}

const SPORTS = [
  { key: 'padel', label: 'Padel' },
  { key: 'halisaha', label: 'Halı saha' },
]
const SKILL = SKILL_LEVELS

// Oynadığın sporlar: sadece seçilenlerin bilgileri (seviye, pozisyon) profilde görünür
function SportPrefs({ prefs, onChange }) {
  const [warn, setWarn] = useState(false)
  const { sports, level, positions } = prefs
  const toggleSport = (k) => {
    if (sports.includes(k) && sports.length === 1) { setWarn(true); return }
    setWarn(false)
    onChange({ ...prefs, sports: sports.includes(k) ? sports.filter((x) => x !== k) : [...sports, k] })
  }
  const togglePos = (p) =>
    onChange({ ...prefs, positions: positions.includes(p) ? positions.filter((x) => x !== p) : [...positions, p] })

  return (
    <section className="panel sport-prefs">
      <h2>Oynadığın sporlar</h2>
      <p className="meta small">Oynamadığın sporun bilgileri profilinde görünmez. Maç listen de sadece seçtiğin sporlarla açılır.</p>
      <div className="sport-toggles">
        {SPORTS.map((s) => {
          const on = sports.includes(s.key)
          return (
            <div key={s.key} className={'sport-card ' + s.key + (on ? ' on' : '')}>
              <label className="sport-head">
                <input type="checkbox" checked={on} onChange={() => toggleSport(s.key)} />
                <b>{s.label}</b>
                <span>{on ? 'Oynuyorum' : 'Oynamıyorum'}</span>
              </label>
              {on && (
                <div className="sport-body">
                  <label>Seviyen
                    <select value={level[s.key] || 'Orta'} onChange={(e) => onChange({ ...prefs, level: { ...level, [s.key]: e.target.value } })}>
                      {SKILL.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </label>
                  {s.key === 'halisaha' && (
                    <div className="pos-block">
                      <span>Pozisyonların <small>(birden fazla seçebilirsin)</small></span>
                      <div className="pos-row">
                        {POSITIONS.map((p) => (
                          <button type="button" key={p} className={'pos-tag btn-like' + (positions.includes(p) ? ' on' : '')} aria-pressed={positions.includes(p)} onClick={() => togglePos(p)}>
                            {p}
                          </button>
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
      {warn && <p className="err">En az bir spor seçili olmalı.</p>}
    </section>
  )
}

function sportLine(prefs) {
  return prefs.sports.map((k) => {
    if (k === 'padel') return `Padel: ${prefs.level.padel}`
    return `Halı saha: ${prefs.level.halisaha}${prefs.positions.length ? ` (${prefs.positions.join(', ')})` : ''}`
  }).join(' · ')
}

// İsim ve bölüm düzenleme
function InfoEditor({ onSave, onCancel }) {
  const [name, setName] = useState(ME.name)
  const [dept, setDept] = useState(ME.dept || '')
  const [instagram, setInstagram] = useState(ME.instagram || '')
  return (
    <form className="info-edit" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ name: name.trim(), dept: dept.trim(), instagram: cleanInstagram(instagram) }) }}>
      <label>Adın (diğerleri böyle görecek)
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Örn: Efe K." required />
      </label>
      <label>Bölümün
        <DeptSelect value={dept} onChange={setDept} />
      </label>
      <label>Instagram
        <div className="ig-input"><span>@</span><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="kullanici.adi" autoCapitalize="none" autoCorrect="off" /></div>
      </label>
      <div className="row-end">
        <button type="button" className="link muted" onClick={onCancel}>Vazgeç</button>
        <button className="btn primary">Kaydet</button>
      </div>
    </form>
  )
}

// SMS ile telefon doğrulama (Twilio Verify)
function PhoneVerify() {
  const [verified, setVerified] = useState(ME.phoneVerified)
  const [phone, setPhone] = useState(ME.phone || '')
  const [step, setStep] = useState('phone') // phone | code
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const send = async (e) => {
    e?.preventDefault()
    if (busy || !phone.trim()) return
    setBusy(true); setErr(''); setInfo('')
    try { await waSendCode(phone); setStep('code'); setCode(''); setInfo('Kod SMS ile gönderildi.') }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  const verify = async (e) => {
    e.preventDefault()
    if (busy || code.length < 6) return
    setBusy(true); setErr('')
    try { const o = await waVerifyCode(code); setPhone(o.phone || phone); setVerified(true) }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  if (verified) return (
    <section className="panel verify-panel">
      <div className="vp-ok">
        <span className="vp-badge">✓ Numara doğrulandı</span>
        <b>{ME.phone}</b>
      </div>
      <button type="button" className="link muted" onClick={() => { setVerified(false); setStep('phone'); setInfo(''); setErr('') }}>Numarayı değiştir</button>
    </section>
  )

  return (
    <section className="panel verify-panel">
      <h2>Telefon doğrulama</h2>
      <p className="meta small">Numaranı SMS ile doğrula: hatırlatma ve bildirimler buraya gelir, ayrıca her numaraya tek hesap açılır.</p>
      {step === 'phone' ? (
        <form onSubmit={send} className="vp-form">
          <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" />
          <button className="btn primary" disabled={busy || !phone.trim()}>{busy ? 'Gönderiliyor…' : 'SMS ile kod gönder'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="vp-form">
          <p className="meta small"><b>{phone}</b> numarasına SMS ile 6 haneli kod gönderdik.</p>
          <input className="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" autoFocus />
          <button className="btn primary" disabled={busy || code.length < 6}>{busy ? 'Kontrol ediliyor…' : 'Doğrula'}</button>
          <div className="row-links">
            <button type="button" className="link" onClick={() => { setStep('phone'); setErr(''); setInfo('') }}>Numarayı değiştir</button>
            <button type="button" className="link" onClick={send} disabled={busy}>Kodu tekrar gönder</button>
          </div>
        </form>
      )}
      {info && !err && <p className="ok">{info}</p>}
      {err && <p className="err">{err}</p>}
    </section>
  )
}

export default function Profile({ prefs, onPrefs, onSaveInfo, email, onLogout }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState([])
  const [history, setHistory] = useState([])
  useEffect(() => {
    loadMyProfileExtras().then((x) => { setNotes(x.notes); setHistory(x.history) }).catch(() => {})
  }, [])
  const t = trustTier(ME.trust)
  return (
    <div className="profile">
      <section className="p-head">
        <PhotoPicker />
        <div>
          {editing ? (
            <InfoEditor onSave={async (v) => { await onSaveInfo(v); setEditing(false) }} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <h1>{ME.name}</h1>
              <p className="meta">{ME.dept ? ME.dept + ' · ' : ''}{sportLine(prefs)}</p>
              <p className="meta small">{email}</p>
              {ME.instagram && <a className="ig-link" href={instaUrl(ME.instagram)} target="_blank" rel="noopener noreferrer">@{ME.instagram}</a>}
              <div className="p-actions">
                <button type="button" className="link" onClick={() => setEditing(true)}>Profilini düzenle</button>
                <button type="button" className="link muted" onClick={onLogout}>Çıkış yap</button>
              </div>
            </>
          )}
        </div>
      </section>

      <PhoneVerify />

      <section className={'trust-panel trust-' + t.key}>
        <div className="tp-score">
          <span className="big">{ME.trust}</span>
          <span>Güven Puanı</span>
        </div>
        <div className="meter"><span style={{ width: ME.trust + '%' }} /></div>
        <div className="tp-stats">
          <div><b>{ME.played}</b><span>oynanan maç</span></div>
          <div><b>{ME.cancels}</b><span>son dakika iptal</span></div>
          <div><b>0</b><span>habersiz gelmeme</span></div>
        </div>
      </section>

      <SportPrefs prefs={prefs} onChange={onPrefs} />

      <KudosPanel notes={notes} setNotes={setNotes} />

      <div className="p-grid">
        <section className="panel">
          <h2>Puan geçmişi</h2>
          {history.length === 0 && <p className="meta small">Henüz bir değişiklik yok. Herkes 100 puanla başlar.</p>}
          <ul className="history">
            {history.map((h, i) => (
              <li key={i}>
                <span><b>{h.what}</b><small>{h.when}</small></span>
                <span className={'delta ' + (h.delta > 0 ? 'up' : 'down')}>{h.delta > 0 ? '+' : ''}{h.delta}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Güven Puanı nasıl çalışır?</h2>
          <p className="meta">Herkes 100 puanla başlar. Oynadığın her maç bittikten sonra 2 puan kazanırsın (en fazla 100).</p>
          <table className="ptable">
            <tbody>
              {PENALTIES.map((p) => (
                <tr key={p.when}><td>{p.when}</td><td className="num">{p.pts === 0 ? '0' : p.pts}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="meta small">Senin yerine başka biri katılırsa ceza yarıya iner. Puanı 50’nin altına düşen biri, puanı tekrar 50’ye çıkana kadar başkalarının maçlarına katılamaz ama kendi maçını açıp oynayarak puan toplayabilir.</p>
        </section>
      </div>
    </div>
  )
}
