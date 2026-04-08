import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  GestureResponderEvent,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  useVideoVisible,
  videoKey,
  saveVideoPosition,
  getVideoPosition,
  clearAllVideoPositions,
} from "./videoVisibilityStore";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type MediaItem = {
  type: "image" | "video";
  uri: string | number;
};

type Props = {
  media: MediaItem[];
  postId: string;
  onOpen: (index: number) => void;
};

/* ============================================================
   SMART IMAGE — lấy kích thước thật khi load xong
   ============================================================ */

interface SmartImageProps {
  uri: string;
  containerWidth: number;
  maxHeight: number;
  borderRadius: number;
}

function SmartImage({ uri, containerWidth, maxHeight, borderRadius }: SmartImageProps) {
  const [height, setHeight] = useState<number | null>(null);

  const handleLoad = (e: { nativeEvent: { source: { width: number; height: number } } }) => {
    const { width: natW, height: natH } = e.nativeEvent.source;
    if (natW > 0 && natH > 0) {
      const calculatedH = Math.min((containerWidth * natH) / natW, maxHeight);
      setHeight(calculatedH);
    }
  };

  const displayHeight = height ?? Math.min(containerWidth, maxHeight);

  return (
    <View style={{ width: containerWidth, height: displayHeight, borderRadius, overflow: "hidden" }}>
      <Image
        source={{ uri }}
        style={{
          width: containerWidth,
          height: displayHeight,
          borderRadius,
          opacity: height ? 1 : 0.85,
        }}
        resizeMode="cover"
        onLoad={handleLoad}
      />
    </View>
  );
}

/** Ảnh trong khung cố định (width × height) — luôn căn đều, không lệch hàng */
function FixedCoverImage({
  uri,
  width,
  height,
  borderRadius,
  onNaturalSize,
}: {
  uri: string;
  width: number;
  height: number;
  borderRadius: number;
  onNaturalSize?: (w: number, h: number) => void;
}) {
  return (
    <View style={{ width, height, borderRadius, overflow: "hidden", backgroundColor: "#eceef2" }}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
        onLoad={(e) => {
          const { width: nw, height: nh } = e.nativeEvent.source;
          if (nw > 0 && nh > 0) onNaturalSize?.(nw, nh);
        }}
      />
    </View>
  );
}

const GAP = 4;
const MAX_TWO_ROW = 400;
// PostCard padding: 14×2 = 28px | FlatList listContent padding: 10×2 = 20px → total = 48px
const BASE_WIDTH_OFFSET = 28 + 20;

