import BreakingNewsTicker from "@/features/social/BreakingNewsTicker";
import PostCard from "@/features/social/PostCard";
import { MOCK_POSTS } from "@/data/mockPosts";

import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  Image,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function SocialScreen() {
  const router = useRouter();

  const [posts, setPosts] = useState(MOCK_POSTS);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const onEndReachedCalledDuringMomentum = useRef(false);

  /* ======================
     REFRESH
  ====================== */

  const onRefresh = async () => {
    setRefreshing(true);

    setTimeout(() => {
      setPosts(MOCK_POSTS);
      setRefreshing(false);
    }, 1000);
  };

  /* ======================
     LOAD MORE
  ====================== */

  const loadMore = () => {
    if (loadingMore || onEndReachedCalledDuringMomentum.current) return;

    setLoadingMore(true);
    onEndReachedCalledDuringMomentum.current = true;

    setTimeout(() => {
      setPosts((prev) => [...prev, ...MOCK_POSTS]);
      setLoadingMore(false);
    }, 1000);
  };

  /* ======================
     RENDER ITEM
  ====================== */

  const renderItem = useCallback(
    ({ item }: any) => <PostCard post={item} />,
    []
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <BreakingNewsTicker />

      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={<CreatePost router={router} />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.loadingText}>Đang tải thêm...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}

        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }

        onEndReached={loadMore}
        onEndReachedThreshold={0.2}

        onMomentumScrollBegin={() => {
          onEndReachedCalledDuringMomentum.current = false;
        }}

        initialNumToRender={6}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

/* ======================
   CREATE POST BOX
====================== */

function CreatePost({ router }: any) {
  return (
    <View style={styles.createContainer}>
      <Image
        source={require("@/Uploads/AnhDaiDien.jpg")}
        style={styles.avatar}
      />

      <TouchableOpacity
        style={styles.fakeInput}
        onPress={() => router.push("/create-post")}
      >
        <Text style={styles.placeholder}>
          Chia sẻ thông tin mới...
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ======================
   STYLES
====================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f3f5",
  },

  listContent: {
    padding: 6,
    paddingBottom: 30,
  },

  createContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },

  fakeInput: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
  },

  placeholder: {
    color: "#777",
    fontSize: 14,
  },

  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },

  loadingText: {
    marginTop: 6,
    color: "#777",
    fontSize: 13,
  },
});