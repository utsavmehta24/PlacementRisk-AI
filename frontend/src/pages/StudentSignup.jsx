import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';

function StudentSignup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.registerStudent({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate(response.data.user?.home_route || '/student-portal');
    } catch (err) {
      setError(err.response?.data?.detail || 'Student registration failed. Please verify details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Student Sign Up</h1>
          <p className="text-slate-300 mt-2">Create your student login and we will generate your student profile automatically.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded px-3 py-2">
            Your student ID will be created automatically after signup.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && <div className="bg-red-950/50 border border-red-700 text-red-200 px-4 py-3 rounded text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Student Account'}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-300">
          Already have an account? <Link to="/login" className="text-blue-300 hover:text-blue-200">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default StudentSignup;
