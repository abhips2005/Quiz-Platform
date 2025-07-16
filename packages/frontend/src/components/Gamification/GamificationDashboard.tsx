import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StarIcon,
  TrophyIcon,
  SparklesIcon,
  FireIcon,
  UsersIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import { 
  ChartBarIcon,
  UserCircleIcon,
  CubeIcon,
  AcademicCapIcon
} from '@heroicons/react/24/solid';
import XPDisplay from './XPDisplay';
import AvatarGallery from './AvatarGallery';
import PowerUpShop from './PowerUpShop';
import AchievementsList from './AchievementsList';
import Leaderboards from './Leaderboards';

interface GamificationDashboardProps {
  onClose?: () => void;
}

const GamificationDashboard: React.FC<GamificationDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: ChartBarIcon,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'avatars',
      name: 'Avatars',
      icon: UserCircleIcon,
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'powerups',
      name: 'Power-ups',
      icon: CubeIcon,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'achievements',
      name: 'Achievements',
      icon: AcademicCapIcon,
      color: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'leaderboards',
      name: 'Leaderboards',
      icon: TrophyIcon,
      color: 'from-red-500 to-rose-600'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'avatars':
        return <AvatarGallery />;
      case 'powerups':
        return <PowerUpShop />;
      case 'achievements':
        return <AchievementsList />;
      case 'leaderboards':
        return <Leaderboards />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SparklesIcon className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-white text-2xl font-bold">Gamification Hub</h1>
                <p className="text-blue-100 text-sm">Level up your learning experience</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800 px-6 py-2 border-b border-gray-700">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* XP Display */}
      <div>
        <h2 className="text-white text-xl font-bold mb-4 flex items-center">
          <StarIcon className="h-6 w-6 text-yellow-500 mr-2" />
          Your Progress
        </h2>
        <XPDisplay showDetails={true} />
      </div>

      {/* Quick Stats Grid */}
      <div>
        <h2 className="text-white text-xl font-bold mb-4 flex items-center">
          <ChartBarIcon className="h-6 w-6 text-blue-500 mr-2" />
          Quick Stats
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Daily Streak"
            value="7 days"
            icon={<FireIcon className="h-8 w-8 text-orange-500" />}
            color="from-orange-500 to-red-600"
          />
          <StatCard
            title="Rank"
            value="#23"
            icon={<TrophyIcon className="h-8 w-8 text-yellow-500" />}
            color="from-yellow-500 to-orange-600"
          />
          <StatCard
            title="Achievements"
            value="12/25"
            icon={<GiftIcon className="h-8 w-8 text-purple-500" />}
            color="from-purple-500 to-pink-600"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-white text-xl font-bold mb-4 flex items-center">
          <UsersIcon className="h-6 w-6 text-green-500 mr-2" />
          Recent Activity
        </h2>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="space-y-4">
            <ActivityItem
              type="xp"
              title="Earned 150 XP"
              description="Completed Math Quiz #5"
              time="2 hours ago"
              icon={<StarIcon className="h-5 w-5 text-yellow-500" />}
            />
            <ActivityItem
              type="achievement"
              title="New Achievement!"
              description="Speed Demon - Answer 5 questions in under 10 seconds"
              time="1 day ago"
              icon={<TrophyIcon className="h-5 w-5 text-purple-500" />}
            />
            <ActivityItem
              type="level"
              title="Level Up!"
              description="Reached Level 12"
              time="3 days ago"
              icon={<SparklesIcon className="h-5 w-5 text-blue-500" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-gray-800 rounded-xl p-6 relative overflow-hidden"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-10`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-gray-400 text-sm font-medium">{title}</div>
          {icon}
        </div>
        <div className="text-white text-2xl font-bold">{value}</div>
      </div>
    </motion.div>
  );
};

// Activity Item Component
interface ActivityItemProps {
  type: string;
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ title, description, time, icon }) => {
  return (
    <div className="flex items-center space-x-4 p-3 bg-gray-700 rounded-lg">
      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-white font-medium">{title}</h4>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <div className="text-gray-500 text-xs">{time}</div>
    </div>
  );
};

export default GamificationDashboard; 