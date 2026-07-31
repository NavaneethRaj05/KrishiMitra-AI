import { MMKV } from 'react-native-mmkv'
import en from './locales/en.json'
import kn from './locales/kn.json'
import hi from './locales/hi.json'
import ta from './locales/ta.json'
import te from './locales/te.json'
import mr from './locales/mr.json'

const storage = new MMKV()
const translations: Record<string, any> = { en, kn, hi, ta, te, mr }

export const getLanguage = (): string => {
  const farmer = storage.getString('farmer_context')
  if (farmer) {
    try {
      const parsed = JSON.parse(farmer)
      return parsed.preferredLanguage || 'en'
    } catch (e) {}
  }
  return storage.getString('preferred_language') || 'en'
}

export const setLanguage = (lang: string) => {
  storage.set('preferred_language', lang)
}

export const getLanguagesList = () => [
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
]

export const t = (key: string, params?: Record<string, string | number>): string => {
  const lang = getLanguage()
  const langPack = translations[lang] || en
  
  const parts = key.split('.')
  let current = langPack
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = current[part]
    } else {
      break
    }
  }

  if (typeof current !== 'string') {
    let fallback = en as any
    for (const part of parts) {
      if (fallback && typeof fallback === 'object') {
        fallback = fallback[part]
      } else {
        break
      }
    }
    current = typeof fallback === 'string' ? fallback : key
  }

  let text = current
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
    })
  }

  return text
}
export default { t, getLanguage, setLanguage, getLanguagesList };
