import { View } from 'react-native';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Text } from './ui/text';
import { Calendar, Clock, MapPin, Users, Star } from 'lucide-react-native';
import { format } from 'date-fns';

import { TripWithDriver } from '../types/schema';

interface TripCardProps {
    trip: TripWithDriver;
    onBook?: () => void;
    showActions?: boolean;
}

export function TripCard({ trip, onBook, showActions = true }: TripCardProps) {
    const departureDate = new Date(trip.departureTime);
    const driver = trip.driver;

    return (
        <Card className="p-4" style={{ marginBottom: 16 }}>
            <View className="flex-row gap-4">
                <View className="items-center gap-2">
                    <Avatar className="w-16 h-16">
                        <AvatarImage src={driver.user.profilePhoto || undefined} />
                        <AvatarFallback>{driver.user.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <View className="flex-row items-center gap-1">
                        <Star size={16} color="#eab308" fill="#eab308" />
                        <Text className="font-medium text-sm">{driver.rating}</Text>
                    </View>
                </View>

                <View className="flex-1">
                    <View className="flex-row items-start justify-between mb-4">
                        <View className="flex-1 mr-2">
                            <Text variant="h3" className="text-lg mb-1">
                                {driver.user.fullName}
                            </Text>
                            <Text className="text-sm text-gray-500">
                                {driver.vehicleMake} {driver.vehicleModel} • {driver.vehicleColor}
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-2xl font-bold text-primary">
                                ₹{trip.pricePerSeat}
                            </Text>
                            <Text className="text-xs text-gray-500">per seat</Text>
                        </View>
                    </View>

                    <View className="gap-3 mb-4">
                        <View className="flex-row items-center gap-2">
                            <MapPin size={16} color="#22c55e" />
                            <View className="flex-1">
                                <Text className="text-sm font-medium">{trip.pickupLocation}</Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <MapPin size={16} color="#ef4444" />
                            <View className="flex-1">
                                <Text className="text-sm font-medium">{trip.dropLocation}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row flex-wrap gap-4 mb-4">
                        <View className="flex-row items-center gap-1.5">
                            <Calendar size={16} className="text-gray-500" color="gray" />
                            <Text className="text-sm text-gray-500">{format(departureDate, 'MMM dd, yyyy')}</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <Clock size={16} className="text-gray-500" color="gray" />
                            <Text className="text-sm text-gray-500">{format(departureDate, 'hh:mm a')}</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <Users size={16} className="text-gray-500" color="gray" />
                            <Text className="text-sm text-gray-500">{trip.availableSeats} seats</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                            <Text className="text-xs">{trip.distance} km</Text>
                        </Badge>
                        <Badge variant="secondary">
                            <Text className="text-xs">{trip.duration} min</Text>
                        </Badge>
                        <Badge variant="outline">
                            <Text className="text-xs capitalize">{trip.status}</Text>
                        </Badge>
                    </View>
                </View>
            </View>

            {showActions && onBook && (
                <View className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        onPress={onBook}
                        className="w-full"
                        size="lg"
                    >
                        Book Now
                    </Button>
                </View>
            )}
        </Card>
    );
}
