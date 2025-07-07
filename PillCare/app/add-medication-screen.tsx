import { supabase } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type RootStackParamList = {
  DosageLog: undefined;
  AddMedication: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddMedication'>;

export const AddMedicationScreen: React.FC<Props> = () => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [type, setType] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [intervalDays, setIntervalDays] = useState<number | null>(null);
  const [times, setTimes] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const route = useRouter();

  const resetForm = () => {
    setName('');
    setDosage('');
    setType('');
    setSelectedDays([]);
    setIntervalDays(null);
    setTimes([]);
    setShowTimePicker(false);
    setEditingTimeIndex(null);
  };

  const handleAddTime = () => {
    setEditingTimeIndex(null)
    setShowTimePicker(true);
  };

  const formatTime12Hour = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const isPM = hours >= 12;
    const hour12 = hours % 12 || 12;
    const minutesStr = minutes.toString().padStart(2, '0');
    return `${hour12}:${minutesStr} ${isPM ? 'PM' : 'AM'}`;
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
  setShowTimePicker(false);
  if (event.type !== 'set' || !selectedDate) return;

  const formatted = formatTime12Hour(selectedDate);
  setTimes((prev) => {
    if (editingTimeIndex === null) {
      return [...prev, formatted];
    } else {
      const updated = [...prev];
      updated[editingTimeIndex] = formatted;
      return updated;
    }
  });
};


  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const removeTime = (index: number) => {
    const updated = [...times];
    updated.splice(index, 1);
    setTimes(updated);
  };

  const handleAddMedication = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) return Alert.alert('Error', 'User not logged in');
    if (!name.trim()) return Alert.alert('Validation', 'Enter medication name.');
    if (!type) return Alert.alert('Validation', 'Select type of schedule.');
    if (times.length === 0) return Alert.alert('Validation', 'Add at least one time.');
    if (type === 'weekly' && selectedDays.length < 1)
      return Alert.alert('Validation', 'Add at least one day.');
    if (type === 'interval') {
      if (!intervalDays || intervalDays <= 0) {
        return Alert.alert('Validation', 'Interval days must be a number greater than 0.');
      }
    }

    const schedule: any = { type, times };
    if (type === 'weekly') schedule.days = selectedDays;
    if (type === 'interval') schedule.interval_days = intervalDays;

    const { error } = await supabase.from('medications').insert({
      senior_id: userId,
      name,
      dosage,
      schedule,
    });

    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Medication added!');
      route.back();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Add Medication</Text>

      <TextInput
        style={styles.input}
        placeholder="Medication Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Dosage (e.g. 10mg)"
        value={dosage}
        onChangeText={setDosage}
      />

      <Text style={styles.label}>Schedule Type</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={type} onValueChange={(value) => setType(value)}>
          <Picker.Item label="-- Select Type --" value="" />
          <Picker.Item label="Daily" value="daily" />
          <Picker.Item label="Weekly" value="weekly" />
          <Picker.Item label="Interval" value="interval" />
        </Picker>
      </View>

      {type === 'weekly' && (
        <View style={styles.dayContainer}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                selectedDays.includes(day) && styles.dayButtonSelected,
              ]}
              onPress={() => toggleDay(day)}
            >
              <Text style={styles.dayText}>{day.slice(0, 3)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {type === 'interval' && (
        <TextInput
          style={styles.input}
          placeholder="Every how many days?"
          keyboardType="numeric"
          value={intervalDays?.toString() || ''}
          onChangeText={(text) => {
            const num = parseInt(text);
            setIntervalDays(isNaN(num) ? null : num);
          }}
        />
      )}

      <Text style={styles.label}>Times</Text>
      {times.map((t, idx) => (
        <View key={idx} style={styles.timeRow}>
          <Text style={styles.timeText}>{t}</Text>
          <TouchableOpacity onPress={() => removeTime(idx)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addTimeBtn} onPress={handleAddTime}>
        <Text style={styles.addTimeText}>+ Add Time</Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          mode="time"
          value={new Date()}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={resetForm}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAddMedication}>
          <Text style={styles.buttonText}>Add Medication</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AddMedicationScreen;

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  heading: { fontSize: 24, marginBottom: 20, fontWeight: 'bold' },
  label: { fontWeight: 'bold', marginBottom: 5 },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  dayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  dayButton: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 4,
    padding: 6,
    margin: 4,
  },
  dayButtonSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  dayText: {
    color: '#000',
  },
  addTimeBtn: {
    backgroundColor: '#27ae60',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  addTimeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 16,
  },
  removeText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  buttonGroup: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#2980b9',
  },
  resetButton: {
    backgroundColor: '#f39c12',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
