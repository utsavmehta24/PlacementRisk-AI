import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { officerAPI, caseAPI, messageAPI } from '../api/client';

const STATUS_COLORS = {
  NEW: 'bg-blue-900/50 text-blue-300 border-blue-700',
  UNDER_REVIEW: 'bg-amber-900/50 text-amber-300 border-amber-700',
  ACTION_PROPOSED: 'bg-purple-900/50 text-purple-300 border-purple-700',
  APPROVED: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  REJECTED: 'bg-red-900/50 text-red-300 border-red-700',
  IN_PROGRESS: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  RESOLVED: 'bg-slate-700 text-slate-300 border-slate-600',
  CLOSED: 'bg-slate-800 text-slate-400 border-slate-700',
};

const RISK_COLORS = { HIGH: 'text-red-400', MEDIUM: 'text-amber-400', LOW: 'text-emerald-400' };

function DecisionModal({ onConfirm, onCancel, decision }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="font-semibold text-lg mb-3 capitalize">{decision} Case</h3>
        <label className="block text-sm text-slate-400 mb-1">Reason (required)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Reason for ${decision}...`}
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 bg-slate-700 rounded-lg text-sm">Cancel</button>
          <button
            onClick={() => reason.trim() && onConfirm(reason)}
            disabled={!reason.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 ${decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
          >
            Confirm {decision}
          </button>
        </div>
      </div>
    </div>
  );
}

function OfficerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [summary, setSummary] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [modal, setModal] = useState(null); // { decision: 'approved'|'rejected' }
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [d, c] = await Promise.all([
      officerAPI.getDashboard(),
      caseAPI.list({ limit: 200 }),
    ]);
    setSummary(d.data);
    const rows = Array.isArray(c.data) ? c.data : [];
    setCases(rows);
    setLoading(false);
    if (!selectedCase && rows.length > 0) {
      await selectCase(rows[0].case_id);
    }
  };

  useEffect(() => { load().catch(console.error); }, []);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const selectCase = async (id) => {
    setSelectedCase(id);
    const [d, m] = await Promise.all([caseAPI.detail(id), messageAPI.list(id)]);
    setDetail(d.data);
    setMessages(m.data);
  };

  const handleDecision = async (reason) => {
    await caseAPI.decide(selectedCase, modal.decision, reason);
    setModal(null);
    await selectCase(selectedCase);
    await load();
  };

  const updateStatus = async (status) => {
    await caseAPI.updateStatus(selectedCase, status, `Status updated to ${status}`);
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

  const filteredCases = cases.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (riskFilter && c.risk_level !== riskFilter) return false;
    if (searchQ && !c.student_name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {modal && (
        <DecisionModal
          decision={modal.decision}
          onConfirm={handleDecision}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Officer Case Workbench</h1>
            <p className="text-xs text-slate-400">{user.full_name} · {summary?.total_cases || 0} cases · {summary?.open_alerts || 0} open alerts</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/alerts')} className="px-3 py-1.5 bg-amber-500 text-slate-900 rounded text-xs font-medium">Alerts</button>
            <button onClick={logout} className="px-3 py-1.5 bg-slate-700 rounded text-xs">Logout</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {/* Case list sidebar */}
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/40">
          <div className="p-3 space-y-2 border-b border-slate-800">
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search student name…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
                <option value="">All Status</option>
                {['NEW','UNDER_REVIEW','ACTION_PROPOSED','APPROVED','REJECTED','IN_PROGRESS','RESOLVED','CLOSED'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
                <option value="">All Risk</option>
                <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-4 text-slate-400 text-sm text-center">Loading cases…</div>}
            {!loading && filteredCases.length === 0 && <div className="p-4 text-slate-400 text-sm text-center">No cases match filters.</div>}
            {filteredCases.map((c) => (
              <button
                key={c.case_id}
                onClick={() => selectCase(c.case_id)}
                className={`w-full text-left px-3 py-3 border-b border-slate-800/60 hover:bg-slate-800/60 transition-colors ${selectedCase === c.case_id ? 'bg-slate-800' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{c.student_name}</span>
                  {c.risk_level && <span className={`text-xs font-bold ${RISK_COLORS[c.risk_level] || 'text-slate-400'}`}>{c.risk_level}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>{c.status}</span>
                  <span className="text-xs text-slate-500">{c.course_type}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-5">
          {!detail ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              Select a case from the list to open the decision panel.
            </div>
          ) : (
            <div className="space-y-5 max-w-3xl">
              {/* Student header */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{detail.student.name}</h2>
                    <p className="text-slate-400 text-sm mt-1">
                      {detail.student.course} · Loan ₹{detail.student.loan_amount?.toLocaleString()} · EMI ₹{detail.student.emi_monthly?.toLocaleString()}/mo
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/student/${detail.student.id}`)}
                    className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800 rounded px-3 py-1.5"
                  >
                    Full Profile →
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span>Risk: <span className={`font-bold ${RISK_COLORS[detail.latest_risk?.level] || 'text-slate-300'}`}>{detail.latest_risk?.level || 'N/A'}</span></span>
                  <span>Score: <span className="font-medium">{detail.latest_risk?.score ? `${(detail.latest_risk.score * 100).toFixed(1)}%` : 'N/A'}</span></span>
                  <span>Case: <span className={`font-medium px-2 py-0.5 rounded border text-xs ${STATUS_COLORS[detail.case?.status] || ''}`}>{detail.case?.status}</span></span>
                </div>
                {detail.latest_risk?.explanation && (
                  <p className="mt-3 text-xs text-slate-400 bg-slate-800/60 rounded-lg p-3">{detail.latest_risk.explanation}</p>
                )}
              </div>

              {/* Actions */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3">Case Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setModal({ decision: 'approved' })} className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-medium">✓ Approve</button>
                  <button onClick={() => setModal({ decision: 'rejected' })} className="px-3 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium">✗ Reject</button>
                  <div className="w-px bg-slate-700 mx-1" />
                  {['UNDER_REVIEW', 'ACTION_PROPOSED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                    <button key={s} onClick={() => updateStatus(s)} className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs">{s.replace(/_/g, ' ')}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timeline */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <h3 className="font-semibold text-sm mb-3">Case Timeline</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {detail.events?.map((e) => (
                      <div key={e.id} className="border-l-2 border-slate-600 pl-3">
                        <div className="text-xs font-semibold text-slate-300">{e.type}</div>
                        <div className="text-xs text-slate-500">{new Date(e.created_at).toLocaleString()}</div>
                        {e.note && <div className="text-xs text-slate-400 mt-0.5">{e.note}</div>}
                        {e.from_status && <div className="text-xs text-slate-500">{e.from_status} → {e.to_status}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messaging */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col">
                  <h3 className="font-semibold text-sm mb-3">Student Communication</h3>
                  <div className="flex-1 space-y-2 max-h-48 overflow-y-auto mb-3">
                    {messages.length === 0 && <p className="text-xs text-slate-500">No messages yet.</p>}
                    {messages.map((m) => (
                      <div key={m.id} className="bg-slate-800 rounded-lg p-2 text-xs text-slate-200">{m.body}</div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={msg}
                      onChange={(e) => setMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Send message to student…"
                    />
                    <button onClick={sendMessage} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs">Send</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OfficerDashboard;
