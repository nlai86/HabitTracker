import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { signInAnonymously } from '../../src/config/supabase';
import { habitService } from '../../src/services/habitService';

const availableIcons = ['⭐', '💪', '📚', '🏃', '💧', '🧘', '🎯', '✍️', '🌱', '🎵', '🍎', '💤', '📱', '🏠', '💰', '❤️'];

export default function HomeScreen() {
  const [habits, setHabits] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('⭐');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // For habit long-press menu
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);

  // Initialize app - authenticate and load habits
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await signInAnonymously();
        setIsAuthenticated(true);
        await loadHabits();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        Alert.alert('Error', 'Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const loadHabits = async () => {
    try {
      const loadedHabits = await habitService.loadHabits();
      setHabits(loadedHabits);
    } catch (error) {
      console.error('Error loading habits:', error);
      Alert.alert('Error', 'Failed to load habits');
    }
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    try {
      const newHabit = await habitService.createHabit(newHabitName.trim(), selectedIcon);
      setHabits([...habits, newHabit]);
      setNewHabitName('');
      setSelectedIcon('⭐');
      setModalVisible(false);
    } catch (error) {
      console.error('Error adding habit:', error);
      Alert.alert('Error', 'Failed to add habit');
    }
  };

  const toggleHabit = async (habitId, dayKey) => {
    try {
      // Optimistic update
      const updatedHabits = habits.map(habit => {
        if (habit.id === habitId) {
          const completedDays = [...habit.completedDays];
          const dayIndex = completedDays.indexOf(dayKey);
          
          if (dayIndex > -1) {
            completedDays.splice(dayIndex, 1);
          } else {
            completedDays.push(dayKey);
          }
          
          return { ...habit, completedDays };
        }
        return habit;
      });
      
      setHabits(updatedHabits);
      
      await habitService.toggleHabitCompletion(habitId, dayKey);
    } catch (error) {
      console.error('Error toggling habit:', error);
      await loadHabits();
      Alert.alert('Error', 'Failed to update habit');
    }
  };

  // ---------- Long Press Menu Actions ----------
  const handleLongPress = (habit) => {
    setSelectedHabit(habit);
    setOptionsVisible(true);
  };

  const completeYesterday = async () => {
    if (!selectedHabit) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    await toggleHabit(selectedHabit.id, dayKey);
    setOptionsVisible(false);
  };

  const deleteHabit = async () => {
    try {
      await habitService.deleteHabit(selectedHabit.id);
      setHabits(habits.filter(h => h.id !== selectedHabit.id));
    } catch (error) {
      console.error("Error deleting habit:", error);
      Alert.alert("Error", "Failed to delete habit");
    } finally {
      setOptionsVisible(false);
    }
  };

  // ---------- Habit Card ----------
  const HabitGrid = ({ habit }) => {
    const scrollViewRef = useRef(null);
    const today = new Date();
    const currentYear = today.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    
    const daysSinceStart = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));
    
    const daysInYear = new Date(currentYear, 11, 31).getDate() === 31 ? 
      (new Date(currentYear, 1, 29).getMonth() === 1 ? 366 : 365) : 365;
    
    const weeks = Math.ceil(daysInYear / 7);
    const daysInWeek = 7;

    useEffect(() => {
      if (scrollViewRef.current) {
        const currentWeek = Math.floor(daysSinceStart / 7);
        const scrollPosition = Math.max(0, (currentWeek - 4) * 14);
        scrollViewRef.current.scrollTo({ x: scrollPosition, animated: false });
      }
    }, []);

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(habit)}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        <View style={styles.habitContainer}>
          <View style={styles.habitHeader}>
            <View style={styles.habitTitleRow}>
              <Text style={styles.habitIcon}>{habit.icon}</Text>
              <Text style={styles.habitName}>{habit.name}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.checkmarkButton,
                (() => {
                  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
                  return habit.completedDays.includes(todayKey) ? styles.checkmarkButtonDone : styles.checkmarkButtonUndone;
                })()
              ]}
              onPress={() => {
                const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
                toggleHabit(habit.id, todayKey);
              }}
            >
              <Text style={[
                styles.checkmarkText,
                (() => {
                  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
                  return habit.completedDays.includes(todayKey) ? styles.checkmarkTextDone : styles.checkmarkTextUndone;
                })()
              ]}>
                {(() => {
                  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
                  return habit.completedDays.includes(todayKey) ? '✓' : '○';
                })()}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.gridScrollView}
          >
            <View style={styles.grid}>
              {Array.from({ length: weeks }, (_, weekIndex) => (
                <View key={weekIndex} style={styles.weekColumn}>
                  {Array.from({ length: daysInWeek }, (_, dayIndex) => {
                    const dayOfYear = (weekIndex * 7) + dayIndex;
                    
                    if (dayOfYear >= daysInYear) {
                      return <View key={dayIndex} style={styles.emptyCell} />;
                    }
                    
                    const currentDate = new Date(currentYear, 0, 1);
                    currentDate.setDate(currentDate.getDate() + dayOfYear);
                    
                    const dayKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
                    const isCompleted = habit.completedDays.includes(dayKey);
                    const isToday = dayOfYear === daysSinceStart;
                    const isFuture = dayOfYear > daysSinceStart;
                    
                    return (
                      <TouchableOpacity
                        key={dayIndex}
                        style={[
                          styles.dayCell,
                          isCompleted && !isToday && styles.completedDay,
                          isCompleted && isToday && styles.todayCompleted,
                          !isCompleted && isToday && styles.today,
                          isFuture && styles.futureDay
                        ]}
                        onPress={() => !isFuture && toggleHabit(habit.id, dayKey)}
                        disabled={isFuture}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    );
  };

  // Show loading screen
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your habits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>HabitTracker</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Habits */}
      {habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No habits yet. Tap + to add one!</Text>
        </View>
      ) : (
        <ScrollView style={styles.habitsContainer}>
          {habits.map(habit => <HabitGrid key={habit.id} habit={habit} />)}
        </ScrollView>
      )}

      {/* Add Habit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Habit</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter habit name"
              value={newHabitName}
              onChangeText={setNewHabitName}
              autoFocus
            />
            
            <Text style={styles.iconSectionTitle}>Choose an Icon</Text>
            <View style={styles.iconGrid}>
              {availableIcons.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon && styles.selectedIconOption
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewHabitName('');
                  setSelectedIcon('⭐');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addHabitButton]}
                onPress={addHabit}
              >
                <Text style={styles.addHabitButtonText}>Add Habit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    {/* Long Press Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={optionsVisible}
        onRequestClose={() => setOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPressOut={() => setOptionsVisible(false)}
        >
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>{selectedHabit?.name}</Text>

            <TouchableOpacity style={styles.optionButton} onPress={completeYesterday}>
              <Text style={styles.optionText}>✅ Complete Yesterday</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={() => {
              setOptionsVisible(false);
              Alert.alert("Edit Habit", "Implement edit modal here!");
            }}>
              <Text style={styles.optionText}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={() => {
              setOptionsVisible(false);
              Alert.alert("Reorder Habits", "Implement reorder mode here!");
            }}>
              <Text style={styles.optionText}>↕️ Reorder Habits</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionButton, styles.deleteButton]} onPress={deleteHabit}>
              <Text style={[styles.optionText, styles.deleteText]}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 60 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 25 },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.5 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  addButtonText: { color: 'white', fontSize: 26, fontWeight: '300', lineHeight: 26 },
  habitsContainer: { flex: 1, paddingHorizontal: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', fontSize: 18, color: '#666', fontWeight: '500' },
  habitContainer: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  habitTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  habitIcon: { fontSize: 24, marginRight: 12 },
  habitName: { fontSize: 20, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  checkmarkButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  checkmarkButtonUndone: { backgroundColor: 'transparent', borderColor: '#ccc' },
  checkmarkButtonDone: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  checkmarkText: { fontSize: 16, fontWeight: '600' },
  checkmarkTextUndone: { color: '#ccc' },
  checkmarkTextDone: { color: 'white' },
  gridScrollView: { marginBottom: 16 },
  grid: { flexDirection: 'row' },
  weekColumn: { marginRight: 2 },
  dayCell: { width: 12, height: 12, backgroundColor: '#e0e0e0', marginBottom: 2, borderRadius: 2 },
  emptyCell: { width: 12, height: 12, marginBottom: 2 },
  completedDay: { backgroundColor: '#4CAF50' },
  today: { backgroundColor: '#e0e0e0', borderWidth: 2, borderColor: '#007AFF' },
  todayCompleted: { backgroundColor: '#007AFF' },
  futureDay: { backgroundColor: '#f0f0f0', opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '85%', maxWidth: 340, maxHeight: '60%' },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#1a1a1a' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 20, backgroundColor: '#f8f8f8' },
  iconSectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1a1a1a' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  iconOption: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  selectedIconOption: { backgroundColor: '#e3f2fd', borderColor: '#007AFF' },
  iconOptionText: { fontSize: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 6 },
  cancelButton: { backgroundColor: '#f0f0f0' },
  cancelButtonText: { color: '#666', fontWeight: '600', fontSize: 16 },
  addHabitButton: { backgroundColor: '#007AFF' },
  addHabitButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },

  // Long-press options modal
  optionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsContainer: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  optionsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  optionButton: { paddingVertical: 14 },
  optionText: { fontSize: 16 },
  deleteButton: { marginTop: 10 },
  deleteText: { color: 'red', fontWeight: '600' },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#333' },
});

