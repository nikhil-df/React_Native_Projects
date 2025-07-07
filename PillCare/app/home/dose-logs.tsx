import MakeUserSchedule from '@/components/addMedications';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage?: string;
  schedule?: any;
  created_at: string;
}

const DosageLogScreen: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<'senior' | 'family' | null>(null);
  const [editingAllowed, setEditingAllowed] = useState(false);
  const router = useRouter();

  const fetchMedications = async () => {
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user || authError) {
      console.error('User not found or auth error');
      return;
    }

    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData) {
      console.error('Error fetching user role:', roleError?.message);
      return;
    }

    setUserRole(userData.role);

    let seniorId = user.id;

    if (userData.role === 'family') {
      const { data: linkData, error: linkError } = await supabase
        .from('links')
        .select('senior_id, consent_settings')
        .eq('family_id', user.id)
        .single();

      if (linkError || !linkData?.senior_id) {
        console.warn('No linked senior or error:', linkError?.message);
        setMedications([]);
        return;
      }

      seniorId = linkData.senior_id;

      // Check consent
      const consent = linkData.consent_settings;
      if (consent?.editing_approved === true) {
        setEditingAllowed(true);
      } else {
        setEditingAllowed(false);
      }
    } else {
      // Seniors always get full access
      setEditingAllowed(true);
    }

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('senior_id', seniorId);

    if (error) {
      console.error('Error fetching medications:', error.message);
    } else {
      setMedications(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMedications();
    MakeUserSchedule();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medications' },
        () => {
          fetchMedications();
          MakeUserSchedule();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddMedication = () => {
    router.push('../add-medication-screen');
  };

  const toggleExpand = (id: string) => {
    setExpandedMedId(prev => (prev === id ? null : id));
  };

  const handleDeleteMedication = async (id: string) => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('medications')
              .delete()
              .eq('id', id);

            if (error) {
              console.error('Delete error:', error.message);
            } else {
              setMedications(prev => prev.filter(med => med.id !== id));
              if (expandedMedId === id) setExpandedMedId(null);
            }
          },
        },
      ]
    );
  };

  const renderMedication = ({ item }: { item: Medication }) => (
    <TouchableOpacity style={styles.card} onPress={() => toggleExpand(item.id)}>
      <Text style={styles.medName}>{item.name}</Text>

      {expandedMedId === item.id && (
        <View style={styles.details}>
          <Text style={styles.label}>Dosage:</Text>
          <Text>{item.dosage || 'N/A'}</Text>
          <Text style={styles.label}>Schedule:</Text>
          <Text>{JSON.stringify(item.schedule, null, 2)}</Text>

          {editingAllowed && (
            <View style={{ marginTop: 12 }}>
              <Button title="Delete" color="red" onPress={() => handleDeleteMedication(item.id)} />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {editingAllowed && <Button title="Add Medication" onPress={handleAddMedication} />}
        <Text style={styles.heading}>Medications</Text>

        {loading ? (
          <Text>Loading...</Text>
        ) : medications.length === 0 ? (
          <Text>No medications found.</Text>
        ) : (
          <FlatList
            data={medications}
            keyExtractor={(item) => item.id}
            renderItem={renderMedication}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default DosageLogScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  card: {
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
  },
  medName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  details: {
    marginTop: 10,
  },
  label: {
    fontWeight: '600',
    marginTop: 8,
  },
});
