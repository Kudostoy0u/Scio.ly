-- RLS policies for users table (display_name)
CREATE POLICY "Users can view display names" ON users
    FOR SELECT USING (true);
    
CREATE POLICY "Users can update their own display name" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);