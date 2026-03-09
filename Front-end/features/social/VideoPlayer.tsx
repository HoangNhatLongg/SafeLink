import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  uri: string;
  onOpenFullscreen?: () => void;
};

export default function VideoPlayer({ uri, onOpenFullscreen }: Props) {
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
    <TouchableOpacity
      activeOpacity={1}
      style={styles.container}
      onPress={onOpenFullscreen}
    >
      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen
        allowsPictureInPicture
        contentFit="cover"
      />

      {/* Controls */}
      <View style={styles.controls} pointerEvents="box-none">
        <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={18}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 250,
    backgroundColor: "black",
    borderRadius: 14,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  controls: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  muteButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 20,
  },
});