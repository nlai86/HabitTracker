import { getCurrentUser, supabase } from '../../src/config/supabase';

// Convert date to string format for database
const formatDateForDB = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Parse date key back to Date object
const parseCompletionDate = (dateString) => {
  // Handle both formats: "2024-11-15" and "2024-10-15" (your current format)
  if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
    }
  }
  return new Date(dateString);
};

export const habitService = {
  // Load all habits for current user
  async loadHabits() {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No user found');

      // Get habits
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (habitsError) throw habitsError;

      // Get all completions for these habits
      const habitIds = habits.map(h => h.id);
      const { data: completions, error: completionsError } = await supabase
        .from('habit_completions')
        .select('*')
        .in('habit_id', habitIds);

      if (completionsError) throw completionsError;

      // Combine habits with their completions
      const habitsWithCompletions = habits.map(habit => ({
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        completedDays: completions
          .filter(c => c.habit_id === habit.id)
          .map(c => {
            // Convert completion_date back to your app's format
            const date = new Date(c.completion_date);
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          })
      }));

      return habitsWithCompletions;
    } catch (error) {
      console.error('Error loading habits:', error);
      return [];
    }
  },

  // Create a new habit
  async createHabit(name, icon = '⭐') {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('habits')
        .insert([{
          name,
          icon,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        icon: data.icon,
        completedDays: []
      };
    } catch (error) {
      console.error('Error creating habit:', error);
      throw error;
    }
  },

  // Toggle habit completion for a specific date
  async toggleHabitCompletion(habitId, dateKey) {
    try {
      // Parse your app's date format
      const dateParts = dateKey.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);
      const date = new Date(year, month, day);
      const dbDateString = formatDateForDB(date);

      // Check if completion already exists
      const { data: existing, error: checkError } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completion_date', dbDateString)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        // Remove completion
        const { error: deleteError } = await supabase
          .from('habit_completions')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;
        return false; // Not completed anymore
      } else {
        // Add completion
        const { error: insertError } = await supabase
          .from('habit_completions')
          .insert([{
            habit_id: habitId,
            completion_date: dbDateString
          }]);

        if (insertError) throw insertError;
        return true; // Now completed
      }
    } catch (error) {
      console.error('Error toggling habit completion:', error);
      throw error;
    }
  },

  // Delete a habit
  async deleteHabit(habitId) {
    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting habit:', error);
      throw error;
    }
  }
};