import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  images: string[];
  onOpen: (index: number) => void;
};

export default function ImageGrid({ images = [], onOpen }: Props) {
  const count = images.length;

  if (!count) return null;

  if (count === 1) {
    return (
      <TouchableOpacity onPress={() => onOpen(0)}>
        <Image source={{ uri: images[0] }} style={styles.single} />
      </TouchableOpacity>
    );
  }

  if (count === 2) {
    return (
      <View style={styles.row}>
        {images.slice(0, 2).map((img, i) => (
          <TouchableOpacity
            key={i}
            style={{ flex: 1 }}
            onPress={() => onOpen(i)}
          >
            <Image source={{ uri: img }} style={styles.half} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (count === 3) {
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => onOpen(0)}
        >
          <Image source={{ uri: images[0] }} style={styles.largeLeft} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          {images.slice(1, 3).map((img, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onOpen(i + 1)}
            >
              <Image source={{ uri: img }} style={styles.small} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 4 ảnh trở lên
  const hidden = count - 4;

  return (
    <View style={styles.grid}>
      {images.slice(0, 4).map((img, i) => (
        <TouchableOpacity
          key={i}
          style={styles.gridItem}
          onPress={() => onOpen(i)}
        >
          <Image source={{ uri: img }} style={styles.gridImage} />

          {i === 3 && hidden > 0 && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>+{hidden}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  single: { width: "100%", height: 220, borderRadius: 12 },

  row: {
    flexDirection: "row",
    gap: 4,
  },

  half: {
    height: 160,
    borderRadius: 12,
  },

  largeLeft: {
    height: 220,
    borderRadius: 12,
  },

  small: {
    height: 108,
    marginBottom: 4,
    borderRadius: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },

  gridItem: {
    width: "49%",
    height: 120,
  },

  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },

  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },

  overlayText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
});