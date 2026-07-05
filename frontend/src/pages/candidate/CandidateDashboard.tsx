import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BarChart2, Brain, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const steps = [
  { key: 'resume', label: 'Resume Upload', path: '/candidate/resume' },
  { key: 'aptitude', label: 'Aptitude Test', path: '/candidate/assessments' },
  { key: 'sql', label: 'SQL Assessment', path: '/candidate/assessments' },
  { key: 'coding', label: 'Coding Round', path: '/candidate/assessments' },
  { key: 'interview', label: 'AI Interview', path: '/candidate/interview' },
];

const getStepStatus = (stepKey: string, candidateStatus: string) => {
  const order = ['resume', 'aptitude', 'sql', 'coding', 'interview'];
  const statusMap: Record<string, string> = {
    pending: 'resume', resume_screening: 'resume', resume_rejected: 'resume',
    aptitude_pending: 'aptitude', aptitude_failed: 'aptitude',
    sql_pending: 'sql', sql_failed: 'sql',
    coding_pending: 'coding', coding_failed: 'coding',
    interview_pending: 'interview', interview_completed: 'interview',
    shortlisted: 'interview', hired: 'interview', rejected: 'interview',
  };

  const currentKey = statusMap[candidateStatus] || 'resume';
  const currentIdx = order.indexOf(currentKey);
  const stepIdx = order.indexOf(stepKey);

  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) {
    if (['resume_rejected', 'aptitude_failed', 'sql_failed', 'coding_failed'].includes(candidateStatus)) return 'failed';
    return 'active';
  }
  return 'pending';
};

const CandidateDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/candidate')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load'));
  }, []);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Track your recruitment progress</p>
      </div>

      {/* Job card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Applied Position</p>
            <h2 className="text-white text-xl font-bold mt-1">{data.job_title || 'N/A'}</h2>
          </div>
          <StatusBadge status={data.status} />
        </div>
        {data.overall_score != null && (
          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="text-gray-400 text-xs">Overall Score</p>
              <p className="text-2xl font-bold text-white">{data.overall_score?.toFixed(1)}%</p>
            </div>
            {data.rank && (
              <div>
                <p className="text-gray-400 text-xs">Rank</p>
                <p className="text-2xl font-bold text-violet-400">#{data.rank}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress steps */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-5">Recruitment Progress</h3>
        <div className="relative">
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-800" />
          <div className="space-y-4">
            {steps.map((step) => {
              const status = getStepStatus(step.key, data.status);
              return (
                <div key={step.key} className="flex items-center gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    status === 'active' ? 'bg-violet-500/20 text-violet-400 ring-2 ring-violet-500' :
                    status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-800 text-gray-600'
                  }`}>
                    {status === 'completed' ? <CheckCircle size={18} /> :
                     status === 'active' ? <Clock size={18} /> :
                     status === 'failed' ? <XCircle size={18} /> :
                     <AlertCircle size={18} />}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <p className={`text-sm font-medium ${status === 'pending' ? 'text-gray-500' : 'text-white'}`}>
                      {step.label}
                    </p>
                    {status === 'active' && (
                      <button onClick={() => navigate(step.path)}
                        className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded-lg transition">
                        Start →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assessment Scores */}
      {data.assessments?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Assessment Results</h3>
          <div className="space-y-3">
            {data.assessments.map((a: any) => (
              <div key={a.type} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-300 text-sm capitalize">{a.type}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{a.percentage?.toFixed(1)}%</span>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;
