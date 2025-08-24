import { supabase } from './supabase';
import type { Team, TeamMember, UserProfile, TeamSpecialty, TeamRole } from '../types/database';

export interface TeamWithRelations extends Team {
  team_leader?: UserProfile;
  members?: (TeamMember & { user?: UserProfile })[];
  member_count?: number;
  active_jobs_count?: number;
  completed_jobs_count?: number;
}

export interface TeamMemberWithRelations extends TeamMember {
  user?: UserProfile;
  team?: Team;
}

export interface TeamFilters {
  specialty?: string;
  isActive?: boolean;
  search?: string;
}

export interface TeamStats {
  totalTeams: number;
  activeTeams: number;
  totalMembers: number;
  averageTeamSize: number;
  specialtyBreakdown: Record<string, number>;
}

// Teams operations
export const getTeams = async (
  organisationId: string,
  filters: TeamFilters = {}
): Promise<{ data: TeamWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('teams')
      .select(`
        *,
        team_leader:user_profiles!teams_team_leader_id_fkey(id, full_name, email, phone_number),
        members:team_members(
          *,
          user:user_profiles(id, full_name, email, phone_number, role)
        )
      `)
      .eq('organisation_id', organisationId);

    // Apply filters
    if (filters.specialty && filters.specialty !== 'all') {
      query = query.eq('specialty', filters.specialty);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Calculate additional stats for each team
    const teamsWithStats = await Promise.all((data || []).map(async (team) => {
      const activeMembers = team.members?.filter(m => m.is_active) || [];
      
      // Get job counts for this team
      const { data: jobCounts } = await supabase
        .from('orders')
        .select('status')
        .eq('assigned_to_team_id', team.id);

      const activeJobsCount = jobCounts?.filter(j => 
        ['öppen_order', 'bokad_bekräftad'].includes(j.status)
      ).length || 0;

      const completedJobsCount = jobCounts?.filter(j => 
        ['redo_fakturera'].includes(j.status)
      ).length || 0;

      return {
        ...team,
        member_count: activeMembers.length,
        active_jobs_count: activeJobsCount,
        completed_jobs_count: completedJobsCount
      };
    }));

    return { data: teamsWithStats, error: null };
  } catch (err) {
    console.error('Error fetching teams:', err);
    return { data: null, error: err as Error };
  }
};

export const getTeam = async (
  id: string
): Promise<{ data: TeamWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_leader:user_profiles!teams_team_leader_id_fkey(id, full_name, email, phone_number),
        members:team_members(
          *,
          user:user_profiles(id, full_name, email, phone_number, role)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching team:', err);
    return { data: null, error: err as Error };
  }
};

export const createTeam = async (
  team: Omit<Team, 'id' | 'created_at'>,
  memberIds: string[] = [],
  memberRoles: Record<string, TeamRole> = {}
): Promise<{ data: TeamWithRelations | null; error: Error | null }> => {
  try {
    // Create team
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert([team])
      .select(`
        *,
        team_leader:user_profiles!teams_team_leader_id_fkey(id, full_name, email, phone_number)
      `)
      .single();

    if (teamError) {
      return { data: null, error: new Error(teamError.message) };
    }

    // Add team members
    if (memberIds.length > 0) {
      const teamMembers = memberIds.map(userId => ({
        organisation_id: team.organisation_id,
        team_id: teamData.id,
        user_id: userId,
        role_in_team: memberRoles[userId] || 'medarbetare' as TeamRole,
        joined_date: new Date().toISOString().split('T')[0]
      }));

      const { error: membersError } = await supabase
        .from('team_members')
        .insert(teamMembers);

      if (membersError) {
        // Rollback team creation if member addition fails
        await supabase.from('teams').delete().eq('id', teamData.id);
        return { data: null, error: new Error(membersError.message) };
      }
    }

    // Fetch complete team data
    const result = await getTeam(teamData.id);
    return result;
  } catch (err) {
    console.error('Error creating team:', err);
    return { data: null, error: err as Error };
  }
};

