import { supabase } from '../config/supabase';

const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const habitService = {
  async loadHabits() {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No user found');

      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (habitsError) throw habitsError;

      const habitIds = habits.map(h => h.id);
      const { data: completions, error: completionsError } = await supabase
        .from('habit_completions')
        .select('*')
        .in('habit_id', habitIds);

      if (completionsError) throw completionsError;

      return habits.map(habit => ({
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        description: habit.description,
        color: habit.color,
        completedDays: completions
          .filter(c => c.habit_id === habit.id)
          .map(c => {
            const date = new Date(c.completion_date);
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          })
      }));
    } catch (error) {
      console.error('Error loading habits:', error);
      return [];
    }
  },

  async createHabit(name, icon = '⭐', description = '', color = '#4CAF50') {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('habits')
        .insert([{
          name,
          icon,
          description,
          color,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        icon: data.icon,
        description: data.description,
        color: data.color,
        completedDays: []
      };
    } catch (error) {
      console.error('Error creating habit:', error);
      throw error;
    }
  },

  async updateHabit(habitId, name, icon, description, color) {
    try {
      const { data, error } = await supabase
        .from('habits')
        .update({
          name,
          icon,
          description,
          color
        })
        .eq('id', habitId)
        .select()
        .single();

      if (error) throw error;
      
      // Return the updated habit with its completedDays
      const { data: completions } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId);

      return {
        ...data,
        completedDays: completions.map(c => {
          const date = new Date(c.completion_date);
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        })
      };
    } catch (error) {
      console.error('Error updating habit:', error);
      throw error;
    }
  },

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
  },

  async toggleHabitCompletion(habitId, dateKey) {
    try {
      const [year, month, day] = dateKey.split('-');
      const date = new Date(year, month, day);
      
      const { data: existing, error: checkError } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completion_date', date.toISOString().split('T')[0])
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existing) {
        const { error: deleteError } = await supabase
          .from('habit_completions')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;
        return false;
      } else {
        const { error: insertError } = await supabase
          .from('habit_completions')
          .insert([{
            habit_id: habitId,
            completion_date: date.toISOString().split('T')[0]
          }]);

        if (insertError) throw insertError;
        return true;
      }
    } catch (error) {
      console.error('Error toggling habit completion:', error);
      throw error;
    }
  },

  async updateHabitOrder(habits) {
    try {
      // If you have an order field in your database, you would update it here
      // For now, we'll just return the reordered habits
      return habits;
    } catch (error) {
      console.error('Error updating habit order:', error);
      throw error;
    }
  }
};