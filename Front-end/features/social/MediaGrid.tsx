import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  GestureResponderEvent,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

type MediaItem = {
  type: "image" | "video";
  uri: string | number;
};

type Props = {
  media: MediaItem[];
  onOpen: (index: number) => void;
};

export default function MediaGrid({ media = [], onOpen }: Props) {
  const count = media.length;
  if (!count) return null;

  // 1 media
  if (count === 1) {
    return (
      <TouchableOpacity onPress={() => onOpen(0)}>
        <RenderMedia item={media[0]} style={styles.single} />
      </TouchableOpacity>
    );
  }

  // 2 media
  if (count === 2) {
    return (
      <View style={styles.row}>
        {media.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.flexItem}
            onPress={() => onOpen(i)}
          >
            <RenderMedia item={item} style={styles.square} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // 3 media
  if (count === 3) {
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.flexItem, { marginRight: 4 }]}
          onPress={() => onOpen(0)}
        >
          <RenderMedia item={media[0]} style={styles.large} />
        </TouchableOpacity>

        <View style={styles.flexItem}>
          {media.slice(1, 3).map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onOpen(i + 1)}
              style={i === 0 ? { marginBottom: 4 } : undefined}
            >
              <RenderMedia item={item} style={styles.small} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 4+
  const hidden = count - 4;

  return (
    <View style={styles.grid}>
      {media.slice(0, 4).map((item, i) => (
        <TouchableOpacity
          key={i}
          style={[
            styles.gridItem,
            i % 2 === 0 && { paddingRight: 2 },
            i % 2 === 1 && { paddingLeft: 2 },
            i < 2 && { marginBottom: 4 },
          ]}
          onPress={() => onOpen(i)}
        >
          <RenderMedia item={item} style={styles.gridMedia} />

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



function RenderMedia({ item, style }: { item: MediaItem; style: any }) {
  if (item.type === "image") {
    return (
      <Image
        source={
          typeof item.uri === "string" ? { uri: item.uri } : item.uri
        }
        style={style}
        resizeMode="cover"
      />
    );
  }

  return <VideoPlayer uri={item.uri} style={style} />;
}



function VideoPlayer({ uri, style }: { uri: string | number; style: any }) {
  const [isMuted, setIsMuted] = useState(true);

  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const toggleMute = (e: GestureResponderEvent) => {
    e.stopPropagation();
    player.muted = !player.muted;
    setIsMuted(player.muted);
  };

  return (
    <View style={[style, styles.videoContainer]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={18}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
}



const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },

  flexItem: {
    flex: 1,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  gridItem: {
    width: "50%",
  },

  single: {
    width: "100%",
    height: 280,
    borderRadius: 12,
  },

  square: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },

  large: {
    width: "100%",
    height: 240,
    borderRadius: 12,
  },

  small: {
    width: "100%",
    height: 118,
    borderRadius: 12,
  },

  gridMedia: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },

  videoContainer: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "black",
  },

  muteButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 6,
    borderRadius: 20,
  },

  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },

  overlayText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
});