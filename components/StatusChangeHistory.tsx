import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { getOrderActivities, type OrderActivity } from '../lib/orders';
import { formatDateTime } from '../lib/database';
import LoadingSpinner from './LoadingSpinner';

interface StatusChangeHistoryProps {
  orderId: string;
  className?: string;
}

function StatusChangeHistory({ orderId, className = '' }: StatusChangeHistoryProps) {
  const [activities, setActivities] = useState<OrderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [orderId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getOrderActivities(orderId);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Filter for status changes and important activities
      const statusActivities = (result.data || []).filter(activity => 
        activity.activity_type === 'status_changed' || 
        activity.activity_type === 'created' ||
        activity.activity_type === 'assigned'
      );

      setActivities(statusActivities);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Kunde inte ladda aktivitetshistorik.');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'status_changed':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'created':
        return <Clock className="w-4 h-4 text-green-600" />;
      case 'assigned':
        return <User className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'status_changed':
        return 'bg-blue-50 border-blue-200';
      case 'created':
        return 'bg-green-50 border-green-200';
      case 'assigned':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600">Laddar historik...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-gray-600 text-center">Ingen aktivitetshistorik tillgänglig</p>
      </div>
    );
  }

  const visibleActivities = isExpanded ? activities : activities.slice(0, 3);

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-blue-600" />
            Statushistorik
          </h4>
          {activities.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
            >
              {isExpanded ? (
                <>
                  Visa mindre
                  <ChevronUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Visa alla ({activities.length})
                  <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {visibleActivities.map((activity, index) => (
            <div 
              key={activity.id} 
              className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.activity_type)}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.activity_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.description}
                </p>
                
                {activity.old_value && activity.new_value && (
                  <div className="mt-1 text-xs text-gray-600">
                    <span className="line-through">{activity.old_value}</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium">{activity.new_value}</span>
                  </div>
                )}
                
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDateTime(activity.created_at)}
                  {activity.user && (
                    <>
                      <span className="mx-2">•</span>
                      <User className="w-3 h-3 mr-1" />
                      {activity.user.full_name}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StatusChangeHistory;