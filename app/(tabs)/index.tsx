import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, // Add this import
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import emojiData from "unicode-emoji-json";
import { getExistingSession, signInAnonymously } from '../../src/config/supabase';
import { habitService } from '../../src/services/habitService';

export default function HomeScreen() {
  const [habits, setHabits] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('⭐');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4CAF50'); // default green
  const [emojiSearch, setEmojiSearch] = useState(''); // Add this state near your other state declarations
  const [isEditing, setIsEditing] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState(null);

  // When closing the modal, reset the state
  const closeModal = () => {
    setNewHabitName('');
    setNewHabitDescription('');
    setSelectedIcon('⭐');
    setSelectedColor('#4CAF50');
    setModalVisible(false);
  };

  // For habit long-press menu
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);

  // Add this state for the emoji modal
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [reorderedHabits, setReorderedHabits] = useState([]);

  // Initialize app - authenticate and load habits
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // First try to get existing session
        const session = await getExistingSession();
        if (!session) {
          // Only sign in anonymously if no existing session
          await signInAnonymously();
        }
        setIsAuthenticated(true);
        await loadHabits();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please try again later.'
        );
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
        // Pass description and color to createHabit
        const newHabit = await habitService.createHabit(
          newHabitName.trim(),
          selectedIcon,
          newHabitDescription.trim(),
          selectedColor
        );
        setHabits([...habits, newHabit]);
        setNewHabitName('');
        setNewHabitDescription('');
        setSelectedIcon('⭐');
        setSelectedColor('#4CAF50');
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

  const isYesterdayCompleted = (habit) => {
    if (!habit) return false; 
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    return habit.completedDays.includes(yesterdayKey);
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

  // Add after other function declarations
  const handleEditPress = (habit) => {
    setIsEditing(true);
    setHabitToEdit(habit);
    setNewHabitName(habit.name);
    setNewHabitDescription(habit.description || '');
    setSelectedIcon(habit.icon);
    setSelectedColor(habit.color || '#4CAF50');
    setModalVisible(true);
    setOptionsVisible(false);
  };

  const handleUpdate = async () => {
    if (!newHabitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    try {
      const updatedHabit = await habitService.updateHabit(
        habitToEdit.id,
        newHabitName.trim(),
        selectedIcon,
        newHabitDescription.trim(),
        selectedColor
      );

      setHabits(habits.map(h => 
        h.id === habitToEdit.id ? updatedHabit : h
      ));

      setModalVisible(false);
      setIsEditing(false);
      setHabitToEdit(null);
      setNewHabitName('');
      setNewHabitDescription('');
      setSelectedIcon('⭐');
      setSelectedColor('#4CAF50');
    } catch (error) {
      console.error('Error updating habit:', error);
      Alert.alert('Error', 'Failed to update habit');
    }
  };

  // ---------- Habit Card ----------
const HabitGrid = ({ habit }) => {
    const scrollViewRef = useRef(null);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const currentYear = today.getFullYear();
    const habitColor = habit.color || '#4CAF50';
    
    // Calculate total weeks to show (past weeks + current week)
    const startOfYear = new Date(currentYear, 0, 1);
    const weeksPassed = Math.ceil((today - startOfYear) / (1000 * 60 * 60 * 24 * 7));
    const totalWeeks = weeksPassed + 1; // Add one more week for future days
    const daysInWeek = 7;

    useEffect(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: false });
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
              <View style={{ flex: 1 }}>
                <Text style={styles.habitName}>{habit.name}</Text>
                {habit.description ? (
                  <Text style={styles.habitDescription}>{habit.description}</Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.checkmarkButton,
                {
                  backgroundColor: habit.completedDays.includes(todayKey)
                    ? habitColor
                    : 'transparent',
                  borderColor: habit.completedDays.includes(todayKey)
                    ? habitColor
                    : '#ccc'
                }
              ]}
              onPress={() => toggleHabit(habit.id, todayKey)}
            >
              <Text style={[
                styles.checkmarkText,
                {
                  color: habit.completedDays.includes(todayKey)
                    ? 'white'
                    : '#ccc'
                }
              ]}>
                {habit.completedDays.includes(todayKey) ? '✓' : '○'}
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
              {Array.from({ length: totalWeeks }, (_, weekIndex) => (
                <View key={weekIndex} style={styles.weekColumn}>
                  {Array.from({ length: daysInWeek }, (_, dayIndex) => {
                    const currentDate = new Date(today);
                    const daysToSubtract = (totalWeeks - weekIndex - 1) * 7 + (6 - dayIndex);
                    currentDate.setDate(currentDate.getDate() - daysToSubtract);
                    
                    const dayKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
                    const isCompleted = habit.completedDays.includes(dayKey);
                    const isToday = dayKey === todayKey;
                    const isFuture = currentDate > today;
                    
                    return (
                      <TouchableOpacity
                        key={dayIndex}
                        style={[
                          styles.dayCell,
                          isCompleted && !isToday && { backgroundColor: habitColor },
                          isCompleted && isToday && { backgroundColor: habitColor },
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

  const getFilteredEmojis = () => {
    return Object.entries(emojiData)
      .map(([emoji, info]) => ({ emoji, name: info.name }))
      .filter(item => 
        item.name.toLowerCase().includes(emojiSearch.toLowerCase()) ||
        item.emoji.includes(emojiSearch)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const saveReorderedHabits = async () => {
    try {
      // Update the habits state with the new order
      setHabits(reorderedHabits);
      setReorderModalVisible(false);
      
      // Here you would typically update the order in your database
      // You'll need to add this functionality to your habitService
    } catch (error) {
      console.error('Error saving habit order:', error);
      Alert.alert('Error', 'Failed to save habit order');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>HabitTracker</Text>
        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.headerAddButtonText}>+</Text>
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
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Habit' : 'Add New Habit'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter habit name"
              value={newHabitName}
              onChangeText={setNewHabitName}
              autoFocus
            />

            {/* Description input */}
            <TextInput
              style={styles.input}
              placeholder="Enter description (optional)"
              value={newHabitDescription}
              onChangeText={setNewHabitDescription}
              multiline
            />

            {/* Color picker */}
            <Text style={styles.iconSectionTitle}>Choose a Color</Text>
            <View style={styles.colorPickerContainer}>
              {[
                // Row 1 (7 colors)
                '#FF3B30', '#FF2D55', '#FF6B6B', '#FF9500', '#FFCC00', '#9ACD32', '#34C759',
                // Row 2 (7 colors)
                '#4CAF50','#5AC8FA', '#007AFF','#64D2FF', '#5856D6', '#AF52DE', '#A280FF', 
                // Row 3 (7 colors)
                '#9C27B0','#FF00FF','#000000', '#4A4A4A', '#8E8E93', '#8B4513', '#F5F5DC',  
              ].map((color, index) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColorCircle,
                    color === '#F5F5DC' && { borderColor: '#E5E5EA', borderWidth: 1 },
                    // Add margin-right: auto to first two items of each row to force 7 items per row
                    (index + 1) % 7 === 0 && { marginRight: 'auto' }
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            {/* Emoji Selection Button */}
            <Text style={styles.iconSectionTitle}>Selected Emoji</Text>
            <TouchableOpacity 
              style={styles.emojiPickerButton}
              onPress={() => setEmojiPickerVisible(true)}
            >
              <Text style={styles.selectedEmojiPreview}>{selectedIcon}</Text>
              <Text style={styles.emojiPickerButtonText}>Change Emoji</Text>
            </TouchableOpacity>

            {/* Add this new Modal for Emoji Picker */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={emojiPickerVisible}
              onRequestClose={() => setEmojiPickerVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { height: '80%' }]}>
                  <View style={styles.emojiPickerHeader}>
                    <Text style={styles.modalTitle}>Choose an Emoji</Text>
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={() => {
                        setEmojiPickerVisible(false);
                        setEmojiSearch(''); // Clear search when closing
                      }}
                    >
                      <Text style={styles.closeButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.emojiSearchInput}
                    placeholder="Search emojis..."
                    value={emojiSearch}
                    onChangeText={setEmojiSearch}
                    clearButtonMode="while-editing"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <FlatList
                    data={getFilteredEmojis()}
                    keyExtractor={(item) => item.emoji}
                    numColumns={6}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.emojiCell,
                          selectedIcon === item.emoji && styles.selectedEmojiCell
                        ]}
                        onPress={() => {
                          setSelectedIcon(item.emoji);
                          setEmojiPickerVisible(false);
                          setEmojiSearch(''); // Clear search when selecting
                        }}
                      >
                        <Text style={styles.emojiText}>{item.emoji}</Text>
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.emojiGrid}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              </View>
            </Modal>


            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setIsEditing(false);
                  setHabitToEdit(null);
                  setNewHabitName('');
                  setNewHabitDescription('');
                  setSelectedIcon('⭐');
                  setSelectedColor('#4CAF50');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={isEditing ? handleUpdate : addHabit}
              >
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Save Changes' : 'Add Habit'}
                </Text>
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
            <Text style={styles.optionText}>
              {selectedHabit && isYesterdayCompleted(selectedHabit)
                ? '❌ Uncomplete Yesterday' 
                : '✅ Complete Yesterday'}
            </Text>
          </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={() => handleEditPress(selectedHabit)}
            >
              <Text style={styles.optionText}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={() => {
              setReorderedHabits([...habits]);
              setReorderModalVisible(true);
              setOptionsVisible(false);
            }}>
              <Text style={styles.optionText}>↕️ Reorder Habits</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionButton, styles.deleteButton]} onPress={deleteHabit}>
              <Text style={[styles.optionText, styles.deleteText]}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reorder Habits Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reorderModalVisible}
        onRequestClose={() => setReorderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%', paddingTop: 16 }]}>
            <View style={styles.reorderHeader}>
              <Text style={styles.modalTitle}>Reorder Habits</Text>
              <View style={styles.reorderButtons}>
                <TouchableOpacity
                  style={styles.reorderButton}
                  onPress={() => setReorderModalVisible(false)}
                >
                  <Text style={styles.reorderButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reorderButton, { marginLeft: 20 }]}
                  onPress={saveReorderedHabits}
                >
                  <Text style={[styles.reorderButtonText, { color: '#007AFF' }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <GestureHandlerRootView style={{ flex: 1 }}>
              <DraggableFlatList
                data={reorderedHabits}
                onDragEnd={({ data }) => setReorderedHabits(data)}
                keyExtractor={item => item.id}
                renderItem={({ item, drag, isActive }) => (
                  <TouchableOpacity
                    style={[
                      styles.reorderItem,
                      isActive && styles.reorderItemActive
                    ]}
                    onLongPress={drag}
                    delayLongPress={0}
                  >
                    <View style={styles.reorderItemContent}>
                      <Text style={styles.reorderItemEmoji}>{item.icon}</Text>
                      <View style={styles.reorderItemTextContainer}>
                        <Text style={styles.reorderItemName}>{item.name}</Text>
                        {item.description ? (
                          <Text style={styles.reorderItemDescription} numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.dragHandle}>⋮⋮</Text>
                    </View>
                  </TouchableOpacity>
                )}
                containerStyle={{ paddingHorizontal: 4 }}
              />
            </GestureHandlerRootView>
          </View>
        </View>
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
  headerAddButton: {  // New style
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  headerAddButtonText: {  // New style
    color: 'white',
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 26
  },
  habitsContainer: { flex: 1, paddingHorizontal: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', fontSize: 18, color: '#666', fontWeight: '500' },
  habitContainer: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  habitTitleRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', // Change from 'center' to 'flex-start'
    flex: 1 
  },
  habitTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  habitIcon: { 
    fontSize: 24, 
    marginRight: 12,
    marginTop: 2, // Align icon with text
  },
  habitName: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#1a1a1a',
    marginBottom: 4, // Add spacing between name and description
  },
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
  modalContent: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 20,
    width: '85%', 
    maxWidth: 340,
    maxHeight: '80%' // Increased from 60% to give more room
  },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#1a1a1a' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 20, backgroundColor: '#f8f8f8' },
  iconSectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1a1a1a' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  iconOption: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  selectedIconOption: { backgroundColor: '#e3f2fd', borderColor: '#007AFF' },
  iconOptionText: { fontSize: 20 },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16, // Reduced from 24
    marginHorizontal: 0, // Remove negative margin
    marginBottom: 8 // Add bottom margin
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14, // Slightly reduced padding
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4, // Reduced horizontal margin
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emojiGrid: {
  paddingVertical: 10,
},
emojiCell: {
  flex: 1,
  margin: 6,
  justifyContent: "center",
  alignItems: "center",
  height: 48,
  borderRadius: 12,
  backgroundColor: "#f0f0f0",
},
selectedEmojiCell: {
  backgroundColor: "#e3f2fd",
  borderColor: "#007AFF",
  borderWidth: 2,
},
emojiText: {
  fontSize: 28,
},
colorPickerContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginBottom: 16,
  width: '100%',
  gap: 8, // Consistent gap between all circles
},
colorCircle: {
  width: 32,
  height: 32,
  borderRadius: 16,
  borderWidth: 1.5,
  borderColor: 'transparent',
},
selectedColorCircle: {
  borderColor: '#333',
  borderWidth: 2,
},
habitDescription: {
  fontSize: 13,
  color: '#888',
  flexWrap: 'wrap',
},
emojiPickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f8f8f8',
  padding: 12,
  borderRadius: 12,
  marginBottom: 16, // Reduced from 20
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
selectedEmojiPreview: {
  fontSize: 24,
  marginRight: 12,
},
emojiPickerButtonText: {
  fontSize: 16,
  color: '#007AFF',
  fontWeight: '500',
},
emojiPickerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  paddingHorizontal: 4,
},
closeButton: {
  padding: 8,
},
closeButtonText: {
  color: '#007AFF',
  fontSize: 16,
  fontWeight: '600',
},
emojiSearchInput: {
  borderWidth: 1,
  borderColor: '#e0e0e0',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 16,
  marginBottom: 16,
  backgroundColor: '#f8f8f8',
},
optionsOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
optionsContainer: {
  backgroundColor: 'white',
  borderRadius: 16,
  padding: 20,
  width: '100%',
  maxWidth: 340,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
},
optionsTitle: {
  fontSize: 20,
  fontWeight: '600',
  marginBottom: 16,
  textAlign: 'center',
  color: '#1a1a1a'
},
optionButton: {
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 12,
  marginBottom: 8,
  backgroundColor: '#f8f8f8'
},
optionText: {
  fontSize: 16,
  color: '#1a1a1a'
},
deleteButton: {
  backgroundColor: '#FEE2E2',
  marginTop: 4
},
deleteText: {
  color: '#DC2626'
},
reorderHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 16,
  marginBottom: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
reorderButtons: {
  flexDirection: 'row',
  alignItems: 'center',
},
reorderButton: {
  paddingVertical: 8,
  paddingHorizontal: 12,
},
reorderButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#666',
},
reorderItem: {
  backgroundColor: 'white',
  paddingVertical: 16,
  paddingHorizontal: 16,
  marginBottom: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
reorderItemActive: {
  backgroundColor: '#f8f8f8',
  transform: [{ scale: 1.02 }],
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 5,
  borderColor: '#007AFF',
},
reorderItemContent: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
reorderItemEmoji: {
  fontSize: 24,
},
reorderItemTextContainer: {
  flex: 1,
  marginRight: 8,
},
reorderItemName: {
  fontSize: 16,
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: 2,
},
reorderItemDescription: {
  fontSize: 13,
  color: '#666',
},
dragHandle: {
  fontSize: 24,
  color: '#999',
  fontWeight: '600',
}
}); // End of StyleSheet.create