import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LayoutPicker({ layout, setLayout }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chọn bố cục</Text>

      <View style={styles.row}>
        <Button
          label="Cổ điển"
          active={layout === "classic"}
          onPress={() => setLayout("classic")}
        />

        <Button
          label="Cột"
          active={layout === "column"}
          onPress={() => setLayout("column")}
        />

        <Button
          label="Khung"
          active={layout === "frame"}
          onPress={() => setLayout("frame")}
        />
      </View>
    </View>
  );
}

function Button({ label, active, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.btn, active && styles.active]}
      onPress={onPress}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "white",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  active: {
    backgroundColor: "#ff8c00",
  },
  text: {
    fontWeight: "600",
  },
});