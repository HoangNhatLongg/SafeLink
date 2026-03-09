import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const screenWidth = Dimensions.get("window").width;

export default function BreakingNewsTicker() {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    if (!textWidth) return;

    translateX.setValue(screenWidth);

    Animated.loop(
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  }, [textWidth]);

  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: insets.top }, // 🔥 tránh tai thỏ
      ]}
    >
      <View style={styles.container}>
        <Animated.Text
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          style={[
            styles.text,
            { transform: [{ translateX }] },
          ]}
        >
          🔥 Tin nổi bật: Cảnh báo thời tiết tại Đắk Lắk...
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff3cd",
  },
  container: {
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
  },
  text: {
    fontWeight: "600",
  },
});