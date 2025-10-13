-- New Teams Feature - CockroachDB Compatible SQL Schema
-- This creates a robust teams system with all necessary tables and relationships

-- 1. New Teams Groups (replaces team_groups)
CREATE TABLE new_team_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school VARCHAR(255) NOT NULL,
    division CHAR(1) NOT NULL CHECK (division IN ('B', 'C')),
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb
);

-- 2. New Team Units (replaces team_units)
CREATE TABLE new_team_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES new_team_groups(id) ON DELETE CASCADE,
    team_id VARCHAR(50) NOT NULL, -- A, B, C, etc.
    name VARCHAR(255) NOT NULL,
    description TEXT,
    captain_code VARCHAR(20) UNIQUE NOT NULL,
    user_code VARCHAR(20) UNIQUE NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    UNIQUE(group_id, team_id)
);

-- 3. New Team Memberships (replaces team_memberships)
CREATE TABLE new_team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('captain', 'co_captain', 'member', 'observer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'banned')),
    permissions JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, team_id)
);

-- 4. Team Invitations
CREATE TABLE new_team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('captain', 'co_captain', 'member', 'observer')),
    invitation_code VARCHAR(50) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    message TEXT
);

-- 5. Team Posts/Announcements
CREATE TABLE new_team_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    post_type VARCHAR(20) DEFAULT 'announcement' CHECK (post_type IN ('announcement', 'assignment', 'material', 'event')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 6. Team Post Attachments
CREATE TABLE new_team_post_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES new_team_posts(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Team Events/Calendar
CREATE TABLE new_team_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(20) DEFAULT 'practice' CHECK (event_type IN ('practice', 'tournament', 'meeting', 'deadline', 'other')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    is_all_day BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB,
    reminder_minutes INTEGER[] DEFAULT ARRAY[15, 60, 1440], -- 15min, 1hr, 1day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Team Event Attendees
CREATE TABLE new_team_event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES new_team_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'attending', 'declined', 'tentative')),
    responded_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(event_id, user_id)
);

-- 9. Team Assignments/Tasks
CREATE TABLE new_team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignment_type VARCHAR(20) DEFAULT 'task' CHECK (assignment_type IN ('task', 'homework', 'project', 'study', 'other')),
    due_date TIMESTAMP WITH TIME ZONE,
    points INTEGER,
    is_required BOOLEAN DEFAULT TRUE,
    max_attempts INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Team Assignment Submissions
CREATE TABLE new_team_assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES new_team_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    grade INTEGER,
    feedback TEXT,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
    attempt_number INTEGER DEFAULT 1,
    UNIQUE(assignment_id, user_id, attempt_number)
);

-- 11. Team Materials/Resources
CREATE TABLE new_team_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    category VARCHAR(50),
    tags TEXT[],
    is_public BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Team Notifications
CREATE TABLE new_team_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- 13. Team Analytics
CREATE TABLE new_team_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_data JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE
);

