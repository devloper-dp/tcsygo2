import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Check } from 'lucide-react';

export type Language = 'en' | 'hi' | 'mr';

interface LanguageOption {
    code: Language;
    name: string;
    nativeName: string;
}

const languages: LanguageOption[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

export function LanguageSelector() {
    const { i18n } = useTranslation();
    const currentLanguage = (i18n.language?.split('-')[0] as Language) || 'en';

    const handleLanguageChange = (lang: Language) => {
        i18n.changeLanguage(lang);
    };

    const getCurrentLanguageName = () => {
        const lang = languages.find((l) => l.code === currentLanguage);
        return lang?.nativeName || 'English';
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Languages className="w-4 h-4" />
                    <span className="hidden sm:inline">{getCurrentLanguageName()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className="flex items-center justify-between"
                    >
                        <div>
                            <p className="font-medium">{lang.nativeName}</p>
                            <p className="text-xs text-muted-foreground">{lang.name}</p>
                        </div>
                        {currentLanguage === lang.code && (
                            <Check className="w-4 h-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
