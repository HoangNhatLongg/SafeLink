import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { fetchActiveSOS } from "./sosApi";

interface SOSMapProps {
  userLocation: { latitude: number; longitude: number };
}

export default function SOSMap({ userLocation }: SOSMapProps) {
  const [activeSOS, setActiveSOS] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadSOS();
    // Refresh every 30s
    const timer = setInterval(loadSOS, 30000);
    return () => clearInterval(timer);
  }, []);

  const loadSOS = async () => {
    try {
      const { sos } = await fetchActiveSOS({
        lat: userLocation.latitude,
        lon: userLocation.longitude,
        radius: 50, // 50km
      });
      setActiveSOS(sos);
    } catch (e) {
      console.warn("Error loading active SOS:", e);
    } finally {
      setLoading(false);
    }
  };

  const centerToUser = () => {
    mapRef.current?.animateToRegion({
      ...userLocation,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {activeSOS.map((sos) => (
          <React.Fragment key={sos.id}>
            {/* Vòng tròn cảnh báo */}
            <Circle
              center={sos.location}
              radius={sos.radius}
              fillColor="rgba(0, 122, 255, 0.1)"
              strokeColor="rgba(0, 122, 255, 0.3)"
              strokeWidth={1}
            />
            {/* Marker cảnh báo (Tam giác đỏ) */}
            <Marker
              coordinate={sos.location}
              title={`🆘 ${sos.category}`}
              description={sos.description}
            >
              <View style={styles.markerContainer}>
                <View style={styles.triangle} />
                <Ionicons name="warning" size={24} color="#FFF" style={styles.warningIcon} />
              </View>
            </Marker>
          </React.Fragment>
        ))}
      </MapView>

      {/* Map Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={loadSOS}>
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={centerToUser}>
          <Ionicons name="locate" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="#FF3B30" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loader: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 10,
    borderRadius: 20,
  },
  controls: {
    position: "absolute",
    right: 16,
    bottom: 30, // Above tab bar
    gap: 12,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 26,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FF3B30",
    position: "absolute",
  },
  warningIcon: {
    marginTop: 6,
  },
});
