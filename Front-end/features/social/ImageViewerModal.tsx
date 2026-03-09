import React from "react";
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";

const { width, height } = Dimensions.get("window");

type Props = {
  visible: boolean;
  images: string[];
  index: number;
  onClose: () => void;
};

export default function ImageViewerModal({
  visible,
  images,
  index,
  onClose,
}: Props) {
  const safeImages = images ?? [];

  // Nếu không có ảnh thì không render gì
  if (!safeImages.length) return null;

  const imageUrls = safeImages.map((url) => ({ url }));

  return (
    <Modal visible={visible} transparent>
      <View style={styles.container}>
        <ImageViewer
          imageUrls={imageUrls}
          index={index}
          enableSwipeDown
          onSwipeDown={onClose}
        />

        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1} / {safeImages.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  close: {
    position: "absolute",
    top: 50,
    right: 20,
  },
  closeText: {
    color: "white",
    fontSize: 24,
  },
  counter: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
  counterText: {
    color: "white",
    fontSize: 16,
  },
});