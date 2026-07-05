import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, TrendingUp, UserCheck, UserX, Clock, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const COLORS = ['#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

const HRDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/hr')
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  const pieData = stats?.status_breakdown
    ? Object.entries(stats.status_breakdown).map(([k, v]) => ({ name: k, value: v as number }))
    : [];

  const barData = stats?.jobs?.slice(0, 6).map((j: any) => ({
    name: j.title.slice(0, 15),
    candidates: j.candidate_count
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">HR Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Overview of recruitment activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Candidates" value={stats?.total_candidates || 0} icon={Users} color="violet" />
        <StatCard title="Active Jobs" value={stats?.total_jobs || 0} icon={Briefcase} color="blue" />
        <StatCard title="Hired / Shortlisted" value={stats?.selected || 0} icon={UserCheck} color="green" />
        <StatCard title="Avg Score" value={`${stats?.avg_score || 0}%`} icon={TrendingUp} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Candidate Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Jobs bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Candidates per Job</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="candidates" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Candidates */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Recent Candidates</h3>
          <button onClick={() => navigate('/hr/candidates')} className="text-xs text-violet-400 hover:text-violet-300">
            View all →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2 font-medium">Name</th>
                <th className="text-left py-2 font-medium">Job</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stats?.recent_candidates?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => navigate(`/hr/candidates/${c.id}`)}>
                  <td className="py-3 text-white font-medium">{c.full_name}</td>
                  <td className="py-3 text-gray-400">{c.job_title}</td>
                  <td className="py-3"><StatusBadge status={c.status} /></td>
                  <td className="py-3 text-right text-gray-300">{c.overall_score ? `${c.overall_score.toFixed(1)}%` : '-'}</td>
                </tr>
              ))}
              {!stats?.recent_candidates?.length && (
                <tr><td colSpan={4} className="py-6 text-center text-gray-500">No candidates yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
