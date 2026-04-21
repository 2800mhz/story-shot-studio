ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'documentary'
CHECK (project_type IN ('documentary', 'commercial', 'narrative'));
