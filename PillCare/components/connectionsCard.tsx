import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ConnectionsCard({ connection, user }: { connection: any, user: any }) {
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    const fetchInfo = async () => {
      const data = await extractConnectionInfo(
        user.role === 'senior' ? connection.family_id : connection.senior_id
      );
      setConnectionInfo(data?.[0]);
    };

    fetchInfo();
  }, [refresh]);

  const extractConnectionInfo = async (connectionId: any) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', connectionId);

    if (error) {
      Alert.alert('Error', error.message);
    }

    return data;
  };

  const handleConnectionAccept = async (id: string) => {
    const { data, error } = await supabase
      .from("links")
      .update({
        linked_at: new Date().toISOString(),
        consent_settings: {
          editing_approved: true,
        },
      })
      .eq("id", id)
      .select();

    if (data) {
      Alert.alert('Success', 'Connection accepted');
      setRefresh(!refresh);
    } else if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteConnection = (id: string) => {
    Alert.alert(
      'Delete Connection',
      'Are you sure you want to delete this connection?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            const { data, error } = await supabase
              .from('links')
              .delete()
              .eq('id', id)
              .select();

            if (data) {
              Alert.alert('Success', 'Connection deleted');
              setRefresh(!refresh);
              if (user.role === 'family') {
                router.push('/auth/link-senior');
              }
            } else if (error) {
              Alert.alert('Error', error?.message);
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = async (id: string) => {
    const { data: allConnections } = await supabase
      .from("links")
      .select("*")
      .eq(user.role === 'family' ? 'family_id' : 'senior_id', user.id);

    if ((allConnections?.length || 0) > 1) {
      Alert.alert(
        'Multiple connections or requests',
        'Are you sure you want to accept this request? It will delete other pending requests.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Accept',
            onPress: async () => {
              for (const item of allConnections ?? []) {
                if (item.id === id) {
                  await handleConnectionAccept(id);
                } else {
                  const { error } = await supabase
                    .from('links')
                    .delete()
                    .eq('id', item.id)
                    .select();

                  if (error) {
                    Alert.alert('Error', error.message);
                  }
                }
              }
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      await handleConnectionAccept(id);
    }
  };

  return (
    <View style={styles.container}>
      <Text>{connectionInfo?.user_info?.name}</Text>

      {connection.linked_at ? (
        <>
          <Text>Linked and secured</Text>
          <TouchableOpacity onPress={() => deleteConnection(connection.id)}>
            <Text style={{ color: 'red', marginTop: 10 }}>Delete Connection</Text>
          </TouchableOpacity>
        </>
      ) : connection.consent_settings.requested_by === user.role ? (
        <Text>Not accepted</Text>
      ) : (
        <TouchableOpacity onPress={() => handleAcceptRequest(connection.id)}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Accept Request</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
