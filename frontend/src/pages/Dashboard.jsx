import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]); const [sightings,setSightings]=useState([]); const [stats,setStats]=useState(null);
  useEffect(()=>{
    api.get(user.role === 'guardian' ? '/cases/mine' : '/cases').then(r=>setCases(r.data));
    if(['admin','police'].includes(user.role)) api.get('/sightings').then(r=>setSightings(r.data));
    if(user.role==='admin') api.get('/admin/stats').then(r=>setStats(r.data));
  },[user.role]);
  async function updateCase(id,status){ await api.patch(`/cases/${id}/status`,{status}); setCases(cases.map(c=>c.id===id?{...c,status}:c)); }
  async function updateSighting(id,status){ await api.patch(`/sightings/${id}/status`,{status}); setSightings(sightings.map(s=>s.id===id?{...s,status}:s)); }
  const markers = cases.map(c=>({lat:c.last_seen_lat,lng:c.last_seen_lng,title:c.name,description:c.status}));
  return <><Navbar /><main className="dashboard"><aside className="sidebar"><h2>Missing Diary</h2><p>{user.role.toUpperCase()}</p><Link to="/dashboard">Dashboard</Link><Link to="/report">Report Case</Link><Link to="/sighting">Submit Sighting</Link></aside><section className="dash-main"><h1>{capitalize(user.role)} Dashboard</h1><p>Welcome, {user.name}</p><div className="stats"><div className="stat"><span>Total Cases</span><b>{cases.length}</b></div><div className="stat"><span>Active</span><b>{cases.filter(c=>['active','verified'].includes(c.status)).length}</b></div><div className="stat"><span>Pending</span><b>{cases.filter(c=>c.status==='pending').length}</b></div><div className="stat"><span>Found</span><b>{cases.filter(c=>c.status==='found').length}</b></div></div>{stats && <pre className="json">{JSON.stringify(stats,null,2)}</pre>}<h2>Map View</h2><MapView markers={markers} height={300}/><h2>Cases</h2><table><thead><tr><th>Name</th><th>Location</th><th>Status</th><th>Action</th></tr></thead><tbody>{cases.map(c=><tr key={c.id}><td><Link to={`/cases/${c.id}`}>{c.name}</Link></td><td>{c.last_seen_location}</td><td><span className={`badge ${c.status}`}>{c.status}</span></td><td>{['admin','police'].includes(user.role) ? <div className="row gap"><button onClick={()=>updateCase(c.id,'verified')}>Verify</button><button onClick={()=>updateCase(c.id,'found')}>Found</button><button onClick={()=>updateCase(c.id,'rejected')}>Reject</button></div> : <Link to={`/cases/${c.id}`}>Open</Link>}</td></tr>)}</tbody></table>{['admin','police'].includes(user.role) && <><h2>Pending Sightings</h2><table><thead><tr><th>Person</th><th>Location</th><th>Confidence</th><th>Status</th><th>Action</th></tr></thead><tbody>{sightings.map(s=><tr key={s.id}><td>{s.person_name}</td><td>{s.location_text}</td><td>{s.confidence_level}</td><td>{s.status}</td><td><button onClick={()=>updateSighting(s.id,'verified')}>Verify</button> <button onClick={()=>updateSighting(s.id,'rejected')}>Reject</button></td></tr>)}</tbody></table></>}</section></main></>;
}
function capitalize(s){return s.charAt(0).toUpperCase()+s.slice(1)}
