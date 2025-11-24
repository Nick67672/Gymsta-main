import React from 'react';
import { View, StyleSheet, Dimensions, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

// Google Places API Response Types
interface GooglePlacesLocation {
  lat: number;
  lng: number;
}

interface GooglePlacesGeometry {
  location: GooglePlacesLocation;
  viewport?: {
    northeast: GooglePlacesLocation;
    southwest: GooglePlacesLocation;
  };
}

interface GooglePlacesDetails {
  geometry: GooglePlacesGeometry;
  place_id: string;
  formatted_address?: string;
  name?: string;
  vicinity?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
}

interface GooglePlacesAutocompleteData {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  terms?: Array<{
    offset: number;
    value: string;
  }>;
}

interface SelectedGym {
  latitude: number;
  longitude: number;
  name: string;
  placeId: string;
}

const GymSearch: React.FC = () => {
  const mapRef = React.useRef<MapView>(null);
  const [selectedGym, setSelectedGym] = React.useState<SelectedGym | null>(null);

  const onPlaceSelected = (
    data: GooglePlacesAutocompleteData,
    details: GooglePlacesDetails | null = null
  ): void => {
    if (!details?.geometry?.location) {
      return;
    }

    // Check if the selected place is a gym
    const isGym = details.types?.some(
      (type) => type.toLowerCase() === 'gym' || type.toLowerCase().includes('gym')
    );

    if (!isGym) {
      Alert.alert(
        'Not a Gym',
        'Please select a gym location. The selected place is not recognized as a gym.',
        [{ text: 'OK' }]
      );
      return;
    }

    const { lat, lng } = details.geometry.location;
    const newRegion: Region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01, // Zoom level
      longitudeDelta: 0.01,
    };

    // Update map view
    mapRef.current?.animateToRegion(newRegion, 1000);
    
    // Save selected gym data
    setSelectedGym({
      latitude: lat,
      longitude: lng,
      name: data.description,
      placeId: data.place_id,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {selectedGym && (
          <Marker
            coordinate={{
              latitude: selectedGym.latitude,
              longitude: selectedGym.longitude,
            }}
            title={selectedGym.name}
          />
        )}
      </MapView>

      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          placeholder="Search for a gym..."
          onPress={onPlaceSelected}
          query={{
            key: GOOGLE_API_KEY || '',
            language: 'en',
            types: 'establishment', // Focuses results on businesses/buildings
          }}
          fetchDetails={true} // REQUIRED to get lat/long coordinates
          styles={{
            textInput: styles.searchInput,
            listView: styles.searchResults,
          }}
          enablePoweredByContainer={false}
          debounce={200}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'visible', // Allow dropdown to overflow container
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    zIndex: 1000, // High z-index to ensure search bar and dropdown are above map
    overflow: 'visible', // Allow dropdown list to overflow
  },
  searchInput: {
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  searchResults: {
    position: 'absolute',
    top: 55, // Position below the input (input height + margin)
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    maxHeight: 300,
    elevation: 8, // Higher elevation for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 1001, // Even higher z-index for the dropdown list
  },
});

export default GymSearch;

