import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and make sure you have:\n' +
    '- EXPO_PUBLIC_SUPABASE_URL\n' +
    '- EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Also add persistent session handling
export const getExistingSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const signInAnonymously = async (retries = 3, initialDelay = 1000) => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < retries; i++) {
    try {
      const { data: { user }, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return user;
    } catch (error) {
      if (error.message.includes('rate limit') && i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Rate limit hit, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
};