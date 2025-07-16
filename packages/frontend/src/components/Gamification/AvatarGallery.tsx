import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LockClosedIcon, 
  CheckIcon, 
  StarIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';
import { 
  CrownIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { gamificationApi, Avatar } from '../../services/gamification';

interface AvatarGalleryProps {
  onAvatarEquipped?: (avatar: Avatar) => void;
}

const AvatarGallery: React.FC<AvatarGalleryProps> = ({ onAvatarEquipped }) => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  const categories = [
    'ALL',
    'CHARACTER',
    'ANIMAL',
    'FANTASY',
    'ROBOT',
    'SPORTS',
    'ACADEMIC'
  ];

  useEffect(() => {
    fetchAvatars();
  }, []);

  const fetchAvatars = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      const response = await gamificationApi.getAvatars(token);
      setAvatars(response.data);
    } catch (error) {
      console.error('Failed to fetch avatars:', error);
      toast.error('Failed to load avatars');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAvatar = async (avatar: Avatar) => {
    try {
      setActionLoading(avatar.id);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      await gamificationApi.unlockAvatar(token, avatar.id);
      toast.success(`${avatar.name} unlocked!`);
      fetchAvatars(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unlock avatar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEquipAvatar = async (avatar: Avatar) => {
    try {
      setActionLoading(avatar.id);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      await gamificationApi.equipAvatar(token, avatar.id);
      toast.success(`${avatar.name} equipped!`);
      fetchAvatars(); // Refresh the list
      onAvatarEquipped?.(avatar);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to equip avatar');
    } finally {
      setActionLoading(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toUpperCase()) {
      case 'LEGENDARY':
        return 'from-purple-500 to-pink-500';
      case 'EPIC':
        return 'from-purple-400 to-indigo-500';
      case 'RARE':
        return 'from-blue-400 to-cyan-500';
      case 'COMMON':
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity.toUpperCase()) {
      case 'LEGENDARY':
        return <CrownIcon className="h-4 w-4 text-purple-300" />;
      case 'EPIC':
        return <SparklesIcon className="h-4 w-4 text-purple-300" />;
      case 'RARE':
        return <StarIcon className="h-4 w-4 text-blue-300" />;
      case 'COMMON':
      default:
        return <ShieldCheckIcon className="h-4 w-4 text-gray-300" />;
    }
  };

  const filteredAvatars = avatars.filter(avatar => 
    selectedCategory === 'ALL' || avatar.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse">
              <div className="w-full aspect-square bg-gray-700 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCategory === category
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {category.charAt(0) + category.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredAvatars.map((avatar) => (
            <motion.div
              key={avatar.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`bg-gray-800 rounded-xl p-4 relative cursor-pointer transition-all border-2 ${
                avatar.isEquipped 
                  ? 'border-green-500 shadow-lg shadow-green-500/20' 
                  : 'border-transparent hover:border-gray-600'
              }`}
              onClick={() => setSelectedAvatar(avatar)}
            >
              {/* Rarity Glow */}
              <div className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(avatar.rarity)} opacity-10 rounded-xl`} />
              
              {/* Avatar Image */}
              <div className="relative w-full aspect-square mb-3">
                <img
                  src={avatar.imageUrl}
                  alt={avatar.name}
                  className={`w-full h-full object-cover rounded-lg ${
                    !avatar.isOwned ? 'grayscale opacity-50' : ''
                  }`}
                />
                
                {/* Status Indicators */}
                {avatar.isEquipped && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="h-4 w-4 text-white" />
                  </div>
                )}
                
                {!avatar.isOwned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-lg">
                    <LockClosedIcon className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                
                {/* Rarity Badge */}
                <div className={`absolute bottom-2 left-2 px-2 py-1 bg-gradient-to-r ${getRarityColor(avatar.rarity)} rounded-full flex items-center space-x-1`}>
                  {getRarityIcon(avatar.rarity)}
                  <span className="text-white text-xs font-medium">
                    {avatar.rarity}
                  </span>
                </div>
              </div>

              {/* Avatar Info */}
              <div className="text-center">
                <h3 className="text-white font-medium text-sm mb-1 truncate">
                  {avatar.name}
                </h3>
                <p className="text-gray-400 text-xs">
                  {avatar.category.charAt(0) + avatar.category.slice(1).toLowerCase()}
                </p>
                {!avatar.isOwned && avatar.cost > 0 && (
                  <p className="text-yellow-400 text-xs font-medium mt-1">
                    {avatar.cost} XP
                  </p>
                )}
              </div>

              {/* Loading Overlay */}
              {actionLoading === avatar.id && (
                <div className="absolute inset-0 bg-black bg-opacity-60 rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Avatar Detail Modal */}
      <AnimatePresence>
        {selectedAvatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAvatar(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Rarity Glow */}
              <div className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(selectedAvatar.rarity)} opacity-20 rounded-xl`} />
              
              <div className="relative z-10">
                {/* Avatar Image */}
                <div className="w-32 h-32 mx-auto mb-6 relative">
                  <img
                    src={selectedAvatar.imageUrl}
                    alt={selectedAvatar.name}
                    className={`w-full h-full object-cover rounded-xl ${
                      !selectedAvatar.isOwned ? 'grayscale opacity-50' : ''
                    }`}
                  />
                  {!selectedAvatar.isOwned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-xl">
                      <LockClosedIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Avatar Details */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <h2 className="text-white font-bold text-xl">{selectedAvatar.name}</h2>
                    {getRarityIcon(selectedAvatar.rarity)}
                  </div>
                  
                  <div className={`inline-flex items-center px-3 py-1 bg-gradient-to-r ${getRarityColor(selectedAvatar.rarity)} rounded-full mb-3`}>
                    <span className="text-white text-sm font-medium">
                      {selectedAvatar.rarity} {selectedAvatar.category}
                    </span>
                  </div>

                  {selectedAvatar.isEquipped && (
                    <div className="inline-flex items-center px-3 py-1 bg-green-600 rounded-full">
                      <CheckIcon className="h-4 w-4 text-white mr-1" />
                      <span className="text-white text-sm font-medium">Equipped</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {!selectedAvatar.isOwned ? (
                    <button
                      onClick={() => handleUnlockAvatar(selectedAvatar)}
                      disabled={actionLoading === selectedAvatar.id}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {actionLoading === selectedAvatar.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Unlocking...
                        </div>
                      ) : (
                        `Unlock for ${selectedAvatar.cost} XP`
                      )}
                    </button>
                  ) : selectedAvatar.isEquipped ? (
                    <button
                      disabled
                      className="flex-1 bg-green-600 text-white font-medium py-3 px-4 rounded-lg cursor-not-allowed opacity-50"
                    >
                      Currently Equipped
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEquipAvatar(selectedAvatar)}
                      disabled={actionLoading === selectedAvatar.id}
                      className="flex-1 bg-green-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {actionLoading === selectedAvatar.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Equipping...
                        </div>
                      ) : (
                        'Equip Avatar'
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => setSelectedAvatar(null)}
                    className="px-6 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredAvatars.length === 0 && !loading && (
        <div className="text-center py-12">
          <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-400 text-lg font-medium mb-2">No avatars found</h3>
          <p className="text-gray-500 text-sm">
            Try selecting a different category
          </p>
        </div>
      )}
    </div>
  );
};

export default AvatarGallery; 