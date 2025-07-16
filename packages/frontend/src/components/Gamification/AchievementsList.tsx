import React from 'react';
import { TrophyIcon } from '@heroicons/react/24/outline';

const AchievementsList: React.FC = () => {
  return (
    <div className="text-center py-12">
      <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-gray-400 text-xl font-medium mb-2">Achievements Coming Soon</h3>
      <p className="text-gray-500">
        Track your progress and unlock amazing achievements!
      </p>
    </div>
  );
};

export default AchievementsList; 