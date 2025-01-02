import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => Promise<Profile>;
  signOut: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    // First check if profile exists
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('id', data.user.id);

    console.log('Profile count during signin:', count);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,type,business_name,contact_email')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    console.log('Profile data during signin:', profile);
    
    if (!profile) {
      throw new Error('No profile found for this user. Please contact support.');
    }

    set({ user: data.user, profile });
  },
  signUp: async (email: string, password: string, profile) => {
    // First, sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from sign up');

    console.log('User created:', authData.user.id);

    // Then create their profile
    const profileToInsert = {
      id: authData.user.id,
      type: profile.type,
      business_name: profile.business_name,
      contact_email: profile.contact_email,
    };

    console.log('Attempting to create profile:', profileToInsert);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([profileToInsert])
      .select('id,type,business_name,contact_email')
      .maybeSingle();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Try to clean up the auth user if profile creation fails
      await supabase.auth.signOut();
      throw profileError;
    }

    console.log('Profile created:', profileData);
    return profileData;
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, profile: null });
  },
  loadUser: async () => {
    try {
      set({ loading: true });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      
      if (!user) {
        set({ user: null, profile: null, loading: false });
        return;
      }

      // First try to get the profile count
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', user.id);

      if (countError) {
        console.error('Error checking profile:', countError);
        set({ user: null, profile: null, loading: false });
        return;
      }

      console.log('Profile count:', count);

      // Then get the actual profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,type,business_name,contact_email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        set({ user: null, profile: null, loading: false });
        return;
      }

      console.log('Profile data:', profile);
      set({ user, profile, loading: false });
    } catch (error) {
      console.error('Error loading user:', error);
      set({ user: null, profile: null, loading: false });
    }
  },
}));