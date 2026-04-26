import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CaseCard from '../components/CaseCard';
import MapView from '../components/MapView';
import { api } from '../api/client';

export default function Home() {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => { api.get('/cases').then(r => setCases(r.data)).catch(() => setCases([])); }, []);
  const filtered = cases.filter(c => [c.name, c.last_seen_location, c.gender].join(' ').toLowerCase().includes(search.toLowerCase()));
  const markers = filtered.map(c => ({ lat: c.last_seen_lat, lng: c.last_seen_lng, title: c.name, description: c.last_seen_location }));
  return <>
    <Navbar />
    <section className="hero">
      <div><h1>Help Bring Missing People Home</h1><p>Every share increases hope. Every verified update can save time.</p><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, age, location..." /><div className="row gap"><Link className="btn danger" to="/report">Report Missing Person</Link><Link className="btn outline light" to="/sighting">Submit a Sighting</Link></div></div>
    </section>
    <main className="container" id="cases">
      <div className="row between"><h2>Urgent Missing Cases</h2><span>{filtered.length} cases</span></div>
      <div className="grid cards">{filtered.map(c => <CaseCard item={c} key={c.id} />)}</div>
      <h2>Live Missing Persons Map</h2>
      <MapView markers={markers} />
    </main>
  </>;
}
