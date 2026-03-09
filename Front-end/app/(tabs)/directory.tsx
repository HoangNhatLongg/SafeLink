import { useEffect, useState } from "react";
import { View } from "react-native";

import AgencyList from "@/features/emergency/AgencyList";
import MapSection from "@/features/emergency/MapSection";
import SearchBox from "@/features/emergency/SearchBox";

import { AGENCIES } from "@/features/emergency/agencyData";
import { getUserLocation } from "@/features/emergency/locationService";

export default function DirectoryScreen() {

  const [location, setLocation] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    const loc = await getUserLocation();
    setLocation(loc);
  };

  const filtered = AGENCIES.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!location) return null;

  return (
    <View style={{ flex: 1 }}>

      <MapSection
        location={location}
        agencies={filtered}
      />

      <SearchBox
        value={search}
        onChange={setSearch}
      />

      <AgencyList agencies={filtered} />

    </View>
  );
}