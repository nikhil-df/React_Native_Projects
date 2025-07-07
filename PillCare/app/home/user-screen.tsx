import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UserProfileScreen() {
  const router = useRouter();
  const [userId , setUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [i, setI] = useState<boolean>(false)
  const [user , setUser] = useState<any>()

  useEffect(() => {
    setIsLoading(true)
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if(session){
          setUserId(session?.user.id)
      }else{
        router.navigate("/auth/login")
      }

      const {data : user , error} = await supabase.from("users").select("*").eq("id" , userId).single()

      if(!error){
        setUser(user)
        console.log(user)
      }else{
        router.navigate("/auth/select-user-type")
      }

      console.log(userId)
      setIsLoading(false)
    }
    fetchData()
  }, [])


  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Section: Basic Info */}
      <View style={styles.section}>
        <Text style={styles.label}>Name:{user.user_info.name}</Text>
        {/* TODO: Add Name Input */}
      </View>

      {/* Section: Role */}
      <View style={styles.section}>
        <Text style={styles.label}>Role:{user.role}</Text>
        {/* TODO: Show user role */}
      </View>

      {/* Section: Preferences */}
      <View style={styles.section}>
        <Text style={styles.label}>Preferences:</Text>
        {/* TODO: Add preferences UI */}
      </View>

      {/* Section: Connection Status */}
      <View style={styles.section}>
        <Text style={styles.label}>Connection:</Text>
        {/* TODO: Show connection info or connect button */}
      </View>

      <TouchableOpacity style={styles.button} onPress={() => setI(!i)}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
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
