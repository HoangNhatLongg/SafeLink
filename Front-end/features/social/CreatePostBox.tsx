import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  onSubmit: (post: any) => void;
};

export default function CreatePostBox({ onSubmit }: Props) {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<any[]>([]);
  const [hashtag, setHashtag] = useState("");

  const pickMedia = async (type: "image" | "video") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled) {
      setMedia([
        ...media,
        {
          type,
          uri: result.assets[0].uri,
        },
      ]);
    }
  };

  const handleSubmit = () => {
    if (!content && media.length === 0) return;

    const newPost = {
      id: Date.now().toString(),
      username: "Bạn",
      avatar: require('../Uploads/AnhDaiDien.jpg'),
      reputation: 100,
      location: "Đắk Lắk",
      title: "",
      hashtag,
      content,
      media,
      likes: 0,
      dislikes: 0,
      commentsCount: 0,
      shares: 0,
    };

    onSubmit(newPost);

    // Reset
    setContent("");
    setMedia([]);
    setHashtag("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: "https://i.pravatar.cc/150?img=12" }}
          style={styles.avatar}
        />

        <TextInput
          placeholder="Bạn đang nghĩ gì?"
          style={styles.input}
          value={content}
          onChangeText={setContent}
          multiline
        />
      </View>

      {/* Preview media */}
      {media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {media.map((item, index) => (
            <View key={index} style={styles.previewWrapper}>
              <Image source={{ uri: item.uri }} style={styles.preview} />
            </View>
          ))}
        </ScrollView>
      )}

      <TextInput
        placeholder="#hashtag"
        value={hashtag}
        onChangeText={setHashtag}
        style={styles.hashtagInput}
      />

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => pickMedia("image")}>
          <Ionicons name="image" size={22} color="#4CAF50" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => pickMedia("video")}>
          <Ionicons name="videocam" size={22} color="#2196F3" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.postBtn} onPress={handleSubmit}>
          <Text style={styles.postText}>Đăng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 16,
    marginVertical: 10,
  },
  header: {
    flexDirection: "row",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  input: {
    flex: 1,
    minHeight: 40,
  },
  previewWrapper: {
    marginTop: 10,
    marginRight: 8,
  },
  preview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  hashtagInput: {
    marginTop: 10,
    paddingVertical: 6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  postBtn: {
    backgroundColor: "#1877F2",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  postText: {
    color: "white",
    fontWeight: "600",
  },
});