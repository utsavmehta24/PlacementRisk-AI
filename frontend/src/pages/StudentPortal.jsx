import React, { useEffect, useMemo, useState } from 'react';
import { messageAPI, studentPortalAPI } from '../api/client';

const courseOptions = ['Engineering', 'MBA', 'Nursing', 'Commerce', 'Law'];
const employerOptions = ['None', 'SME', 'Startup', 'MNC', 'FAANG'];

function StudentPortal() {
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [institutes, setInstitutes] = useState([]);
  const [instituteQuery, setInstituteQuery] = useState('');
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

  const loadPortal = async () => {
    const me = await studentPortalAPI.me();
    setProfile(me.data);
    setForm({
      institute_id: me.data.student.institute_id || '',
      course_type: me.data.student.course || 'Engineering',
      cgpa: me.data.student.cgpa ?? 7.0,
      academic_consistency_score: me.data.student.academic_consistency_score ?? 0.7,
      internship_count: me.data.student.internship_count ?? 0,
      internship_duration_months: me.data.student.internship_duration_months ?? 0,
      employer_type: me.data.student.employer_type || 'None',
      skill_certifications: me.data.student.skill_certifications ?? 0,
      gap_years: me.data.student.gap_years ?? 0,
      loan_amount: me.data.student.loan_amount ?? 500000,
      emi_monthly: me.data.student.emi_monthly ?? 8333,
      disbursal_date: me.data.student.disbursal_date ? new Date(me.data.student.disbursal_date).toISOString().slice(0, 10) : '',
    });

    if (me.data?.active_case?.id) {
      const m = await messageAPI.list(me.data.active_case.id);
      setMessages(m.data);
    } else {
      setMessages([]);
    }
  };

  const loadInstitutes = async (search = '') => {
    const resp = await studentPortalAPI.listInstitutes({ search, limit: 30 });
    setInstitutes(resp.data);
  };

  useEffect(() => {
    loadPortal().catch((err) => {
      setError(err.response?.data?.detail || 'Could not load student portal.');
    });
    loadInstitutes().catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInstitutes(instituteQuery).catch(console.error);
    }, 250);
    return () => clearTimeout(timer);
  }, [instituteQuery]);

  const selectedInstitute = useMemo(
    () => institutes.find((inst) => inst.id === form.institute_id) || null,
    [institutes, form.institute_id]
  );

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setNotice('');
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
      setNotice('Profile saved. You can run analysis now.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    setError('');
    setNotice('');
    try {
      const resp = await studentPortalAPI.analyze();
      setProfile(resp.data.profile);
      if (resp.data.profile?.active_case?.id) {
        const m = await messageAPI.list(resp.data.profile.active_case.id);
        setMessages(m.data);
      }
      setNotice(`Analysis updated. Current risk: ${resp.data.analysis.risk_level}.`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not run analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const send = async () => {
    if (!activeCaseId || !text.trim()) return;
    try {
      await messageAPI.send(activeCaseId, text.trim());
      setText('');
      const m = await messageAPI.list(activeCaseId);
      setMessages(m.data);
      setNotice('Message sent to support case.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send message.');
    }
  };

  if (!profile && !error) return <div className="min-h-screen grid place-items-center">Loading student portal...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Student Support Portal</h1>
        <p className="text-slate-400 mt-2">Welcome {profile?.student?.name}</p>
      </div>

      {error && <div className="bg-red-950/50 border border-red-700 text-red-200 px-4 py-3 rounded">{error}</div>}
      {notice && <div className="bg-emerald-950/50 border border-emerald-700 text-emerald-200 px-4 py-3 rounded">{notice}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="font-semibold">Risk Snapshot</h2>
          <p className="mt-2">Risk Level: <b>{profile?.risk?.level || 'N/A'}</b></p>
          <p>Risk Score: <b>{(((profile?.risk?.score) || 0) * 100).toFixed(1)}%</b></p>
          <p>Placement (6m): <b>{(((profile?.risk?.placement_prob_6mo) || 0) * 100).toFixed(1)}%</b></p>
          <p>Median Salary: <b>{profile?.risk?.salary_p50 ? `Rs.${profile.risk.salary_p50.toLocaleString()}` : 'N/A'}</b></p>
          <p className="text-sm text-slate-300 mt-2">{profile?.risk?.explanation || 'Run analysis after completing your profile.'}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="font-semibold">Active Case</h2>
          <p className="mt-2">Case ID: {profile?.active_case?.id || 'No active case'}</p>
          <p>Status: <b>{profile?.active_case?.status || 'N/A'}</b></p>
          <p>Recommended Action: <b>{profile?.active_case?.recommended_action || 'N/A'}</b></p>
          <p className="text-sm text-slate-300 mt-2">{profile?.active_case?.summary || 'No pending summary.'}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="font-semibold">Support Priorities</h2>
          <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
            {(profile?.support_tracks || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="mt-4 text-xs text-slate-400">
            Profile completion: {profile?.student?.profile_completion || 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold">Profile For Analysis</h2>
              <p className="text-sm text-slate-400">Add your institute, academic signals, and loan details so the model can produce a useful risk view.</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 bg-slate-700 rounded" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button className="px-3 py-2 bg-blue-600 rounded" onClick={analyze} disabled={analyzing}>
                {analyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Institute Search</label>
              <input
                value={instituteQuery}
                onChange={(e) => setInstituteQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2"
                placeholder="Search institute"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Institute</label>
              <select
                value={form.institute_id}
                onChange={(e) => updateField('institute_id', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2"
              >
                <option value="">Select institute</option>
                {institutes.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} - {inst.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Course</label>
              <select value={form.course_type} onChange={(e) => updateField('course_type', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2">
                {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Current Employer Type</label>
              <select value={form.employer_type} onChange={(e) => updateField('employer_type', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2">
                {employerOptions.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">CGPA</label>
              <input type="number" min="0" max="10" step="0.1" value={form.cgpa} onChange={(e) => updateField('cgpa', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Academic Consistency</label>
              <input type="number" min="0" max="1" step="0.05" value={form.academic_consistency_score} onChange={(e) => updateField('academic_consistency_score', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Internship Count</label>
              <input type="number" min="0" value={form.internship_count} onChange={(e) => updateField('internship_count', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Internship Duration (Months)</label>
              <input type="number" min="0" value={form.internship_duration_months} onChange={(e) => updateField('internship_duration_months', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Skill Certifications</label>
              <input type="number" min="0" value={form.skill_certifications} onChange={(e) => updateField('skill_certifications', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Gap Years</label>
              <input type="number" min="0" value={form.gap_years} onChange={(e) => updateField('gap_years', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Loan Amount</label>
              <input type="number" min="0" value={form.loan_amount} onChange={(e) => updateField('loan_amount', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Monthly EMI</label>
              <input type="number" min="0" value={form.emi_monthly} onChange={(e) => updateField('emi_monthly', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Loan Disbursal Date</label>
              <input type="date" value={form.disbursal_date} onChange={(e) => updateField('disbursal_date', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="font-semibold">Institute Context</h2>
          {!selectedInstitute ? (
            <p className="text-sm text-slate-400 mt-2">Pick an institute to view its location and placement strength.</p>
          ) : (
            <div className="text-sm space-y-2 mt-3">
              <p><span className="text-slate-400">Institute:</span> {selectedInstitute.name}</p>
              <p><span className="text-slate-400">Location:</span> {selectedInstitute.city}, {selectedInstitute.state}</p>
              <p><span className="text-slate-400">Region:</span> {selectedInstitute.region}</p>
              <p><span className="text-slate-400">6m Placement Rate:</span> {(selectedInstitute.placement_rate_6mo * 100).toFixed(1)}%</p>
              <p><span className="text-slate-400">Median Salary:</span> Rs.{selectedInstitute.median_salary.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Inbox</h2>
        {!activeCaseId && <div className="text-sm text-amber-300 mb-3">Your support case is still being created. Refresh if this message stays longer than a few seconds.</div>}
        <div className="max-h-64 overflow-auto space-y-2 mb-3">
          {messages.length === 0 && <div className="text-sm text-slate-400">No messages yet. Use the box below to ask for resume help, internships, or repayment guidance.</div>}
          {messages.map((m) => (
            <div key={m.id} className="bg-slate-800 rounded p-2 text-sm">{m.body}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-slate-800 rounded p-2" placeholder="Type your message" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="px-3 py-2 bg-blue-600 rounded disabled:opacity-50" onClick={send} disabled={!activeCaseId || !text.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default StudentPortal;
