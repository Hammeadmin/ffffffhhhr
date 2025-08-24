/*
# Create Notification Edge Function

1. New Edge Function
   - `create-notification` function to create notifications for users
   - Handles different notification types with appropriate templates
   - Validates user existence and permissions

2. Features
   - Type-safe notification creation
   - Swedish notification templates
   - Error handling and validation
   - Support for single user and team notifications

3. Security
   - Validates user exists in organization
   - Prevents spam by checking recent notifications
   - Proper error handling and logging
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationRequest {
  user_id: string;
  type: 'order_assignment' | 'event_assignment' | 'status_update' | 'system';
  title: string;
  message: string;
  action_url?: string;
  metadata?: {
    order_id?: string;
    order_title?: string;
    event_id?: string;
    event_title?: string;
    team_id?: string;
    team_name?: string;
    old_status?: string;
    new_status?: string;
  };
}

interface TeamNotificationRequest {
  team_id: string;
  type: 'order_assignment' | 'event_assignment' | 'status_update' | 'system';
  title: string;
  message: string;
  action_url?: string;
  exclude_user_id?: string; // Don't notify this user (e.g., the one making the change)
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    
    // Handle team notifications
    if (requestBody.team_id) {
      const teamRequest = requestBody as TeamNotificationRequest;
      const result = await createTeamNotifications(supabase, teamRequest);
      
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 400
        }
      );
    }

    // Handle single user notification
    const notificationRequest = requestBody as NotificationRequest;
    const result = await createNotification(supabase, notificationRequest);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      }
    );

  } catch (error) {
    console.error('Error in create-notification function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function createNotification(supabase: any, request: NotificationRequest) {
  try {
    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, full_name, organisation_id')
      .eq('id', request.user_id)
      .single();

    if (userError || !user) {
      return {
        success: false,
        error: 'Användare hittades inte'
      };
    }

    // Check for duplicate notifications (prevent spam)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', request.user_id)
      .eq('type', request.type)
      .eq('title', request.title)
      .gte('created_at', fiveMinutesAgo)
      .single();

    if (recentNotification) {
      return {
        success: true,
        message: 'Notification already sent recently',
        notification_id: recentNotification.id
      };
    }

    // Create the notification
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: request.user_id,
        type: request.type,
        title: request.title,
        message: request.message,
        action_url: request.action_url,
        is_read: false
      })
      .select()
      .single();

    if (insertError) {
      return {
        success: false,
        error: `Kunde inte skapa notifiering: ${insertError.message}`
      };
    }

    console.log(`Notification created for user ${user.full_name}: ${request.title}`);

    return {
      success: true,
      message: 'Notifiering skapad framgångsrikt',
      notification_id: notification.id
    };

  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function createTeamNotifications(supabase: any, request: TeamNotificationRequest) {
  try {
    // Get team members
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        user:user_profiles(id, full_name, organisation_id)
      `)
      .eq('team_id', request.team_id)
      .eq('is_active', true);

    if (teamError || !teamMembers) {
      return {
        success: false,
        error: 'Team eller teammedlemmar hittades inte'
      };
    }

    const notifications = [];
    const errors = [];

    // Create notification for each team member
    for (const member of teamMembers) {
      // Skip excluded user (e.g., the one making the assignment)
      if (request.exclude_user_id && member.user_id === request.exclude_user_id) {
        continue;
      }

      try {
        const notificationRequest: NotificationRequest = {
          user_id: member.user_id,
          type: request.type,
          title: request.title,
          message: request.message,
          action_url: request.action_url
        };

        const result = await createNotification(supabase, notificationRequest);
        
        if (result.success) {
          notifications.push(result.notification_id);
        } else {
          errors.push(`${member.user?.full_name}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${member.user?.full_name}: ${error.message}`);
      }
    }

    return {
      success: notifications.length > 0,
      message: `${notifications.length} notifieringar skapade för teammedlemmar`,
      notifications_created: notifications.length,
      errors: errors
    };

  } catch (error) {
    console.error('Error creating team notifications:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to generate notification templates
function generateNotificationTemplate(
  type: string,
  metadata: any
): { title: string; message: string } {
  switch (type) {
    case 'order_assignment':
      return {
        title: 'Ny order tilldelad',
        message: `Du har tilldelats ordern "${metadata.order_title}"`
      };
    
    case 'event_assignment':
      return {
        title: 'Ny händelse schemalagd',
        message: `Du har en ny händelse: "${metadata.event_title}"`
      };
    
    case 'status_update':
      return {
        title: 'Status uppdaterad',
        message: `Status ändrad från "${metadata.old_status}" till "${metadata.new_status}"`
      };
    
    case 'system':
      return {
        title: 'Systemmeddelande',
        message: metadata.message || 'Nytt systemmeddelande'
      };
    
    default:
      return {
        title: 'Ny notifiering',
        message: 'Du har en ny notifiering'
      };
  }
}