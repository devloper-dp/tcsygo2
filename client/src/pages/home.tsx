import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Navbar } from '@/components/Navbar';
import { RecentSearches, PopularRoutes } from '@/components/SearchSuggestions';
import { RepeatRideButton } from '@/components/RepeatRideButton';
import { FavoriteRoutes } from '@/components/FavoriteRoutes';
import { SafetyTips } from '@/components/SafetyTips';
import { CarbonFootprint } from '@/components/CarbonFootprint';
import { RidePreferences } from '@/components/RidePreferences';
import { Calendar, ArrowRight, Users, Shield, Leaf, DollarSign, Settings } from 'lucide-react';
import { Coordinates } from '@/lib/maps';
import { useSearchStore } from '@/lib/search-store';
import { QuickBookWidget } from '@/components/QuickBookWidget';
import { QuickActions } from '@/components/QuickActions';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import heroImage from '@assets/generated_images/Happy_carpooling_travelers_roadtrip_dc309ad7.png';

export default function Home() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinates>();
  const [drop, setDrop] = useState('');
  const [dropCoords, setDropCoords] = useState<Coordinates>();
  const [date, setDate] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const { addRecentSearch } = useSearchStore();
  const { user } = useAuth();

  // Fetch user statistics for carbon footprint
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return { totalDistance: 0, totalRides: 0 };

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('trip:trips(distance_covered)')
        .eq('passenger_id', user.id)
        .eq('status', 'completed');

      if (error) throw error;

      const totalDistance = bookings?.reduce((sum, b: any) => {
        return sum + (parseFloat(b.trip?.distance_covered) || 0);
      }, 0) || 0;

      return {
        totalDistance,
        totalRides: bookings?.length || 0,
      };
    },
    enabled: !!user,
  });

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (!data?.onboarding_completed) {
        setShowOnboarding(true);
      }
    };

    checkOnboarding();
  }, [user]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleSearch = () => {
    if (!pickup || !drop) return;

    // Add to recent searches
    addRecentSearch({
      pickup,
      drop,
      pickupCoords,
      dropCoords,
      date,
    });

    const params = new URLSearchParams({
      pickup,
      drop,
      ...(pickupCoords && { pickupLat: pickupCoords.lat.toString(), pickupLng: pickupCoords.lng.toString() }),
      ...(dropCoords && { dropLat: dropCoords.lat.toString(), dropLng: dropCoords.lng.toString() }),
      ...(date && { date })
    });

    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Onboarding Tutorial for New Users */}
      <OnboardingTutorial open={showOnboarding} onComplete={handleOnboardingComplete} />

      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="font-display font-bold text-5xl md:text-6xl text-white mb-4">
              {t('home.title')}
            </h1>
            <p className="text-xl text-white/90 mb-8">
              {t('home.subtitle')}
            </p>
            <QuickBookWidget className="mb-6" />
          </div>

          <Card className="max-w-4xl mx-auto p-6 bg-background/95 backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto,auto] gap-4">
              <LocationAutocomplete
                value={pickup}
                onChange={(val, coords) => {
                  setPickup(val);
                  if (coords) setPickupCoords(coords);
                }}
                placeholder={t('common.pickup')}
                testId="input-pickup"
              />

              <LocationAutocomplete
                value={drop}
                onChange={(val, coords) => {
                  setDrop(val);
                  if (coords) setDropCoords(coords);
                }}
                placeholder={t('common.drop')}
                testId="input-drop"
              />

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 w-full pl-10 pr-4 rounded-lg border border-input bg-background text-foreground"
                  data-testid="input-date"
                />
              </div>

              <Button
                size="lg"
                onClick={handleSearch}
                disabled={!pickup || !drop}
                className="whitespace-nowrap"
                data-testid="button-search"
              >
                {t('common.search')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Recent Searches and Popular Routes */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Promotional Banner */}
            {user && (
              <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Welcome Offer!</h3>
                      <p className="text-sm text-muted-foreground">Get 20% off on your first 3 rides. Use code: WELCOME20</p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/search')}>
                    Book Now
                  </Button>
                </div>
              </Card>
            )}

            {/* Quick Actions with Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RepeatRideButton variant="card" />
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/profile')}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Ride Preferences</h3>
                    <p className="text-sm text-muted-foreground">Set your AC, music, and other preferences</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="container mx-auto px-6 py-8">
        <QuickActions className="mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <RecentSearches />
            <PopularRoutes />
          </div>

          <div className="space-y-6">
            <RepeatRideButton />
            <FavoriteRoutes />
            {userStats && (
              <CarbonFootprint
                totalDistance={userStats.totalDistance}
                totalRides={userStats.totalRides}
              />
            )}
            <SafetyTips />
          </div>
        </div>
      </section>

      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <h2 className="font-display font-bold text-4xl text-center mb-12">
            Why Choose TCSYGO?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">Save Money</h3>
              <p className="text-muted-foreground">
                Share travel costs and make your journey more affordable
              </p>
            </Card>

            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-success" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">Go Green</h3>
              <p className="text-muted-foreground">
                Reduce carbon emissions by sharing rides with others
              </p>
            </Card>

            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-warning" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">Travel Safe</h3>
              <p className="text-muted-foreground">
                Verified drivers and secure payment options for peace of mind
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display font-bold text-4xl mb-6">
                  Ready to Start Your Journey?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Join thousands of travelers who are saving money and making new connections every day.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" onClick={() => navigate('/search')} data-testid="button-cta-find">
                    <Users className="mr-2 w-5 h-5" />
                    Find a Ride
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/create-trip')} data-testid="button-cta-offer">
                    Offer a Ride
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Search for a ride</h4>
                      <p className="text-sm text-muted-foreground">
                        Enter your pickup and drop locations to find available trips
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Book your seat</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose a trip that matches your schedule and budget
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Enjoy your journey</h4>
                      <p className="text-sm text-muted-foreground">
                        Track your ride in real-time and arrive safely at your destination
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-12 bg-card">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">T</span>
              </div>
              <span className="font-display font-bold text-xl">TCSYGO</span>
            </div>

            <p className="text-sm text-muted-foreground">
              © 2024 TCSYGO - Indore's Carpooling Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
