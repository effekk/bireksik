import { createContext, useContext } from 'react'

// Profil fotoğrafları: { kullanıcıId: fotoğrafAdresi }
// Taslakta fotoğraf sadece tarayıcıda durur; Supabase gelince sunucuya yüklenecek.
export const PhotoContext = createContext({ photos: {}, setPhoto: () => {} })

export function usePhotos() {
  return useContext(PhotoContext)
}

export default function Avatar({ user, className = '' }) {
  const { photos } = usePhotos()
  const src = user && (photos[user.id] || user.photo)
  if (src) {
    return (
      <span className={'avatar has-photo ' + className}>
        <img src={src} alt={user.name} />
      </span>
    )
  }
  return <span className={'avatar ' + className}>{user?.name?.[0] ?? '?'}</span>
}
