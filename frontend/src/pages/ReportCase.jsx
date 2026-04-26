import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';

export default function ReportCase() {
  const nav = useNavigate();
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({ name:'', age:'', gender:'', height:'', clothing:'', medical_info:'', description:'', last_seen_location:'', last_seen_time:'' });
  const [msg, setMsg] = useState('');
  async function submit(e){
    e.preventDefault(); setMsg('');
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    fd.append('last_seen_lat', pos.lat); fd.append('last_seen_lng', pos.lng);
    [...files].forEach(f => fd.append('images', f));
    try { const { data } = await api.post('/cases', fd); nav(`/cases/${data.id}`); } catch(err) { setMsg(err.response?.data?.message || 'Failed to submit report'); }
  }
  return <><Navbar /><main className="container narrow"><h1>Report Missing Person</h1><p className="muted">Click on the map to select the last seen location.</p>{msg && <p className="error">{msg}</p>}<form onSubmit={submit} className="form-grid">
    {['name','age','gender','height','clothing','medical_info','last_seen_location'].map(k => <input key={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={k.replaceAll('_',' ')} required={['name','last_seen_location'].includes(k)} />)}
    <input type="datetime-local" value={form.last_seen_time} onChange={e=>setForm({...form,last_seen_time:e.target.value})} />
    <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Full description" />
    <input type="file" multiple accept="image/*" onChange={e=>setFiles(e.target.files)} />
    <MapView center={[pos.lat,pos.lng]} markers={[{lat:pos.lat,lng:pos.lng,title:'Last seen location'}]} onPick={latlng=>setPos(latlng)} />
    <button className="btn danger full">Submit Report</button>
  </form></main></>;
}
