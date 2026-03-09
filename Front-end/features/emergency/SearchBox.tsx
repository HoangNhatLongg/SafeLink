import { TextInput, View } from "react-native";

export default function SearchBox({ value, onChange }: any) {

  return (
    <View
      style={{
        padding: 10,
        backgroundColor: "#fff",
      }}
    >
      <TextInput
        placeholder="Nhập nội dung tìm kiếm"
        value={value}
        onChangeText={onChange}
        style={{
          backgroundColor: "#f2f2f2",
          padding: 10,
          borderRadius: 8,
        }}
      />
    </View>
  );
}