export const updateTeam = async (
  id: string,
  updates: Partial<Team>
): Promise<{ data: TeamWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        team_leader:user_profiles!teams_team_leader_id_fkey(id, full_name, email, phone_number),
        members:team_members(
          *,
          user:user_profiles(id, full_name, email, phone_number, role)
        )
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating team:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteTeam = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting team:', err);
    return { error: err as Error };
  }
};

// Team members operations
export const getTeamMembers = async (
  teamId: string
): Promise<{ data: TeamMemberWithRelations[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:user_profiles(id, full_name, email, phone_number, role),
        team:teams(id, name, specialty)
      `)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('role_in_team', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching team members:', err);
    return { data: null, error: err as Error };
  }
};

export const addTeamMember = async (
  teamMember: Omit<TeamMember, 'id' | 'created_at'>
): Promise<{ data: TeamMemberWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .insert([teamMember])
      .select(`
        *,
        user:user_profiles(id, full_name, email, phone_number, role),
        team:teams(id, name, specialty)
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error adding team member:', err);
    return { data: null, error: err as Error };
  }
};

export const updateTeamMember = async (
  id: string,
  updates: Partial<TeamMember>
): Promise<{ data: TeamMemberWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:user_profiles(id, full_name, email, phone_number, role),
        team:teams(id, name, specialty)
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating team member:', err);
    return { data: null, error: err as Error };
  }
};

export const removeTeamMember = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error removing team member:', err);
    return { error: err as Error };
  }
};

// Team statistics and analytics
export const getTeamStats = async (
  organisationId: string
): Promise<{ data: TeamStats | null; error: Error | null }> => {
  try {
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(id, is_active)
      `)
      .eq('organisation_id', organisationId);

    if (teamsError) {
      return { data: null, error: new Error(teamsError.message) };
    }

    const allTeams = teams || [];
    const activeTeams = allTeams.filter(team => team.is_active);
    const totalMembers = allTeams.reduce((sum, team) => 
      sum + (team.members?.filter((m: any) => m.is_active).length || 0), 0
    );
    const averageTeamSize = activeTeams.length > 0 ? totalMembers / activeTeams.length : 0;

    const specialtyBreakdown = allTeams.reduce((acc, team) => {
      acc[team.specialty] = (acc[team.specialty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      data: {
        totalTeams: allTeams.length,
        activeTeams: activeTeams.length,
        totalMembers,
        averageTeamSize: Math.round(averageTeamSize * 10) / 10,
        specialtyBreakdown
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching team stats:', err);
    return { data: null, error: err as Error };
  }
};

// Team assignment utilities
export const getAvailableTeamsForJob = async (
  organisationId: string,
  jobType: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: TeamWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('teams')
      .select(`
        *,
        team_leader:user_profiles!teams_team_leader_id_fkey(id, full_name, email),
        members:team_members(
          *,
          user:user_profiles(id, full_name, email)
        )
      `)
      .eq('organisation_id', organisationId)
      .eq('is_active', true);

    // Filter by specialty if job type matches
    if (jobType && jobType !== 'allmänt') {
      query = query.or(`specialty.eq.${jobType},specialty.eq.allmänt`);
    }

    const { data, error } = await query.order('name');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // TODO: Add availability checking based on calendar events
    // For now, return all matching teams
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching available teams:', err);
    return { data: null, error: err as Error };
  }
};

export const getTeamWorkload = async (
  teamId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: {
    activeJobs: number;
    completedJobs: number;
    totalHours: number;
    utilizationRate: number;
  } | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('orders')
      .select('status, estimated_hours')
      .eq('assigned_to_team_id', teamId);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const orders = data || [];
    const activeJobs = orders.filter(order => 
      ['öppen_order', 'bokad_bekräftad'].includes(order.status)
    ).length;

    const completedJobs = orders.filter(order => 
      order.status === 'redo_fakturera'
    ).length;

    const totalHours = orders.reduce((sum, order) => 
      sum + (order.estimated_hours || 0), 0
    );

    // Calculate utilization rate (simplified - assumes 40 hours per week per member)
    const { data: teamData } = await supabase
      .from('teams')
      .select(`
        members:team_members(id, is_active)
      `)
      .eq('id', teamId)
      .single();

    const activeMemberCount = teamData?.members?.filter((m: any) => m.is_active).length || 1;
    const availableHours = activeMemberCount * 40; // 40 hours per week per member
    const utilizationRate = availableHours > 0 ? (totalHours / availableHours) * 100 : 0;

    return {
      data: {
        activeJobs,
        completedJobs,
        totalHours,
        utilizationRate: Math.round(utilizationRate)
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching team workload:', err);
    return { data: null, error: err as Error };
  }
};

// Utility functions
export const getUserTeams = async (
  userId: string
): Promise<{ data: TeamWithRelations[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        team:teams(
          *,
          team_leader:user_profiles!teams_team_leader_id_fkey(id, full_name, email)
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const teams = data?.map((tm: any) => tm.team).filter(Boolean) || [];
    return { data: teams, error: null };
  } catch (err) {
    console.error('Error fetching user teams:', err);
    return { data: null, error: err as Error };
  }
};

export const getUnassignedUsers = async (
  organisationId: string
): Promise<{ data: UserProfile[] | null; error: any | null }> => {
  try {
    // Call the function we created in the database
    const { data, error } = await supabase.rpc('get_unassigned_users', {
      org_id: organisationId,
    });

    if (error) {
      console.error('Error fetching unassigned users:', error);
      return { data: null, error };
    }

    return { data, error: null };

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return { data: null, error };
  }
};

export const checkTeamAssignmentConflict = async (
  teamId: string,
  startDate: string,
  endDate: string
): Promise<{ hasConflict: boolean; conflictingJobs: any[] }> => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        related_order:orders(title, customer:customers(name))
      `)
      .eq('assigned_to_team_id', teamId)
      .gte('start_time', startDate)
      .lte('end_time', endDate);

    if (error) {
      console.error('Error checking team conflicts:', error);
      return { hasConflict: false, conflictingJobs: [] };
    }

    return {
      hasConflict: (data || []).length > 0,
      conflictingJobs: data || []
    };
  } catch (err) {
    console.error('Error checking team assignment conflict:', err);
    return { hasConflict: false, conflictingJobs: [] };
  }
};

