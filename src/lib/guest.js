import { createContext, useContext } from 'react'

// Misafir (üye olmayan) modda mı? Avatar, isim ve güven puanı gibi
// katılımcı bilgileri bu bayrak açıkken blurlanır.
export const GuestContext = createContext(false)
export const useGuest = () => useContext(GuestContext)
