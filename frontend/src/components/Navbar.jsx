import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return <header className="navbar">
    <Link to="/" className="brand">🛡️ SafeReturn</Link>
    <nav>
      <Link to="/">Home</Link>
      <a href="/#cases">Missing Cases</a>
      <Link to="/report">Report</Link>
      {user ? <><Link to="/dashboard">Dashboard</Link><button className="ghost" onClick={logout}>Logout</button></> : <Link className="btn small" to="/login">Login</Link>}
    </nav>
  </header>
}
