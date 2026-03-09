import MapView, { Marker } from "react-native-maps";
import { StyleSheet } from "react-native";

export default function MapSection({ location, agencies }: any) {

  return (
    <MapView
      style={styles.map}
      region={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      <Marker
        coordinate={location}
        title="Vị trí của bạn"
      />

      {agencies.map((item: any) => (
        <Marker
          key={item.id}
          coordinate={{
            latitude: item.lat,
            longitude: item.lng,
          }}
          title={item.name}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: "100%",
    width: "100%",
  },
});