import { FlatList } from "react-native";
import AgencyCard from "./AgencyCard";

export default function AgencyList({ agencies }: any) {

  return (
    <FlatList
      data={agencies}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) =>
        <AgencyCard item={item} />
      }
    />
  );
}