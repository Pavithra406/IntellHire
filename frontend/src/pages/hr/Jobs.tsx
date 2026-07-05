import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, Edit, Users, HelpCircle, Terminal } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Job } from '../../types';
import QuestionManager from './QuestionManager';
import CodingQuestionManager from './CodingQuestionManager';

const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'questions' | 'coding'>('jobs');
  const navigate = useNavigate();

  const emptyForm = {
    title: '', description: '', required_skills: '', experience_years: '',
    qualification: '', salary_range: '', resume_cutoff: 60,
    aptitude_cutoff: 60, sql_cutoff: 60, coding_cutoff: 60
  };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    api.get('/jobs').then(r => setJobs(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
    };
    try {
      if (editJob) {
        await api.put(`/jobs/${editJob.id}`, payload);
        toast.success('Job updated');
      } else {
        await api.post('/jobs', payload);
        toast.success('Job created');
      }
      setShowForm(false);
      setEditJob(null);
      setForm(emptyForm);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const openEdit = (job: Job) => {
    setEditJob(job);
    setForm({
      ...job,
      required_skills: job.required_skills.join(', '),
    } as any);
    setShowForm(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Openings</h1>
          <p className="text-gray-400 text-sm mt-1">{jobs.length} jobs created</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditJob(null); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> New Job
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab('jobs')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'jobs' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          Jobs
        </button>
        <button onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'questions' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <HelpCircle size={13} /> MCQ Questions
        </button>
        <button onClick={() => setActiveTab('coding')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'coding' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Terminal size={13} /> Coding Questions
        </button>
      </div>

      {activeTab === 'questions' && <QuestionManager jobs={jobs} />}
      {activeTab === 'coding' && <CodingQuestionManager jobs={jobs} />}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-white mb-5">{editJob ? 'Edit Job' : 'Create Job Opening'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Job Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" placeholder="e.g. Senior React Developer" />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Job Description *</label>
                <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 resize-none" placeholder="Describe the role..." />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Required Skills (comma separated)</label>
                <input value={form.required_skills} onChange={e => setForm({ ...form, required_skills: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" placeholder="React, TypeScript, Node.js" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 block mb-1">Experience</label>
                  <input value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" placeholder="2-4 years" />
                </div>
                <div>
                  <label className="text-sm text-gray-300 block mb-1">Salary Range</label>
                  <input value={form.salary_range} onChange={e => setForm({ ...form, salary_range: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" placeholder="$80k - $120k" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Resume Cutoff %', key: 'resume_cutoff' },
                  { label: 'Aptitude Cutoff %', key: 'aptitude_cutoff' },
                  { label: 'SQL Cutoff %', key: 'sql_cutoff' },
                  { label: 'Coding Cutoff %', key: 'coding_cutoff' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-sm text-gray-300 block mb-1">{f.label}</label>
                    <input type="number" min={0} max={100}
                      value={(form as any)[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: Number(e.target.value) })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-sm font-medium transition">
                  {editJob ? 'Update Job' : 'Create Job'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Briefcase size={16} className="text-violet-400" />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${job.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                {job.is_active ? 'Active' : 'Closed'}
              </span>
            </div>
            <h3 className="text-white font-semibold mb-1">{job.title}</h3>
            <p className="text-gray-400 text-xs mb-3 line-clamp-2">{job.description}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {job.required_skills.slice(0, 3).map(s => (
                <span key={s} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{s}</span>
              ))}
              {job.required_skills.length > 3 && (
                <span className="text-xs text-gray-500">+{job.required_skills.length - 3}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/hr/candidates?job=${job.id}`)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition">
                <Users size={12} /> Candidates
              </button>
              <button onClick={() => openEdit(job)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition">
                <Edit size={12} /> Edit
              </button>
            </div>
          </div>
        ))}
        {!jobs.length && (
          <div className="col-span-3 text-center py-16 text-gray-500">
            <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
            <p>No jobs yet. Create your first job opening.</p>
          </div>
        )}
      </div>}
    </div>
  );
};

export default Jobs;
