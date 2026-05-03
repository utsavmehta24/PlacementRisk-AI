import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageAPI, studentPortalAPI } from '../api/client';

const courseOptions = ['Engineering', 'MBA', 'Nursing', 'Commerce', 'Law'];
const employerOptions = ['None', 'SME', 'Startup', 'MNC', 'FAANG'];

const RISK_COLORS = { HIGH: '#E24B4A', MEDIUM: '#EF9F27', LOW: '#1D9E75' };
const RISK_BG = { HIGH: 'bg-red-900/40 border-red-700 text-red-200', MEDIUM: 'bg-amber-900/40 border-amber-700 text-amber-200', LOW: 'bg-emerald-900/40 border-emerald-700 text-emerald-200' };

function RiskPill({ level }) {
  if (!level) return <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">Not scored</span>;
  const cls = { HIGH: 'bg-red-600', MEDIUM: 'bg-amber-500', LOW: 'bg-emerald-600' }[level] || 'bg-slate-600';
  return <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${cls}`}>{level} RISK</span>;
}

function ProgressBar({ value, max = 100, color = '#3b82f6' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold" style={color ? { color } : {}}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function StudentPortal() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('success');
  const [institutes, setInstitutes] = useState([]);
  const [instituteQuery, setInstituteQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [form, setForm] = useState({
    institute_id: '',
    course_type: 'Engineering',
    cgpa: 7.0,
    academic_consistency_score: 0.7,
    internship_count: 0,
    internship_duration_months: 0,
    employer_type: 'None',
    skill_certifications: 0,
    gap_years: 0,
    loan_amount: 500000,
    emi_monthly: 8333,
    disbursal_date: '',
  });

  const activeCaseId = profile?.active_case?.id || null;
  const risk = profile?.risk || {};
  const student = profile?.student || {};

  const showNotice = (msg, type = 'success') => {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(''), 4000);
  };

  const loadPortal = async () => {
    const me = await studentPortalAPI.me();
    setProfile(me.data);
    const s = me.data.student;
    setForm({
      institute_id: s.institute_id || '',
      course_type: s.course || 'Engineering',
      cgpa: s.cgpa ?? 7.0,
      academic_consistency_score: s.academic_consistency_score ?? 0.7,
      internship_count: s.internship_count ?? 0,
      internship_duration_months: s.internship_duration_months ?? 0,
      employer_type: s.employer_type || 'None',
      skill_certifications: s.skill_certifications ?? 0,
      gap_years: s.gap_years ?? 0,
      loan_amount: s.loan_amount ?? 500000,
      emi_monthly: s.emi_monthly ?? 8333,
      disbursal_date: s.disbursal_date ? new Date(s.disbursal_date).toISOString().slice(0, 10) : '',
    });
    if (me.data?.active_case?.id) {
      const m = await messageAPI.list(me.data.active_case.id);
      setMessages(m.data);
    }
  };

  const loadInstitutes = async (search = '') => {
    try {
      const resp = await studentPortalAPI.listInstitutes({ search, limit: 40 });
      setInstitutes(resp.data);
    } catch (_) {}
  };

  useEffect(() => {
    loadPortal().catch((err) => showNotice(err.response?.data?.detail || 'Could not load portal.', 'error'));
    loadInstitutes();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadInstitutes(instituteQuery), 300);
    return () => clearTimeout(t);
  }, [instituteQuery]);

  const selectedInstitute = useMemo(
    () => institutes.find((i) => i.id === form.institute_id) || null,
    [institutes, form.institute_id]
  );

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        cgpa: Number(form.cgpa),
        academic_consistency_score: Number(form.academic_consistency_score),
        internship_count: Number(form.internship_count),
        internship_duration_months: Number(form.internship_duration_months),
        skill_certifications: Number(form.skill_certifications),
        gap_years: Number(form.gap_years),
        loan_amount: Number(form.loan_amount),
        emi_monthly: Number(form.emi_monthly),
        disbursal_date: form.disbursal_date || null,
      };
      const resp = await studentPortalAPI.updateProfile(payload);
      setProfile(resp.data);
      showNotice('Profile saved successfully.');
    } catch (err) {
      showNotice(err.response?.data?.detail || 'Could not save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const resp = await studentPortalAPI.analyze();
      setProfile(resp.data.profile);
      if (resp.data.profile?.active_case?.id) {
        const m = await messageAPI.list(resp.data.profile.active_case.id);
        setMessages(m.data);
      }
      const lvl = resp.data.analysis?.risk_level;
      showNotice(`Analysis complete — Risk: ${lvl}`, lvl === 'HIGH' ? 'error' : lvl === 'MEDIUM' ? 'warn' : 'success');
      setActiveTab('overview');
    } catch (err) {
      showNotice(err.response?.data?.detail || 'Analysis failed.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const sendMsg = async () => {
    if (!activeCaseId || !msgText.trim()) return;
    try {
      await messageAPI.send(activeCaseId, msgText.trim());
      setMsgText('');
      const m = await messageAPI.list(activeCaseId);
      setMessages(m.data);
    } catch (err) {
      showNotice('Could not send message.', 'error');
    }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const riskLevel = risk.level;
  const riskScore = risk.score || 0;
  const placement6m = risk.placement_prob_6mo || 0;
  const salaryP50 = risk.salary_p50 || 0;
  const completion = student.profile_completion || 0;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'My Profile' },
    { id: 'inbox', label: `Inbox${messages.length > 0 ? ` (${messages.length})` : ''}` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
              {(student.name || user.full_name || 'S')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-sm">{student.name || user.full_name}</div>
              <div className="text-xs text-slate-400">{student.course} · Student Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskPill level={riskLevel} />
            <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded border border-slate-700 hover:border-slate-500">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Notice banner */}
      {notice && (
        <div className={`border-b px-4 py-2 text-sm text-center ${
          noticeType === 'error' ? 'bg-red-950/60 border-red-800 text-red-200' :
          noticeType === 'warn' ? 'bg-amber-950/60 border-amber-800 text-amber-200' :
          'bg-emerald-950/60 border-emerald-800 text-emerald-200'
        }`}>
          {notice}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Risk Level"
                value={riskLevel || '—'}
                sub={`Score: ${(riskScore * 100).toFixed(1)}%`}
                color={riskLevel ? RISK_COLORS[riskLevel] : undefined}
              />
              <StatCard
                label="Placement (6 mo)"
                value={`${(placement6m * 100).toFixed(0)}%`}
                sub="Probability of placement"
                color="#60a5fa"
              />
              <StatCard
                label="Median Salary"
                value={salaryP50 ? `₹${(salaryP50 / 100000).toFixed(1)}L` : '—'}
                sub="Expected annual (P50)"
                color="#34d399"
              />
              <StatCard
                label="Profile"
                value={`${completion}%`}
                sub="Completion"
                color={completion >= 80 ? '#34d399' : '#f59e0b'}
              />
            </div>

            {/* Risk explanation */}
            {riskLevel && (
              <div className={`border rounded-xl p-4 ${RISK_BG[riskLevel]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">AI Risk Explanation</span>
                  <RiskPill level={riskLevel} />
                </div>
                <p className="text-sm leading-relaxed">{risk.explanation || 'No explanation available.'}</p>
                {risk.scored_at && (
                  <p className="text-xs opacity-60 mt-2">Last scored: {new Date(risk.scored_at).toLocaleString()}</p>
                )}
              </div>
            )}

            {/* Placement timeline bars */}
            {risk.placement_prob_6mo && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold mb-4">Placement Timeline Probability</h3>
                <div className="space-y-4">
                  {[
                    { label: '3 Months', value: risk.placement_prob_3mo || 0, color: '#ef4444' },
                    { label: '6 Months', value: placement6m, color: '#f59e0b' },
                    { label: '12 Months', value: risk.placement_prob_12mo || 0, color: '#22c55e' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{label}</span>
                        <span className="font-semibold" style={{ color }}>{(value * 100).toFixed(1)}%</span>
                      </div>
                      <ProgressBar value={value * 100} color={color} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Salary bands */}
            {salaryP50 > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold mb-4">Expected Salary Range</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'P10 (Low)', value: risk.salary_p10, color: '#ef4444' },
                    { label: 'P50 (Median)', value: salaryP50, color: '#60a5fa' },
                    { label: 'P90 (High)', value: risk.salary_p90, color: '#22c55e' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-slate-800/60 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">{label}</div>
                      <div className="font-bold text-lg" style={{ color }}>
                        ₹{value ? (value / 100000).toFixed(1) : '—'}L
                      </div>
                    </div>
                  ))}
                </div>
                {student.emi_monthly > 0 && (
                  <div className="mt-3 text-sm text-slate-400 text-center">
                    Monthly EMI: ₹{student.emi_monthly?.toLocaleString()} ·{' '}
                    {salaryP50 / 12 >= student.emi_monthly * 3
                      ? <span className="text-emerald-400">Comfortable repayment capacity</span>
                      : salaryP50 / 12 >= student.emi_monthly * 2
                      ? <span className="text-amber-400">Moderate repayment capacity</span>
                      : <span className="text-red-400">Tight repayment capacity</span>
                    }
                  </div>
                )}
              </div>
            )}

            {/* Active case */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Support Case</h3>
              {profile.active_case?.id ? (
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4 flex-wrap">
                    <span className="text-slate-400">Status: <span className="text-slate-100 font-medium">{profile.active_case.status}</span></span>
                    <span className="text-slate-400">Action: <span className="text-blue-300 font-medium">{profile.active_case.recommended_action?.replace(/_/g, ' ')}</span></span>
                  </div>
                  <p className="text-slate-300">{profile.active_case.summary}</p>
                  <button onClick={() => setActiveTab('inbox')} className="text-blue-400 hover:text-blue-300 text-xs underline">
                    Open inbox →
                  </button>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No active case. Run analysis to create one.</p>
              )}
            </div>

            {/* Support tracks */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Support Tracks Available</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '📚', label: 'Skill-up Programs', desc: 'Coursera, NPTEL, LinkedIn Learning' },
                  { icon: '📄', label: 'Resume Review', desc: 'Profile & LinkedIn optimization' },
                  { icon: '🎤', label: 'Mock Interviews', desc: 'Technical & HR practice rounds' },
                  { icon: '🤝', label: 'Recruiter Match', desc: 'Direct recruiter introductions' },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-xs font-semibold text-slate-200">{label}</div>
                    <div className="text-xs text-slate-400 mt-1">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {!riskLevel && (
              <div className="bg-blue-950/40 border border-blue-800 rounded-xl p-5 text-center">
                <p className="text-blue-200 mb-3">Complete your profile and run analysis to get your placement risk score.</p>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
                >
                  Complete Profile →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Academic & Loan Profile</h2>
                <p className="text-slate-400 text-sm mt-1">Fill in your details accurately — the AI uses these to compute your placement risk score.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
                <button
                  onClick={analyze}
                  disabled={analyzing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {analyzing ? 'Analyzing…' : '▶ Run Analysis'}
                </button>
              </div>
            </div>

            {/* Profile completion bar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Profile Completion</span>
                <span className="font-semibold text-blue-300">{completion}%</span>
              </div>
              <ProgressBar value={completion} color={completion >= 80 ? '#22c55e' : '#f59e0b'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Institute section */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-200">Institute</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Search Institute</label>
                  <input
                    value={instituteQuery}
                    onChange={(e) => setInstituteQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type to search (e.g. IIT, NIT, VIT…)"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Select Institute</label>
                  <select
                    value={form.institute_id}
                    onChange={(e) => set('institute_id', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Select institute —</option>
                    {institutes.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} · {inst.city}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedInstitute && (
                  <div className="bg-slate-800/60 rounded-lg p-3 text-xs space-y-1">
                    <div className="font-semibold text-slate-200">{selectedInstitute.name}</div>
                    <div className="text-slate-400">{selectedInstitute.city}, {selectedInstitute.state} · {selectedInstitute.region}</div>
                    <div className="flex gap-4 mt-2">
                      <span className="text-emerald-400">6m placement: {(selectedInstitute.placement_rate_6mo * 100).toFixed(0)}%</span>
                      <span className="text-blue-400">Median: ₹{(selectedInstitute.median_salary / 100000).toFixed(1)}L</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Academic section */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-200">Academic Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Course</label>
                    <select value={form.course_type} onChange={(e) => set('course_type', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {courseOptions.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CGPA (0–10)</label>
                    <input type="number" min="0" max="10" step="0.1" value={form.cgpa} onChange={(e) => set('cgpa', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Academic Consistency (0–1)</label>
                    <input type="number" min="0" max="1" step="0.05" value={form.academic_consistency_score} onChange={(e) => set('academic_consistency_score', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Gap Years</label>
                    <input type="number" min="0" value={form.gap_years} onChange={(e) => set('gap_years', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Internship section */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-200">Internship & Skills</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Internship Count</label>
                    <input type="number" min="0" value={form.internship_count} onChange={(e) => set('internship_count', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Duration (months)</label>
                    <input type="number" min="0" value={form.internship_duration_months} onChange={(e) => set('internship_duration_months', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Employer Type</label>
                    <select value={form.employer_type} onChange={(e) => set('employer_type', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {employerOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Skill Certifications</label>
                    <input type="number" min="0" value={form.skill_certifications} onChange={(e) => set('skill_certifications', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Loan section */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-200">Loan Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Loan Amount (₹)</label>
                    <input type="number" min="0" value={form.loan_amount} onChange={(e) => set('loan_amount', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  

                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Monthly EMI (₹)</label>
                    <input type="number" min="0" value={form.emi_monthly} onChange={(e) => set('emi_monthly', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Loan Disbursal Date</label>
                    <input type="date" value={form.disbursal_date} onChange={(e) => set('disbursal_date', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={saveProfile} disabled={saving} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
              <button onClick={analyze} disabled={analyzing} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50">
                {analyzing ? 'Analyzing…' : '▶ Run Analysis'}
              </button>
            </div>
          </div>
        )}

        {/* ── INBOX TAB ── */}
        {activeTab === 'inbox' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Support Inbox</h2>
              <p className="text-slate-400 text-sm mt-1">Messages between you and your loan support officer.</p>
            </div>

            {!activeCaseId && (
              <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-4 text-amber-200 text-sm">
                No active support case yet. Go to the Profile tab, complete your details and run analysis to create one.
              </div>
            )}

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-1">
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No messages yet. Send a message below to reach your support officer.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_user_id === (JSON.parse(localStorage.getItem('user') || '{}').id);
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-700 text-slate-100 rounded-bl-sm'}`}>
                          <p>{m.body}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                            {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2 border-t border-slate-700 pt-4">
                <input
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ask about resume help, internships, repayment guidance…"
                  disabled={!activeCaseId}
                />
                <button
                  onClick={sendMsg}
                  disabled={!activeCaseId || !msgText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>

            {profile.active_case && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-sm">
                <div className="flex gap-6 flex-wrap text-slate-400">
                  <span>Case status: <span className="text-slate-200 font-medium">{profile.active_case.status}</span></span>
                  <span>Recommended: <span className="text-blue-300 font-medium">{profile.active_case.recommended_action?.replace(/_/g, ' ')}</span></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentPortal;
