import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";

type Task = {
  id: string;
  title: string;
  dueISO?: string | null;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "ms.tasks.v1";

export default function ActionPlanScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setTasks(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
  }, [tasks]);

  const addTask = () => {
    const t = title.trim();
    if (!t) return;
    const now = new Date().toISOString();
    const task: Task = {
      id: `${Date.now()}`,
      title: t,
      dueISO: due.trim() ? toISO(due.trim()) : null,
      done: false,
      createdAt: now,
      updatedAt: now,
    };
    setTasks((prev) => [task, ...prev]);
    setTitle("");
    setDue("");
  };

  const toggleDone = (id: string, done: boolean) => {
    setTasks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, done, updatedAt: new Date().toISOString() } : x))
    );
  };

  const editField = (id: string, field: "title" | "dueISO", value: string) => {
    setTasks((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              [field]: field === "dueISO" ? (value.trim() ? toISO(value) : null) : value,
              updatedAt: new Date().toISOString(),
            }
          : x
      )
    );
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((x) => x.id !== id));
  };

  const sorted = useMemo(() => {
    const byDate = (a?: string | null) => (a ? Date.parse(a) || Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);
    return [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1; // incomplete first
      const da = byDate(a.dueISO), db = byDate(b.dueISO);
      if (da !== db) return da - db;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [tasks]);

  const clearAll = () => {
    Alert.alert("Clear all tasks?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => setTasks([]) },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Action Plan</Text>
      <Text style={styles.note}>Add tasks and due dates (YYYY-MM-DD). They’re saved on your device.</Text>

      <View style={styles.addRow}>
        <TextInput
          placeholder="Task title (e.g., Book IELTS)"
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { flex: 2 }]}
        />
        <TextInput
          placeholder="YYYY-MM-DD"
          value={due}
          onChangeText={setDue}
          style={[styles.input, { width: 140, marginLeft: 8 }]}
        />
      </View>
      <PrimaryButton title="Add task" onPress={addTask} />

      <View style={{ height: 12 }} />

      {sorted.map((t) => (
        <View key={t.id} style={[styles.card, t.done && { opacity: 0.6 }]}>
          <View style={styles.row}>
            <Text style={styles.label}>Done</Text>
            <Switch value={t.done} onValueChange={(v) => toggleDone(t.id, v)} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={t.title}
              onChangeText={(v) => editField(t.id, "title", v)}
              style={styles.input}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Due date</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              value={fromISO(t.dueISO)}
              onChangeText={(v) => editField(t.id, "dueISO", v)}
              style={styles.input}
            />
          </View>

          <View style={styles.rowEnd}>
            <TouchableOpacity onPress={() => removeTask(t.id)}>
              <Text style={{ color: colors.mapleRed, fontWeight: "600" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={{ height: 12 }} />
      <TouchableOpacity onPress={clearAll}>
        <Text style={{ color: "#666", textDecorationLine: "underline" }}>Clear all</Text>
      </TouchableOpacity>
    </View>
  );
}

function toISO(input: string): string | null {
  // Accepts YYYY-MM-DD, returns ISO or null if invalid
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function fromISO(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  note: { color: "#666", marginBottom: 8 },
  addRow: { flexDirection: "row", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  rowEnd: { flexDirection: "row", justifyContent: "flex-end" },
  label: { width: 140, color: colors.text },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 6, padding: 10, backgroundColor: "#fafafa" },
  card: { padding: 12, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa", borderRadius: 8, marginBottom: 10 },
});
