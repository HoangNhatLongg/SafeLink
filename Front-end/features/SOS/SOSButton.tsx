import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BUTTON_SIZE = 64;
const STORAGE_KEY = "sos_button_position";

interface SOSButtonProps {
  onPress: () => void;
}

export default function SOSButton({ onPress }: SOSButtonProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);

  // Load position from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((pos) => {
      if (pos) {
        const { x, y } = JSON.parse(pos);
        pan.setValue({ x, y });
      } else {
        // Default position: bottom right
        const defaultX = SCREEN_WIDTH - BUTTON_SIZE - 20;
        const defaultY = SCREEN_HEIGHT - BUTTON_SIZE - 150;
        pan.setValue({ x: defaultX, y: defaultY });
      }
    });

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        setIsDragging(false);
        pan.flattenOffset();
        
        // Boundaries check
        let newX = (pan.x as any)._value;
        let newY = (pan.y as any)._value;

        if (newX < 10) newX = 10;
        if (newX > SCREEN_WIDTH - BUTTON_SIZE - 10) newX = SCREEN_WIDTH - BUTTON_SIZE - 10;
        if (newY < 50) newY = 50;
        if (newY > SCREEN_HEIGHT - BUTTON_SIZE - 100) newY = SCREEN_HEIGHT - BUTTON_SIZE - 100;

        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();

        // Save position
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x: newX, y: newY }));

        // Detect tap vs drag
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          onPress();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: isDragging ? 1.1 : 1 },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.pulseCircle,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.2],
              outputRange: [0.6, 0],
            }),
          },
        ]}
      />
      <View style={styles.button}>
        <Ionicons name="warning" size={32} color="#fff" />
        <Text style={styles.text}>SOS</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 9999,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  pulseCircle: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "#FF3B30",
  },
  text: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    marginTop: -2,
  },
});