/** Hai media cạnh nhau: cùng chiều cao hàng, ảnh fill + cover (không còn khoảng trắng lệch) */
function TwoMediaRow({
  media,
  halfW,
  postId,
  onOpen,
}: {
  media: MediaItem[];
  halfW: number;
  postId: string;
  onOpen: (index: number) => void;
}) {
  const [nat, setNat] = useState<[ { w: number; h: number } | null, { w: number; h: number } | null ]>([
    null,
    null,
  ]);

  const idealHeight = (index: 0 | 1): number => {
    const item = media[index];
    if (item.type === "video") {
      return Math.min(halfW * (9 / 16), MAX_TWO_ROW);
    }
    const d = nat[index];
    if (!d) return halfW;
    return Math.min((halfW * d.h) / d.w, MAX_TWO_ROW);
  };

  const rowHeight = Math.min(Math.max(idealHeight(0), idealHeight(1)), MAX_TWO_ROW);

  const setNatAt = (index: 0 | 1, w: number, h: number) => {
    setNat((prev) => {
      const next: [typeof prev[0], typeof prev[1]] = [prev[0], prev[1]];
      next[index] = { w, h };
      return next;
    });
  };

  return (
    <View style={styles.row}>
      {media.map((item, i) => (
        <TouchableOpacity
          key={i}
          activeOpacity={0.9}
          onPress={() => onOpen(i)}
          style={{ width: halfW, height: rowHeight, marginRight: i === 0 ? GAP : 0 }}
        >
          {item.type === "image" ? (
            <FixedCoverImage
              uri={item.uri as string}
              width={halfW}
              height={rowHeight}
              borderRadius={12}
              onNaturalSize={(w, h) => setNatAt(i as 0 | 1, w, h)}
            />
          ) : (
            <VideoPlayerInline
              uri={item.uri}
              vidKey={videoKey(postId, i)}
              containerWidth={halfW}
              containerHeight={rowHeight}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const MAX_THREE_ROW = 400;

/** Ba media: cột trái lớn + cột phải 2 ô xếp dọc — cùng tổng chiều cao, không lệch khung */
function ThreeMediaRow({
  media,
  halfW,
  postId,
  onOpen,
}: {
  media: MediaItem[];
  halfW: number;
  postId: string;
  onOpen: (index: number) => void;
}) {
  const [nat0, setNat0] = useState<{ w: number; h: number } | null>(null);

  const leftIdeal = (): number => {
    const item = media[0];
    if (item.type === "video") {
      return Math.min(halfW * (9 / 16), MAX_THREE_ROW);
    }
    if (!nat0) return halfW * 1.15;
    return Math.min((halfW * nat0.h) / nat0.w, MAX_THREE_ROW);
  };

  const minStack = halfW + GAP + 40;
  const rowHeight = Math.min(Math.max(leftIdeal(), minStack), MAX_THREE_ROW);
  const smallH = (rowHeight - GAP) / 2;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onOpen(0)}
        style={{ width: halfW, height: rowHeight, marginRight: GAP }}
      >
        {media[0].type === "image" ? (
          <FixedCoverImage
            uri={media[0].uri as string}
            width={halfW}
            height={rowHeight}
            borderRadius={12}
            onNaturalSize={(w, h) => setNat0({ w, h })}
          />
        ) : (
          <VideoPlayerInline
            uri={media[0].uri}
            vidKey={videoKey(postId, 0)}
            containerWidth={halfW}
            containerHeight={rowHeight}
          />
        )}
      </TouchableOpacity>

      <View style={{ width: halfW, height: rowHeight }}>
        {media.slice(1, 3).map((item, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.9}
            onPress={() => onOpen(i + 1)}
            style={{ height: smallH, marginBottom: i === 0 ? GAP : 0 }}
          >
            {item.type === "image" ? (
              <FixedCoverImage
                uri={item.uri as string}
                width={halfW}
                height={smallH}
                borderRadius={12}
              />
            ) : (
              <VideoPlayerInline
                uri={item.uri}
                vidKey={videoKey(postId, i + 1)}
                containerWidth={halfW}
                containerHeight={smallH}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ============================================================
   VIDEO PLAYER INLINE
   ============================================================ */

function VideoPlayerInline({
  uri,
  vidKey,
  containerWidth,
  containerHeight,
}: {
  uri: string | number;
  vidKey: string;
  containerWidth: number;
  containerHeight: number;
}) {
  const uriStr = uri?.toString() ?? "";

  // Khởi tạo player: muted, chưa play — sẽ điều khiển bằng visibility
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const isVisible = useVideoVisible(vidKey);
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  const [isMuted, setIsMuted] = useState(true);
  const isMutedRef = useRef(true);

  // ── Auto play / pause theo visibility ────────────────────
  useEffect(() => {
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible]);

  // ── Lưu vị trí mỗi 500ms để đồng bộ với viewer ──────────
  useEffect(() => {
    if (!uriStr) return;
    const id = setInterval(() => {
      saveVideoPosition(uriStr, player.currentTime ?? 0);
    }, 500);
    return () => clearInterval(id);
  }, [uriStr]);

  // ── Toggle mute ──────────────────────────────────────────
  const toggleMute = (e: GestureResponderEvent) => {
    e.stopPropagation();
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    player.muted = next;
    setIsMuted(next);
  };

  return (
    <View style={[styles.videoContainer, { width: containerWidth, height: containerHeight }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" />
      <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
}

/* ============================================================
   MEDIAGRID
   ============================================================ */

const BASE_WIDTH = SCREEN_W - BASE_WIDTH_OFFSET; // = SCREEN_W - 48
const MAX_HEIGHT = 400;

export default function MediaGrid({ media = [], postId, onOpen }: Props) {
  const count = media.length;
  if (!count) return null;

  if (count === 1) {
    const item = media[0];
    if (item.type === "image") {
      return (
        <TouchableOpacity onPress={() => onOpen(0)} activeOpacity={0.9}>
          <SmartImage uri={item.uri as string} containerWidth={BASE_WIDTH} maxHeight={MAX_HEIGHT} borderRadius={12} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={() => onOpen(0)} activeOpacity={0.9}>
        <VideoPlayerInline uri={item.uri} vidKey={videoKey(postId, 0)} containerWidth={BASE_WIDTH} containerHeight={280} />
      </TouchableOpacity>
    );
  }

  if (count === 2) {
    const halfW = (BASE_WIDTH - GAP) / 2;
    return <TwoMediaRow media={media} halfW={halfW} postId={postId} onOpen={onOpen} />;
  }

  if (count === 3) {
    const halfW = (BASE_WIDTH - GAP) / 2;
    return (
      <ThreeMediaRow media={media} halfW={halfW} postId={postId} onOpen={onOpen} />
    );
  }

  const hidden = count - 4;
  const gridW = (BASE_WIDTH - 2) / 2;

  return (
    <View style={styles.grid}>
      {media.slice(0, 4).map((item, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onOpen(i)}
          activeOpacity={0.9}
          style={[styles.gridItem, i % 2 === 0 && { paddingRight: 2 }, i % 2 === 1 && { paddingLeft: 2 }, i < 2 && { marginBottom: 2 }]}
        >
          {item.type === "image" ? (
            <FixedCoverImage uri={item.uri as string} width={gridW} height={gridW} borderRadius={12} />
          ) : (
            <VideoPlayerInline uri={item.uri} vidKey={videoKey(postId, i)} containerWidth={gridW} containerHeight={gridW} />
          )}
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

/* ============================================================
   FEED VIDEO MANAGER (re-exports từ store)
   ============================================================ */

// Giữ export để không break import cũ ở MediaViewerModal
export { clearAllVideoPositions as clearAllFeedVideoPositions } from "./videoVisibilityStore";
export function setFeedVideoMuted(_muted: boolean) { /* no-op — mute theo visibility */ }

/* ============================================================
   MEDIA VIEWER MODAL
   ============================================================ */

type ViewerProps = {
  visible: boolean;
  media: MediaItem[];
  index: number;
  onClose: () => void;
};

export function MediaViewerModal({ visible, media, index, onClose }: ViewerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(index);
  // Lưu URI đang phát trong viewer để ghi lại vị trí khi đóng
  const currentUriRef = useRef<string>("");

  useEffect(() => {
    if (visible && scrollRef.current && index >= 0) {
      scrollRef.current.scrollTo({ x: index * SCREEN_W, animated: false });
      setCurrentIndex(index);
      currentUriRef.current = media[index]?.uri?.toString() ?? "";
    }
  }, [visible, index]);

  if (!media?.length) return null;

  const renderItem = (item: MediaItem) => {
    if (item.type === "image") {
      return (
        <View style={{ width: SCREEN_W, height: SCREEN_H }}>
          <ImageViewer
            imageUrls={[{ url: typeof item.uri === "string" ? item.uri : "" }]}
            enableSwipeDown
            onSwipeDown={onClose}
            backgroundColor="black"
          />
        </View>
      );
    }
    return (
      <ViewerVideoItem
        uri={item.uri}
        onPositionUpdate={(sec) => {
          // Escribe back la posición en tiempo real al store
          if (item.uri) saveVideoPosition(item.uri.toString(), sec);
        }}
      />
    );
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== currentIndex) {
      setCurrentIndex(idx);
      currentUriRef.current = media[idx]?.uri?.toString() ?? "";
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <ScrollView
          ref={scrollRef as any}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentOffset={{ x: index * SCREEN_W, y: 0 }}
        >
          {media.map((item, i) => <View key={i}>{renderItem(item)}</View>)}
        </ScrollView>
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        <View style={styles.counter}>
          <Text style={styles.counterText}>{currentIndex + 1} / {media.length}</Text>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   VIEWER VIDEO ITEM
   ============================================================ */

function ViewerVideoItem({
  uri,
  onPositionUpdate,
}: {
  uri: string | number;
  onPositionUpdate?: (seconds: number) => void;
}) {
  const uriStr = uri?.toString() ?? "";

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  // Khôi phục vị trí từ feed player khi mở viewer
  useEffect(() => {
    const savedSec = getVideoPosition(uriStr);
    if (savedSec > 0) {
      player.seekBy(savedSec);
    }
    player.play();
  }, [uriStr]);

  // Cập nhật vị trí liên tục để feed player đồng bộ khi đóng viewer
  useEffect(() => {
    const id = setInterval(() => {
      const sec = player.currentTime ?? 0;
      onPositionUpdate?.(sec);
    }, 300);
    return () => clearInterval(id);
  }, []);

  const [showControls, setShowControls] = useState(false);

  const togglePlay = () => {
    if (player.playing) player.pause();
    else player.play();
    setShowControls(true);
    setTimeout(() => setShowControls(false), 2000);
  };

  return (
    <Pressable style={{ width: SCREEN_W, height: SCREEN_H }} onPress={togglePlay}>
      <VideoView
        player={player}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        contentFit="contain"
        allowsFullscreen
        allowsPictureInPicture
      />
      {showControls && (
        <View style={styles.controlsOverlay}>
          <Ionicons name={player.playing ? "pause" : "play"} size={50} color="white" />
        </View>
      )}
    </Pressable>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  flexItem: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%" },
  videoContainer: { overflow: "hidden", borderRadius: 12, backgroundColor: "black" },
  muteButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 6,
    borderRadius: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  overlayText: { color: "white", fontSize: 24, fontWeight: "bold" },
  modalContainer: { flex: 1, backgroundColor: "black" },
  close: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  counter: { position: "absolute", bottom: 40, alignSelf: "center" },
  counterText: { color: "white", fontSize: 16 },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
});
