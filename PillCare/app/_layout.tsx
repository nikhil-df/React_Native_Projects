import { useColors } from "@/constants/allConstants";
import AuthProvider from "@/lib/auth";
import { Stack } from "expo-router";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  const colours = useColors();
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colours.background }} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar
          backgroundColor={colours.background}
          barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        />
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
