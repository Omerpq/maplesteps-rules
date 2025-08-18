import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Switch } from "react-native";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { getRulesVersion } from "../services/rules";
import { calculateCrs, getCrsVersion, primeCrsParams, getCrsLastSynced } from "../services/crs";
import { calculateFsw67, getFswVersion, primeFswParams, getFswLastSynced } from "../services/fsw67";
import RulesBadge from "../components/RulesBadge";

export default function ScoreScreen({ navigation }: any) {
  // Shared inputs
  const [age, setAge] = useState("29");
  const [clb, setClb] = useState("9");
  const [education, setEducation] = useState("masters" as any);
  const [fswSynced, setFswSynced] = useState<string>("local");

  // Re‑prime rules whenever this screen gains focus
  React.useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      primeCrsParams();
      primeFswParams();
    });
    return unsub;
  }, [navigation]);

  // CRS output
  const [crsScore, setCrsScore] = useState<number | null>(null);
  const [crsSynced, setCrsSynced] = useState<string>("local");

  // FSW-67 inputs
  const [fswYears, setFswYears] = useState("3");
  const [fswArranged, setFswArranged] = useState(false);

  // Adaptability toggles
  const [adSpouseCLB4, setAdSpouseCLB4] = useState(false);
  const [adRelativeCA, setAdRelativeCA] = useState(false);
  const [adCanadianStudy, setAdCanadianStudy] = useState(false);
  const [adArranged, setAdArranged] = useState(false);
  const [adCanadianWork1yr, setAdCanadianWork1yr] = useState(false);

  useEffect(() => {
    if (fswArranged) setAdArranged(true);
  }, [fswArranged]);

  // FSW-67 output
  const [fswResult, setFswResult] = useState<null | {
    total: number;
    pass: boolean;
    passMark: number;
    classification: "Likely" | "Borderline" | "Unlikely";
    version: string;
    breakdown: Record<string, number>;
  }>(null);

  const rulesVersion = getRulesVersion();
  const crsVersion = getCrsVersion();
  const fswVersion = getFswVersion();

  // 🔌 Load CRS/FSW params (remote-first) once on mount
  useEffect(() => {
    primeCrsParams().then(() => setCrsSynced(getCrsLastSynced()));
    primeFswParams().then(() => setFswSynced(getFswLastSynced()));
  }, []);

  const runCrs = () => {
    const s = calculateCrs({
      age: Number(age) || 0,
      clb: Number(clb) || 0,
      education: (education || "bachelor") as any,
    });
    setCrsScore(s);
  };

  const runFsw = () => {
    const res = calculateFsw67({
      age: Number(age) || 0,
      clb: Number(clb) || 0,
      education: (education || "bachelor") as any,
      experienceYears: Number(fswYears) || 0,
      arrangedEmployment: fswArranged,
      adaptability: {
        spouse_language_clb4: adSpouseCLB4,
        relative_in_canada: adRelativeCA,
        canadian_study: adCanadianStudy,
        arranged_employment: adArranged,
        canadian_work_1yr: adCanadianWork1yr,
      },
    });
    setFswResult(res);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Eligibility Score — v2</Text>
      <RulesBadge />

      {/* Shared inputs */}
      <View style={styles.row}>
        <Text style={styles.label}>Age</Text>
        <TextInput keyboardType="number-pad" value={age} onChangeText={setAge} style={styles.input} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Primary language CLB</Text>
        <TextInput keyboardType="number-pad" value={clb} onChangeText={setClb} style={styles.input} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Education (bachelor/masters/phd)</Text>
        <TextInput autoCapitalize="none" value={education} onChangeText={setEducation} style={styles.input} />
      </View>

      {/* CRS (demo) */}
      <PrimaryButton title="Calculate CRS (demo)" onPress={runCrs} />
      {crsScore !== null && (
        <Text style={styles.result}>
          Demo CRS estimate: <Text style={{ fontWeight: "800" }}>{crsScore}</Text>
        </Text>
      )}

      {/* Divider */}
      <View style={{ height: 16 }} />

      {/* FSW-67 (demo) */}
      <Text style={styles.h2}>FSW-67 Pre-check</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Skilled experience years</Text>
        <TextInput keyboardType="number-pad" value={fswYears} onChangeText={setFswYears} style={styles.input} />
      </View>
      <View style={[styles.row, { alignItems: "center" }]}>
        <Text style={styles.label}>Arranged employment (LMIA/valid offer)</Text>
        <Switch value={fswArranged} onValueChange={setFswArranged} />
      </View>

      <Text style={[styles.h2, { marginTop: 10 }]}>Adaptability (max 10)</Text>
      <View style={[styles.row, { alignItems: "center" }]}><Text style={styles.label}>Spouse language ≥ CLB4</Text><Switch value={adSpouseCLB4} onValueChange={setAdSpouseCLB4} /></View>
      <View style={[styles.row, { alignItems: "center" }]}><Text style={styles.label}>Relative in Canada</Text><Switch value={adRelativeCA} onValueChange={setAdRelativeCA} /></View>
      <View style={[styles.row, { alignItems: "center" }]}><Text style={styles.label}>Canadian study (eligible)</Text><Switch value={adCanadianStudy} onValueChange={setAdCanadianStudy} /></View>
      <View style={[styles.row, { alignItems: "center" }]}><Text style={styles.label}>Arranged employment (+5)</Text><Switch value={adArranged} onValueChange={setAdArranged} /></View>
      <View style={[styles.row, { alignItems: "center" }]}><Text style={styles.label}>Canadian work ≥ 1 year</Text><Switch value={adCanadianWork1yr} onValueChange={setAdCanadianWork1yr} /></View>

      <PrimaryButton title="FSW-67 Check" onPress={runFsw} />

      {fswResult && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {fswResult.classification} {fswResult.pass ? "✓" : "✕"}
            </Text>
            <Text style={styles.cardMeta}>
              Score {fswResult.total} / {fswResult.passMark}
            </Text>
          </View>

          <View style={styles.breakdown}>
            <Text>Education: {fswResult.breakdown.education}</Text>
            <Text>Language: {fswResult.breakdown.language}</Text>
            <Text>Experience: {fswResult.breakdown.experience}</Text>
            <Text>Age: {fswResult.breakdown.age}</Text>
            <Text>Arranged employment: {fswResult.breakdown.arranged_employment}</Text>
            <Text>Adaptability: {fswResult.breakdown.adaptability}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  h2: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8, marginTop: 4 },
  meta: { color: "#666", marginBottom: 2 },
  metaSmall: { color: "#888", marginBottom: 12, fontSize: 12 },
  row: { flexDirection: "row", marginBottom: 8 },
  label: { width: 240, color: colors.text, paddingTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 6, padding: 10, backgroundColor: "#fafafa" },
  result: { marginTop: 12, fontWeight: "600", color: colors.mapleRed },
  card: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa" },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardMeta: { color: "#666" },
  breakdown: { marginTop: 8, gap: 2 },
});
