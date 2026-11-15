-- Zevio AI Platform - Database Schema for Supabase
-- Creates tables for Chat history, Homework questions, and Code Studio projects

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Conversation Sessions
CREATE TABLE IF NOT EXISTS zevio_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    model TEXT NOT NULL DEFAULT 'Qwen/Qwen2.5-7B-Instruct',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Chat Messages
CREATE TABLE IF NOT EXISTS zevio_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES zevio_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content TEXT NOT NULL,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Homework Sessions
CREATE TABLE IF NOT EXISTS zevio_homework_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    question TEXT NOT NULL,
    file_name TEXT,
    solution TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Code Studio Snippets
CREATE TABLE IF NOT EXISTS zevio_code_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Project',
    language TEXT NOT NULL DEFAULT 'javascript',
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE zevio_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE zevio_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE zevio_homework_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zevio_code_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own conversations"
    ON zevio_conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can access own messages"
    ON zevio_messages FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM zevio_conversations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access own homework"
    ON zevio_homework_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can access own code projects"
    ON zevio_code_projects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

