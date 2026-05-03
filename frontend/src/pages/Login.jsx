import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';

function Login() {
  const [identifier, setIdentifier] = useState('admin@placementrisk.ai');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const applyDemo = (demoIdentifier) => {
    setIdentifier(demoIdentifier);
    setPassword('demo123');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(identifier, password);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate(response.data.user?.home_route || '/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">PlacementRisk AI</h1>
          <p className="text-slate-300 mt-2">Linking Education Loans to Career Success</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-200">Email or Student ID</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@placementrisk.ai or student UUID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && <div className="bg-red-950/50 border border-red-700 text-red-200 px-4 py-3 rounded">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="font-semibold text-slate-300 text-sm mb-2">Sign in as</p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <button type="button" onClick={() => applyDemo('admin@placementrisk.ai')} className="text-left px-3 py-2 rounded border border-slate-700 hover:border-blue-500 hover:bg-slate-800">
              Admin demo: admin@placementrisk.ai / demo123
            </button>
            <button type="button" onClick={() => applyDemo('riskhead@placementrisk.ai')} className="text-left px-3 py-2 rounded border border-slate-700 hover:border-blue-500 hover:bg-slate-800">
              Risk Head demo: riskhead@placementrisk.ai / demo123
            </button>
            <button type="button" onClick={() => applyDemo('officer@placementrisk.ai')} className="text-left px-3 py-2 rounded border border-slate-700 hover:border-blue-500 hover:bg-slate-800">
              Officer demo: officer@placementrisk.ai / demo123
            </button>
          </div>
          <button type="button" onClick={() => applyDemo('student0001@placementrisk.ai')} className="text-left px-3 py-2 rounded border border-slate-700 hover:border-blue-500 hover:bg-slate-800">
              Student demo: student0001@placementrisk.ai / demo123
            </button>
          <div className="mt-3 text-xs text-slate-400 bg-slate-900 border border-slate-700 rounded px-3 py-2">
            Seeded students: <span className="text-blue-300">student0001@placementrisk.ai</span> through <span className="text-blue-300">student1500@placementrisk.ai</span> — all use password <span className="text-amber-300">demo123</span>
          </div>
          <div className="mt-3 text-sm text-slate-300">
            New student? <Link to="/student-signup" className="text-blue-300 hover:text-blue-200">Create student account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
