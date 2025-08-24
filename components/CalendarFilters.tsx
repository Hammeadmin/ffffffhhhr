import React, { useState, useEffect } from 'react';
import {
  Filter,
  Users,
  User,
  X,
  ChevronDown,
  Check,
  Calendar,
  Building,
  Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTeams, type TeamWithRelations } from '../lib/teams';
import { getUserProfiles, type UserProfile } from '../lib/database';

interface CalendarFiltersProps {
  selectedUsers: string[];
  selectedTeams: string[];
  onUserChange: (userIds: string[]) => void;
  onTeamChange: (teamIds: string[]) => void;
  onClearFilters: () => void;
  className?: string;
  userTeams: TeamWithRelations[];
}

interface FilterSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  items: Array<{
    id: string;
    name: string;
    avatar?: string;
    color?: string;
    role?: string;
    specialty?: string;
  }>;
}

function CalendarFilters({
  selectedUsers,
  selectedTeams,
  onUserChange,
  onTeamChange,
  userTeams,
  onClearFilters,
  className = ''
}: CalendarFiltersProps) {
  const { user } = useAuth();
  const [isUserSectionOpen, setIsUserSectionOpen] = useState(true);
  const [isTeamSectionOpen, setIsTeamSectionOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<TeamWithRelations[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadFilterData();
  }, []);

  const loadFilterData = async () => {
  try {
    setLoading(true);
    setError(null);

    if (!user) {
      setLoading(false);
      return;
    }

    // Get current user's profile
    const { data: currentUserProfileData, error: userError } = await getUserProfiles('', { userId: user.id });
    if (userError || !currentUserProfileData?.[0]) {
      throw new Error(userError?.message || 'Kunde inte hämta användarprofil.');
    }
    const currentUser = currentUserProfileData[0];
    setUserProfile(currentUser);

    if (!currentUser.organisation_id) {
      throw new Error('Ingen organisation hittades för användaren.');
    }

    // Fetch all users and teams for the organization
    const [allUsersResult, allTeamsResult] = await Promise.all([
      getUserProfiles(currentUser.organisation_id),
      getTeams(currentUser.organisation_id)
    ]);
    if (allUsersResult.error) throw allUsersResult.error;
    if (allTeamsResult.error) throw allTeamsResult.error;

    const allOrgUsers = allUsersResult.data || [];
    const allOrgTeams = allTeamsResult.data || [];

    // --- START: New Role-Based Filtering Logic ---
    if (currentUser.role === 'admin') {
      // Admins see everyone and all teams
      setUsers(allOrgUsers);
      setTeams(allOrgTeams);
    } else {
      // Workers and Sales see a restricted list
      const memberTeamIds = userTeams.map(t => t.id);
      const memberUserIds = new Set<string>([currentUser.id]);
      userTeams.forEach(team => {
        team.members?.forEach(member => memberUserIds.add(member.user_id));
      });

      const visibleUsers = allOrgUsers.filter(u => memberUserIds.has(u.id));
      const visibleTeams = allOrgTeams.filter(t => memberTeamIds.includes(t.id));
      
      setUsers(visibleUsers);
      setTeams(visibleTeams);
    }
    // --- END: New Role-Based Filtering Logic ---

  } catch (err: any) {
    console.error('Error loading filter data:', err);
    setError(err.message || 'Kunde inte ladda filterdata');
  } finally {
    setLoading(false);
  }
};

  const handleUserToggle = (userId: string) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    onUserChange(newSelection);
  };

  const handleTeamToggle = (teamId: string) => {
    const newSelection = selectedTeams.includes(teamId)
      ? selectedTeams.filter(id => id !== teamId)
      : [...selectedTeams, teamId];
    onTeamChange(newSelection);
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      onUserChange([]);
    } else {
      onUserChange(users.map(u => u.id));
    }
  };

  const handleSelectAllTeams = () => {
    if (selectedTeams.length === teams.length) {
      onTeamChange([]);
    } else {
      onTeamChange(teams.map(t => t.id));
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActiveFiltersCount = () => {
    return selectedUsers.length + selectedTeams.length;
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-500',
      sales: 'bg-blue-500',
      worker: 'bg-green-500'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <button
          disabled
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
          Laddar filter...
        </button>
      </div>
    );
  }

return (
  <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}>
    {/* Header with Title and "Clear All" button */}
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-semibold text-gray-900 flex items-center">
        <Filter className="w-4 h-4 mr-2" />
        Filter
      </h3>
      {getActiveFiltersCount() > 0 && (
        <button
          onClick={onClearFilters}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
        >
          Rensa alla
        </button>
      )}
    </div>

    {/* Your existing Search Input */}
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        placeholder="Sök..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    {/* Main Accordion container */}
    <div className="space-y-3">
      {/* Users Accordion Section */}
      <div>
        <button
          onClick={() => setIsUserSectionOpen(!isUserSectionOpen)}
          className="w-full flex items-center justify-between text-left p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg"
        >
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Användare</span>
            {selectedUsers.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {selectedUsers.length}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isUserSectionOpen ? 'rotate-180' : ''}`} />
        </button>
        {isUserSectionOpen && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
            <div className="flex justify-end px-2">
              <button onClick={handleSelectAllUsers} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                {selectedUsers.length === filteredUsers.length ? 'Avmarkera alla' : 'Markera alla'}
              </button>
            </div>
            {filteredUsers.map(user => (
              <label key={user.id} className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ml-3 mr-2 ${getRoleColor(user.role)}`}>
                  {getUserInitials(user.full_name)}
                </div>
                <span className="text-sm text-gray-700">{user.full_name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Teams Accordion Section */}
      <div>
        <button
          onClick={() => setIsTeamSectionOpen(!isTeamSectionOpen)}
          className="w-full flex items-center justify-between text-left p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg"
        >
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Team</span>
            {selectedTeams.length > 0 && (
              <span className="ml-2 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {selectedTeams.length}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isTeamSectionOpen ? 'rotate-180' : ''}`} />
        </button>
        {isTeamSectionOpen && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
             <div className="flex justify-end px-2">
              <button onClick={handleSelectAllTeams} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                {selectedTeams.length === filteredTeams.length ? 'Avmarkera alla' : 'Markera alla'}
              </button>
            </div>
            {filteredTeams.map(team => (
              <label key={team.id} className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(team.id)}
                  onChange={() => handleTeamToggle(team.id)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-medium ml-3 mr-2 ${getTeamColor(team.specialty)}`}>
                    <Users className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-700">{team.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);
}

export default CalendarFilters;