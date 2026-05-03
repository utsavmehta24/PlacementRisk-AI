import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI } from '../api/client';
import RiskBadge from '../components/RiskBadge';
import SalaryBands from '../components/SalaryBands';

function StudentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          studentAPI.getProfile(id),
          studentAPI.getHistory(id, 10),
        ]);
        setStudent(profileRes.data);
        setHistory(historyRes.data);
      } catch (error) {
        console.error('Error loading student data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [id]);

  const handleAction = async (actionType) => {
    try {
      await studentAPI.initiateAction(id, actionType);
      alert(`Action '${actionType}' initiated successfully.`);
    } catch (error) {
      console.error('Error initiating action:', error);
      alert('Failed to initiate action');
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-lg">Loading student profile...</div>;
  if (!student) return <div className="min-h-screen grid place-items-center text-lg text-red-600">Student not found</div>;

  const riskScore = student.latest_risk_score;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Student Risk Profile</h1>
            <p className="text-sm text-slate-300">{student.student_name}</p>
          </div>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-400">Back to Dashboard</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">Basic Information</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-500">Course:</span> {student.course_type}</p>
              <p><span className="text-slate-500">Institute:</span> {student.institute_name}</p>
              <p><span className="text-slate-500">CGPA:</span> {student.cgpa}</p>
              <p><span className="text-slate-500">Loan Amount:</span> Rs.{student.loan_amount.toLocaleString()}</p>
              <p><span className="text-slate-500">Monthly EMI:</span> Rs.{student.emi_monthly.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">Risk Score History</h2>
            <div className="space-y-3">
              {history.map((score, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{new Date(score.scored_at).toLocaleDateString()}</span>
                  <RiskBadge level={score.risk_level} score={score.risk_score} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {riskScore ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Placement Risk Score</h2>
                  <RiskBadge level={riskScore.risk_level} score={riskScore.risk_score} large />
                </div>
                <p className="text-xs text-slate-500 mt-3">Last scored: {new Date(riskScore.scored_at).toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-bold mb-4">Placement Timeline (3 / 6 / 12 months)</h2>
                <div className="space-y-4">
                  {[
                    ['3 Months', riskScore.placement_prob_3mo],
                    ['6 Months', riskScore.placement_prob_6mo],
                    ['12 Months', riskScore.placement_prob_12mo],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-medium">{(value * 100).toFixed(1)}%</span></div>
                      <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${value * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-bold mb-4">Salary Range (P10 / P50 / P90)</h2>
                <SalaryBands p10={riskScore.salary_p10} p50={riskScore.salary_p50} p90={riskScore.salary_p90} emi={student.emi_monthly} />
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-bold mb-4">Top Risk Drivers (Explainable AI)</h2>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded">{riskScore.shap_explanation}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-bold mb-4">Next Best Action</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleAction('skill_up')} className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">Skill-up Program</button>
                  <button onClick={() => handleAction('resume_help')} className="px-4 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Resume Help</button>
                  <button onClick={() => handleAction('mock_interview')} className="px-4 py-3 bg-violet-600 text-white rounded-md hover:bg-violet-700">Mock Interview</button>
                  <button onClick={() => handleAction('recruiter_match')} className="px-4 py-3 bg-amber-500 text-slate-900 rounded-md hover:bg-amber-400">Recruiter Match</button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-6"><p className="text-slate-600">No risk score available for this student.</p></div>
          )}
        </div>
      </main>
    </div>
  );
}

export default StudentView;