export const suggestTeamForJob = async (
  organisationId: string,
  jobType: string,
  estimatedHours?: number,
  startDate?: string
): Promise<{ data: TeamWithRelations[] | null; error: Error | null }> => {
  try {
    // Get teams that match the job type
    const teamsResult = await getAvailableTeamsForJob(organisationId, jobType, startDate);
    
    if (teamsResult.error) {
      return teamsResult;
    }

    const teams = teamsResult.data || [];

    // Score teams based on various factors
    const scoredTeams = await Promise.all(teams.map(async (team) => {
      let score = 0;

      // Specialty match bonus
      if (team.specialty === jobType) {
        score += 50;
      } else if (team.specialty === 'allmänt') {
        score += 20;
      }

      // Team size consideration
      const memberCount = team.members?.filter(m => m.is_active).length || 0;
      if (memberCount >= 2 && memberCount <= 4) {
        score += 20; // Optimal team size
      }

      // Workload consideration
      const workloadResult = await getTeamWorkload(team.id);
      if (workloadResult.data) {
        const utilization = workloadResult.data.utilizationRate;
        if (utilization < 70) {
          score += 30; // Available capacity
        } else if (utilization < 90) {
          score += 10; // Some capacity
        }
      }

      return { ...team, suggestionScore: score };
    }));

    // Sort by score (highest first)
    scoredTeams.sort((a, b) => (b as any).suggestionScore - (a as any).suggestionScore);

    return { data: scoredTeams, error: null };
  } catch (err) {
    console.error('Error suggesting team for job:', err);
    return { data: null, error: err as Error };
  }
};