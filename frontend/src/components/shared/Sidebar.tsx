import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, Briefcase, FileText, BarChart3,
  Settings, LogOut, Bot, UserPlus, Trophy, Building2
} from 'lucide-react'

const HR_NAV = [
  { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hr/company', icon: Building2, label: 'Company' },
  { to: '/hr/jobs', icon: Briefcase, label: 'Job Openings' },
  { to: '/hr/candidates', icon: Users, label: 'Candidates' },
  { to: '/hr/candidates/create', icon: UserPlus, label: 'Add Candidate' },
  { to: '/hr/rankings', icon: Trophy, label: 'Rankings' },
]

const CANDIDATE_NAV = [
  { to: '/candidate/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/candidate/resume', icon: FileText, label: 'Resume Upload' },
  { to: '/candidate/results', icon: BarChart3, label: 'My Results' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = user?.role === 'hr' ? HR_NAV : CANDIDATE_NAV

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">AI Hiring</p>
            <p className="text-xs text-gray-500 mt-0.5">Agent Platform</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
            <span className="text-blue-400 text-xs font-bold">
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}
