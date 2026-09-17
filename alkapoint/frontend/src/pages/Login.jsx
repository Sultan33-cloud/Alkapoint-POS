import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome to AlkaPoint');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md ap-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/alkapoint-logo.svg" alt="AlkaPoint" className="w-10 h-10" />
          <div>
            <div className="text-xl font-bold">AlkaPoint</div>
            <div className="text-xs text-paper-400">POS & Business Suite</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="ap-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ap-input"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="ap-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ap-input"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="ap-btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-[11px] text-paper-400 text-center">
          Default admin: omondipeddy83@gmail.com / admin123
        </div>
      </div>
    </div>
  );
}