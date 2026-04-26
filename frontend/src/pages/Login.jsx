import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@safereturn.test');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();
  async function submit(e) { e.preventDefault(); setError(''); try { await login(email, password); nav('/dashboard'); } catch (err) { setError(err.response?.data?.message || 'Login failed'); } }
  return <><Navbar /><main className="auth-card"><h2>Login</h2>{error && <p className="error">{error}</p>}<form onSubmit={submit}><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" /><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" /><button className="btn full">Login</button></form><p>No account? <Link to="/register">Register</Link></p><small>Seed users: admin@, police@, guardian@, local@safereturn.test / password123</small></main></>;
}
