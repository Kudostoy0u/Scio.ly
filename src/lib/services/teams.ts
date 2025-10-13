import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface TeamGroup {
  id: string;
  school: string;
  division: 'B' | 'C';
  slug: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, any>;
}

export interface TeamUnit {
  id: string;
  group_id: string;
  team_id: string;
  name: string;
  description?: string;
  captain_code: string;
  user_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, any>;
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: 'captain' | 'co_captain' | 'member' | 'observer';
  joined_at: string;
  invited_by?: string;
  status: 'active' | 'inactive' | 'pending' | 'banned';
  permissions: Record<string, any>;
  user: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface TeamPost {
  id: string;
  team_id: string;
  author_id: string;
  title?: string;
  content: string;
  post_type: 'announcement' | 'assignment' | 'material' | 'event';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  scheduled_at?: string;
  expires_at?: string;
  author: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
  };
  attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
  }>;
}

export interface TeamEvent {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  description?: string;
  event_type: 'practice' | 'tournament' | 'meeting' | 'deadline' | 'other';
  start_time: string;
  end_time?: string;
  location?: string;
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_pattern?: Record<string, any>;
  reminder_minutes: number[];
  created_at: string;
  updated_at: string;
  attendees: Array<{
    user_id: string;
    status: 'pending' | 'attending' | 'declined' | 'tentative';
    responded_at?: string;
  }>;
}

export interface TeamAssignment {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  description?: string;
  assignment_type: 'task' | 'homework' | 'project' | 'study' | 'other';
  due_date?: string;
  points?: number;
  is_required: boolean;
  max_attempts?: number;
  created_at: string;
  updated_at: string;
  submissions: Array<{
    id: string;
    user_id: string;
    content: string;
    submitted_at: string;
    grade?: number;
    feedback?: string;
    status: 'draft' | 'submitted' | 'graded' | 'returned';
  }>;
}

export interface TeamMaterial {
  id: string;
  team_id: string;
  uploaded_by: string;
  title: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category?: string;
  tags: string[];
  is_public: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  uploader: {
    id: string;
    email: string;
    display_name: string;
  };
}

