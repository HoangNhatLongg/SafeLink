import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { fetchFollowers, fetchFollowing, followUser, unfollowUser } from "@/features/social/services/postsApi";

export default function FollowersListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; type: "followers" | "following"; name?: string }>();
  
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mảng dùng để tránh click spam nút follow
  const [busyList, setBusyList] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async (searchQuery: string) => {
    if (!params.userId || !params.type) return;
    setLoading(true);
    try {
      if (params.type === "followers") {
        const { followers } = await fetchFollowers(params.userId, searchQuery);
        setUsers(followers || []);
      } else {
        const { following } = await fetchFollowing(params.userId, searchQuery);
        setUsers(following || []);
      }
    } catch (e: any) {
      if (e.message.includes("403") || e.message.includes("không chia sẻ")) {
        setUsers([]);
      } else {
        Alert.alert("Lỗi", e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [params.userId, params.type]);

  useEffect(() => {
    const timeoutId = setTimeout(() => loadData(query), query ? 500 : 0);
    return () => clearTimeout(timeoutId);
  }, [query, loadData]);

  const handleToggleFollow = async (user: any) => {
    if (busyList[user._id]) return;
    setBusyList(prev => ({ ...prev, [user._id]: true }));
    try {
      if (user.isFollowedByMe) {
        await unfollowUser(user._id);
        setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isFollowedByMe: false } : u));
      } else {
        await followUser(user._id);
        setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isFollowedByMe: true } : u));
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setBusyList(prev => ({ ...prev, [user._id]: false }));
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => router.push({ pathname: "/user/[id]", params: { id: item._id } })}
      >
        <Image 
          source={item.avatar ? { uri: item.avatar } : require("../../assets/images/avatar-default.jpg")} 
          style={styles.avatar} 
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          {item.email && <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.followBtn, item.isFollowedByMe && styles.followingBtn]}
        onPress={() => handleToggleFollow(item)}
        disabled={busyList[item._id]}
      >
        {busyList[item._id] ? (
          <ActivityIndicator size="small" color={item.isFollowedByMe ? "#e43131ff" : "#fff"} />
        ) : (
          <Text style={[styles.followText, item.isFollowedByMe && styles.followingText]}>
            {item.isFollowedByMe ? "Hủy theo dõi" : "Theo dõi"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.type === "followers" ? "Người theo dõi" : "Đang theo dõi"}
          {params.name ? ` của ${params.name}` : ""}
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#888" style={{marginLeft: 10}}/>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm người dùng..."
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#888" style={{marginRight: 10}}/>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1877f2" size="large" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: "#888", fontSize: 15 }}>
                {query ? "Không tìm thấy ai phù hợp." : "Danh sách trống."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  searchWrapper: {
    padding: 12,
    backgroundColor: "#fff",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 15,
    color: "#333",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f2f5",
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111",
  },
  userEmail: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: "#1877f2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  followingBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  followText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  followingText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 13,
  },
});
