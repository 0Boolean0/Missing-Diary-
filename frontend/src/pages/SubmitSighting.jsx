import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';

export default function SubmitSighting() {
  const { id } = useParams(); const nav = useNavigate();
  const [cases, setCases] = useState([]); const [image, setImage] = useState(null);
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [form, setForm] = useState({ missing_person_id: id || '', location_text:'', description:'', confidence_level:'maybe' });
  const [msg,setMsg] = useState('');
  useEffect(()=>{api.get('/cases').then(r=>setCases(r.data));},[]);
  async function submit(e){e.preventDefault(); const fd=new FormData(); Object.entries(form).forEach(([k,v])=>fd.append(k,v)); fd.append('lat',pos.lat); fd.append('lng',pos.lng); if(image) fd.append('image',image); try{await api.post('/sightings',fd); nav(`/cases/${form.missing_person_id}`)}catch(err){setMsg(err.response?.data?.message || 'Failed to submit sighting')}}
  return <><Navbar /><main className="container narrow"><h1>Submit a Sighting</h1><p className="muted">Your information can help bring someone home.</p>{msg && <p className="error">{msg}</p>}<form onSubmit={submit} className="form-grid"><select value={form.missing_person_id} onChange={e=>setForm({...form,missing_person_id:e.target.value})} required><option value="">Select missing person</option>{cases.map(c=><option key={c.id} value={c.id}>{c.name} - {c.last_seen_location}</option>)}</select><input value={form.location_text} onChange={e=>setForm({...form,location_text:e.target.value})} placeholder="Location name" /><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe what you saw" required /><select value={form.confidence_level} onChange={e=>setForm({...form,confidence_level:e.target.value})}><option value="sure">Sure</option><option value="maybe">Maybe</option><option value="not_sure">Not sure</option></select><input type="file" accept="image/*" onChange={e=>setImage(e.target.files[0])} /><MapView center={[pos.lat,pos.lng]} markers={[{lat:pos.lat,lng:pos.lng,title:'Sighting location'}]} onPick={latlng=>setPos(latlng)} /><button className="btn full">Submit Sighting</button></form></main></>;
}
