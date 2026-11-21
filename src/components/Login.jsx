import { useState } from 'react'
import Logo from './Logo.jsx'
import { supabase, trError } from '../lib/supabase.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// E-posta ile giriş/kayıt: adrese 6 haneli kod gider, sonra kod girilir.
// mode='signup' → yeni hesap açılabilir. mode='login' → sadece kayıtlı hesaplar.
export default function Login({ mode = 'signup', onBack, onSwitch }) {
  const signup = mode === 'signup'
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('mail')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const mail = email.trim().toLowerCase()
  const valid = EMAIL_RE.test(mail)

  const sendCode = async (e) => {
    e?.preventDefault()
    if (!valid || busy) return
    setBusy(true); setErr(''); setInfo('')
    const { error } = await supabase.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: signup } })
    setBusy(false)
    if (error) {
      const m = (error.message || '').toLowerCase()
      // Giriş modunda kayıtlı olmayan e-posta
      if (!signup && (m.includes('signups not allowed') || m.includes('otp_disabled') || m.includes('not found'))) {
        return setErr('Bu e-posta kayıtlı değil. "Üye ol" ile hesap oluşturabilirsin.')
      }
      return setErr(trError(error))
    }
    setStep('code'); setCode(''); setInfo('Kod gönderildi.')
  }

  const verify = async (e) => {
    e.preventDefault()
    if (code.length < 6 || busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.auth.verifyOtp({ email: mail, token: code, type: 'email' })
    setBusy(false)
    if (error) setErr(trError(error))
  }

  return (
    <div className="login page">
      <div className="login-art" aria-hidden="true">
        <svg viewBox="0 0 200 60">
          {[20, 70, 120].map((x) => <circle key={x} cx={x} cy="30" r="18" fill="#fff" fillOpacity=".92" />)}
          <circle cx="172" cy="30" r="17" fill="none" stroke="var(--ball)" strokeWidth="3.5" strokeDasharray="7 5" />
        </svg>
      </div>
      <div className="login-card page" key={mode + step}>
        {onBack && step === 'mail' && (
          <button type="button" className="back-link" onClick={onBack}>← Siteyi incelemeye dön</button>
        )}
        <Logo size={32} />
        {step === 'mail' ? (
          <form onSubmit={sendCode}>
            <h1>{signup ? 'Üye ol' : 'Giriş yap'}</h1>
            <p className="meta">
              {signup
                ? 'E-postanı yaz, 6 haneli bir kod gönderelim. Birkaç saniyede hesabın hazır.'
                : 'Kayıtlı e-postana 6 haneli bir giriş kodu göndereceğiz.'}
            </p>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              aria-label="E-posta adresi"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button className="btn primary big" disabled={!valid || busy}>{busy ? 'Gönderiliyor…' : (signup ? 'Üye ol' : 'Kod gönder')}</button>
            {onSwitch && (
              <p className="meta small switch-auth">
                {signup ? 'Zaten üye misin? ' : 'Hesabın yok mu? '}
                <button type="button" className="link" onClick={onSwitch}>{signup ? 'Giriş yap' : 'Üye ol'}</button>
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={verify}>
            <button type="button" className="back-link" onClick={() => { setStep('mail'); setCode(''); setErr(''); setInfo('') }}>← Geri dön</button>
            <h1>Kodu gir</h1>
            <p className="meta">Kodu <b>{mail}</b> adresine gönderdik. Yanlış mı yazdın? <b>Geri dön</b>'e basıp düzeltebilirsin. Gelen kutunda yoksa spam klasörüne de bak.</p>
            <input className="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" aria-label="Doğrulama kodu" autoFocus />
            <button className="btn primary big" disabled={code.length < 6 || busy}>{busy ? 'Kontrol ediliyor…' : (signup ? 'Üye ol' : 'Giriş yap')}</button>
            <div className="row-links">
              <button type="button" className="link" onClick={sendCode} disabled={busy}>Kodu tekrar gönder</button>
            </div>
          </form>
        )}
        {info && !err && <p className="ok">{info}</p>}
        {err && <p className="err" role="alert">{err}</p>}
      </div>
    </div>
  )
}
