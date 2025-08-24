import React from 'react';
import { Clock, MapPin, User, Users, Calendar, FileText, Package } from 'lucide-react';
import { formatSwedishTime } from '../lib/calendar';
import { EVENT_TYPE_LABELS } from '../types/database';
import type { CalendarEventWithRelations } from '../lib/calendar';

interface CalendarEventCardProps {
  event: CalendarEventWithRelations;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void; // Add this line
  onTimeTrackingClick?: () => void;
  showUserAvatar?: boolean;
  compact?: boolean;
  className?: string;
}

function CalendarEventCard({ 
  event, 
  onClick, 
  onDragStart,
  onTimeTrackingClick,
  showUserAvatar = true, 
  compact = false,
  className = '' 
}: CalendarEventCardProps) {
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'task':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reminder':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return Calendar;
      case 'task':
        return Package;
      case 'reminder':
        return Clock;
      default:
        return Calendar;
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role?: string) => {
    const colors = {
      admin: 'bg-red-500',
      sales: 'bg-blue-500',
      worker: 'bg-green-500'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-500';
  };

  const formatTimeRange = () => {
    if (!event.start_time) return '';
    
    const startTime = formatSwedishTime(new Date(event.start_time));
    if (!event.end_time) return startTime;
    
    const endTime = formatSwedishTime(new Date(event.end_time));
    return `${startTime} - ${endTime}`;
  };

  const Icon = getEventTypeIcon(event.type);

  
  if (compact) {
  return (
    <div
  key={event.id}
  draggable={!!onDragStart} // Only draggable if the handler is provided
  onDragStart={onDragStart} // Use the prop from the parent
  onClick={(e) => {
    e.stopPropagation();
    onClick?.(e);
  }}
      className={`select-none flex flex-col p-2 rounded border cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${getEventTypeColor(event.type)} ${className}`}
      title={event.title}
    >
      {/* Left side: Title, Type, and Time */}
  <div className="flex-1 min-w-0">
    {/* Line 1: The Event Title */}
    <p className="text-xs font-bold truncate">
      {event.title}
    </p>

    {/* Line 2: Event Type and Time */}
    <div className="flex items-center space-x-2 text-xs opacity-80 mt-1">
      <div className="flex items-center min-w-0">
        <Icon className="w-3 h-3 mr-1 flex-shrink-0" />
        <span className="truncate">{EVENT_TYPE_LABELS[event.type]}</span>
      </div>
      <div className="flex items-center min-w-0">
        <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
        <span className="truncate">{formatTimeRange()}</span>
      </div>
    </div>
  </div>

  {/* Right side: Avatar or Team Icon */}
  <div className="flex-shrink-0 ml-2">
    {event.assigned_to ? (
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${getRoleColor(event.assigned_to.role)}`}
        title={event.assigned_to.full_name}
      >
        {getUserInitials(event.assigned_to.full_name)}
      </div>
    ) : event.assigned_to_team_id && (
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center bg-purple-500 text-white"
        title="Team Assignment"
      >
        <Users className="w-3 h-3" />
      </div>
    )}
  </div>
    </div>
  );
}

  return (
  <div
  draggable={!!onDragStart} // Only draggable if the handler is provided
  onDragStart={onDragStart} // Use the prop from the parent
  onClick={(e) => {
    e.stopPropagation();
    onClick?.(e); // Fixed: No longer passes 'e' which was causing an error
  }}
    className={`select-none overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
  compact ? 'p-3' : 'p-4'
    } ${className}`}
  >
      <div className="flex items-start space-x-3">
        {/* Event Type Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventTypeColor(event.type)}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              {/* This container now controls the title and time together */}
              <div className="flex items-center">
                <h4 className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>
                  {event.title}
                </h4>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.type)}`}>
                  {EVENT_TYPE_LABELS[event.type]}
                </span>
                {event.start_time && (
                  <span className="text-xs text-gray-500 flex items-center flex-shrink min-w-0">
                    <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{formatTimeRange()}</span>
                  </span>
                )}
              </div>
            </div>

            {/* User Avatar */}
            {/* User Avatar OR Team Icon */}
              {showUserAvatar && (
                <div className="flex-shrink-0 ml-3">
                  {event.assigned_to ? (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getRoleColor(event.assigned_to.role)}`}
                      title={event.assigned_to.full_name}
                    >
                      {getUserInitials(event.assigned_to.full_name)}
                    </div>
                  ) : event.assigned_to_team_id && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500 text-white text-xs font-medium"
                      title="Team Assignment"
                    >
                      <Users className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Description */}
          {!compact && event.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-center text-xs text-gray-500 mb-2">
              <MapPin className="w-3 h-3 mr-1" />
              {event.location}
            </div>
          )}

          {/* Related Items */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {event.related_lead && (
              <div className="flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                Lead: {event.related_lead.title}
              </div>
            )}
            {event.related_job && (
              <div className="flex items-center">
                <Package className="w-3 h-3 mr-1" />
                Jobb: {event.related_job.title}
              </div>
            )}
            {event.related_order_id && (
              <div className="flex items-center">
                <Package className="w-3 h-3 mr-1" />
                Order
              </div>
            )}
          </div>

          {/* Assigned User (if not showing avatar) */}
          {!showUserAvatar && event.assigned_to && (
            <div className="flex items-center text-xs text-gray-500 mt-2">
              <User className="w-3 h-3 mr-1" />
              {event.assigned_to.full_name}
            </div>
          )}

          {/* Time Tracking Button for Workers */}
          {onTimeTrackingClick && event.related_order_id && (
            <div className="mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTimeTrackingClick();
                }}
                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
              >
                Tidtagning
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarEventCard;