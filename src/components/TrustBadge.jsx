import { trustTier } from '../lib/trust.js'
import { useGuest } from '../lib/guest.js'

export default function TrustBadge({ score, compact = false }) {
  const guest = useGuest()
  if (guest) return <span className="trust blurred" aria-hidden="true"><i />••</span>
  const t = trustTier(score)
  return (
    <span className={'trust trust-' + t.key} title={'Güven Puanı: ' + score}>
      <i />
      {score}
      {!compact && <small>{t.label}</small>}
    </span>
  )
}
