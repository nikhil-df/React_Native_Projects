import ConnectionsCard from '@/components/connectionsCard';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UserProfileScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [connection, setConnection] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const id = session.user.id;
        setUserId(id);

        const { data: fetchedUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        const { data: connection } = await supabase
          .from('links')
          .select('*')
          .eq(fetchedUser.role === 'family' ? 'family_id' : 'senior_id', id)

        if (!connection && fetchedUser.role === 'family') {
          router.navigate('/auth/link-senior');
        } else {
          setConnection(connection);
        }

        if (fetchedUser) {
          setUser(fetchedUser);
        } else {
          router.navigate('/auth/select-user-type');
        }
      } else {
        router.navigate('/auth/login');
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!isLoading && !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>User not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {user && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Name: {user.user_info?.name || 'N/A'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Role: {user.role || 'N/A'}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Email: {user.email || 'N/A'}</Text>
          </View>


          {
            connection[0] ? (
              <FlatList
                data={connection}
                renderItem={({ item }) => (
                  <ConnectionsCard connection={item} user={user} />
                )}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.section}>
                <Text style={styles.label}>No connection found. Please link to a member.</Text>
                <TouchableOpacity onPress={() => router.push('/auth/link-senior')}>
                  <Text style={[styles.buttonText, { color: 'blue' }]}>Link to a member</Text>
                </TouchableOpacity>
              </View>
            )
          }
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/auth/login');
            }}>
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
