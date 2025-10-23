import React from 'react';
import { Receipt, Status } from '../types';
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon } from './Icons';

interface DashboardProps {
    receipts: Receipt[];
}

export const Dashboard: React.FC<DashboardProps> = ({ receipts }) => {
    const pendingCount = receipts.filter(r => r.status === Status.Pending && r.daysPassed <= 18).length;
    const overdueCount = receipts.filter(r => r.daysPassed > 18 && r.status !== Status.Done).length;
    const processedCount = receipts.filter(r => r.status === Status.Done).length;

    const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: number; color: string }> = ({ icon, title, value, color }) => (
        <div className={`bg-gray-800/50 border ${color} p-5 rounded-lg shadow-lg flex items-center space-x-4`}>
            {icon}
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
                icon={<ClockIcon className="w-8 h-8 text-yellow-400" />}
                title="Pending Orders"
                value={pendingCount}
                color="border-yellow-500/50"
            />
            <StatCard 
                icon={<AlertTriangleIcon className="w-8 h-8 text-red-400" />}
                title="Overdue Orders"
                value={overdueCount}
                color="border-red-500/50"
            />
            <StatCard 
                icon={<CheckCircleIcon className="w-8 h-8 text-green-400" />}
                title="Processed Orders"
                value={processedCount}
                color="border-green-500/50"
            />
        </div>
    );
};
