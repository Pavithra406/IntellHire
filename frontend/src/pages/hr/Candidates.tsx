import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, ChevronRight, UserPlus, Upload, Download, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import { Job } from '../../types';

const Candidates: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCredentials, setShowCredentials] = useState<any>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [form, setForm] = useState({ email: '', full_name: '', password: '', job_id: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const load = () => {
    Promise.all([api.get('/candidates'), api.get('/jobs')])
      .then(([cr, jr]) => { setCandidates(cr.data); setJobs(jr.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const jobParam = params.get('job');
    if (jobParam) setFilterJob(jobParam);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/candidates', { ...form, job_id: Number(form.job_id) });
      setShowForm(false);
      setForm({ email: '', full_name: '', password: '', job_id: '' });
      setShowCredentials(res.data);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const handleDelete = async (candidateId: number) => {
    try {
      await api.delete(`/candidates/${candidateId}`);
      toast.success('Candidate deleted');
      setDeleteConfirm(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const filtered = candidates.filter(c =>
    (!filterJob || String(c.job_id) === filterJob) &&
    (!search || c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidates</h1>
          <p className="text-gray-400 text-sm mt-1">{candidates.length} total candidates</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <UserPlus size={16} /> Add Candidate
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search candidates..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500" />
        </div>
        <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500">
          <option value="">All Jobs</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr className="text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Score</th>
              <th className="px-4 py-3 font-medium text-right">Rank</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-800/40">
                <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/hr/candidates/${c.id}`)}>
                  <p className="text-white font-medium">{c.full_name}</p>
                  <p className="text-gray-500 text-xs">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-300 cursor-pointer" onClick={() => navigate(`/hr/candidates/${c.id}`)}>{c.job_title}</td>
                <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/hr/candidates/${c.id}`)}><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-right text-gray-300 cursor-pointer" onClick={() => navigate(`/hr/candidates/${c.id}`)}>
                  {c.overall_score ? `${c.overall_score.toFixed(1)}%` : '-'}
                </td>
                <td className="px-4 py-3 text-right text-gray-300 cursor-pointer" onClick={() => navigate(`/hr/candidates/${c.id}`)}>
                  {c.rank ? `#${c.rank}` : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete candidate"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No candidates found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add candidate modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Create Candidate Account</h2>
            <p className="text-gray-400 text-sm mb-5">HR creates login credentials and assigns the candidate to a job.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Full Name</label>
                <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  placeholder="Candidate's full name" />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  placeholder="candidate@email.com" />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Login Password</label>
                <input required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  placeholder="Set a password to share with candidate" />
                <p className="text-xs text-gray-500 mt-1">You will share these credentials with the candidate manually.</p>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Assign to Job</label>
                <select required value={form.job_id} onChange={e => setForm({ ...form, job_id: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500">
                  <option value="">Select a job opening</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-sm font-medium">
                  Create & Get Credentials
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials modal - shown after creation */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-green-500/30 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <UserPlus size={18} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Candidate Created!</h2>
                <p className="text-gray-400 text-sm">Share these login credentials with the candidate</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 space-y-3 mb-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-white font-medium">{showCredentials.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Login URL</p>
                <p className="text-violet-400 font-mono text-sm">http://localhost:5173/login</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-white font-mono">{showCredentials.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Password</p>
                <p className="text-white font-mono">{showCredentials.password}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Assigned Job</p>
                <p className="text-white">{jobs.find(j => j.id === showCredentials.job_id)?.title || `Job #${showCredentials.job_id}`}</p>
              </div>
            </div>

            <p className="text-yellow-400 text-xs mb-4">⚠ Save these credentials now. The password won't be shown again.</p>

            <button onClick={() => setShowCredentials(null)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg font-medium">
              Done
            </button>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Delete Candidate?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete the candidate account and all their data including resume, assessments, interview, and rankings.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition">
                Yes, Delete
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Candidates;
