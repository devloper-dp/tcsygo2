import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    actualTheme: 'light' | 'dark';
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set, get) => ({
            theme: 'system',
            actualTheme: 'light',
            setTheme: (theme: Theme) => {
                set({ theme });
                applyTheme(theme);
            },
        }),
        {
            name: 'tcsygo-theme',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    applyTheme(state.theme);
                }
            },
        }
    )
);

// Export a convenience hook with the same name as before for compatibility
export const useTheme = useThemeStore;

function applyTheme(theme: Theme) {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let actualTheme: 'light' | 'dark';

    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        actualTheme = systemTheme;
        root.classList.add(systemTheme);
    } else {
        actualTheme = theme;
        root.classList.add(theme);
    }

    useThemeStore.setState({ actualTheme });
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const theme = useThemeStore.getState().theme;
        if (theme === 'system') {
            applyTheme('system');
        }
    });
}
