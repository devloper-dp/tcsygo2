import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Star } from 'lucide-react';
import { TripWithDriver } from '@shared/schema';
import { format } from 'date-fns';

interface TripCardProps {
  trip: TripWithDriver;
  onBook?: () => void;
  showActions?: boolean;
}

export function TripCard({ trip, onBook, showActions = true }: TripCardProps) {
  const departureDate = new Date(trip.departureTime);
  const driver = trip.driver;

  return (
    <Card className="p-6 hover-elevate" data-testid={`trip-card-${trip.id}`}>
      <div className="flex gap-6">
        <div className="flex flex-col items-center gap-2">
          <Avatar className="w-16 h-16">
            <AvatarImage src={driver.user.profilePhoto || undefined} />
            <AvatarFallback>{driver.user.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="font-medium">{driver.rating}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-lg mb-1" data-testid="driver-name">
                {driver.user.fullName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {driver.vehicleMake} {driver.vehicleModel} • {driver.vehicleColor}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary" data-testid="trip-price">
                ₹{trip.pricePerSeat}
              </div>
              <div className="text-xs text-muted-foreground">per seat</div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" data-testid="trip-pickup">{trip.pickupLocation}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" data-testid="trip-drop">{trip.dropLocation}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span data-testid="trip-date">{format(departureDate, 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span data-testid="trip-time">{format(departureDate, 'hh:mm a')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span data-testid="trip-seats">{trip.availableSeats} seats available</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {trip.distance} km
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {trip.duration} min
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {trip.status}
            </Badge>
          </div>
        </div>
      </div>

      {showActions && onBook && (
        <div className="mt-6 pt-4 border-t">
          <Button 
            onClick={onBook} 
            className="w-full" 
            size="lg"
            data-testid="button-book-trip"
          >
            Book Now
          </Button>
        </div>
      )}
    </Card>
  );
}
