import React from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/* ─── Types ─── */
type MediaType = "image" | "video";

interface MediaItem {
  uri: string;
  type: MediaType;
  mimeType?: string | null;
  fileName?: string | null;
}

interface ImageGridPreviewProps {
  media: MediaItem[];
  onRemove: (index: number) => void;
  fadeAnims?: Animated.Value[];
}

/* ─── Helpers ─── */
const { width: SCREEN_W } = Dimensions.get("window");
const PREVIEW_W = SCREEN_W - 24;
const GAP = 2;

/* Grid layout logic — tương tự Facebook:
   1 item  → full width
   2 items → 50/50 row
   3 items → 2 left + 1 right
   4+ items → 2×2 grid + overlay
*/
function getLayout(items: MediaItem[]) {
  const count = items.length;
  if (count === 1) {
    return { rows: [{ items: [{ idx: 0, w: PREVIEW_W, h: 220 }] }] };
  }
  if (count === 2) {
    const w = (PREVIEW_W - GAP) / 2;
    return {
      rows: [{ items: [{ idx: 0, w, h: 160 }, { idx: 1, w, h: 160 }] }],
    };
  }
  if (count === 3) {
    const w = (PREVIEW_W - GAP) / 2;
    return {
      rows: [
        { items: [{ idx: 0, w, h: 200 }] },
        { items: [{ idx: 1, w, h: 98 }, { idx: 2, w, h: 98 }] },
      ],
    };
  }
  if (count === 4) {
    const w = (PREVIEW_W - GAP) / 2;
    return {
      rows: [
        { items: [{ idx: 0, w, h: 98 }, { idx: 1, w, h: 98 }] },
        { items: [{ idx: 2, w, h: 98 }, { idx: 3, w, h: 98 }] },
      ],
    };
  }
  // ≥5: 2×2 + overlay
  const w = (PREVIEW_W - GAP) / 2;
  return {
    rows: [
      { items: [{ idx: 0, w, h: 98 }, { idx: 1, w, h: 98 }] },
      { items: [{ idx: 2, w, h: 98 }, { idx: 3, w, h: 98, overlay: count > 4 ? count - 4 : undefined }] },
    ],
  };
}

/* ─── ImageCell ─── */
interface CellProps {
  item: MediaItem;
  w: number;
  h: number;
  anim?: Animated.Value;
  overlay?: number;
  onRemove: () => void;
}

function ImageCell({ item, w, h, anim, overlay, onRemove }: CellProps) {
  const Wrapper = anim ? Animated.View : View;
  const wrapperStyle = anim ? [{ opacity: anim as any }] : [];

  return (
    <Wrapper style={wrapperStyle as any}>
      <View style={[styles.cell, { width: w, height: h }]}>
        <Image
          source={{ uri: item.uri }}
          style={[styles.cellImage, { width: w, height: h }]}
          resizeMode="cover"
        />
        {item.type === "video" && (
          <View style={styles.videoBadge}>
            <Ionicons name="videocam" size={14} color="#fff" />
          </View>
        )}
        {overlay !== undefined && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>+{overlay}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Ionicons name="close-circle" size={22} color="#fff" style={styles.removeIcon} />
        </TouchableOpacity>
      </View>
    </Wrapper>
  );
}

/* ─── Main Component ─── */
export function ImageGridPreview({ media, onRemove, fadeAnims = [] }: ImageGridPreviewProps) {
  if (!media.length) return null;

  const { rows } = getLayout(media);

  return (
    <View style={styles.container}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.items.map((cell) => (
            <ImageCell
              key={cell.idx}
              item={media[cell.idx]}
              w={cell.w}
              h={cell.h}
              anim={fadeAnims[cell.idx]}
              overlay={cell.overlay}
              onRemove={() => onRemove(cell.idx)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { borderRadius: 12, overflow: "hidden" },
  row: { flexDirection: "row", gap: GAP, marginBottom: GAP },
  cell: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#E4E6EB",
  },
  cellImage: { borderRadius: 6 },
  videoBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    padding: 3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  overlayText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  removeIcon: { textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 },
});
