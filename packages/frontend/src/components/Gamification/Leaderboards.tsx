import React from 'react';
import { UsersIcon } from '@heroicons/react/24/outline';

const Leaderboards: React.FC = () => {
  return (
    <div className="text-center py-12">
      <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-gray-400 text-xl font-medium mb-2">Leaderboards Coming Soon</h3>
      <p className="text-gray-500">
        Compete with other players and climb the ranks!
      </p>
    </div>
  );
};

export default Leaderboards; 