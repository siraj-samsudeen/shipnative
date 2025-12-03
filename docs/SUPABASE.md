# Supabase Guide

This guide explains how to use Supabase for authentication and database operations in your app.

## Quick Start

### Development Mode (No API Keys)

The app automatically uses a mock Supabase client when credentials are missing:

```bash
# Just run the app - mock Supabase will be used automatically
yarn app:ios
# or
yarn app:android
# or
yarn web:dev
```

You'll see console logs:
```
🔐 [MockSupabase] Initialized mock Supabase client
⚠️  Supabase credentials not found - using mock authentication
```

### Production Setup

#### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Wait for database to be provisioned

#### 2. Get API Credentials

1. Go to Project Settings → API
2. Copy your Project URL
3. Copy your **publishable** key (`sb_publishable_...`) from the API settings

#### 3. Add to Environment

Add to `.env`:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here
```

#### 4. Set Up Database Schema

ShipNative includes a production-ready database schema. To set it up:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the `supabase-schema.sql` file from the root of this repository
4. Copy and paste the entire file into the SQL Editor
5. Click **Run** to execute

The schema includes:
- **profiles** - User profile information (first name, last name, avatar, etc.)
- **user_preferences** - App preferences (dark mode, notifications, language, etc.)
- **push_tokens** - Expo push notification tokens for multiple devices
- Automatic triggers for profile creation on signup
- Row Level Security (RLS) policies
- Helper functions for common operations

See [BACKEND.md](./BACKEND.md) for detailed database documentation.

## Usage

### Using the Hook (Recommended)

```typescript
import { useAuth } from './hooks/useAuth'

function LoginScreen() {
  const { user, signIn, signOut, loading, isAuthenticated } = useAuth()
  
  const handleLogin = async () => {
    const { error } = await signIn({
      email: 'user@example.com',
      password: 'password123',
    })
    
    if (error) {
      alert(error.message)
    }
  }
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  if (isAuthenticated) {
    return (
      <View>
        <Text>Welcome {user?.email}</Text>
        <Button onPress={signOut} title="Sign Out" />
      </View>
    )
  }
  
  return <Button onPress={handleLogin} title="Sign In" />
}
```

### Direct Client Access

```typescript
import { supabase } from './services/supabase'

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})

// Sign out
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Get current session
const { data: { session } } = await supabase.auth.getSession()
```

## Authentication

### Sign Up

```typescript
const { signUp } = useAuth()

const handleSignUp = async () => {
  const { error } = await signUp({
    email: 'user@example.com',
    password: 'password123',
    options: {
      data: {
        first_name: 'John',
        last_name: 'Doe',
      },
    },
  })
  
  if (error) {
    console.error('Sign up error:', error)
  }
}
```

### Sign In

```typescript
const { signIn } = useAuth()

const handleSignIn = async () => {
  const { error } = await signIn({
    email: 'user@example.com',
    password: 'password123',
  })
  
  if (error) {
    console.error('Sign in error:', error)
  }
}
```

### Sign Out

```typescript
const { signOut } = useAuth()

const handleSignOut = async () => {
  const { error } = await signOut()

  if (error) {
    console.error('Sign out error:', error)
  }
}
```

### Social Login (Google & Apple)

```typescript
const { signInWithGoogle, signInWithApple } = useAuth()

const handleGoogleSignIn = async () => {
  const { error } = await signInWithGoogle()

  if (error) {
    console.error('Google sign in error:', error)
  }
}

const handleAppleSignIn = async () => {
  const { error } = await signInWithApple()

  if (error) {
    console.error('Apple sign in error:', error)
  }
}
```

Social login buttons are automatically shown/hidden based on feature flags:
- `enableGoogleAuth`: Shows Google sign in button
- `enableAppleAuth`: Shows Apple sign in button
- If both are disabled, no social login section appears

## Setup Wizard for Social Login

The ShipNative setup wizard (`yarn setup`) will guide you through setting up Google and Apple OAuth:

### Google OAuth Setup

1. **Run setup wizard**: Run `yarn setup` from the project root
2. **Choose Google OAuth**: Select "Yes" when prompted to set up Google OAuth
3. **Google Cloud Console**: Create OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Enable Google+ API
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs for Supabase
4. **Supabase Configuration**: Enter credentials in Supabase Auth → Providers → Google
5. **Environment Variables**: Setup wizard adds to `.env`:
   ```bash
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
   EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### Apple Sign-In Setup

