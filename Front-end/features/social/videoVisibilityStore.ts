/**
 * VideoVisibilityStore
 *
 * - Theo dõi vidKey nào đang hiển thị ≥ 80% trên màn hình
 * - Key: `${postId}_${mediaIndex}` — khớp với videoKey()
 * - Dùng event-emitter thay vì polling để phản hồi tức thì
 * - Chia sẻ vị trí video (giây) giữa feed player và viewer
 */

import { useEffect, useRef, useState } from "react";
import { ViewToken } from "react-native";

// ── Visible set ──────────────────────────────────────────────

const _visibleKeys = new Set<string>();
type Listener = (keys: Set<string>) => void;
const _listeners = new Set<Listener>();

function _notify() {
  _listeners.forEach((fn) => fn(_visibleKeys));
}

function _subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** Hook: trả về true khi vidKey đang hiển thị ≥ 80% */
export function useVideoVisible(vidKey: string): boolean {
  const [visible, setVisible] = useState(() => _visibleKeys.has(vidKey));
  const keyRef = useRef(vidKey);
  keyRef.current = vidKey;

  useEffect(() => {
    // Sync ngay lập tức nếu store đã có giá trị
    setVisible(_visibleKeys.has(vidKey));
    return _subscribe((keys) => {
      setVisible(keys.has(keyRef.current));
    });
  }, [vidKey]);

  return visible;
}

/**
 * Dùng cho FlatList.onViewableItemsChanged.
 * postId là key của item trong FlatList; ta mở rộng sang mọi vidKey
 * của post đó (postId_0, postId_1 …) vì 1 post có thể có nhiều video.
 */
export function makeOnViewableItemsChanged(
  onPostIdsChange?: (postIds: string[]) => void
) {
  return ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    _visibleKeys.clear();

    const postIds: string[] = [];
    for (const v of viewableItems) {
      const pct = (v as any).percentVisible ?? 0;
      if (v.isViewable && pct >= 80 && v.key) {
        postIds.push(v.key);
        // Thêm vidKeys của mọi video trong post này (tối đa 4 video/post)
        for (let i = 0; i < 4; i++) {
          _visibleKeys.add(videoKey(v.key, i));
        }
      }
    }

    _notify();
    onPostIdsChange?.(postIds);
  };
}

/** Sinh key cho video trong PostCard: `${postId}_${mediaIndex}` */
export function videoKey(postId: string, mediaIndex: number): string {
  return `${postId}_${mediaIndex}`;
}

// ── Video position store (giây) ───────────────────────────────

/** Lưu vị trí phát hiện tại (giây) để đồng bộ feed ↔ viewer */
const _posMap = new Map<string, number>();

export function saveVideoPosition(uri: string, seconds: number) {
  _posMap.set(uri, seconds);
}

export function getVideoPosition(uri: string): number {
  return _posMap.get(uri) ?? 0;
}

export function clearAllVideoPositions() {
  _posMap.clear();
}
