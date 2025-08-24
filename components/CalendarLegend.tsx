import React from 'react';
import { Users, User, Calendar, Info } from 'lucide-react';
import { TEAM_SPECIALTY_LABELS, USER_ROLE_LABELS } from '../types/database';
import type { TeamWithRelations, UserProfile } from '../lib/teams';

interface CalendarLegendProps {
  selectedUsers: UserProfile[];
  selectedTeams: TeamWithRelations[];
  eventTypes: Array<{ type: string; label: string; color: string }>;
  className?: string;
}

function CalendarLegend({ selectedUsers, selectedTeams, eventTypes, className = '' }: CalendarLegendProps) {
  const getTeamColor = (specialty: string) => {
    const colors = {
      fönsterputsning: 'bg-blue-500',
      taktvätt: 'bg-green-500',
      fasadtvätt: 'bg-purple-500',
      allmänt: 'bg-gray-500',
      övrigt: 'bg-orange-500'
    };
    return colors[specialty as keyof typeof colors] || 'bg-gray-500';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-500',
      sales: 'bg-blue-500',
      worker: 'bg-green-500'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-500';
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (selectedUsers.length === 0 && selectedTeams.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center mb-3">
        <Info className="w-4 h-4 text-gray-600 mr-2" />
        <h3 className="text-sm font-medium text-gray-900">Kalenderförklaring</h3>
      </div>

      <div className="space-y-4">
        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2 flex items-center">
              <User className="w-3 h-3 mr-1" />
              Valda användare ({selectedUsers.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${getRoleColor(user.role)}`}>
                    {getUserInitials(user.full_name)}
                  </div>
                  <span className="text-sm text-gray-700 truncate">{user.full_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Teams */}
        {selectedTeams.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2 flex items-center">
              <Users className="w-3 h-3 mr-1" />
              Valda team ({selectedTeams.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedTeams.map((team) => (
                <div key={team.id} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${getTeamColor(team.specialty)}`}>
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="text-sm text-gray-700 truncate">{team.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Types */}
        {eventTypes.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Händelsetyper
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eventTypes.map((eventType) => (
                <div key={eventType.type} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${eventType.color}`}></div>
                  <span className="text-sm text-gray-700">{eventType.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarLegend;