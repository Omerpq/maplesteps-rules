import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import QuickCheckScreen from "../screens/QuickCheckScreen";
import ScoreScreen from "../screens/ScoreScreen";
import ActionPlanScreen from "../screens/ActionPlanScreen";
import TimelineScreen from "../screens/TimelineScreen";
import UpdatesScreen from "../screens/UpdatesScreen";
import VaultScreen from "../screens/VaultScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { Text } from "react-native";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true, tabBarActiveTintColor: colors.mapleRed }}>
      <Tab.Screen name="QuickCheck" component={QuickCheckScreen} options={{ title: "QuickCheck" }} />
      <Tab.Screen name="Score" component={ScoreScreen} options={{ title: "Score" }} />
      <Tab.Screen name="ActionPlan" component={ActionPlanScreen} options={{ title: "Action Plan" }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ title: "Timeline" }} />
      <Tab.Screen name="Updates" component={UpdatesScreen} options={{ title: "Updates" }} />
      <Tab.Screen name="Vault" component={VaultScreen} options={{ title: "Vault" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Tab.Navigator>
  );
}
