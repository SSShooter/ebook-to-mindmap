import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import zh from './locales/zh.json'
import zhTW from './locales/zh-TW.json'
import ja from './locales/ja.json'
import es from './locales/es.json'
import de from './locales/de.json'
import ko from './locales/ko.json'

export const supportedLngs = [
  'en',
  'zh',
  'zh-TW',
  'ja',
  'es',
  'de',
  'ko',
] as const

export type SupportedLng = (typeof supportedLngs)[number]

const resources = {
  en: {
    translation: en,
  },
  zh: {
    translation: zh,
  },
  'zh-TW': {
    translation: zhTW,
  },
  ja: {
    translation: ja,
  },
  es: {
    translation: es,
  },
  de: {
    translation: de,
  },
  ko: {
    translation: ko,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: supportedLngs as unknown as string[],
    fallbackLng: 'zh',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n
