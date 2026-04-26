import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';

export default function CaseDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  useEffect(() => { api.get(`/cases/${id}`).then(r => setItem(r.data)); }, [id]);
  if (!item) return <><Navbar /><main className="container">Loading...</main></>;
  const image = item.images?.[0] || 'https://placehold.co/600x420?text=Missing+Person';
  const markers = [{ lat:item.last_seen_lat,lng:item.last_seen_lng,title:'Last seen',description:item.last_seen_location }, ...(item.sightings || []).filter(s=>s.status==='verified').map(s=>({lat:s.lat,lng:s.lng,title:'Verified sighting',description:s.description}))];
  return <><Navbar /><main className="container"><div className="details-grid"><section><img className="big-photo" src={image} alt={item.name} /> <div className="thumbs">{item.images?.map((src,i)=><img key={i} src={src} />)}</div></section><section className="panel"><div className="row between"><h1>{item.name}</h1><span className={`badge ${item.status}`}>{item.status}</span></div><p><b>Age:</b> {item.age}</p><p><b>Gender:</b> {item.gender}</p><p><b>Height:</b> {item.height}</p><p><b>Last Seen:</b> {item.last_seen_location}</p><p><b>Clothing:</b> {item.clothing}</p><p><b>Medical:</b> {item.medical_info || 'None'}</p><p>{item.description}</p><div className="row gap"><Link className="btn danger" to={`/sighting/${item.id}`}>I Saw This Person</Link><button className="btn outline" onClick={()=>navigator.share?.({title:item.name,url:location.href})}>Share Case</button></div></section></div><h2>Last Seen Location & Verified Sightings</h2><MapView center={[item.last_seen_lat,item.last_seen_lng]} markers={markers} /><h2>Timeline / Sightings</h2><div className="timeline">{(item.sightings || []).map(s => <div className="timeline-item" key={s.id}><b>{s.status}</b> sighting: {s.description}<br/><small>{new Date(s.created_at).toLocaleString()}</small></div>)}</div></main></>;
}
