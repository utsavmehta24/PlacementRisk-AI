import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { officerAPI, caseAPI, messageAPI } from '../api/client';

function OfficerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [summary, setSummary] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [d, c] = await Promise.all([officerAPI.getDashboard(), caseAPI.list({ limit: 100 })]);
    setSummary(d.data);
    const rows = Array.isArray(c.data) ? c.data : (c.data?.value || []);
    setCases(rows);
    if (!selectedCase && rows.length > 0) {
      selectCase(rows[0].case_id).catch(console.error);
    }
  };

  useEffect(() => { load().catch(console.error); }, []);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const selectCase = async (id) => {
    setSelectedCase(id);
    const [d, m] = await Promise.all([caseAPI.detail(id), messageAPI.list(id)]);
    setDetail(d.data);
    setMessages(m.data);
  };

  const decide = async (decision) => {
    const reason = prompt(`Reason for ${decision}:`);
    if (!reason) return;
    await caseAPI.decide(selectedCase, decision, reason);
    await selectCase(selectedCase);
    await load();
  };

  const updateStatus = async (status) => {
    await caseAPI.updateStatus(selectedCase, status, `Updated to ${status}`);
    await selectCase(selectedCase);
    await load();
  };

  const sendMessage = async () => {
    if (!msg.trim()) return;
    await messageAPI.send(selectedCase, msg);
    setMsg('');
    const m = await messageAPI.list(selectedCase);
    setMessages(m.data);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h1 className="text-xl font-bold">Officer Case Workbench</h1>
          <p className="text-slate-400 text-sm">{user.full_name}</p>
          <div className="mt-3 text-sm">Total cases: <b>{summary?.total_cases || 0}</b></div>
          <button className="mt-3 px-3 py-2 bg-slate-700 rounded" onClick={logout}>Logout</button>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 max-h-[72vh] overflow-auto">
          {cases.length === 0 && <div className="p-4 text-slate-400 text-sm">No cases available yet.</div>}
          {cases.map((c) => (
            <button key={c.case_id} className={`w-full text-left p-3 rounded mb-1 ${selectedCase === c.case_id ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'}`} onClick={() => selectCase(c.case_id)}>
              <div className="font-medium">{c.student_name}</div>
              <div className="text-xs text-slate-400">{c.status} | {c.risk_level || 'N/A'} | {c.course_type}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-4">
        {!detail ? <p>Select a case to open decision panel.</p> : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{detail.student.name}</h2>
              <p className="text-slate-400 text-sm">{detail.student.course} | Loan Rs.{detail.student.loan_amount.toLocaleString()}</p>
              <p className="text-sm mt-2">Risk: <b>{detail.latest_risk.level}</b> ({((detail.latest_risk.score || 0) * 100).toFixed(1)}%)</p>
              <p className="text-sm text-slate-300 mt-1">{detail.latest_risk.explanation}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 bg-emerald-600 rounded" onClick={() => decide('approved')}>Approve</button>
              <button className="px-3 py-2 bg-red-600 rounded" onClick={() => decide('rejected')}>Reject</button>
              {['UNDER_REVIEW', 'ACTION_PROPOSED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                <button key={s} className="px-2 py-1 bg-slate-700 rounded text-xs" onClick={() => updateStatus(s)}>{s}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded p-3">
                <h3 className="font-semibold mb-2">Case Timeline</h3>
                <div className="max-h-64 overflow-auto text-sm space-y-2">
                  {detail.events.map((e) => (
                    <div key={e.id} className="border-l-2 border-slate-600 pl-2">
                      <div className="font-medium">{e.type}</div>
                      <div className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString()}</div>
                      <div className="text-xs">{e.note || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800 rounded p-3">
                <h3 className="font-semibold mb-2">Student Communication</h3>
                <div className="max-h-56 overflow-auto text-sm space-y-2 mb-2">
                  {messages.map((m) => (
                    <div key={m.id} className="bg-slate-700 rounded p-2">{m.body}</div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={msg} onChange={(e) => setMsg(e.target.value)} className="flex-1 bg-slate-700 rounded p-2" placeholder="Send message" />
                  <button className="px-3 py-2 bg-blue-600 rounded" onClick={sendMessage}>Send</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfficerDashboard;
