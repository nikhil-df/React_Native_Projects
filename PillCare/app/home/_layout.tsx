import { Tabs } from "expo-router";

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="medications"
        options={{ title: "Medications" }}
      />
      <Tabs.Screen
        name="dose-logs"
        options={{ title: "Dose Logs" }}
      />
      <Tabs.Screen
        name="AnalyticsScreen"
        options={{ title: "AnalyticsScreen" }}
      />
      <Tabs.Screen
        name="user-screen"
        options={{ title: "User Screen" }}
      />
    </Tabs>
  );
}
