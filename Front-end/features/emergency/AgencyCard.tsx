import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useColorScheme } from '@/hooks/use-color-scheme';
export default function AgencyCard({ item }: any) {
  const colorScheme = useColorScheme();
  return (
    <View
      style={{
        padding: 14,
        borderBottomWidth: 1,
        borderColor: "#eee",
      }}
    >
      <Text
        style={{
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        {item.name}
      </Text>

      <Text>{item.address}</Text>

      <TouchableOpacity
        onPress={() => Linking.openURL(`tel:${item.phone}`)}
      >
        <Text style={{ color: "red", marginTop: 6 }}>
          📞 {item.phone}
        </Text>
      </TouchableOpacity>
    </View>
  );
}