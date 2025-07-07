import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    async function checkUser() {
      if (loading) return;

      if (!session) {
        router.replace('/auth/signup');
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.replace('/auth/signup');
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        router.replace('/auth/select-user-type');
        return;
      }

      if (userProfile.role === 'senior') {
        router.replace('/home/medications');
        return;
      }

      if (userProfile.role === 'family') {
        const { data: links, error: linkError } = await supabase
          .from('links')
          .select('id, linked_at')
          .eq('family_id', user.id)
          .maybeSingle(); // get 0 or 1 row

        if (linkError) {
          router.replace('/auth/link-senior');
          return;
        }

        if (!links) {
          // No request sent yet
          router.replace('/auth/link-senior');
        } else if (!links.linked_at) {
          // Request sent but not approved
          router.replace('/auth/show-request');
        } else {
          // Approved
          router.replace('/home/medications');
        }
      }
    }

    checkUser();
  }, [session, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}
