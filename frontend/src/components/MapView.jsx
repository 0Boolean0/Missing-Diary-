import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const icon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

function ClickPicker({ onPick }) {
  useMapEvents({ click(e) { onPick?.(e.latlng); } });
  return null;
}

export default function MapView({ center = [23.8103, 90.4125], markers = [], onPick, height = 320 }) {
  return (
    <div style={{ position: 'relative', zIndex: 0, isolation: 'isolate' }}>
      <MapContainer center={center} zoom={12} style={{ height, width: '100%', borderRadius: 14 }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {onPick && <ClickPicker onPick={onPick} />}
        {markers.map((m, i) => <Marker key={i} position={[Number(m.lat), Number(m.lng)]} icon={icon}>
          <Popup><b>{m.title}</b><br />{m.description}</Popup>
        </Marker>)}
      </MapContainer>
    </div>
  );
}
