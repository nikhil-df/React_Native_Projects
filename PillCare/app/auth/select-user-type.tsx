import { supabase } from "@/lib/supabase";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function SelectUserType() {
  const router = useRouter();
  const navigation = useNavigation();

  const [userType, setUserType] = useState<"senior" | "family" | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "Select User Type",
      headerTitleAlign: "center",
      headerBackVisible: false,
    });
  }, []);

  const handleConfirm = async () => {
    if (!userType || !name.trim()) {
      Alert.alert("Incomplete", "Please enter your name and select a user type.");
      return;
    }

    setLoading(true);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      Alert.alert("Error", "Failed to get authenticated user.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      phone: null,
      role: userType,
      plan_type: null,
      created_at: new Date().toISOString(),
      user_info: {
        name: name.trim()
      },
    });

    setLoading(false);

    if (insertError) {
      Alert.alert("Error", insertError.message);
    } else {
      router.push({
        pathname: "/auth/link-senior",
        params: { userType: userType === "family" ? "Family Member" : "user" }
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select User Type</Text>

      <TextInput
        placeholder="Enter your name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[
            styles.button,
            userType === "senior" && styles.buttonSelected
          ]}
          onPress={() => setUserType("senior")}
        >
          <Text style={styles.buttonText}>User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            userType === "family" && styles.buttonSelected
          ]}
          onPress={() => setUserType("family")}
        >
          <Text style={styles.buttonText}>Family Member</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, loading && { opacity: 0.5 }]}
        onPress={handleConfirm}
        disabled={loading}
      >
        <Text style={styles.confirmText}>
          {loading ? "Creating..." : "Confirm"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 32,
  },
  button: {
    padding: 16,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    width: "45%",
    alignItems: "center",
  },
  buttonSelected: {
    backgroundColor: "#005bb5",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "green",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
