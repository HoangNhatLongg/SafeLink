import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import SOSMap from "@/features/SOS/SOSMap";
import SOSButton from "@/features/SOS/SOSButton";
import SOSModal from "@/features/SOS/SOSModal";
import { updateLocation } from "@/features/SOS/sosApi";

export default function SOSScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const initLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(coords);
      
      // Update location to server for better proximity alerts
      updateLocation(coords.latitude, coords.longitude);
    } catch (e) {
      console.warn("Init location error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initLocation();
    // Refresh position periodically when screen is focused
    const timer = setInterval(initLocation, 60000); 
    return () => clearInterval(timer);
  }, [initLocation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (!location) return null;

  return (
    <View style={styles.container}>
      {/* Bản đồ SOS */}
      <SOSMap userLocation={location} />

      {/* Nút SOS nổi (có thể kéo thả) */}
      <SOSButton onPress={() => setModalVisible(true)} />

      {/* Modal gửi SOS */}
      <SOSModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          // SOSMap has internal interval to refresh, so it will show up soon
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});