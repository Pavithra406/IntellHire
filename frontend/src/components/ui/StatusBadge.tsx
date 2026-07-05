const STATUS_MAP: Record<string, string> = {
  pending: 'badge-gray',
  aptitude_pending: 'badge-yellow',
  sql_pending: 'badge-yellow',
  coding_pending: 'badge-yellow',
  interview_pending: 'badge-blue',
  interview_completed: 'badge-blue',
  resume_rejected: 'badge-red',
  aptitude_failed: 'badge-red',
  sql_failed: 'badge-red',
  coding_failed: 'badge-red',
  rejected: 'badge-red',
  shortlisted: 'badge-blue',
  hired: 'badge-green',
  passed: 'badge-green',
  failed: 'badge-red',
  completed: 'badge-green',
  in_progress: 'badge-yellow',
}

export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_MAP[status] || 'badge-gray'
  return <span className={cls}>{status.replace(/_/g, ' ')}</span>
}
