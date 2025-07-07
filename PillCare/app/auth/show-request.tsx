import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Text, View } from "react-native";

export default function ShowRequestScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchLink = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("family_id", session.user.id)
        .is("linked_at", null)
        .maybeSingle();

      if (error) {
        setError("Failed to fetch link request.");
        console.error(error);
      } else {
        setLink(data);
      }

      setLoading(false);
    };

    fetchLink();
  }, [session?.user?.id]);

  const acceptRequest = async () => {
    if (!link) return;

    setSubmitting(true);

    const updatedConsent = { editing_approved: false };

    const { error } = await supabase
      .from("links")
      .update({
        consent_settings: updatedConsent,
        linked_at: new Date().toISOString()
      })
      .eq("id", link.id);

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", "Could not accept the request.");
      console.error(error);
    } else {
      router.replace("/home/medications");
    }
  };

  const handleResendRequest = () => {
    router.replace("/auth/link-senior");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !link) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{error ?? "No pending request found."}</Text>
        <View style={{ marginTop: 20 }}>
          <Button title="Resend Request" onPress={handleResendRequest} />
          <View style={{ height: 10 }} />
          <Button title="Logout" onPress={handleLogout} color="red" />
        </View>
      </View>
    );
  }

  const consent = link.consent_settings || {};
  const requestedBy = consent.requested_by;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>
        You have a pending request to link with a senior.
      </Text>

      {requestedBy === "senior" ? (
        <>
          <Text style={{ marginBottom: 10 }}>
            The senior invited you to manage their medications.
          </Text>
          <Button title="Accept Request" onPress={acceptRequest} disabled={submitting} />
        </>
      ) : (
        <Text style={{ marginBottom: 10 }}>
          You've already sent a request. Please wait for the senior to approve it.
        </Text>
      )}

      <View style={{ marginTop: 30 }}>
        <Button title="Resend Request" onPress={handleResendRequest} />
        <View style={{ height: 10 }} />
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>
    </View>
  );
}
