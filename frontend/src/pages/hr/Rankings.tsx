import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Job } from '../../types';
import { Trophy, TrendingUp } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { useNavigate } from 'react-router-dom';

const Rankings: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/jobs').then(r => setJobs(r.data));
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    setLoading(true);
    api.get(`/ranking/job/${selectedJob}`)
      .then(r => setRankings(r.data))
      .finally(() => setLoading(false));
  }, [selectedJob]);

  const recMap: Record<string, string> = {
    strong_hire: 'text-green-400', hire: 'text-blue-400',
    maybe: 'text-yellow-400', reject: 'text-red-400'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Candidate Rankings</h1>
        <p className="text-gray-400 text-sm mt-1">AI-computed rankings based on all assessment scores</p>
      </div>

      <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
        className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-300 focus:outline-none focus:border-violet-500">
        <option value="">Select a job to view rankings</option>
        {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
      </select>

      {loading && <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>}

      {!loading && rankings.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr className="text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium text-right">Resume</th>
                <th className="px-4 py-3 font-medium text-right">Aptitude</th>
                <th className="px-4 py-3 font-medium text-right">SQL</th>
                <th className="px-4 py-3 font-medium text-right">Coding</th>
                <th className="px-4 py-3 font-medium text-right">Interview</th>
                <th className="px-4 py-3 font-medium text-right">Overall</th>
                <th className="px-4 py-3 font-medium">AI Rec</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rankings.map((r) => (
                <tr key={r.candidate_id} className="hover:bg-gray-800/40 cursor-pointer"
                  onClick={() => navigate(`/hr/candidates/${r.candidate_id}`)}>
                  <td className="px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${r.rank <= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
                      {r.rank}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{r.full_name}</p>
                    <p className="text-gray-500 text-xs">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{r.resume_score?.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right text-gray-300">{r.aptitude_score?.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right text-gray-300">{r.sql_score?.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right text-gray-300">{r.coding_score?.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right text-gray-300">{r.interview_score?.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{r.overall_score?.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium capitalize ${recMap[r.ai_recommendation?.recommendation] || 'text-gray-400'}`}>
                      {r.ai_recommendation?.recommendation?.replace('_', ' ') || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && selectedJob && !rankings.length && (
        <div className="text-center py-20 text-gray-500">
          <Trophy size={40} className="mx-auto mb-3 opacity-30" />
          <p>No rankings computed yet for this job</p>
        </div>
      )}
    </div>
  );
};

export default Rankings;
