/**
 * CachedImage — expo-image wrapper với:
 *  - Disk + memory cache tự động (expo-image)
 *  - Hiển thị ảnh đúng kích thước (thumbnail/medium/large) theo context
 *  - Fallback về local URL nếu chưa dùng Cloudinary
 *  - Hỗ trợ placeholder mờ (ActivityIndicator) khi đang load
 */

import { Image, ImageContentFit } from "expo-image";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

/** Object ảnh từ API (hỗ trợ cả Cloudinary multi-size và local URL) */
export type PostImage = {
  url: string;        // URL gốc hoặc local fallback
  thumbnail?: string; // 150x150 — grid nhỏ
  medium?: string;    // 600px  — trong feed
  large?: string;     // 1200px — xem chi tiết
};

/** Chọn URL phù hợp với context hiển thị */
export const resolveImageUrl = (
  img: PostImage | string | undefined,
  context: "thumbnail" | "feed" | "detail" = "feed"
): string => {
  if (!img) return "";
  if (typeof img === "string") return img;

  switch (context) {
    case "thumbnail": return img.thumbnail || img.medium || img.url;
    case "feed":      return img.medium    || img.large  || img.url;
    case "detail":    return img.large     || img.medium || img.url;
  }
};

type Props = {
  source: PostImage | string | undefined;
  style?: any;
  contentFit?: ImageContentFit;
  context?: "thumbnail" | "feed" | "detail";
  /** Có hiện loading spinner không (default: false) */
  showLoader?: boolean;
};

/**
 * Component ảnh tối ưu:
 * - Tự động chọn URL đúng kích thước
 * - Cache memory + disk qua expo-image
 * - Transition nhẹ khi load
 */
export default function CachedImage({
  source,
  style,
  contentFit = "cover",
  context = "feed",
  showLoader = false,
}: Props) {
  const [loading, setLoading] = React.useState(showLoader);
  const uri = resolveImageUrl(source, context);

  if (!uri) return null;

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={200}
        cachePolicy="memory-disk"      // Cache trên memory + disk
        onLoadEnd={() => setLoading(false)}
        recyclingKey={uri}             // Key cho FlatList recycling
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#94a3b8" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
});
