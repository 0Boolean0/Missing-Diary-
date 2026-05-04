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
    <div style={{ position: 'relative', height, width: '100%', borderRadius: 14, overflow: 'hidden', zIndex: 0 }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {onPick && <ClickPicker onPick={onPick} />}
        {/* Fix #24: use stable key instead of array index */}
        {markers.map((m) => (
          <Marker key={`${m.lat}-${m.lng}-${m.title}`} position={[Number(m.lat), Number(m.lng)]} icon={icon}>
            <Popup><b>{m.title}</b><br />{m.description}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
