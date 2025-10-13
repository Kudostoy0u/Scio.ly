-- Enhanced v2 assignments with roster integration
-- This migration adds question-based assignments to the v2 system

-- 1. Enhanced assignment questions table
CREATE TABLE new_team_assignment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES new_team_assignments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'free_response', 'codebusters')),
    options JSONB, -- For multiple choice questions
    correct_answer TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Assignment roster assignments (who gets the assignment)
CREATE TABLE new_team_assignment_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES new_team_assignments(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if not linked
    subteam_id UUID REFERENCES new_team_units(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, student_name, subteam_id)
);

-- 3. Enhanced assignment submissions with question-level responses
CREATE TABLE new_team_assignment_question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES new_team_assignment_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES new_team_assignment_questions(id) ON DELETE CASCADE,
    response_text TEXT,
    response_data JSONB, -- For complex responses
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES auth.users(id),
    UNIQUE(submission_id, question_id)
);

-- 4. Assignment templates for common question sets
CREATE TABLE new_team_assignment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES new_team_units(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_name VARCHAR(255) NOT NULL,
    question_count INTEGER NOT NULL,
    time_limit_minutes INTEGER,
    question_types JSONB, -- Array of question types
    subtopics TEXT[], -- Array of subtopics
    division CHAR(1) CHECK (division IN ('B', 'C')),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Assignment analytics and statistics
CREATE TABLE new_team_assignment_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES new_team_assignments(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    earned_points INTEGER NOT NULL,
    completion_time_seconds INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assignment_questions_assignment_id ON new_team_assignment_questions(assignment_id);
CREATE INDEX idx_assignment_questions_order ON new_team_assignment_questions(assignment_id, order_index);
CREATE INDEX idx_assignment_roster_assignment_id ON new_team_assignment_roster(assignment_id);
CREATE INDEX idx_assignment_roster_student ON new_team_assignment_roster(student_name, subteam_id);
CREATE INDEX idx_assignment_roster_user ON new_team_assignment_roster(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_question_responses_submission ON new_team_assignment_question_responses(submission_id);
CREATE INDEX idx_question_responses_question ON new_team_assignment_question_responses(question_id);
CREATE INDEX idx_assignment_templates_team ON new_team_assignment_templates(team_id);
CREATE INDEX idx_assignment_templates_event ON new_team_assignment_templates(event_name);
CREATE INDEX idx_assignment_analytics_assignment ON new_team_assignment_analytics(assignment_id);
CREATE INDEX idx_assignment_analytics_student ON new_team_assignment_analytics(student_name);

-- RLS policies for new tables
ALTER TABLE new_team_assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_team_assignment_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_team_assignment_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_team_assignment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_team_assignment_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment questions
CREATE POLICY "Users can view assignment questions for their teams" ON new_team_assignment_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM new_team_assignments a
            JOIN new_team_memberships m ON a.team_id = m.team_id
            WHERE a.id = assignment_id AND m.user_id = auth.uid() AND m.status = 'active'
        )
    );

-- RLS policies for assignment roster
CREATE POLICY "Users can view assignment roster for their teams" ON new_team_assignment_roster
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM new_team_assignments a
            JOIN new_team_memberships m ON a.team_id = m.team_id
            WHERE a.id = assignment_id AND m.user_id = auth.uid() AND m.status = 'active'
        )
    );

CREATE POLICY "Captains can manage assignment roster" ON new_team_assignment_roster
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM new_team_assignments a
            JOIN new_team_memberships m ON a.team_id = m.team_id
            WHERE a.id = assignment_id AND m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('captain', 'co_captain')
        )
    );

-- RLS policies for question responses
CREATE POLICY "Users can view their own question responses" ON new_team_assignment_question_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM new_team_assignment_submissions s
            WHERE s.id = submission_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own question responses" ON new_team_assignment_question_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM new_team_assignment_submissions s
            WHERE s.id = submission_id AND s.user_id = auth.uid()
        )
    );

-- RLS policies for assignment templates
CREATE POLICY "Users can view templates for their teams" ON new_team_assignment_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM new_team_memberships m
            WHERE m.team_id = team_id AND m.user_id = auth.uid() AND m.status = 'active'
        ) OR is_public = TRUE
    );

CREATE POLICY "Captains can manage templates for their teams" ON new_team_assignment_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM new_team_memberships m
            WHERE m.team_id = team_id AND m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('captain', 'co_captain')
        )
    );

-- RLS policies for assignment analytics
CREATE POLICY "Users can view analytics for their teams" ON new_team_assignment_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM new_team_assignments a
            JOIN new_team_memberships m ON a.team_id = m.team_id
            WHERE a.id = assignment_id AND m.user_id = auth.uid() AND m.status = 'active'
        )
    );
