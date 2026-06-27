import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.plumLight,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 64,
        },
        tabBarBackground: isIOS
          ? () => (
              <BlurView
                intensity={80}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="users" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="zap" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="mail" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
