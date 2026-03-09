import { useEffect, useState } from "react";
import { View } from "react-native";

import MapSection from "@/features/SOS/MapSection";

import { AGENCIES } from "@/features/SOS/agencyData";
import { getUserLocation } from "@/features/SOS/locationService";

export default function DirectoryScreen() {

  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    const loc = await getUserLocation();
    setLocation(loc);
  };

  const filtered = AGENCIES.filter((item) =>
    item.name.toLowerCase().includes("")
  );

  if (!location) return null;

  return (
    <View>

      <MapSection
        location={location}
        agencies={filtered}
      />

    </View>
  );
}