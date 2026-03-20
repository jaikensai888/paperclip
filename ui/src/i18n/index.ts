import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enPages from './locales/en/pages.json';
import enComponents from './locales/en/components.json';
import zhCommon from './locales/zh/common.json';
import zhPages from './locales/zh/pages.json';
import zhComponents from './locales/zh/components.json';

export const defaultNS = 'common';
export const resources = {
  en: {
    common: enCommon,
    pages: enPages,
    components: enComponents,
  },
  zh: {
    common: zhCommon,
    pages: zhPages,
    components: zhComponents,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