export interface TeamNotification {
  id: string;
  user_id: string;
  team_id: string;
  notification_type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export class TeamsService {
  private supabase: any;

  constructor() {
    this.supabase = null; // Will be initialized in methods
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  // Team Group Management
  async createTeamGroup(data: {
    school: string;
    division: 'B' | 'C';
    description?: string;
    created_by: string;
  }): Promise<TeamGroup> {
    const supabase = await this.getSupabase();
    const slug = `${data.school.toLowerCase().replace(/\s+/g, '-')}-${data.division.toLowerCase()}-${Date.now()}`;
    
    const { data: group, error } = await supabase
      .from('new_team_groups')
      .insert({
        ...data,
        slug,
        settings: {}
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create team group: ${error.message}`);
    return group;
  }

  async getTeamGroup(slug: string): Promise<TeamGroup | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('new_team_groups')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) return null;
    return data;
  }

  async getUserTeamGroups(userId: string): Promise<TeamGroup[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('new_team_groups')
      .select(`
        *,
        new_team_units!inner(
          *,
          new_team_memberships!inner(*)
        )
      `)
      .eq('new_team_units.new_team_memberships.user_id', userId);

    if (error) return [];
    return data;
  }

  // Team Unit Management
  async createTeamUnit(data: {
    group_id: string;
    team_id: string;
    name: string;
    description?: string;
    created_by: string;
  }): Promise<TeamUnit> {
    const supabase = await this.getSupabase();
    
    const { data: unit, error } = await supabase
      .from('new_team_units')
      .insert({
        ...data,
        captain_code: this.generateTeamCode(),
        user_code: this.generateTeamCode(),
        settings: {}
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create team unit: ${error.message}`);
    return unit;
  }

  async getTeamUnit(teamId: string): Promise<TeamUnit | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('new_team_units')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error) return null;
    return data;
  }

  async joinTeamByCode(code: string, userId: string): Promise<TeamUnit> {
    const supabase = await this.getSupabase();
    
    // Find team by code
    const { data: team, error: teamError } = await supabase
      .from('new_team_units')
      .select('*')
      .or(`captain_code.eq.${code},user_code.eq.${code}`)
      .single();

    if (teamError || !team) {
      throw new Error('Invalid team code');
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('new_team_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', team.id)
      .single();

    if (existingMembership) {
      throw new Error('You are already a member of this team');
    }

    // Determine role based on code type
    const isCaptain = team.captain_code === code;
    const role = isCaptain ? 'captain' : 'member';

    // Add user to team
    const { error: membershipError } = await supabase
      .from('new_team_memberships')
      .insert({
        user_id: userId,
        team_id: team.id,
        role,
        status: 'active'
      });

    if (membershipError) {
      throw new Error(`Failed to join team: ${membershipError.message}`);
    }

    return team;
  }

  // Team Members Management
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('new_team_memberships')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching team members:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }
      
      // Format the data to match TeamMember interface
      return data.map((membership: any) => ({
        id: membership.id,
        user_id: membership.user_id,
        team_id: membership.team_id,
        role: membership.role as 'captain' | 'co_captain' | 'member' | 'observer',
        joined_at: membership.joined_at,
        invited_by: membership.invited_by,
        status: membership.status as 'active' | 'inactive' | 'pending' | 'banned',
        permissions: membership.permissions || {},
        user: {
          id: membership.user_id,
          email: `user-${membership.user_id.substring(0, 8)}@example.com`,
          display_name: `User ${membership.user_id.substring(0, 8)}`,
          avatar_url: undefined
        }
      }));
    } catch (error) {
      console.error('Error in getTeamMembers:', error);
      return [];
    }
  }

  async updateMemberRole(teamId: string, userId: string, role: string, updatedBy: string): Promise<void> {
    const supabase = await this.getSupabase();
    
    // Check if updater has permission
    const { data: updaterMembership } = await supabase
      .from('new_team_memberships')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', updatedBy)
      .single();

    if (!updaterMembership || !['captain', 'co_captain'].includes(updaterMembership.role)) {
      throw new Error('Insufficient permissions');
    }

    const { error } = await supabase
      .from('new_team_memberships')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }
  }

  async removeMember(teamId: string, userId: string, removedBy: string): Promise<void> {
    const supabase = await this.getSupabase();
    
    // Check if remover has permission
    const { data: removerMembership } = await supabase
      .from('new_team_memberships')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', removedBy)
      .single();

    if (!removerMembership || !['captain', 'co_captain'].includes(removerMembership.role)) {
      throw new Error('Insufficient permissions');
    }

    const { error } = await supabase
      .from('new_team_memberships')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  }

  // Team Posts Management
  async createTeamPost(data: {
    team_id: string;
    author_id: string;
    title?: string;
    content: string;
    post_type?: 'announcement' | 'assignment' | 'material' | 'event';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    is_pinned?: boolean;
    is_public?: boolean;
    scheduled_at?: string;
    expires_at?: string;
  }): Promise<TeamPost> {
    const supabase = await this.getSupabase();
    
    const { data: post, error } = await supabase
      .from('new_team_posts')
      .insert({
        ...data,
        post_type: data.post_type || 'announcement',
        priority: data.priority || 'normal',
        is_pinned: data.is_pinned || false,
        is_public: data.is_public !== false
      })
      .select(`
        *,
        author:auth.users!author_id(id, email, raw_user_meta_data),
        attachments:new_team_post_attachments(*)
      `)
      .single();

    if (error) throw new Error(`Failed to create post: ${error.message}`);
    return this.formatTeamPost(post);
  }

  async getTeamPosts(teamId: string, limit = 20, offset = 0): Promise<TeamPost[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('new_team_posts')
      .select(`
        *,
        author:auth.users!author_id(id, email, raw_user_meta_data),
        attachments:new_team_post_attachments(*)
      `)
      .eq('team_id', teamId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return [];
    return data.map(this.formatTeamPost);
  }

  // Team Events Management
  async createTeamEvent(data: {
    team_id: string;
    created_by: string;
    title: string;
    description?: string;
    event_type?: 'practice' | 'tournament' | 'meeting' | 'deadline' | 'other';
    start_time: string;
    end_time?: string;
    location?: string;
    is_all_day?: boolean;
    is_recurring?: boolean;
    recurrence_pattern?: Record<string, any>;
    reminder_minutes?: number[];
  }): Promise<TeamEvent> {
    const supabase = await this.getSupabase();
    
    const { data: event, error } = await supabase
      .from('new_team_events')
      .insert({
        ...data,
        event_type: data.event_type || 'practice',
        is_all_day: data.is_all_day || false,
        is_recurring: data.is_recurring || false,
        reminder_minutes: data.reminder_minutes || [15, 60, 1440]
      })
      .select(`
        *,
        attendees:new_team_event_attendees(*)
      `)
      .single();

    if (error) throw new Error(`Failed to create event: ${error.message}`);
    return this.formatTeamEvent(event);
  }

  async getTeamEvents(teamId: string, startDate?: string, endDate?: string): Promise<TeamEvent[]> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from('new_team_events')
      .select(`
        *,
        attendees:new_team_event_attendees(*)
      `)
      .eq('team_id', teamId)
      .order('start_time', { ascending: true });

    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    const { data, error } = await query;
    if (error) return [];
    return data.map(this.formatTeamEvent);
  }

  // Team Assignments Management
  async createTeamAssignment(data: {
    team_id: string;
    created_by: string;
    title: string;
    description?: string;
    assignment_type?: 'task' | 'homework' | 'project' | 'study' | 'other';
    due_date?: string;
    points?: number;
    is_required?: boolean;
    max_attempts?: number;
  }): Promise<TeamAssignment> {
    const supabase = await this.getSupabase();
    
    const { data: assignment, error } = await supabase
      .from('new_team_assignments')
      .insert({
        ...data,
        assignment_type: data.assignment_type || 'task',
        is_required: data.is_required !== false
      })
      .select(`
        *,
        submissions:new_team_assignment_submissions(*)
      `)
      .single();

    if (error) throw new Error(`Failed to create assignment: ${error.message}`);
    return this.formatTeamAssignment(assignment);
  }

  async getTeamAssignments(teamId: string): Promise<TeamAssignment[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('new_team_assignments')
      .select(`
        *,
        submissions:new_team_assignment_submissions(*)
      `)
      .eq('team_id', teamId)
      .order('due_date', { ascending: true });

    if (error) return [];
    return data.map(this.formatTeamAssignment);
  }

  // Team Materials Management
  async uploadTeamMaterial(data: {
    team_id: string;
    uploaded_by: string;
    title: string;
    description?: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    category?: string;
    tags?: string[];
    is_public?: boolean;
  }): Promise<TeamMaterial> {
    const supabase = await this.getSupabase();
    
    const { data: material, error } = await supabase
      .from('new_team_materials')
      .insert({
        ...data,
        tags: data.tags || [],
        is_public: data.is_public !== false
      })
      .select(`
        *,
        uploader:auth.users!uploaded_by(id, email, raw_user_meta_data)
      `)
      .single();

    if (error) throw new Error(`Failed to upload material: ${error.message}`);
    return this.formatTeamMaterial(material);
  }

  async getTeamMaterials(teamId: string, category?: string): Promise<TeamMaterial[]> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from('new_team_materials')
      .select(`
        *,
        uploader:auth.users!uploaded_by(id, email, raw_user_meta_data)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) return [];
    return data.map(this.formatTeamMaterial);
  }

  // Team Notifications
  async getTeamNotifications(userId: string, teamId?: string, unreadOnly = false): Promise<TeamNotification[]> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from('new_team_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) return [];
    return data;
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from('new_team_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  // Utility methods
  private generateTeamCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private formatTeamPost(post: any): TeamPost {
    return {
      ...post,
      author: {
        id: post.author.id,
        email: post.author.email,
        display_name: post.author.raw_user_meta_data?.full_name || post.author.email,
        avatar_url: post.author.raw_user_meta_data?.avatar_url
      }
    };
  }

  private formatTeamEvent(event: any): TeamEvent {
    return {
      ...event,
      attendees: event.attendees || []
    };
  }

  private formatTeamAssignment(assignment: any): TeamAssignment {
    return {
      ...assignment,
      submissions: assignment.submissions || []
    };
  }

  private formatTeamMaterial(material: any): TeamMaterial {
    return {
      ...material,
      uploader: {
        id: material.uploader.id,
        email: material.uploader.email,
        display_name: material.uploader.raw_user_meta_data?.full_name || material.uploader.email
      }
    };
  }
}

export const teamsService = new TeamsService();
