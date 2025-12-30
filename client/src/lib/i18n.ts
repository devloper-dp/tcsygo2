import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../i18n/locales/en.json';
import hi from '../i18n/locales/hi.json';
import mr from '../i18n/locales/mr.json';

const resources = {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;
