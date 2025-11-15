import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  const handleSearch = () => {
    if (pickup && drop) {
      router.push({
        pathname: '/search',
        params: { pickup, drop }
      });
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Marker
          coordinate={{ latitude: 28.6139, longitude: 77.2090 }}
          title="Your Location"
        />
      </MapView>

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.logo}>TCSYGO</Text>
          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={32} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.inputGroup}>
            <Ionicons name="location-outline" size={20} color="#22c55e" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Pickup location"
              value={pickup}
              onChangeText={setPickup}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Ionicons name="location-outline" size={20} color="#ef4444" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Drop location"
              value={drop}
              onChangeText={setDrop}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity 
            style={[styles.searchBtn, (!pickup || !drop) && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={!pickup || !drop}
          >
            <Text style={styles.searchBtnText}>Search Rides</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/create-trip')}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileBtn: {
    padding: 4,
  },
  searchCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  searchBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  searchBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  searchBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
