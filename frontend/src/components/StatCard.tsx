import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color = 'violet', subtitle }) => {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500 to-violet-700',
    green: 'from-green-500 to-green-700',
    blue: 'from-blue-500 to-blue-700',
    red: 'from-red-500 to-red-700',
    yellow: 'from-yellow-500 to-yellow-600',
    indigo: 'from-indigo-500 to-indigo-700',
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${colorMap[color] || colorMap.violet} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;
