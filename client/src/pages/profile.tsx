import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ArrowLeft, User, Car, Star, Camera, Shield, Check, Activity, Loader2, Settings, Wallet, Users as UsersIcon } from 'lucide-react';
import { Driver, TripWithDriver, BookingWithDetails } from '@shared/schema';
import { format } from 'date-fns';
import { RatingModal } from '@/components/RatingModal';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { mapDriver, mapBooking, mapTrip } from '@/lib/mapper';
import { RidePreferences } from '@/components/RidePreferences';
import { EmergencyContactsWrapper } from '@/components/EmergencyContactsWrapper';
import { WalletBalanceWidget } from '@/components/WalletBalanceWidget';
import { AutoPaySetup } from '@/components/AutoPaySetup';
import { RideStatistics } from '@/components/RideStatistics';

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, signOut, updateProfile } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ratingBooking, setRatingBooking] = useState<BookingWithDetails | null>(null);

  const { data: driverProfile } = useQuery<Driver | null>({
    queryKey: ['driver-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return null;
      if (!data) return null;
      return mapDriver(data);
    },
    enabled: user?.role === 'driver' || user?.role === 'both',
  });

  const { data: bookings } = useQuery<BookingWithDetails[]>({
    queryKey: ['my-bookings-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*, trip:trips(*, driver:drivers(*, user:users(*)))')
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapBooking);
    },
    enabled: !!user,
  });

  const { data: myTrips } = useQuery<TripWithDriver[]>({
    queryKey: ['my-trips-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // First get driver ID
      const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', user.id).maybeSingle();
      if (!driver) return [];

      const { data, error } = await supabase
        .from('trips')
        .select('*, driver:drivers(*, user:users(*))')
        .eq('driver_id', driver.id)
        .order('departure_time', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapTrip);
    },
    enabled: !!user && (user.role === 'driver' || user.role === 'both'),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'bg-primary/10 text-primary',
      ongoing: 'bg-success/10 text-success',
      completed: 'bg-muted text-muted-foreground',
      cancelled: 'bg-destructive/10 text-destructive',
      confirmed: 'bg-success/10 text-success',
      pending: 'bg-warning/10 text-warning',
      rejected: 'bg-destructive/10 text-destructive',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };





  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      // Use the storage service helper function
      const { uploadProfilePhoto } = await import('@/lib/storage-service');
      const result = await uploadProfilePhoto(user.id, file);

      if (!result.success) {
        toast({
          title: 'Upload failed',
          description: result.error || 'Unable to upload photo.',
          variant: 'destructive',
        });
        return;
      }

      // Update profile using AuthContext
      await updateProfile({ profilePhoto: result.url });
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Unable to upload photo.',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };


  const [isUpdating, setIsUpdating] = useState(false);

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true);
      await updateProfile({
        fullName,
        phone,
        bio,
      });
    } catch (error) {
      // Error handled by AuthContext
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Please log in</h2>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative z-0">
      <Navbar />

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.profilePhoto || undefined} />
                <AvatarFallback className="text-2xl">{(user?.fullName || '').charAt(0)}</AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center hover-elevate active-elevate-2 disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-primary-foreground" />
                )}
              </button>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1" data-testid="text-user-name">{user.fullName}</h2>
              <p className="text-muted-foreground mb-3">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {user.role}
                </Badge>
                {user.verificationStatus === 'verified' && (
                  <Badge variant="outline" className="gap-1">
                    <Check className="w-3 h-3 text-success" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            <Button variant="outline" onClick={handleSignOut} data-testid="button-signout">
              Sign Out
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="personal" data-testid="tab-personal">
              <User className="w-4 h-4 mr-2" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="safety" data-testid="tab-safety">
              <Shield className="w-4 h-4 mr-2" />
              Safety
            </TabsTrigger>
            {(user.role === 'driver' || user.role === 'both') && (
              <TabsTrigger value="driver" data-testid="tab-driver">
                <Car className="w-4 h-4 mr-2" />
                Driver Info
              </TabsTrigger>
            )}
            <TabsTrigger value="history" data-testid="tab-history">
              <Activity className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Personal Information</h3>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    data-testid="input-fullname"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    data-testid="input-bio"
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                  data-testid="button-save-profile"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>

                <Separator className="my-6" />

                <div>
                  <h4 className="text-sm font-semibold mb-3">Payment Methods</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your saved payment methods for faster checkout
                  </p>
                  <Button variant="outline" onClick={() => navigate('/payment-methods')}>
                    Manage Payment Methods
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Wallet Balance Widget */}
              <WalletBalanceWidget />

              {/* Ride Preferences */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Ride Preferences
                </h3>
                <RidePreferences />
              </Card>

              {/* Auto-Pay Setup */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Auto-Pay Settings
                </h3>
                <AutoPaySetup />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="safety">
            <div className="space-y-6">
              {/* Emergency Contacts */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Emergency Contacts
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add trusted contacts who will be notified in case of emergency
                </p>
                <EmergencyContactsWrapper />
              </Card>

              {/* Safety Tips */}
              <Card className="p-6 bg-muted/50">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Safety Tips
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Always verify driver details before getting in the vehicle</li>
                  <li>• Share your trip details with emergency contacts</li>
                  <li>• Use the in-app safety check-in feature during rides</li>
                  <li>• Keep your phone charged and accessible</li>
                  <li>• Trust your instincts - if something feels wrong, cancel the ride</li>
                </ul>
              </Card>
            </div>
          </TabsContent>

          {(user.role === 'driver' || user.role === 'both') && (
            <TabsContent value="driver">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Driver Information</h3>
                  <div className="flex items-center gap-3">
                    {driverProfile && (
                      <Badge className={
                        driverProfile.verificationStatus === 'verified'
                          ? 'bg-success/10 text-success'
                          : driverProfile.verificationStatus === 'pending'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                      }>
                        {driverProfile.verificationStatus}
                      </Badge>
                    )}
                    {driverProfile && driverProfile.verificationStatus === 'rejected' && (
                      <Button size="sm" variant="outline" onClick={() => navigate('/driver-onboarding')}>
                        Re-apply
                      </Button>
                    )}
                  </div>
                </div>

                {driverProfile ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>License Number</Label>
                        <div className="text-sm font-medium mt-1">{driverProfile.licenseNumber}</div>
                      </div>
                      <div>
                        <Label>Rating</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 fill-warning text-warning" />
                          <span className="text-sm font-medium">{driverProfile.rating}</span>
                          <span className="text-xs text-muted-foreground">({driverProfile.totalTrips} trips)</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="mb-3 block">Vehicle Information</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Make & Model</p>
                          <p className="font-medium">{driverProfile.vehicleMake} {driverProfile.vehicleModel}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Year</p>
                          <p className="font-medium">{driverProfile.vehicleYear}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Color</p>
                          <p className="font-medium">{driverProfile.vehicleColor}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">License Plate</p>
                          <p className="font-medium">{driverProfile.vehiclePlate}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <Shield className="w-5 h-5 text-primary" />
                      <div className="text-sm">
                        <span className="font-medium">Availability: </span>
                        <span className={driverProfile.isAvailable ? 'text-success' : 'text-muted-foreground'}>
                          {driverProfile.isAvailable ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-semibold mb-2">Complete driver verification</h4>
                    <p className="text-muted-foreground mb-6">
                      Become a verified driver to start offering rides
                    </p>
                    <Button onClick={() => navigate('/driver-onboarding')}>
                      Start Verification
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>
          )}

          <TabsContent value="history">
            <div className="space-y-6">
              {/* Ride Statistics Summary */}
              <RideStatistics />

              <h3 className="text-lg font-semibold">Trip History</h3>
              <div className="space-y-6">
                {bookings && bookings.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">My Rides</h4>
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <Card
                          key={booking.id}
                          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => navigate(`/track/${booking.trip.id}`)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold text-sm">
                                {booking.trip.pickupLocation} → {booking.trip.dropLocation}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(booking.trip.departureTime), 'MMM dd, yyyy • hh:mm a')}
                              </div>
                            </div>
                            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                          </div>
                          {booking.status === 'confirmed' && new Date(booking.trip.departureTime) < new Date() && (
                            <Button size="sm" variant="outline" className="w-full mt-2" onClick={(e) => {
                              e.stopPropagation();
                              setRatingBooking(booking);
                            }}>
                              Rate Driver
                            </Button>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {myTrips && myTrips.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 mt-6">Trips I Drove</h4>
                    <div className="space-y-4">
                      {myTrips.map((trip) => (
                        <Card
                          key={trip.id}
                          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => navigate(`/track/${trip.id}`)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold text-sm">
                                {trip.pickupLocation} → {trip.dropLocation}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(trip.departureTime), 'MMM dd, yyyy • hh:mm a')}
                              </div>
                            </div>
                            <Badge className={getStatusColor(trip.status)}>{trip.status}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {!bookings?.length && !myTrips?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No history found.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {ratingBooking && (
        <RatingModal
          isOpen={!!ratingBooking}
          onClose={() => setRatingBooking(null)}
          tripId={ratingBooking.trip.id}
          driverId={ratingBooking.trip.driver.user.id}
          driverName={ratingBooking.trip.driver.user.fullName}
        />
      )}
    </div>
  );
}
