import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Mock data - would be fetched from API
  const trips = [
    {
      id: '1',
      driver: { name: 'John Doe', rating: 4.8, photo: null },
      pickup: params.pickup || 'Delhi',
      drop: params.drop || 'Jaipur',
      date: '2024-01-20',
      time: '10:00 AM',
      price: 500,
      seats: 3,
      vehicle: 'Honda City',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Results</Text>
        <TouchableOpacity>
          <Ionicons name="options-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.resultCount}>
        <Text style={styles.resultText}>{trips.length} trips found</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.tripList}>
        {trips.map((trip) => (
          <TouchableOpacity
            key={trip.id}
            style={styles.tripCard}
            onPress={() => router.push(`/trip/${trip.id}`)}
          >
            <View style={styles.driverSection}>
              <View style={styles.driverAvatar}>
                <Text style={styles.avatarText}>
                  {trip.driver.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{trip.driver.name}</Text>
                <View style={styles.rating}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.ratingText}>{trip.driver.rating}</Text>
                </View>
              </View>
              <View style={styles.priceSection}>
                <Text style={styles.price}>₹{trip.price}</Text>
                <Text style={styles.priceLabel}>per seat</Text>
              </View>
            </View>

            <View style={styles.routeSection}>
              <View style={styles.routeItem}>
                <Ionicons name="location-outline" size={18} color="#22c55e" />
                <Text style={styles.location}>{trip.pickup}</Text>
              </View>
              <View style={styles.routeItem}>
                <Ionicons name="location-outline" size={18} color="#ef4444" />
                <Text style={styles.location}>{trip.drop}</Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.detail}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{trip.date}</Text>
              </View>
              <View style={styles.detail}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{trip.time}</Text>
              </View>
              <View style={styles.detail}>
                <Ionicons name="people-outline" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{trip.seats} seats</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Book Now</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  resultCount: {
    padding: 16,
    backgroundColor: 'white',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  scrollView: {
    flex: 1,
  },
  tripList: {
    padding: 16,
    gap: 16,
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  routeSection: {
    gap: 8,
    marginBottom: 12,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  location: {
    fontSize: 14,
    color: '#1f2937',
  },
  detailsSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  bookBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
