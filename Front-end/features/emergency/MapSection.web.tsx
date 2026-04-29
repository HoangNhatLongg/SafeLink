import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Agency } from './types';

interface Props {
  location: { latitude: number; longitude: number };
  agencies: Agency[];
  onMarkerPress?: (agency: Agency) => void;
}

export default function MapSection({ location, agencies, onMarkerPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bản đồ không được hỗ trợ trên trình duyệt web.</Text>
      <Text style={styles.subtext}>Vui lòng sử dụng ứng dụng di động để xem bản đồ.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    width: "100%",
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    padding: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  }
});
