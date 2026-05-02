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
    loadStudentData();
  }, [id]);

  const loadStudentData = async () => {
    try {
      const [profileRes, historyRes] = await Promise.all([
        studentAPI.getProfile(id),
        studentAPI.getHistory(id, 10)
      ]);
      setStudent(profileRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType) => {
    try {
      await studentAPI.initiateAction(id, actionType);
      alert(`Action "${actionType}" initiated successfully!`);
    } catch (error) {
      console.error('Error initiating action:', error);
      alert('Failed to initiate action');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading student profile...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Student not found</div>
      </div>
    );
  }

  const riskScore = student.latest_risk_score;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Risk Profile</h1>
            <p className="text-sm text-gray-600">{student.student_name}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Student Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Course</dt>
                  <dd className="text-sm text-gray-900">{student.course_type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Institute</dt>
                  <dd className="text-sm text-gray-900">{student.institute_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">CGPA</dt>
                  <dd className="text-sm text-gray-900">{student.cgpa}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Loan Amount</dt>
                  <dd className="text-sm text-gray-900">
                    ₹{student.loan_amount.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Monthly EMI</dt>
                  <dd className="text-sm text-gray-900">
                    ₹{student.emi_monthly.toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Risk Score History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Risk Score History</h2>
              <div className="space-y-3">
                {history.map((score, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {new Date(score.scored_at).toLocaleDateString()}
                    </span>
                    <RiskBadge level={score.risk_level} score={score.risk_score} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Risk Assessment */}
          <div className="lg:col-span-2 space-y-6">
            {riskScore ? (
              <>
                {/* Risk Badge */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Current Risk Level</h2>
                    <RiskBadge level={riskScore.risk_level} score={riskScore.risk_score} large />
                  </div>
                  <p className="text-sm text-gray-600 mt-4">
                    Last scored: {new Date(riskScore.scored_at).toLocaleString()}
                  </p>
                </div>

                {/* Placement Probability */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Placement Timeline</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>3 Months</span>
                        <span className="font-medium">
                          {(riskScore.placement_prob_3mo * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${riskScore.placement_prob_3mo * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>6 Months</span>
                        <span className="font-medium">
                          {(riskScore.placement_prob_6mo * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${riskScore.placement_prob_6mo * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>12 Months</span>
                        <span className="font-medium">
                          {(riskScore.placement_prob_12mo * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${riskScore.placement_prob_12mo * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Bands */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Expected Salary Range</h2>
                  <SalaryBands
                    p10={riskScore.salary_p10}
                    p50={riskScore.salary_p50}
                    p90={riskScore.salary_p90}
                    emi={student.emi_monthly}
                  />
                </div>

                {/* SHAP Explanation */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Risk Drivers</h2>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded">
                    {riskScore.shap_explanation}
                  </p>
                </div>

                {/* Next Best Action */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Recommended Actions</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleAction('skill_up')}
                      className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Skill Development
                    </button>
                    <button
                      onClick={() => handleAction('resume_help')}
                      className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Resume Help
                    </button>
                    <button
                      onClick={() => handleAction('mock_interview')}
                      className="px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Mock Interview
                    </button>
                    <button
                      onClick={() => handleAction('recruiter_match')}
                      className="px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    >
                      Recruiter Match
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">No risk score available for this student.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentView;