1. **Run setup wizard**: Run `yarn setup` from the project root
2. **Choose Apple Sign-In**: Select "Yes" when prompted to set up Apple Sign-In
3. **Apple Developer Console**: Configure Sign In with Apple:
   - Go to [Apple Developer Console](https://developer.apple.com/account/resources/identifiers/list)
   - Enable Sign In with Apple capability on your App ID
   - Create Services ID for OAuth
   - Generate private key and key ID
4. **Supabase Configuration**: Enter credentials in Supabase Auth → Providers → Apple
5. **Environment Variables**: Setup wizard adds to `.env`:
   ```bash
   EXPO_PUBLIC_APPLE_SERVICES_ID=com.example.app
   EXPO_PUBLIC_APPLE_TEAM_ID=ABC123DEF4
   EXPO_PUBLIC_APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
   EXPO_PUBLIC_APPLE_KEY_ID=ABC123DEF4
   ```

### Manual Setup

If you prefer to set up social login manually after project creation:

```bash
cd your-project
yarn setup-env
```

The interactive setup script will prompt for all social login credentials.

### Password Reset

```typescript
const { resetPassword } = useAuth()

const handleResetPassword = async () => {
  const { error } = await resetPassword('user@example.com')
  
  if (error) {
    console.error('Reset error:', error)
  } else {
    alert('Check your email for reset link')
  }
}
```

### Update User

```typescript
const { updateUser } = useAuth()

const handleUpdateProfile = async () => {
  const { error } = await updateUser({
    data: {
      first_name: 'Jane',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  })
  
  if (error) {
    console.error('Update error:', error)
  }
}
```

### Auth State Listener

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('Auth event:', event)
      console.log('Session:', session)
      
      if (event === 'SIGNED_IN') {
        // User signed in
      } else if (event === 'SIGNED_OUT') {
        // User signed out
      }
    }
  )
  
  return () => subscription.unsubscribe()
}, [])
```

---

## Database Operations

### Select Data

```typescript
// Get all rows
const { data, error } = await supabase
  .from('posts')
  .select('*')

// Get specific columns
const { data, error } = await supabase
  .from('posts')
  .select('id, title, author')

// Get single row
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('id', 1)
  .single()

// With filters
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('author_id', userId)
  .gte('created_at', '2024-01-01')
  .order('created_at', { ascending: false })
  .limit(10)
```

### Insert Data

```typescript
// Insert single row
const { data, error } = await supabase
  .from('posts')
  .insert({
    title: 'My Post',
    content: 'Hello world',
    author_id: userId,
  })

// Insert multiple rows
const { data, error } = await supabase
  .from('posts')
  .insert([
    { title: 'Post 1', content: 'Content 1' },
    { title: 'Post 2', content: 'Content 2' },
  ])
```

### Update Data

```typescript
// Update rows
const { data, error } = await supabase
  .from('posts')
  .update({ title: 'Updated Title' })
  .eq('id', 1)

// Update multiple rows
const { data, error } = await supabase
  .from('posts')
  .update({ published: true })
  .eq('author_id', userId)
```

### Delete Data

```typescript
// Delete rows
const { data, error } = await supabase
  .from('posts')
  .delete()
  .eq('id', 1)

// Delete with filter
const { data, error } = await supabase
  .from('posts')
  .delete()
  .eq('author_id', userId)
  .lt('created_at', '2023-01-01')
```

### Upsert Data

```typescript
// Insert or update
const { data, error } = await supabase
  .from('posts')
  .upsert({
    id: 1,
    title: 'Updated or New Post',
    content: 'Content',
  })
