import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme, Theme } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./src/theme/colors";

const queryClient = new QueryClient();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.mapleRed,
    background: colors.background,
    card: "#fff",
    text: colors.text,
    border: "#e6e6e6",
    notification: colors.mapleRed
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
