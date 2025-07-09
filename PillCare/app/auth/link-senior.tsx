import { supabase } from "@/lib/supabase";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LinkSeniors() {
  const [user, setUser] = useState<any>(null);
  const navigation = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [isSenior, setIsSenior] = useState<boolean>(false);


  useEffect(() => {
    const getUser = async () => {
      const user = await getCurrentUser();
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) {
        Alert.alert("Error", "Error fetching user data");
        return null;
      }

      setUser(userData);
      setIsSenior(userData?.role === "senior");
      return userData;
    };

    getUser();
    navigation.setOptions({
      headerShown: false
    });
  }, []);



  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  };

  const isSelfLink = (currentUserEmail: string, targetEmail: string) => {
    return currentUserEmail.toLowerCase() === targetEmail.toLowerCase();
  };

  const findOppositeUser = async (email: string, currentUserId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", email)
      .neq("id", currentUserId)
      .maybeSingle();

    return error ? null : data;
  };

  const hasExistingLink = async (currentUserId: string) => {
    const { data } = await supabase
      .from("links")
      .select("*")
      .or(`senior_id.eq.${currentUserId},family_id.eq.${currentUserId}`);
    return data ?? [];
  };

  const deleteExistingLinks = async (currentUserId: string) => {
    const { error } = await supabase
      .from("links")
      .delete()
      .or(`senior_id.eq.${currentUserId},family_id.eq.${currentUserId}`);
    return error;
  };

  const createNewLink = async (
    currentUserId: string,
    oppositeUserId: string,
    currentIsSenior: boolean
  ) => {
    const { error } = await supabase.from("links").insert({
      senior_id: currentIsSenior ? currentUserId : oppositeUserId,
      family_id: currentIsSenior ? oppositeUserId : currentUserId,
      consent_settings: { requested_by: currentIsSenior ? "senior" : "family" },
      linked_at: null,
    });

    return error;
  };

  const handleLink = async () => {
    if (!email.trim()) {
      Alert.alert("Validation", "Please enter an email.");
      return;
    }

    setLoading(true);

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      Alert.alert("Error", "Unable to get current user.");
      setLoading(false);
      return;
    }

    if (isSelfLink(currentUser.email ?? "", email)) {
      Alert.alert("Invalid", "You cannot link with your own email.");
      setLoading(false);
      return;
    }

    const oppositeUser = await findOppositeUser(email.trim().toLowerCase(), currentUser.id);
    if (!oppositeUser || oppositeUser.role === user?.role) {
      Alert.alert("Not Found", "No opposite user found with that email.");
      setLoading(false);
      return;
    }

    const existingLinks = await hasExistingLink(currentUser.id);
    const isCurrentUserSenior = isSenior;

    const proceedWithLink = async () => {
      const error = await createNewLink(currentUser.id, oppositeUser.id, isCurrentUserSenior);
      setLoading(false);

      if (error) {
        Alert.alert("Error", "Failed to send link request.");
      } else {
        Alert.alert("Success", "Link request sent.");
        setEmail("");
        router.replace("/");
      }
    };

    if (existingLinks.length > 0) {
      Alert.alert(
        "Already Linked",
        "You're already linked to someone. Do you want to replace this link?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setLoading(false),
          },
          {
            text: "Replace",
            style: "destructive",
            onPress: async () => {
              const error = await deleteExistingLinks(currentUser.id);
              if (error) {
                Alert.alert("Error", "Failed to remove previous link.");
                setLoading(false);
              } else {
                await proceedWithLink();
              }
            },
          },
        ]
      );
    } else {
      await proceedWithLink();
    }
  };

  const handleSkip = () => {
    router.replace("/home/medications");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Link {isSenior ? "Family Member" : "Senior"}
      </Text>

      <TextInput
        placeholder="Enter email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button
        title={loading ? "Linking..." : "Send Link Request"}
        onPress={handleLink}
        disabled={loading}
      />

      {isSenior && (
        <View style={{ marginTop: 20 }}>
          <Button title="Skip for Now" onPress={handleSkip} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
});
