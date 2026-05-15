import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import type { Agency } from "./types";
import { AGENCY_TYPE_COLORS, AGENCY_TYPE_ICONS } from "./types";

interface Props {
  location: { latitude: number; longitude: number };
  agencies: Agency[];
  onMarkerPress?: (agency: Agency) => void;
}

function openDirections(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  if (Platform.OS === "ios") {
    const url = `maps://app?daddr=${lat},${lng}&dirflg=d`;
    Linking.canOpenURL(url).then((supported) => {
      Linking.openURL(supported
        ? url
        : `https://maps.google.com/maps?daddr=${lat},${lng}&q=${label}`
      );
    });
  } else {
    Linking.openURL(`google.navigation:q=${lat},${lng}&mode=d`).catch(() =>
      Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}&q=${label}`)
    );
  }
}

export default function MapSection({ location, agencies, onMarkerPress }: Props) {
  const mapRef = useRef<MapView>(null);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
      showsUserLocation
      showsMyLocationButton
    >
      {agencies.map((item) => {
        const pinColor = AGENCY_TYPE_COLORS[item.type] ?? "#616161";
        const icon = AGENCY_TYPE_ICONS[item.type] ?? "📍";
        return (
          <Marker
            key={item._id ?? item.name}
            coordinate={{ latitude: item.lat, longitude: item.lng }}
            onPress={() => onMarkerPress?.(item)}
          >
            <View style={[styles.customMarker, { backgroundColor: pinColor }]}>
              <Text style={styles.customMarkerText}>{icon}</Text>
            </View>
            {/* Không dùng tooltip để tránh bị clipped */}
            <Callout
              style={styles.calloutContainer}
              onPress={() => openDirections(item.lat, item.lng, item.name)}
            >
              <View style={styles.callout}>
                <View style={styles.calloutHeader}>
                  <Text style={styles.calloutIcon}>{icon}</Text>
                  <Text style={styles.calloutName} numberOfLines={2}>{item.name}</Text>
                </View>
                <Text style={styles.calloutAddr} numberOfLines={2}>{item.address}</Text>
                <View style={[styles.calloutBtn, { backgroundColor: pinColor }]}>
                  <Ionicons name="navigate" size={13} color="#fff" />
                  <Text style={styles.calloutBtnText}>Nhấn để chỉ đường</Text>
                </View>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 280, width: "100%" },
  // Callout container cần width cố định để react-native-maps đo được đúng
  calloutContainer: {
    width: 220,
  },
  callout: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    // Không dùng shadow ở đây vì callout đã có border mặc định của react-native-maps
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 6,
  },
  calloutIcon: { fontSize: 20, lineHeight: 24 },
  calloutName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a2e",
    lineHeight: 18,
  },
  calloutAddr: {
    fontSize: 11,
    color: "#666",
    marginBottom: 8,
    lineHeight: 15,
  },
  calloutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  calloutBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customMarkerText: {
    fontSize: 18,
    lineHeight: 22,
  },
});