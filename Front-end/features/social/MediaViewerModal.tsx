import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { VideoView, useVideoPlayer } from "expo-video";

const { width, height } = Dimensions.get("window");

type MediaItem = {
  type: "image" | "video";
  uri: string | number;
};

type Props = {
  visible: boolean;
  media: MediaItem[];
  index: number;
  onClose: () => void;
};

export default function MediaViewerModal({
  visible,
  media,
  index,
  onClose,
}: Props) {
  const flatListRef = useRef<FlatList>(null);

  if (!media?.length) return null;

  const renderItem = ({ item }: { item: MediaItem }) => {
    if (item.type === "image") {
      return (
        <View style={{ width, height }}>
          <ImageViewer
            imageUrls={[
              {
                url: typeof item.uri === "string" ? item.uri : "",
              },
            ]}
            enableSwipeDown
            onSwipeDown={onClose}
            backgroundColor="black"
          />
        </View>
      );
    }

    return <VideoItem uri={item.uri} />;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={media}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
        />

        {/* Close */}
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        {/* Counter */}
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1} / {media.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

/* ======================
   VIDEO ITEM
====================== */

function VideoItem({ uri }: { uri: string | number }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <View style={{ width, height }}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="contain"
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
}

/* ======================
   STYLES
====================== */

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