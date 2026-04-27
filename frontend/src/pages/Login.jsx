import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      nav(redirect);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  }

  return (
    <>
      <Navbar />
      <main className="auth-card">
        <h2>Login</h2>
        {redirect !== '/dashboard' && (
          <p className="muted" style={{ fontSize: 13 }}>Login to continue to <b>{redirect}</b></p>
        )}
        {error && <p className="error">{error}</p>}
        <form onSubmit={submit}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
          <button className="btn full">Login</button>
        </form>
        <p>No account? <Link to="/register">Register</Link></p>
        <small className="muted">Seed users: admin@, police@, guardian@, local@missingdiary.test / password123</small>
      </main>
    </>
  );
}
