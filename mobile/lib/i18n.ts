import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
    en: {
        translation: {
            "welcome": "Welcome to TCSYGO",
            "book_ride": "Book a Ride",
            "ride_preferences": "Ride Preferences",
            "save": "Save Changes",
            "common": {
                "error": "Error",
                "success": "Success",
                "ok": "OK"
            },
            "settings": {
                "title": "Settings",
                "preferences": "Preferences",
                "language": "Language",
                "dark_mode": "Dark Mode",
                "legal": "Legal",
                "terms_of_service": "Terms of Service",
                "privacy_policy": "Privacy Policy",
                "danger_zone": "Danger Zone",
                "logout": "Log Out",
                "delete_account": "Delete Account",
                "logout_confirm": "Are you sure you want to log out?",
                "cancel": "Cancel",
                "confirm": "Confirm",
                "theme_changed": "Theme changed successfully",
                "dark_mode_now": "Dark mode is now",
                "on": "on",
                "off": "off"
            },
            "tabs": {
                "home": "Home",
                "search": "Search",
                "trips": "My Trips",
                "profile": "Profile"
            },
            "profile": {
                "account": 'Account',
                "general": 'General',
                "support": 'Support',
                "edit_profile": 'Edit Profile',
                "earnings": 'Earnings',
                "my_vehicles": 'My Vehicles',
                "ride_preferences": 'Ride Preferences',
                "wallet_payments": 'Wallet & Payments',
                "refer_earn": 'Refer & Earn',
                "ride_stats": 'Ride Statistics',
                "safety_center": 'Safety Center',
                "notifications": 'Notifications',
                "help_support": 'Help & Support',
                "settings": 'Settings',
                "trips": 'trips',
                "rating": 'Rating',
                "wallet": 'Wallet',
                "passenger": 'Passenger',
                "driver": 'Driver',
                "earned": "Earned",
                "full_name": "Full Name",
                "phone_number": "Phone Number",
                "email_readonly": "Email (Cannot be changed)",
                "enter_name": "Enter your full name",
                "enter_phone": "+91 98765 43210",
                "bio": "Bio",
                "save_success": "Profile updated successfully",
                "name_required": "Full Name is required"
            },
            "driver": {
                "ride_requests": "Ride Requests",
                "showing_pending_requests": "Showing all pending ride requests near you.",
                "searching_title": "Searching for Riders",
                "searching_subtitle": "We're looking for passengers nearby. Stay tuned!",
                "accept_success": "Request Accepted",
                "accept_subtitle": "Navigate to pickup location.",
                "accept_failed": "Failed to accept",
                "accept_ride": "Accept Ride Request",
                "accepting": "Accepting...",
                "pickup": "Pickup",
                "dropoff": "Dropoff",
                "distance": "Distance",
                "est_time": "Est. Time"
            }
        }
    },
    hi: {
        translation: {
            "welcome": "TCSYGO में आपका स्वागत है",
            "book_ride": "सवारी बुक करें",
            "ride_preferences": "सवारी प्राथमिकताएं",
            "save": "परिवर्तन सहेजें",
            "common": {
                "error": "त्रुटि",
                "success": "सफलता",
                "ok": "ठीक है"
            },
            "settings": {
                "title": "सेटिंग्स",
                "preferences": "प्राथमिकताएं",
                "language": "भाषा",
                "dark_mode": "डार्क मोड",
                "legal": "कानूनी",
                "terms_of_service": "सेवा की शर्तें",
                "privacy_policy": "गोपनीयता नीति",
                "danger_zone": "खतरनाक क्षेत्र",
                "logout": "लॉग आउट",
                "delete_account": "खाता हटाएं",
                "logout_confirm": "क्या आप वाकई लॉग आउट करना चाहते हैं?",
                "cancel": "रद्द करें",
                "confirm": "पुष्टि करें",
                "theme_changed": "थीम सफलतापूर्वक बदल गई",
                "dark_mode_now": "डार्क मोड अब",
                "on": "चालू",
                "off": "बंद"
            },
            "tabs": {
                "home": "होम",
                "search": "खोजें",
                "trips": "मेरी यात्राएं",
                "profile": "प्रोफ़ाइल"
            },
            "profile": {
                "account": 'खाता',
                "general": 'सामान्य',
                "support": 'सहायता',
                "edit_profile": 'प्रोफ़ाइल संपादित करें',
                "earnings": 'कमाई',
                "my_vehicles": 'मेरे वाहन',
                "ride_preferences": 'सवारी प्राथमिकताएं',
                "wallet_payments": 'वॉलेट और भुगतान',
                "refer_earn": 'रेफर करें और कमाएं',
                "ride_stats": 'सवारी के आंकड़े',
                "safety_center": 'सुरक्षा केंद्र',
                "notifications": 'सूचनाएं',
                "help_support": 'सहायता और समर्थन',
                "settings": 'सेटिंग्स',
                "trips": 'यात्राएं',
                "rating": 'रेटिंग',
                "wallet": 'वॉलेट',
                "passenger": 'यात्री',
                "driver": 'ड्राइवर',
                "earned": "कुल कमाई",
                "full_name": "पूरा नाम",
                "phone_number": "फ़ोन नंबर",
                "email_readonly": "ईमेल (बदला नहीं जा सकता)",
                "enter_name": "अपना पूरा नाम दर्ज करें",
                "enter_phone": "+91 98765 43210",
                "bio": "बायो",
                "save_success": "प्रोफ़ाइल सफलतापूर्वक अपडेट की गई",
                "name_required": "पूरा नाम आवश्यक है"
            },
            "driver": {
                "ride_requests": "सवारी के अनुरोध",
                "showing_pending_requests": "आपके आस-पास के सभी लंबित सवारी अनुरोध दिखा रहा है।",
                "searching_title": "सवारियों की खोज",
                "searching_subtitle": "हम पास के यात्रियों की तलाश कर रहे हैं। बने रहें!",
                "accept_success": "अनुरोध स्वीकार कर लिया गया",
                "accept_subtitle": "पिकअप स्थान पर जाएं।",
                "accept_failed": "स्वीकार करने में विफल",
                "accept_ride": "सवारी अनुरोध स्वीकार करें",
                "accepting": "स्वीकार किया जा रहा है...",
                "pickup": "पिकअप",
                "dropoff": "ड्रॉप-ऑफ",
                "distance": "दूरी",
                "est_time": "अनुमानित समय"
            }
        }
    },
    mr: {
        translation: {
            "welcome": "TCSYGO मध्ये आपले स्वागत आहे",
            "book_ride": "राइड बुक करा",
            "ride_preferences": "राइड पसंती",
            "save": "बदल जतन करा",
            "common": {
                "error": "त्रुटी",
                "success": "यश",
                "ok": "ठोक"
            },
            "settings": {
                "title": "सेटिंग्ज",
                "preferences": "पसंती",
                "language": "भाषा",
                "dark_mode": "डार्क मोड",
                "legal": "कायदेशीर",
                "terms_of_service": "सेवा अटी",
                "privacy_policy": "गोपनीयता धोरण",
                "danger_zone": "धोकादायक क्षेत्र",
                "logout": "लॉग आउट",
                "delete_account": "खाते हटवा",
                "logout_confirm": "तुम्हाला खात्री आहे की तुम्ही लॉग आउट करू इच्छिता?",
                "cancel": "रद्द करा",
                "confirm": "पुष्टी करा",
                "theme_changed": "थीम यशस्वीरित्या बदलली",
                "dark_mode_now": "डार्क मोड आता",
                "on": "सुरू",
                "off": "बंद"
            },
            "tabs": {
                "home": "होम",
                "search": "शोधा",
                "trips": "माझ्या सहली",
                "profile": "प्रोफाइल"
            },
            "profile": {
                "account": 'खाते',
                "general": 'सामान्य',
                "support": 'मदत',
                "edit_profile": 'प्रोफाइल संपादित करा',
                "earnings": 'कमाई',
                "my_vehicles": 'माझी वाहने',
                "ride_preferences": 'प्रवास पसंती',
                "wallet_payments": 'वॉलेट आणि पेमेंट',
                "refer_earn": 'संदर्भ द्या आणि कमवा',
                "ride_stats": 'प्रवास आकडेवारी',
                "safety_center": 'सुरक्षा केंद्र',
                "notifications": 'सूचना',
                "help_support": 'मदत आणि समर्थन',
                "settings": 'सेटिंग्ज',
                "trips": 'प्रवास',
                "rating": 'रेटिंग',
                "wallet": 'वॉलेट',
                "passenger": 'प्रवासी',
                "driver": 'चालक',
                "earned": "एकूण कमाई",
                "full_name": "पूर्ण नाव",
                "phone_number": "फोन नंबर",
                "email_readonly": "ईमेल (बदलले जाऊ शकत नाही)",
                "enter_name": "तुमचे पूर्ण नाव प्रविष्ट करा",
                "enter_phone": "+91 98765 43210",
                "bio": "बायो",
                "save_success": "प्रोफाइल यशस्वीरित्या अपडेट केली",
                "name_required": "पूर्ण नाव आवश्यक आहे"
            },
            "driver": {
                "ride_requests": "प्रवास विनंत्या",
                "showing_pending_requests": "तुमच्या जवळील सर्व प्रलंबित प्रवास विनंत्या दाखवत आहे.",
                "searching_title": "प्रवाशांचा शोध घेत आहे",
                "searching_subtitle": "आम्ही जवळच्या प्रवाशांचा शोध घेत आहोत. संपर्कात रहा!",
                "accept_success": "विनंती स्वीकारली",
                "accept_subtitle": "पिकअप स्थानावर जा.",
                "accept_failed": "स्वीकारण्यात अयशस्वी",
                "accept_ride": "प्रवास विनंती स्वीकारली",
                "accepting": "स्वीकारत आहे...",
                "pickup": "पिकअप",
                "dropoff": "ड्रॉप-ऑफ",
                "distance": "अंतर",
                "est_time": "अंदाजे वेळ"
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