```

---

## Mock Service Features

The mock Supabase service provides comprehensive simulation:

### Authentication
- ✅ Sign up with email/password
- ✅ Sign in with email/password
- ✅ Sign in with Google OAuth
- ✅ Sign in with Apple OAuth
- ✅ Sign out
- ✅ Session management
- ✅ Password reset (simulated)
- ✅ User updates
- ✅ Auth state listeners

### Database
- ✅ Select with filters (eq, neq, gt, gte, lt, lte, like, ilike, in)
- ✅ Insert (single and multiple)
- ✅ Update with filters
- ✅ Delete with filters
- ✅ Upsert
- ✅ Ordering (ascending/descending)
- ✅ Limiting and pagination
- ✅ Single row queries

### Testing Utilities

```typescript
import { mockSupabaseHelpers } from './services/mocks/supabase'

// Clear all mock data
mockSupabaseHelpers.clearAll()

// Get all users
const users = mockSupabaseHelpers.getUsers()

// Get table data
const posts = mockSupabaseHelpers.getTableData('posts')

// Seed table with data
mockSupabaseHelpers.seedTable('posts', [
  { id: 1, title: 'Post 1', content: 'Content 1' },
  { id: 2, title: 'Post 2', content: 'Content 2' },
])

// Get current session
const session = mockSupabaseHelpers.getCurrentSession()
```

---

## Database Schema

### Create Tables

In Supabase dashboard → SQL Editor:

```sql
-- Users table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  first_name text,
  last_name text,
  avatar_url text,
  has_completed_onboarding boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Posts table
create table public.posts (
  id bigserial primary key,
  title text not null,
  content text,
  author_id uuid references public.profiles(id) on delete cascade,
  published boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Posts policies
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (published = true or author_id = auth.uid());

create policy "Users can create own posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = author_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = author_id);
```

---

## Best Practices

### Error Handling

```typescript
const { data, error } = await supabase
  .from('posts')
  .select('*')

if (error) {
  console.error('Database error:', error.message)
  // Handle error appropriately
  return
}

// Use data safely
console.log('Posts:', data)
```

### Type Safety

```typescript
interface Post {
  id: number
  title: string
  content: string
  author_id: string
  created_at: string
}

const { data, error } = await supabase
  .from('posts')
  .select('*')
  .returns<Post[]>()

// data is now typed as Post[] | null
```

### Row Level Security

Always enable RLS on tables:

```sql
alter table public.posts enable row level security;
```

Create policies to control access:

```sql
-- Only authenticated users can insert
create policy "Authenticated users can insert"
  on public.posts for insert
  to authenticated
  with check (true);
```

### Real-time Subscriptions

```typescript
const channel = supabase
  .channel('posts-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'posts',
    },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// Cleanup
channel.unsubscribe()
```

---

## Troubleshooting

### Mock mode in production

**Problem**: App using mock Supabase in production

**Solution**:
- Verify `.env` file exists
- Check `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set
- Restart Metro: `yarn app:start --clear`

### Authentication not persisting

**Problem**: User logged out on app restart

**Solution**:
- Check SecureStore permissions (iOS/Android)
- Verify `persistSession: true` in Supabase config
- Check for errors in console

### Database queries failing

**Problem**: Queries return errors

**Solution**:
- Check Row Level Security policies
- Verify user is authenticated
- Check table/column names are correct
- Review Supabase logs in dashboard

### CORS errors (web)

**Problem**: CORS errors when calling Supabase from web

**Solution**:
- Add your domain to Supabase → Authentication → URL Configuration
- Check API URL is correct
- Verify publishable key is correct

---

## Next Steps

- [ ] Set up Supabase project
- [ ] Create database schema
- [ ] Configure Row Level Security
- [ ] Add API keys to `.env`
- [ ] Test authentication flow
- [ ] Test database operations
- [ ] Set up real-time subscriptions (if needed)
- [ ] Configure email templates
- [ ] Set up storage buckets (if needed)
