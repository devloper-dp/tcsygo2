import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

const resources = {
    en: {
        translation: {
            "welcome": "Welcome",
            "book_ride": "Book a Ride",
            "ride_preferences": "Ride Preferences",
            "save": "Save"
        }
    },
    hi: {
        translation: {
            "welcome": "स्वागत है",
            "book_ride": "एक सवारी बुक करें",
            "ride_preferences": "सवारी की प्राथमिकताएं",
            "save": "सहेजें"
        }
    },
    mr: {
        translation: {
            "welcome": "स्वागत आहे",
            "book_ride": "राइड बुक करा",
            "ride_preferences": "राइड पसंती",
            "save": "जतन करा"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getLocales()[0].languageCode || 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
