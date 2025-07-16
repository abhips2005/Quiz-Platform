import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { gamificationApi } from '../../services/gamification';

interface XPData {
  id: string;
  currentXP: number;
  level: number;
  totalXPEarned: number;
  xpToNextLevel: number;
  prestige: number;
  weeklyXP: number;
  monthlyXP: number;
}

interface XPDisplayProps {
  compact?: boolean;
  showDetails?: boolean;
  onLevelUp?: (newLevel: number) => void;
}

const XPDisplay: React.FC<XPDisplayProps> = ({ 
  compact = false, 
  showDetails = true,
  onLevelUp 
}) => {
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    fetchXPData();
  }, []);

  const fetchXPData = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        console.error('No access token available');
        return;
      }
      const response = await gamificationApi.getXP(token);
      setXpData(response.data);
    } catch (error) {
      console.error('Failed to fetch XP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!xpData) return 0;
    const xpInCurrentLevel = xpData.currentXP - (xpData.totalXPEarned - xpData.currentXP);
    const xpForThisLevel = calculateXPForLevel(xpData.level);
    return Math.min((xpInCurrentLevel / xpForThisLevel) * 100, 100);
  };

  const calculateXPForLevel = (level: number) => {
    return Math.floor(100 * Math.pow(1.2, level - 1));
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'from-purple-500 to-pink-500';
    if (level >= 25) return 'from-yellow-400 to-orange-500';
    if (level >= 10) return 'from-green-400 to-blue-500';
    return 'from-blue-400 to-indigo-500';
  };

  const getLevelIcon = (level: number) => {
    if (level >= 50) return <TrophyIcon className="h-5 w-5 text-purple-300" />;
    if (level >= 25) return <StarIcon className="h-5 w-5 text-yellow-300" />;
    return <StarIcon className="h-4 w-4 text-blue-300" />;
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg ${compact ? 'p-2' : 'p-4'} animate-pulse`}>
        <div className="h-4 bg-gray-700 rounded mb-2"></div>
        <div className="h-2 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!xpData) {
    return (
      <div className={`bg-gray-800 rounded-lg ${compact ? 'p-2' : 'p-4'} text-center`}>
        <div className="text-gray-400 text-sm">XP data unavailable</div>
      </div>
    );
  }

  const progress = calculateProgress();

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getLevelColor(xpData.level)} flex items-center justify-center`}>
          <span className="text-white font-bold text-sm">{xpData.level}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-medium text-sm">Level {xpData.level}</span>
            <span className="text-gray-400 text-xs">{xpData.currentXP} XP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full bg-gradient-to-r ${getLevelColor(xpData.level)}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden">
      {/* Background glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${getLevelColor(xpData.level)} opacity-10 blur-xl`} />
      
      <div className="relative z-10">
        {/* Level display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getLevelColor(xpData.level)} flex items-center justify-center relative`}>
              <span className="text-white font-bold text-xl">{xpData.level}</span>
              {xpData.prestige > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{xpData.prestige}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Level {xpData.level}</h3>
              <p className="text-gray-400 text-sm">
                {xpData.currentXP.toLocaleString()} / {(xpData.currentXP + xpData.xpToNextLevel).toLocaleString()} XP
              </p>
            </div>
          </div>
          
          <div className="text-right">
            {getLevelIcon(xpData.level)}
            <div className="text-gray-400 text-sm mt-1">
              {xpData.xpToNextLevel.toLocaleString()} to next
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Progress to Level {xpData.level + 1}</span>
            <span className="text-white text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 relative overflow-hidden">
            <motion.div
              className={`h-3 rounded-full bg-gradient-to-r ${getLevelColor(xpData.level)} relative`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              {/* Animated shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
                animate={{
                  x: [-100, 300],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "linear",
                }}
                style={{ width: "50px" }}
              />
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        {showDetails && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-white font-bold text-lg">{xpData.totalXPEarned.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">Total XP</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-white font-bold text-lg">{xpData.weeklyXP.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">This Week</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-white font-bold text-lg">{xpData.monthlyXP.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">This Month</div>
            </div>
          </div>
        )}
      </div>

      {/* Level up animation */}
      <AnimatePresence>
        {isLevelingUp && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 opacity-20"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default XPDisplay; 