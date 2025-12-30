import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationCenter } from './NotificationCenter';
import { LanguageSelector } from './LanguageSelector';
import { WalletBalanceWidget } from './WalletBalanceWidget';
import { User, LogOut, LayoutDashboard, UserCircle, Wallet, MapPin, Moon, Sun, Monitor, Shield, Building2 } from 'lucide-react';
import { useTheme } from '@/lib/theme-store';
import { OrganizationSettings } from './OrganizationSettings';
import { useState } from 'react';

export function Navbar() {
    const [, navigate] = useLocation();
    const { user, signOut, loading } = useAuth();
    const { theme, setTheme } = useTheme();
    const [showOrgSettings, setShowOrgSettings] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/');
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    const getThemeIcon = () => {
        if (theme === 'dark') return <Moon className="h-4 w-4" />;
        if (theme === 'light') return <Sun className="h-4 w-4" />;
        return <Monitor className="h-4 w-4" />;
    };

    return (
        <header className="sticky top-0 z-[100] border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pointer-events-auto">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-lg">T</span>
                    </div>
                    <span className="font-display font-bold text-xl">TCSYGO</span>
                </div>

                <nav className="hidden md:flex items-center gap-6">
                    {/* Show Find a Ride for passengers only */}
                    {(!user || user.role === 'passenger') && (
                        <Button variant="ghost" onClick={() => navigate('/search')} data-testid="link-find-ride">
                            Find a Ride
                        </Button>
                    )}
                    {user && (
                        <>
                            {/* Show Offer a Ride only for drivers */}
                            {(user.role === 'driver') && (
                                <>
                                    <Button variant="ghost" onClick={() => navigate('/driver-requests')} className="text-primary font-semibold">
                                        Start Driving
                                    </Button>
                                    <Button variant="ghost" onClick={() => navigate('/create-trip')} data-testid="link-offer-ride">
                                        Offer a Ride
                                    </Button>
                                </>
                            )}
                            <Button variant="ghost" onClick={() => navigate('/my-trips')} data-testid="link-my-trips">
                                My Trips
                            </Button>
                        </>
                    )}
                </nav>

                <div className="flex items-center gap-3">
                    {(loading && !user) ? (
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                    ) : user ? (
                        <>
                            <WalletBalanceWidget />
                            <LanguageSelector />
                            <NotificationCenter />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden border hover:bg-accent transition-colors">
                                        <Avatar className="h-full w-full">
                                            <AvatarImage src={user.profilePhoto || undefined} alt={user.fullName} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {user.fullName.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <div className="flex flex-col space-y-1 p-2">
                                        <p className="text-sm font-semibold leading-none">{user.fullName}</p>
                                        <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                                        <UserCircle className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/my-trips')} className="cursor-pointer">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        <span>My Trips</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/wallet')} className="cursor-pointer">
                                        <Wallet className="mr-2 h-4 w-4" />
                                        <span>Wallet</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/saved-places')} className="cursor-pointer">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        <span>Saved Places</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/safety-center')} className="cursor-pointer">
                                        <Shield className="mr-2 h-4 w-4 text-primary" />
                                        <span>Safety Center</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowOrgSettings(true)} className="cursor-pointer">
                                        <Building2 className="mr-2 h-4 w-4 text-primary" />
                                        <span>Work Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
                                                {getThemeIcon()}
                                                <span className="ml-2">Theme</span>
                                            </div>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent side="left" align="start">
                                            <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer">
                                                <Sun className="mr-2 h-4 w-4" />
                                                <span>Light</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer">
                                                <Moon className="mr-2 h-4 w-4" />
                                                <span>Dark</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer">
                                                <Monitor className="mr-2 h-4 w-4" />
                                                <span>System</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => navigate('/login')} data-testid="button-login">
                                Log In
                            </Button>
                            <Button onClick={() => navigate('/signup')} data-testid="button-signup">
                                Sign Up
                            </Button>
                        </>
                    )}
                </div>
            </div>
            <OrganizationSettings isOpen={showOrgSettings} onOpenChange={setShowOrgSettings} />
        </header>
    );
}
