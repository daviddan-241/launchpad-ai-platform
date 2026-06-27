import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STAGE_COLORS: Record<string, string> = {
  New: "#8b7a9e",
  Researching: "#60a5fa",
  Contacted: "#f59e0b",
  Meeting: "#d946ef",
  Qualified: "#10b981",
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { leads, tasks } = useApp();

  const stats = useMemo(() => {
    const hot = leads.filter(l => l.fitScore >= 80 && l.intentScore >= 70).length;
    const meetings = leads.filter(l => l.stage === "Meeting" || l.stage === "Qualified").length;
    const pipeline = leads.reduce((sum, l) => sum + (l.fitScore + l.intentScore), 0);
    return { total: leads.length, hot, meetings, pipeline };
  }, [leads]);

  const pendingTasks = tasks.filter(t => !t.done);
  const recentLeads = leads.slice(0, 5);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>LeadForge</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Revenue Workspace</Text>
        </View>
        <Pressable
          style={[styles.chatBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "40" }]}
          onPress={() => router.push("/(tabs)/chat")}
        >
          <Feather name="zap" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: "Leads", value: stats.total, icon: "users" as const, color: colors.primary },
          { label: "Hot", value: stats.hot, icon: "trending-up" as const, color: colors.accent },
          { label: "Meetings", value: stats.meetings, icon: "calendar" as const, color: colors.positive },
          { label: "Tasks", value: pendingTasks.length, icon: "check-circle" as const, color: "#60a5fa" },
        ].map(stat => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={stat.icon} size={16} color={stat.color} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {pendingTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pending Tasks</Text>
          {pendingTasks.slice(0, 3).map(task => (
            <View key={task.id} style={[styles.taskRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.priorityDot, {
                backgroundColor: task.priority === "High" ? colors.destructive : task.priority === "Medium" ? colors.accent : colors.mutedForeground
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, { color: colors.foreground }]} numberOfLines={1}>{task.title}</Text>
                <Text style={[styles.taskDue, { color: colors.mutedForeground }]}>{task.due}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Leads</Text>
          <Pressable onPress={() => router.push("/(tabs)/leads")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>

        {recentLeads.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No leads yet</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Add your first lead in the Leads tab</Text>
          </View>
        ) : (
          recentLeads.map(lead => (
            <View key={lead.id} style={[styles.leadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.leadInfo}>
                <Text style={[styles.leadName, { color: colors.foreground }]}>{lead.name}</Text>
                <Text style={[styles.leadSub, { color: colors.mutedForeground }]}>{lead.title} · {lead.company}</Text>
              </View>
              <View style={styles.leadScores}>
                <View style={[styles.scoreBadge, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.scoreText, { color: colors.primary }]}>F{lead.fitScore}</Text>
                </View>
                <View style={[styles.stageDot, { backgroundColor: STAGE_COLORS[lead.stage] + "33" }]}>
                  <Text style={[styles.stageText, { color: STAGE_COLORS[lead.stage] }]}>{lead.stage}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  title: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  chatBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 16, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: "500" },
  taskRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, gap: 10, marginBottom: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 14, fontWeight: "500", fontFamily: "Inter_500Medium" },
  taskDue: { fontSize: 12, marginTop: 2 },
  leadCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  leadSub: { fontSize: 12, marginTop: 2 },
  leadScores: { flexDirection: "row", gap: 6, alignItems: "center" },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  scoreText: { fontSize: 11, fontWeight: "600" },
  stageDot: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  stageText: { fontSize: 11, fontWeight: "500" },
  emptyCard: { alignItems: "center", padding: 32, borderRadius: 20, borderWidth: 1, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  emptyHint: { fontSize: 13, textAlign: "center" },
});
