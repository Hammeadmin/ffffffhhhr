import React from 'react';
import { User, Users, Calendar, Plus, Filter } from 'lucide-react';
import type { UserProfile } from '../types/database';
import type { TeamWithRelations } from '../lib/teams';

interface CalendarQuickActionsProps {
  currentUser: UserProfile | null;
  userTeams: TeamWithRelations[];
  selectedUsers: string[];
  selectedTeams: string[];
  onUserSelect: (userId: string) => void;
  onTeamSelect: (teamId: string) => void;
  onShowMyCalendar: () => void;
  onShowAllCalendars: () => void;
  onCreateEvent: () => void;
  className?: string;
}

function CalendarQuickActions({
  currentUser,
  userTeams,
  selectedUsers,
  selectedTeams,
  onUserSelect,
  onTeamSelect,
  currentUserRole,
  organisationName,
  onShowMyCalendar,
  onShowAllCalendars,
  onCreateEvent,
  className = ''
}: CalendarQuickActionsProps) {
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-500',
      sales: 'bg-blue-500',
      worker: 'bg-green-500'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-500';
  };

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

  const isMyCalendarActive = currentUser && selectedUsers.length === 1 && selectedUsers[0] === currentUser.id && selectedTeams.length === 0;
  const isAllCalendarsActive = selectedUsers.length === 0 && selectedTeams.length === 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}>
  <h3 className="text-base font-semibold text-gray-900 mb-4">
    Snabbåtgärder
  </h3>

  {/* Section 1: Main Action Buttons */}
  <div className="flex flex-wrap gap-2 mb-4">
    <button
      onClick={onCreateEvent}
      className="flex-grow inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
    >
      <Plus className="w-4 h-4 mr-2" />
      Ny händelse
    </button>
    <button
      onClick={onShowMyCalendar}
      className={`flex-grow inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isMyCalendarActive
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <User className="w-4 h-4 mr-2" />
      Min kalender
    </button>
    {/* This entire block will only appear for admins */}
{currentUserRole === 'admin' && (
  <button
    onClick={onShowAllCalendars}
    className={`flex-grow inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isAllCalendarsActive
        ? 'bg-blue-100 text-blue-700'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    <Calendar className="w-4 h-4 mr-2" />
    {organisationName} Kalender
  </button>
)}
  </div>

  {/* Section 2: Quick Team Selection */}
  {userTeams.length > 0 && (
    <div className="pt-3 border-t border-gray-200">
      <h4 className="text-sm font-semibold text-gray-800 mb-2">Mina team</h4>
      <div className="flex flex-wrap gap-2">
        {userTeams.map((team) => (
          <button
            key={team.id}
            onClick={() => onTeamSelect(team.id)}
            className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedTeams.includes(team.id)
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={team.name}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${getTeamColor(team.specialty)}`}></div>
            {team.name}
          </button>
        ))}
      </div>
    </div>
  )}

      {/* Active Filters Summary */}
      {(selectedUsers.length > 0 || selectedTeams.length > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>
                Visar: {selectedUsers.length > 0 && `${selectedUsers.length} användare`}
                {selectedUsers.length > 0 && selectedTeams.length > 0 && ', '}
                {selectedTeams.length > 0 && `${selectedTeams.length} team`}
              </span>
            </div>
            
            {/* Permission Indicator */}
            {currentUser && (
              <div className="text-xs text-gray-500">
                {currentUser.role === 'admin' ? 'Full åtkomst' :
                 currentUser.role === 'sales' ? 'Team & säljåtkomst' :
                 'Begränsad åtkomst'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarQuickActions;