# Prompt Forge 4.1.0

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## 🔧 Setup

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/2800mhz/story-shot-studio.git
   cd story-shot-studio
   npm install
   ```

2. **Create a Supabase project**
   - Go to https://supabase.com
   - Click "New Project"
   - Note your project URL and anon key

3. **Run the database migration**

   **Option A: Using Supabase Dashboard (Recommended)**
   - Go to your Supabase project dashboard
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"
   - Copy the entire content from `supabase/migrations/001_initial_schema.sql`
   - Paste into the SQL editor
   - Click "Run" button
   - Wait for "Success" message

   **Option B: Using Supabase CLI**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link your project (get project-ref from dashboard URL)
   supabase link --project-ref your-project-ref

   # Push migration
   supabase db push
   ```

4. **Enable Google OAuth**
   - Go to Authentication > Providers in Supabase Dashboard
   - Enable "Google" provider
   - Add your Google OAuth credentials (Client ID & Secret)
   - Add authorized redirect URL: `http://localhost:5173/auth/callback`

5. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Configure Gemini API (In-App)**
   - Open the app at http://localhost:5173
   - Sign in with Google
   - Go to Settings (⚙️ icon)
   - Add your Gemini API key(s)
   - Get API keys from: https://aistudio.google.com/app/apikey

### Database Schema

The app uses the following tables:
- `projects` - User projects
- `episodes` - Project episodes
- `global_characters` - Reusable character definitions
- `global_locations` - Reusable location definitions
- `scenes` - Individual scenes
- `prompts` - Generated prompts

See `supabase/migrations/001_initial_schema.sql` for the complete schema.

### Running Migrations

If you have an existing Supabase project:

1. Go to Supabase Dashboard → SQL Editor
2. Run migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_fix_character_location_ids.sql`

Or use Supabase CLI:
```bash
supabase db push
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
