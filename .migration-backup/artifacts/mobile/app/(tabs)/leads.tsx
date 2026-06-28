import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Lead, LeadStage, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STAGES: LeadStage[] = ["New", "Researching", "Contacted", "Meeting", "Qualified"];
const STAGE_COLORS: Record<LeadStage, string> = {
  New: "#6b7280",
  Researching: "#3b82f6",
  Contacted: "#d97706",
  Meeting: "#9333ea",
  Qualified: "#059669",
};

function ScoreBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[scoreBadgeStyles.wrap, { backgroundColor: color + "22" }]}>
      <Text style={[scoreBadgeStyles.text, { color }]}>{label} {value}</Text>
    </View>
  );
}
const scoreBadgeStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontSize: 11, fontWeight: "600" as const },
});

function AddLeadModal({ visible, onClose, onSave, colors }: {
  visible: boolean;
  onClose: () => void;
  onSave: (lead: Omit<Lead, "id" | "lastTouched">) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [email, setEmail] = useState("");
  const [fitScore, setFitScore] = useState("70");
  const [intentScore, setIntentScore] = useState("60");
  const [nextStep, setNextStep] = useState("");
  const [signal, setSignal] = useState("");

  function handleSave() {
    if (!name.trim() || !company.trim()) {
      Alert.alert("Required", "Name and company are required.");
      return;
    }
    onSave({
      name: name.trim(),
      title: title.trim() || "Unknown",
      company: company.trim(),
      industry: industry.trim() || "General",
      email: email.trim(),
      fitScore: Math.min(100, Math.max(0, Number(fitScore) || 70)),
      intentScore: Math.min(100, Math.max(0, Number(intentScore) || 60)),
      stage: "New",
      nextStep: nextStep.trim() || "Review and qualify",
      tags: [],
      recentSignal: signal.trim() || "Added manually",
      notes: "",
    });
    setName(""); setTitle(""); setCompany(""); setIndustry("");
    setEmail(""); setFitScore("70"); setIntentScore("60");
    setNextStep(""); setSignal("");
    onClose();
  }

  const inputStyle = [styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }];
  const labelStyle = [styles.label, { color: colors.mutedForeground }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Lead</Text>
          <Pressable onPress={handleSave}>
            <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={labelStyle}>Name *</Text>
          <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.mutedForeground} />
          <Text style={labelStyle}>Title</Text>
          <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholder="VP Sales" placeholderTextColor={colors.mutedForeground} />
          <Text style={labelStyle}>Company *</Text>
          <TextInput style={inputStyle} value={company} onChangeText={setCompany} placeholder="Acme Corp" placeholderTextColor={colors.mutedForeground} />
          <Text style={labelStyle}>Industry</Text>
          <TextInput style={inputStyle} value={industry} onChangeText={setIndustry} placeholder="SaaS, Fintech, Healthtech…" placeholderTextColor={colors.mutedForeground} />
          <Text style={labelStyle}>Email</Text>
          <TextInput style={inputStyle} value={email} onChangeText={setEmail} placeholder="name@company.com" placeholderTextColor={colors.mutedForeground} keyboardType="email-address" autoCapitalize="none" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Fit Score (0-100)</Text>
              <TextInput style={inputStyle} value={fitScore} onChangeText={setFitScore} keyboardType="numeric" placeholder="70" placeholderTextColor={colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Intent Score (0-100)</Text>
              <TextInput style={inputStyle} value={intentScore} onChangeText={setIntentScore} keyboardType="numeric" placeholder="60" placeholderTextColor={colors.mutedForeground} />
            </View>
          </View>
          <Text style={labelStyle}>Recent Signal</Text>
          <TextInput style={inputStyle} value={signal} onChangeText={setSignal} placeholder="Posted about scaling outbound…" placeholderTextColor={colors.mutedForeground} />
          <Text style={labelStyle}>Next Step</Text>
          <TextInput style={inputStyle} value={nextStep} onChangeText={setNextStep} placeholder="Send personalised sequence" placeholderTextColor={colors.mutedForeground} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function LeadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { leads, addLead, updateLead, deleteLead } = useApp();
  const [search, setSearch] = useState("");
  const [addVisible, setAddVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<LeadStage | "All">("All");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    let list = leads;
    if (selectedStage !== "All") list = list.filter(l => l.stage === selectedStage);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.industry.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.fitScore + b.intentScore - (a.fitScore + a.intentScore));
  }, [leads, search, selectedStage]);

  function handleDelete(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Lead", "Remove this lead permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteLead(id) },
    ]);
  }

  function advanceStage(lead: Lead) {
    const idx = STAGES.indexOf(lead.stage);
    if (idx < STAGES.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateLead(lead.id, { stage: STAGES[idx + 1] });
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerArea, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Leads</Text>
        <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads…"
            placeholderTextColor={colors.mutedForeground}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
          {(["All", ...STAGES] as const).map(stage => (
            <Pressable
              key={stage}
              style={[styles.stageFilter, {
                backgroundColor: selectedStage === stage ? colors.primary : colors.muted,
                borderColor: selectedStage === stage ? colors.primary : colors.border,
              }]}
              onPress={() => setSelectedStage(stage)}
            >
              <Text style={[styles.stageFilterText, { color: selectedStage === stage ? "#fff" : colors.mutedForeground }]}>
                {stage}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        scrollEnabled={!!filtered.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {leads.length === 0 ? "No leads yet" : "No matches"}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              {leads.length === 0 ? "Tap + to add your first lead" : "Try a different search"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.leadCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/lead/${item.id}`); }}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.leadName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.leadSub, { color: colors.mutedForeground }]}>{item.title} · {item.company}</Text>
              </View>
              <View style={styles.cardChevron}>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </View>
            <View style={styles.cardMid}>
              <ScoreBadge label="Fit" value={item.fitScore} color={colors.primary} />
              <ScoreBadge label="Intent" value={item.intentScore} color={colors.accent} />
              <View style={[styles.stagePill, { backgroundColor: STAGE_COLORS[item.stage] + "18" }]}>
                <Text style={[styles.stagePillText, { color: STAGE_COLORS[item.stage] }]}>{item.stage}</Text>
              </View>
            </View>
            {item.recentSignal ? (
              <Text style={[styles.signal, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.recentSignal}
              </Text>
            ) : null}
            <View style={styles.cardActions}>
              <Pressable
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={(e) => { e.stopPropagation?.(); advanceStage(item); }}
              >
                <Feather name="arrow-right" size={13} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Advance stage</Text>
              </Pressable>
              <Text style={[styles.touched, { color: colors.mutedForeground }]}>{item.lastTouched}</Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAddVisible(true); }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      <AddLeadModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSave={addLead}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerArea: { paddingHorizontal: 16, paddingBottom: 8 },
  screenTitle: { fontSize: 26, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 12 },
  searchWrap: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  stageFilter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  stageFilterText: { fontSize: 12, fontWeight: "500" },
  list: { padding: 16, paddingTop: 8, gap: 10 },
  leadCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardChevron: { paddingTop: 2 },
  leadName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  leadSub: { fontSize: 12, marginTop: 2 },
  cardMid: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  stagePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  stagePillText: { fontSize: 11, fontWeight: "500" },
  signal: { fontSize: 12 },
  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  actionText: { fontSize: 12, fontWeight: "500" },
  touched: { fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyHint: { fontSize: 13 },
  fab: { position: "absolute", bottom: 100, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#d946ef", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  modalCancel: { fontSize: 15 },
  modalSave: { fontSize: 15, fontWeight: "600" },
  modalContent: { padding: 20, gap: 4, paddingBottom: 60 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: "row", gap: 12 },
});
