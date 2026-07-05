import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Job } from '../../types';

interface Props { jobs: Job[] }

const TYPES = [
  { value: 'aptitude', label: 'Aptitude', subType: 'mcq', desc: 'MCQ questions with A/B/C/D options' },
  { value: 'sql', label: 'SQL MCQ', subType: 'mcq', desc: 'SQL multiple choice questions' },
  { value: 'sql_query', label: 'SQL Query Writing', subType: 'query', desc: 'SQL query writing problems', type: 'sql' },
  { value: 'coding', label: 'Coding', subType: 'mcq', desc: 'Programming problems with test cases', type: 'coding' },
];

const QuestionUpload: React.FC<Props> = ({ jobs }) => {
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [bankCounts, setBankCounts] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!selectedJob) return toast.error('Select a job first');
    if (!file.name.endsWith('.pdf')) return toast.error('Only PDF files accepted');

    const formData = new FormData();
    formData.append('file', file);

    const assessType = (selectedType as any).type || selectedType.value;
    const url = `/questions/upload-pdf?job_id=${selectedJob}&assessment_type=${assessType}&sub_type=${selectedType.subType}`;

    setUploading(true);
    setResult(null);
    try {
      const res = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      toast.success(`${res.data.questions_count} questions uploaded!`);
      // Update bank count
      const key = `${selectedJob}_${assessType}`;
      setBankCounts(prev => ({ ...prev, [key]: res.data.questions_count }));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async (jobId: string, assessType: string) => {
    try {
      await api.delete(`/questions/bank/${jobId}/${assessType}`);
      toast.success('Question bank cleared');
      const key = `${jobId}_${assessType}`;
      setBankCounts(prev => ({ ...prev, [key]: 0 }));
    } catch {
      toast.error('Failed to clear');
    }
  };

  const downloadSample = (type: string) => {
    window.open(`http://localhost:8000/api/questions/sample-format/${type}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Upload Assessment Questions</h2>
        <p className="text-gray-400 text-sm mt-1">Upload PDF files containing questions for each assessment round</p>
      </div>

      {/* Job selector */}
      <div>
        <label className="text-sm text-gray-300 block mb-1.5">Select Job</label>
        <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500 w-full max-w-sm">
          <option value="">-- Choose a job --</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button key={t.value} onClick={() => { setSelectedType(t); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedType.value === t.value
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Info + sample download */}
      <div className="bg-gray-800 rounded-xl p-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-white text-sm font-medium">{selectedType.label} Format</p>
          <p className="text-gray-400 text-xs mt-0.5">{selectedType.desc}</p>
        </div>
        <button
          onClick={() => downloadSample((selectedType as any).type || selectedType.value)}
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 whitespace-nowrap">
          <Download size={13} /> Sample Format
        </button>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-700 hover:border-violet-500 rounded-xl p-10 text-center cursor-pointer transition">
        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ''; }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
            <p className="text-gray-400 text-sm">Parsing PDF...</p>
          </div>
        ) : (
          <>
            <Upload size={28} className="mx-auto mb-2 text-gray-500" />
            <p className="text-white font-medium">Click to upload PDF</p>
            <p className="text-gray-500 text-xs mt-1">{selectedType.label} questions · PDF only</p>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-gray-900 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-green-400" />
            <p className="text-white font-medium">{result.questions_count} questions uploaded successfully</p>
          </div>
          <div className="space-y-2">
            {result.questions_preview?.map((q: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-gray-500 flex-shrink-0">Q{i + 1}.</span>
                <span className="text-gray-300">{q.text}...</span>
                <span className="ml-auto text-xs text-gray-500 flex-shrink-0">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question banks per job */}
      {selectedJob && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Question Banks — Job #{selectedJob}</h3>
          <div className="space-y-2">
            {['aptitude', 'sql', 'coding'].map(type => {
              const key = `${selectedJob}_${type}`;
              return (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-gray-300 text-sm capitalize">{type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => api.get(`/questions/bank/${selectedJob}/${type}`)
                      .then(r => setBankCounts(prev => ({ ...prev, [key]: r.data.count })))
                      .catch(() => {})}
                      className="text-xs text-violet-400 hover:text-violet-300">
                      Check
                    </button>
                    {bankCounts[key] !== undefined && (
                      <span className="text-xs text-gray-400">{bankCounts[key]} questions</span>
                    )}
                    <button onClick={() => handleClear(selectedJob, type)}
                      className="text-gray-500 hover:text-red-400 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionUpload;
