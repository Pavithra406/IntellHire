import React from 'react';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-700 text-gray-300' },
  resume_screening: { label: 'Screening', className: 'bg-blue-500/20 text-blue-400' },
  resume_rejected: { label: 'Resume Rejected', className: 'bg-red-500/20 text-red-400' },
  aptitude_pending: { label: 'Aptitude Pending', className: 'bg-yellow-500/20 text-yellow-400' },
  aptitude_failed: { label: 'Aptitude Failed', className: 'bg-red-500/20 text-red-400' },
  sql_pending: { label: 'SQL Pending', className: 'bg-yellow-500/20 text-yellow-400' },
  sql_failed: { label: 'SQL Failed', className: 'bg-red-500/20 text-red-400' },
  coding_pending: { label: 'Coding Pending', className: 'bg-yellow-500/20 text-yellow-400' },
  coding_failed: { label: 'Coding Failed', className: 'bg-red-500/20 text-red-400' },
  interview_pending: { label: 'Interview Pending', className: 'bg-purple-500/20 text-purple-400' },
  interview_completed: { label: 'Interview Done', className: 'bg-indigo-500/20 text-indigo-400' },
  shortlisted: { label: 'Shortlisted', className: 'bg-green-500/20 text-green-400' },
  hired: { label: 'Hired', className: 'bg-green-600/30 text-green-300 font-semibold' },
  rejected: { label: 'Rejected', className: 'bg-red-600/30 text-red-300' },
  passed: { label: 'Passed', className: 'bg-green-500/20 text-green-400' },
  failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400' },
  completed: { label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-500/20 text-yellow-400' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-700 text-gray-300' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
