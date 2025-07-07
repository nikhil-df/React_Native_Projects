import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
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
  const params = useLocalSearchParams();
  const userType = params.userType as "user" | "Family Member";
  const navigation = useNavigation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isSenior = userType === "user";

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: isSenior ? "Link Family Member" : "Link Senior User",
      headerTitleAlign: "center",
      headerBackVisible: false,
    });
  }, []);

  const handleLink = async () => {
    if (!email.trim()) {
      Alert.alert("Validation", "Please enter an email.");
      return;
    }

    setLoading(true);

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      Alert.alert("Error", "Unable to get current user.");
      setLoading(false);
      return;
    }

    if (email.trim().toLowerCase() === currentUser.email?.toLowerCase()) {
      Alert.alert("Invalid", "You cannot link with your own email.");
      setLoading(false);
      return;
    }

    const { data: oppositeUser, error: lookupError } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", email.trim().toLowerCase())
      .neq("id", currentUser.id)
      .maybeSingle();

    if (lookupError || !oppositeUser) {
      Alert.alert("Not Found", "No user found with that email.");
      setLoading(false);
      return;
    }

    const isCurrentUserSenior = isSenior;
    const currentUserField = isCurrentUserSenior ? "senior_id" : "family_id";

    // Check for existing links
    const { data: existingLinksRaw } = await supabase
      .from("links")
      .select("*")
      .or(`senior_id.eq.${currentUser.id},family_id.eq.${currentUser.id}`);

    const existingLinks = existingLinksRaw ?? [];

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
              const { error: deleteError } = await supabase
                .from("links")
                .delete()
                .or(
                  `senior_id.eq.${currentUser.id},family_id.eq.${currentUser.id}`
                );

              if (deleteError) {
                Alert.alert("Error", "Failed to remove previous link.");
                setLoading(false);
                return;
              }

              await createNewLink(
                currentUser.id,
                oppositeUser.id,
                isCurrentUserSenior
              );
            },
          },
        ]
      );
    } else {
      await createNewLink(
        currentUser.id,
        oppositeUser.id,
        isCurrentUserSenior
      );
    }
  };

  const createNewLink = async (
    currentUserId: string,
    oppositeUserId: string,
    currentIsSenior: boolean
  ) => {
    const { error: insertError } = await supabase.from("links").insert({
      senior_id: currentIsSenior ? currentUserId : oppositeUserId,
      family_id: currentIsSenior ? oppositeUserId : currentUserId,
      consent_settings: { requested_by: currentIsSenior ? "senior" : "family" },
      linked_at: null,
    });

    setLoading(false);

    if (insertError) {
      Alert.alert("Error", "Failed to send link request.");
    } else {
      Alert.alert("Success", "Link request sent.");
      setEmail("");
      router.replace("/"); // 🔁 Redirect after success
    }
  };

  const handleSkip = () => {
    router.replace("/"); // 👈 Redirect senior who wants to skip
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
