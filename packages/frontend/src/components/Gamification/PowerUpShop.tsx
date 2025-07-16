import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BoltIcon, 
  ClockIcon, 
  LightBulbIcon,
  ForwardIcon,
  StarIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { CubeIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { gamificationApi, PowerUp } from '../../services/gamification';

const PowerUpShop: React.FC = () => {
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    fetchPowerUps();
  }, []);

  const fetchPowerUps = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      const response = await gamificationApi.getPowerUps(token);
      setPowerUps(response.data);
    } catch (error) {
      console.error('Failed to fetch power-ups:', error);
      toast.error('Failed to load power-ups');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (powerUp: PowerUp, quantity: number = 1) => {
    try {
      setPurchasing(powerUp.id);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      await gamificationApi.purchasePowerUp(token, powerUp.id, quantity);
      toast.success(`Purchased ${quantity}x ${powerUp.name}!`);
      fetchPowerUps(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to purchase power-up');
    } finally {
      setPurchasing(null);
    }
  };

  const getPowerUpIcon = (type: string) => {
    switch (type) {
      case 'TIME_BOOST':
        return <ClockIcon className="h-6 w-6" />;
      case 'HINT_REVEAL':
        return <LightBulbIcon className="h-6 w-6" />;
      case 'SKIP_QUESTION':
        return <ForwardIcon className="h-6 w-6" />;
      case 'DOUBLE_POINTS':
        return <StarIcon className="h-6 w-6" />;
      default:
        return <BoltIcon className="h-6 w-6" />;
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
      case 'UNCOMMON':
        return 'from-green-400 to-emerald-500';
      case 'COMMON':
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse">
            <div className="w-12 h-12 bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-700 rounded mb-2"></div>
            <div className="h-3 bg-gray-700 rounded mb-4"></div>
            <div className="h-8 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-white text-2xl font-bold mb-2 flex items-center justify-center">
          <ShoppingCartIcon className="h-8 w-8 text-blue-500 mr-3" />
          Power-Up Shop
        </h2>
        <p className="text-gray-400">
          Enhance your quiz performance with special abilities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {powerUps.map((powerUp) => (
          <motion.div
            key={powerUp.id}
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-gray-800 rounded-xl p-6 relative overflow-hidden"
          >
            {/* Rarity Glow */}
            <div className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(powerUp.rarity)} opacity-10`} />
            
            <div className="relative z-10">
              {/* Power-up Icon */}
              <div className={`w-16 h-16 bg-gradient-to-r ${getRarityColor(powerUp.rarity)} rounded-xl flex items-center justify-center mb-4`}>
                <div className="text-white">
                  {getPowerUpIcon(powerUp.type)}
                </div>
              </div>

              {/* Power-up Info */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold text-lg">{powerUp.name}</h3>
                  {powerUp.quantity && powerUp.quantity > 0 && (
                    <div className="bg-green-600 text-white text-sm px-2 py-1 rounded-full">
                      {powerUp.quantity}
                    </div>
                  )}
                </div>
                
                <div className={`inline-flex items-center px-2 py-1 bg-gradient-to-r ${getRarityColor(powerUp.rarity)} rounded-full mb-3`}>
                  <CubeIcon className="h-4 w-4 text-white mr-1" />
                  <span className="text-white text-xs font-medium uppercase">
                    {powerUp.rarity}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  {powerUp.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  {powerUp.duration > 0 && (
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <div className="text-gray-400">Duration</div>
                      <div className="text-white font-medium">{powerUp.duration}s</div>
                    </div>
                  )}
                  {powerUp.cooldown > 0 && (
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <div className="text-gray-400">Cooldown</div>
                      <div className="text-white font-medium">{powerUp.cooldown}s</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={() => handlePurchase(powerUp)}
                disabled={purchasing === powerUp.id}
                className={`w-full bg-gradient-to-r ${getRarityColor(powerUp.rarity)} text-white font-medium py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center`}
              >
                {purchasing === powerUp.id ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Purchasing...
                  </>
                ) : (
                  <>
                    <ShoppingCartIcon className="h-5 w-5 mr-2" />
                    Buy for {powerUp.cost} XP
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {powerUps.length === 0 && !loading && (
        <div className="text-center py-12">
          <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-400 text-xl font-medium mb-2">No Power-ups Available</h3>
          <p className="text-gray-500">
            Check back later for new power-ups to enhance your gameplay!
          </p>
        </div>
      )}
    </div>
  );
};

export default PowerUpShop; 