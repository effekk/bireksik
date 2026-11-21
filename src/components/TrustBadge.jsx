import { trustTier } from '../lib/trust.js'

export default function TrustBadge({ score, compact = false }) {
  const t = trustTier(score)
  return (
    <span className={'trust trust-' + t.key} title={'Güven Puanı: ' + score}>
      <i />
      {score}
      {!compact && <small>{t.label}</small>}
    </span>
  )
}
