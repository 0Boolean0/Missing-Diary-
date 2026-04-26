import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', role:'local' });
  const { register } = useAuth(); const nav = useNavigate(); const [error, setError] = useState('');
  async function submit(e){e.preventDefault();try{await register(form);nav('/dashboard')}catch(err){setError(err.response?.data?.message || 'Registration failed')}}
  return <><Navbar /><main className="auth-card"><h2>Create Account</h2>{error && <p className="error">{error}</p>}<form onSubmit={submit}>{['name','email','phone','password'].map(k=><input key={k} type={k==='password'?'password':'text'} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={k} />)}<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="local">Local People</option><option value="guardian">Guardian</option></select><button className="btn full">Register</button></form></main></>;
}
