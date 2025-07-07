import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  View
} from 'react-native';

dayjs.extend(utc);
dayjs.extend(timezone);

type Dose = {
  id: string;
  status: string;
  scheduled_time: string;
  taken_time: string | null;
  synced_at: string;
  medication_id: string;
  medications: {
    id: string;
    name: string;
  };
};

export default function TodayDoseScreen() {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'senior' | 'family' | null>(null);

  const fetchData = async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User fetch error:', userError?.message);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData) {
      console.error('Role fetch error:', roleError?.message);
      setLoading(false);
      return;
    }

    const role = userData.role;
    setUserRole(role);

    const today = dayjs().format('YYYY-MM-DD');
    const startOfDay = `${today}T00:00:00+00:00`;
    const endOfDay = `${today}T23:59:59+00:00`;
    const now = new Date().toISOString();

    let seniorId = user.id;

    if (role === 'family') {
      const { data: linked, error: linkError } = await supabase
        .from('links')
        .select('senior_id')
        .eq('family_id' , user.id)
        .single();

      if (linkError || !linked?.senior_id) {
        console.warn('No linked senior found');
        setDoses([]);
        setLoading(false);
        return;
      }

      seniorId = linked.senior_id;
    }

    await supabase
      .from('dose_logs')
      .update({ status: 'missed', synced_at: now })
      .eq('senior_id', seniorId)
      .eq('status', 'scheduled')
      .lt('scheduled_time', startOfDay);

    const { data, error } = await supabase
      .from('dose_logs')
      .select(
        `
        id,
        status,
        scheduled_time,
        taken_time,
        synced_at,
        medication_id,
        medications (
          id,
          name
        )
      `
      )
      .eq('senior_id', seniorId)
      .gte('scheduled_time', startOfDay)
      .lte('scheduled_time', endOfDay)
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Dose fetch error:', error.message);
      setLoading(false);
      return;
    }

    const fixedData: Dose[] = (data || []).map((item) => ({
      ...item,
      medications: Array.isArray(item.medications)
        ? item.medications[0]
        : item.medications,
    }));

    setDoses(fixedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('doses-medications-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dose_logs',
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsTaken = async (doseId: string) => {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('dose_logs')
      .update({
        status: 'taken',
        taken_time: now,
        synced_at: now,
      })
      .eq('id', doseId);

    if (error) {
      console.error('Update error:', error.message);
    } else {
      setDoses((prev) =>
        prev.map((d) =>
          d.id === doseId
            ? { ...d, status: 'taken', taken_time: now, synced_at: now }
            : d
        )
      );
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Today's Doses</Text>
      <FlatList
        showsVerticalScrollIndicator={false}
        data={doses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const localScheduled = dayjs.utc(item.scheduled_time).local();
          const localTaken = item.taken_time
            ? dayjs.utc(item.taken_time).local()
            : null;

          return (
            <View style={styles.doseItem}>
              <Text style={styles.medName}>
                {item.medications?.name ?? 'Unnamed Medication'}
              </Text>
              <Text style={styles.status}>Status: {item.status}</Text>
              <Text style={styles.time}>
                Scheduled: {localScheduled.format('hh:mm A')}
              </Text>
              {localTaken && (
                <Text style={styles.time}>
                  Taken: {localTaken.format('hh:mm A')}
                </Text>
              )}
              {item.status === 'scheduled' && userRole === 'senior' && (
                <Button
                  title="Mark as Taken"
                  onPress={() => markAsTaken(item.id)}
                />
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center' }}>No doses scheduled for today.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  doseItem: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  medName: { fontSize: 18, fontWeight: '600' },
  status: { marginTop: 4 },
  time: { marginTop: 2, fontSize: 12, color: 'gray' },
});
