import { useState } from 'react'
import { matchLink, shareText } from '../lib/share.js'

// Maçı WhatsApp'ta paylaşma penceresi
export default function ShareSheet({ match, onClose }) {
  const [copied, setCopied] = useState('')
  const text = shareText(match)

  const copy = async (what, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(what)
    } catch {
      setCopied('err')
    }
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Maçı paylaş" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Maçı paylaş</h2>
          <button type="button" className="x" onClick={onClose} aria-label="Kapat">×</button>
        </div>
        <p className="meta">WhatsApp grubunda şöyle görünecek:</p>
        <div className="wa-bubble">
          {text.split('\n').map((l, i) => <p key={i}>{l}</p>)}
        </div>
        <div className="sheet-actions">
          <a className="btn wa big" href={'https://wa.me/?text=' + encodeURIComponent(text)} target="_blank" rel="noopener noreferrer">
            WhatsApp’ta paylaş
          </a>
          <button type="button" className="btn ghost big" onClick={() => copy('text', text)}>Mesajı kopyala</button>
          <button type="button" className="link" onClick={() => copy('link', matchLink(match))}>Sadece linki kopyala</button>
        </div>
        {copied === 'text' && <p className="ok">Mesaj kopyalandı, istediğin gruba yapıştırabilirsin.</p>}
        {copied === 'link' && <p className="ok">Link kopyalandı.</p>}
        {copied === 'err' && <p className="err">Kopyalanamadı. Mesajı elle seçip kopyalayabilirsin.</p>}
        <p className="sample">Taslak: link adresi gerçek site adresi alınınca çalışacak.</p>
      </div>
    </div>
  )
}
