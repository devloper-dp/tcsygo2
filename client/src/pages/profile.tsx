import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, User, Car, Star, Camera, Shield, Check, Calendar, MapPin, Activity } from 'lucide-react';
import { Driver, TripWithDriver, BookingWithDetails } from '@shared/schema';
import { format } from 'date-fns';
import { RatingModal } from '@/components/RatingModal';
import { NotificationDropdown } from '@/components/NotificationDropdown';

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');

  const [ratingBooking, setRatingBooking] = useState<BookingWithDetails | null>(null);

  const { data: driverProfile } = useQuery<Driver>({
    queryKey: ['/api/drivers/my-profile'],
    enabled: user?.role === 'driver' || user?.role === 'both',
  });

  const { data: bookings } = useQuery<BookingWithDetails[]>({
    queryKey: ['/api/bookings/my-bookings'],
  });

  const { data: myTrips } = useQuery<TripWithDriver[]>({
    queryKey: ['/api/trips/my-trips'],
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      // Use the correct endpoint matching routes.ts: /api/users/:id
      return await apiRequest('PUT', `/api/users/${user.id}`, data);
    },
    onSuccess: (updatedUser) => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
      // Invalidate the specific user query if it exists, or trigger a reload of auth user
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}`] });
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'Unable to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      fullName,
      phone,
      bio,
    });
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold">Profile</h1>
          <div className="ml-auto">
            <NotificationDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.profilePhoto || undefined} />
                <AvatarFallback className="text-2xl">{user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center hover-elevate active-elevate-2">
                <Camera className="w-4 h-4 text-primary-foreground" />
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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="personal" data-testid="tab-personal">
              <User className="w-4 h-4 mr-2" />
              Personal Info
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
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {(user.role === 'driver' || user.role === 'both') && (
            <TabsContent value="driver">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Driver Information</h3>
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
            <h3 className="text-lg font-semibold mb-6">Trip History</h3>
            <div className="space-y-6">
              {bookings && bookings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">My Rides</h4>
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="p-4">
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
                          <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setRatingBooking(booking)}>
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
                      <Card key={trip.id} className="p-4">
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
