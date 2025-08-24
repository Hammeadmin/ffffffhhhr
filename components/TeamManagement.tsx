import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Settings,
  Crown,
  User,
  MapPin,
  Clock,
  TrendingUp,
  Activity,
  Edit,
  Trash2,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Star,
  Award,
  Target,
  Calendar,
  Phone,
  Mail,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamStats,
  getUnassignedUsers,
  addTeamMember,
  removeTeamMember,
  type TeamWithRelations,
  type TeamFilters
} from '../lib/teams';
import { getTeamMembers, formatCurrency, formatDate } from '../lib/database';
import {
  TEAM_SPECIALTY_LABELS,
  TEAM_ROLE_LABELS,
  getTeamSpecialtyColor,
  getTeamRoleColor,
  type TeamSpecialty,
  type TeamRole,
  type UserProfile
} from '../types/database';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import ConfirmDialog from './ConfirmDialog';

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

function TeamManagement() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  
  const [activeTab, setActiveTab] = useState<'teams' | 'members'>('teams');
  const [teams, setTeams] = useState<TeamWithRelations[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<TeamWithRelations | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    specialty: 'allmänt' as TeamSpecialty,
    team_leader_id: '',
    hourly_rate: ''
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, TeamRole>>({});
  const [formLoading, setFormLoading] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<TeamFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamsResult, usersResult, unassignedResult, statsResult] = await Promise.all([
        getTeams(DEMO_ORG_ID, filters),
        getTeamMembers(DEMO_ORG_ID),
        getUnassignedUsers(DEMO_ORG_ID),
        getTeamStats(DEMO_ORG_ID)
      ]);

      if (teamsResult.error) {
        setError(teamsResult.error.message);
        return;
      }

      if (usersResult.error) {
        setError(usersResult.error.message);
        return;
      }

      setTeams(teamsResult.data || []);
      setAllUsers(usersResult.data || []);
      setUnassignedUsers(unassignedResult.data || []);
      setTeamStats(statsResult.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.team_leader_id) {
      showError('Fel', 'Teamnamn och teamledare är obligatoriska fält.');
      return;
    }

    try {
      setFormLoading(true);

      const teamData = {
        organisation_id: DEMO_ORG_ID,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        specialty: formData.specialty,
        team_leader_id: formData.team_leader_id,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
      };

      const result = await createTeam(teamData, selectedMembers, memberRoles);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Team skapat framgångsrikt!');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error creating team:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid skapande av team.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeam || !formData.name.trim()) {
      showError('Fel', 'Teamnamn är obligatoriskt.');
      return;
    }

    try {
      setFormLoading(true);

      const updates = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        specialty: formData.specialty,
        team_leader_id: formData.team_leader_id || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
      };

      const result = await updateTeam(selectedTeam.id, updates);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Team uppdaterat framgångsrikt!');
      setShowEditModal(false);
      setSelectedTeam(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error updating team:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid uppdatering av team.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;

    try {
      const result = await deleteTeam(teamToDelete.id);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Team borttaget framgångsrikt!');
      setShowDeleteDialog(false);
      setTeamToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting team:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid borttagning av team.');
    }
  };

  const handleEditTeam = (team: TeamWithRelations) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      specialty: team.specialty,
      team_leader_id: team.team_leader_id || '',
      hourly_rate: team.hourly_rate?.toString() || ''
    });
    setShowEditModal(true);
  };

  const handleMemberRoleChange = (userId: string, role: TeamRole) => {
    setMemberRoles(prev => ({ ...prev, [userId]: role }));
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    
    // Set default role if not set
    if (!memberRoles[userId]) {
      setMemberRoles(prev => ({ ...prev, [userId]: 'medarbetare' }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      specialty: 'allmänt',
      team_leader_id: '',
      hourly_rate: ''
    });
    setSelectedMembers([]);
    setMemberRoles({});
  };

  const getSpecialtyIcon = (specialty: TeamSpecialty) => {
    switch (specialty) {
      case 'fönsterputsning': return '🪟';
      case 'taktvätt': return '🏠';
      case 'fasadtvätt': return '🏢';
      case 'allmänt': return '🔧';
      case 'övrigt': return '⚡';
      default: return '🔧';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <LoadingSpinner />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-10 h-10 text-red-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Kunde inte ladda team-data</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button 
              onClick={loadData}
              className="ml-auto inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Försök igen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users2 className="w-8 h-8 mr-3 text-blue-600" />
            Team Management
          </h1>
          <p className="mt-2 text-gray-600">
            Hantera specialiserade arbetsteam och deras medlemmar
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Skapa Nytt Team
          </button>
        </div>
      </div>

      {/* Team Statistics */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt Team</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aktiva Team</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.activeTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt Medlemmar</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Genomsnittlig Storlek</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.averageTeamSize}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'teams', label: 'Alla Team', icon: Users2 },
            { id: 'members', label: 'Teammedlemmar', icon: User }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sök</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sök team..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialitet</label>
              <select
                value={filters.specialty || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, specialty: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla specialiteter</option>
                {Object.entries(TEAM_SPECIALTY_LABELS).map(([specialty, label]) => (
                  <option key={specialty} value={specialty}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Rensa filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          {teams.length === 0 ? (
            <EmptyState
              type="general"
              title="Inga team ännu"
              description="Skapa ditt första team för att organisera medarbetare efter specialitet och projekt."
              actionText="Skapa Nytt Team"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div key={team.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Team Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getSpecialtyIcon(team.specialty)}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{team.name}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamSpecialtyColor(team.specialty)}`}>
                            {TEAM_SPECIALTY_LABELS[team.specialty]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditTeam(team)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setTeamToDelete(team);
                            setShowDeleteDialog(true);
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Team Description */}
                    {team.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{team.description}</p>
                    )}

                    {/* Team Leader */}
                    {team.team_leader && (
                      <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-lg">
                        <Crown className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{team.team_leader.full_name}</p>
                          <p className="text-xs text-gray-500">Teamledare</p>
                        </div>
                      </div>
                    )}

                    {/* Team Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">{team.member_count || 0}</p>
                        <p className="text-xs text-gray-500">Medlemmar</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">{team.active_jobs_count || 0}</p>
                        <p className="text-xs text-gray-500">Aktiva Jobb</p>
                      </div>
                    </div>

                    {/* Hourly Rate */}
                    {team.hourly_rate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Timtaxa:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(team.hourly_rate)}/tim</span>
                      </div>
                    )}

                    {/* Team Members Preview */}
                    {team.members && team.members.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Medlemmar</span>
                          <button
                            onClick={() => {
                              setSelectedTeam(team);
                              setShowDetailsModal(true);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Visa alla
                          </button>
                        </div>
                        <div className="flex -space-x-2">
                          {team.members.slice(0, 4).map((member) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                              title={member.user?.full_name}
                            >
                              {member.user?.full_name?.charAt(0) || 'U'}
                            </div>
                          ))}
                          {team.members.length > 4 && (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                              +{team.members.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Unassigned Users */}
          {unassignedUsers.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Ej tilldelade användare ({unassignedUsers.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassignedUsers.map((user) => (
                  <div key={user.id} className="bg-white rounded-lg p-4 border border-yellow-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          // Quick assign to team functionality could be added here
                        }}
                        className="text-blue-600 hover:text-blue-700"
                        title="Tilldela till team"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Team Members */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Alla teammedlemmar</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medlem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roll i Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gick med
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teams.flatMap(team => 
                    (team.members || []).map(member => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                              {member.user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.user?.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.user?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-xl mr-2">{getSpecialtyIcon(team.specialty)}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{team.name}</div>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamSpecialtyColor(team.specialty)}`}>
                                {TEAM_SPECIALTY_LABELS[team.specialty]}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamRoleColor(member.role_in_team)}`}>
                            {TEAM_ROLE_LABELS[member.role_in_team]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(member.joined_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {member.is_active ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                // Edit member role functionality
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Redigera roll"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                // Remove from team functionality
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Ta bort från team"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Skapa nytt team</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Teaminformation</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teamnamn *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="T.ex. Fönsterputsningsexperten"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beskrivning
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Specialiserat team för komplexa fönsterputsningsjobb"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specialitet *
                      </label>
                      <select
                        required
                        value={formData.specialty}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value as TeamSpecialty }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Object.entries(TEAM_SPECIALTY_LABELS).map(([specialty, label]) => (
                          <option key={specialty} value={specialty}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timtaxa (SEK)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="500.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teamledare *
                    </label>
                    <select
                      required
                      value={formData.team_leader_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, team_leader_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Välj teamledare...</option>
                      {allUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Member Selection */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Välj teammedlemmar</h4>
                  
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    {allUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Inga användare tillgängliga</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {allUsers.map((user) => (
                          <div key={user.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(user.id)}
                                  onChange={() => toggleMemberSelection(user.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                                  {user.full_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                  <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                              </div>
                              
                              {selectedMembers.includes(user.id) && (
                                <select
                                  value={memberRoles[user.id] || 'medarbetare'}
                                  onChange={(e) => handleMemberRoleChange(user.id, e.target.value as TeamRole)}
                                  className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {Object.entries(TEAM_ROLE_LABELS).map(([role, label]) => (
                                    <option key={role} value={role}>{label}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Members Preview */}
                  {selectedMembers.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h5 className="font-medium text-blue-900 mb-2">
                        Valda medlemmar ({selectedMembers.length})
                      </h5>
                      <div className="space-y-2">
                        {selectedMembers.map(userId => {
                          const user = allUsers.find(u => u.id === userId);
                          const role = memberRoles[userId] || 'medarbetare';
                          return (
                            <div key={userId} className="flex items-center justify-between text-sm">
                              <span className="text-blue-900">{user?.full_name}</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamRoleColor(role)}`}>
                                {TEAM_ROLE_LABELS[role]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Skapar...</span>
                    </div>
                  ) : (
                    'Skapa Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Redigera team</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTeam(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teamnamn *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivning
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialitet *
                  </label>
                  <select
                    required
                    value={formData.specialty}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value as TeamSpecialty }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(TEAM_SPECIALTY_LABELS).map(([specialty, label]) => (
                      <option key={specialty} value={specialty}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timtaxa (SEK)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teamledare
                </label>
                <select
                  value={formData.team_leader_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, team_leader_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Ingen teamledare</option>
                  {allUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTeam(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Sparar...</span>
                    </div>
                  ) : (
                    'Spara Ändringar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showDetailsModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="text-2xl mr-3">{getSpecialtyIcon(selectedTeam.specialty)}</span>
                  {selectedTeam.name}
                </h3>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamSpecialtyColor(selectedTeam.specialty)}`}>
                  {TEAM_SPECIALTY_LABELS[selectedTeam.specialty]}
                </span>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Information */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Teaminformation</h4>
                  <div className="space-y-3">
                    {selectedTeam.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Beskrivning:</span>
                        <p className="text-sm text-gray-900">{selectedTeam.description}</p>
                      </div>
                    )}
                    
                    {selectedTeam.hourly_rate && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Timtaxa:</span>
                        <p className="text-sm text-gray-900">{formatCurrency(selectedTeam.hourly_rate)}/tim</p>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Skapat:</span>
                      <p className="text-sm text-gray-900">{formatDate(selectedTeam.created_at)}</p>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-500">Aktiva jobb:</span>
                      <p className="text-sm text-gray-900">{selectedTeam.active_jobs_count || 0}</p>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-500">Slutförda jobb:</span>
                      <p className="text-sm text-gray-900">{selectedTeam.completed_jobs_count || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Teammedlemmar</h4>
                  {selectedTeam.members && selectedTeam.members.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTeam.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                              {member.user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.user?.full_name}
                                {member.user_id === selectedTeam.team_leader_id && (
                                  <Crown className="w-4 h-4 inline ml-2 text-yellow-600" />
                                )}
                              </p>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTeamRoleColor(member.role_in_team)}`}>
                                  {TEAM_ROLE_LABELS[member.role_in_team]}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Sedan {formatDate(member.joined_date)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {member.user?.phone_number && (
                              <a
                                href={`tel:${member.user.phone_number}`}
                                className="text-gray-400 hover:text-blue-600"
                                title="Ring"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                            {member.user?.email && (
                              <a
                                href={`mailto:${member.user.email}`}
                                className="text-gray-400 hover:text-blue-600"
                                title="E-post"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Inga medlemmar i detta team</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setTeamToDelete(null);
        }}
        onConfirm={handleDeleteTeam}
        title="Ta bort team"
        message={`Är du säker på att du vill ta bort teamet "${teamToDelete?.name}"? Alla medlemmar kommer att bli ej tilldelade.`}
        confirmText="Ta bort"
        cancelText="Avbryt"
        type="danger"
      />
    </div>
  );
}

export default TeamManagement;