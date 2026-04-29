import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapSection({ location, agencies }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bản đồ không được hỗ trợ trên trình duyệt web.</Text>
      <Text style={styles.subtext}>Vui lòng sử dụng ứng dụng di động để xem bản đồ.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
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