-- 14. Team Chat/Messages
CREATE TABLE new_team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    reply_to UUID REFERENCES new_team_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Team Polls/Voting
CREATE TABLE new_team_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    allow_multiple BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 16. Team Poll Votes
CREATE TABLE new_team_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES new_team_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    selected_options JSONB NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(poll_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_new_team_groups_slug ON new_team_groups(slug);
CREATE INDEX idx_new_team_groups_school_division ON new_team_groups(school, division);
CREATE INDEX idx_new_team_units_group_id ON new_team_units(group_id);
CREATE INDEX idx_new_team_units_codes ON new_team_units(captain_code, user_code);
CREATE INDEX idx_new_team_memberships_user_id ON new_team_memberships(user_id);
CREATE INDEX idx_new_team_memberships_team_id ON new_team_memberships(team_id);
CREATE INDEX idx_new_team_memberships_role ON new_team_memberships(role);
CREATE INDEX idx_new_team_invitations_code ON new_team_invitations(invitation_code);
CREATE INDEX idx_new_team_invitations_email ON new_team_invitations(email);
CREATE INDEX idx_new_team_posts_team_id ON new_team_posts(team_id);
CREATE INDEX idx_new_team_posts_created_at ON new_team_posts(created_at DESC);
CREATE INDEX idx_new_team_events_team_id ON new_team_events(team_id);
CREATE INDEX idx_new_team_events_start_time ON new_team_events(start_time);
CREATE INDEX idx_new_team_assignments_team_id ON new_team_assignments(team_id);
CREATE INDEX idx_new_team_assignments_due_date ON new_team_assignments(due_date);
CREATE INDEX idx_new_team_materials_team_id ON new_team_materials(team_id);
CREATE INDEX idx_new_team_materials_category ON new_team_materials(category);
CREATE INDEX idx_new_team_notifications_user_id ON new_team_notifications(user_id);
CREATE INDEX idx_new_team_notifications_is_read ON new_team_notifications(is_read);
CREATE INDEX idx_new_team_messages_team_id ON new_team_messages(team_id);
CREATE INDEX idx_new_team_messages_created_at ON new_team_messages(created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_new_team_groups_updated_at BEFORE UPDATE ON new_team_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_new_team_units_updated_at BEFORE UPDATE ON new_team_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_new_team_posts_updated_at BEFORE UPDATE ON new_team_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_new_team_events_updated_at BEFORE UPDATE ON new_team_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_new_team_assignments_updated_at BEFORE UPDATE ON new_team_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_new_team_materials_updated_at BEFORE UPDATE ON new_team_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create functions for common operations
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS TEXT AS $$
BEGIN
    RETURN upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
BEGIN
    RETURN upper(substring(md5(random()::text) from 1 for 12));
END;
$$ LANGUAGE plpgsql;

-- Create view for team member details
CREATE VIEW new_team_member_details AS
SELECT 
    tm.id as membership_id,
    tm.team_id,
    tm.role,
    tm.joined_at,
    tm.status,
    tm.user_id,
    'User ' || substring(tm.user_id::text from 1 for 8) as display_name,
    NULL as avatar_url,
    NULL as bio
FROM new_team_memberships tm;

-- Create view for team statistics
CREATE VIEW new_team_stats AS
SELECT 
    tu.id as team_id,
    tu.name as team_name,
    tg.school,
    tg.division,
    COUNT(tm.id) as member_count,
    COUNT(CASE WHEN tm.role = 'captain' THEN 1 END) as captain_count,
    COUNT(CASE WHEN tm.role = 'co_captain' THEN 1 END) as co_captain_count,
    COUNT(CASE WHEN tm.role = 'member' THEN 1 END) as member_role_count,
    COUNT(tp.id) as post_count,
    COUNT(te.id) as event_count,
    COUNT(ta.id) as assignment_count,
    COUNT(tm2.id) as material_count
FROM new_team_units tu
JOIN new_team_groups tg ON tu.group_id = tg.id
LEFT JOIN new_team_memberships tm ON tu.id = tm.team_id
LEFT JOIN new_team_posts tp ON tu.id = tp.team_id
LEFT JOIN new_team_events te ON tu.id = te.team_id
LEFT JOIN new_team_assignments ta ON tu.id = ta.team_id
LEFT JOIN new_team_materials tm2 ON tu.id = tm2.team_id
GROUP BY tu.id, tu.name, tg.school, tg.division;

-- Insert sample data (optional)
INSERT INTO new_team_groups (school, division, slug, description, created_by) VALUES
('Sample High School', 'C', 'sample-high-school-c', 'Sample Science Olympiad team', gen_random_uuid());

INSERT INTO new_team_units (group_id, team_id, name, description, captain_code, user_code, created_by) VALUES
((SELECT id FROM new_team_groups WHERE slug = 'sample-high-school-c'), 'A', 'Varsity Team', 'Main competition team', generate_team_code(), generate_team_code(), gen_random_uuid());

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO public;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO public;
