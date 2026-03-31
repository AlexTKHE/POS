import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HUBS = ["Health", "Mind", "Finance", "Relationships", "Learning", "Productivity"];
const HEALTH_SECTIONS = ["Overview", "Lift", "Diet"] as const;
const SNAPSHOT_ITEMS = [
  {
    key: "sleep",
    label: "Average sleep",
    value: "7h 18m",
    change: "+22m",
    changeDirection: "up",
  },
  {
    key: "weight",
    label: "Average morning weight",
    value: "181.9 lb",
    change: "-0.7 lb",
    changeDirection: "down",
  },
  {
    key: "steps",
    label: "Average steps",
    value: "7,980",
    change: "+640",
    changeDirection: "up",
  },
  {
    key: "energy",
    label: "Average morning energy",
    value: "7.1 / 10",
    change: "+0.6",
    changeDirection: "up",
  },
  {
    key: "soreness",
    label: "Average soreness",
    value: "4.2 / 10",
    change: "-0.9",
    changeDirection: "down",
  },
] as const;

type HealthSection = (typeof HEALTH_SECTIONS)[number];
type SnapshotKey = (typeof SNAPSHOT_ITEMS)[number]["key"];

export function HealthHubScreen() {
  const [activeHub, setActiveHub] = useState("Health");
  const [activeSection, setActiveSection] = useState<HealthSection>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [waterCount, setWaterCount] = useState(4);
  const [detailKey, setDetailKey] = useState<SnapshotKey | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const menuProgress = useRef(new Animated.Value(0)).current;
  const detailProgress = useRef(new Animated.Value(0)).current;

  const activeSnapshot = SNAPSHOT_ITEMS.find((item) => item.key === detailKey) ?? null;

  const openMenu = () => {
    setMenuVisible(true);
    setMenuOpen(true);

    Animated.timing(menuProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    setMenuOpen(false);

    Animated.timing(menuProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  };

  const openDetail = (key: SnapshotKey) => {
    setDetailKey(key);
    setDetailVisible(true);

    Animated.timing(detailProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDetail = () => {
    Animated.timing(detailProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDetailVisible(false);
        setDetailKey(null);
      }
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBarShell}>
        <View style={styles.topBar}>
          <View style={styles.hubTitle}>
            <Text style={styles.hubNameAccent}>{activeHub}</Text>
            <Text style={styles.hubNameBase}>hub</Text>
          </View>
          <Pressable
            accessibilityLabel="Open hub menu"
            onPress={openMenu}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.menuButtonPressed,
            ]}
          >
            <View style={styles.menuIcon}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </View>
          </Pressable>
        </View>
        <View style={styles.navDivider} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bodyBlock}>
          <Text style={styles.kicker}>Welcome to Health Hub:</Text>
          <View style={styles.sectionSwitchRow}>
            {HEALTH_SECTIONS.map((section) => (
              <Pressable
                key={section}
                onPress={() => setActiveSection(section)}
                style={({ pressed }) => [
                  styles.sectionSwitch,
                  activeSection === section && styles.sectionSwitchActive,
                  pressed && styles.sectionSwitchPressed,
                ]}
              >
                <Text
                  style={[
                    styles.sectionSwitchText,
                    activeSection === section && styles.sectionSwitchTextActive,
                  ]}
                >
                  {section}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {activeSection === "Overview" ? (
          <>
            <View style={styles.hydrationCard}>
              <View style={styles.hydrationHeader}>
                <View>
                  <Text style={styles.metricLabel}>Hydration</Text>
                  <Text style={styles.hydrationValue}>{waterCount} bottles today</Text>
                </View>
                <Text style={styles.metricSubtext}>Bottle size: 24 oz</Text>
              </View>

              <View style={styles.hydrationControls}>
                <Pressable
                  accessibilityLabel="Remove one bottle"
                  onPress={() => setWaterCount((count) => Math.max(0, count - 1))}
                  style={({ pressed }) => [
                    styles.hydrationButton,
                    pressed && styles.hydrationButtonPressed,
                  ]}
                >
                  <Text style={styles.hydrationButtonText}>-</Text>
                </Pressable>

                <View style={styles.hydrationCountPill}>
                  <Text style={styles.hydrationCountText}>{waterCount * 24} oz</Text>
                </View>

                <Pressable
                  accessibilityLabel="Add one bottle"
                  onPress={() => setWaterCount((count) => count + 1)}
                  style={({ pressed }) => [
                    styles.hydrationButton,
                    pressed && styles.hydrationButtonPressed,
                  ]}
                >
                  <Text style={styles.hydrationButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.snapshotBlock}>
              <Text style={styles.title}>A Snapshot</Text>

              <View style={styles.snapshotList}>
                {SNAPSHOT_ITEMS.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => openDetail(item.key)}
                    style={({ pressed }) => [
                      styles.snapshotRow,
                      pressed && styles.snapshotRowPressed,
                    ]}
                  >
                    <View style={styles.snapshotCopy}>
                      <Text style={styles.snapshotLabel}>{item.label} over last 7 days</Text>
                      <Text style={styles.snapshotValue}>{item.value}</Text>
                      <View style={styles.snapshotDeltaRow}>
                        <Text
                          style={[
                            styles.snapshotDeltaArrow,
                            item.changeDirection === "down" && styles.snapshotDeltaDown,
                          ]}
                        >
                          {item.changeDirection === "up" ? "↑" : "↓"}
                        </Text>
                        <Text style={styles.snapshotDeltaText}>
                          {item.change} vs previous 7 days
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.snapshotChevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {activeSection === "Lift" ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>Lift tab</Text>
            <Text style={styles.placeholderBody}>
              This view will hold lifting metrics and quick workout entry once
              the overview layout is approved.
            </Text>
          </View>
        ) : null}

        {activeSection === "Diet" ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>Diet tab</Text>
            <Text style={styles.placeholderBody}>
              This view will hold calorie, macro, and food logging once the
              overview layout is approved.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {activeSection === "Overview" ? (
        <Pressable
          accessibilityLabel="Add daily log"
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
        >
          <Text style={styles.fabText}>Add daily log</Text>
        </Pressable>
      ) : null}

      {detailVisible && activeSnapshot ? (
        <Animated.View
          style={[
            styles.detailOverlay,
            {
              transform: [
                {
                  translateX: detailProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.detailTopBar}>
            <Pressable
              accessibilityLabel="Back to dashboard"
              onPress={closeDetail}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.detailTitle}>{activeSnapshot.label}</Text>
            <View style={styles.detailSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailHero}>
              <Text style={styles.metricLabel}>Last 7 days</Text>
              <Text style={styles.detailValue}>{activeSnapshot.value}</Text>
              <Text style={styles.detailDelta}>
                {activeSnapshot.changeDirection === "up" ? "↑" : "↓"}{" "}
                {activeSnapshot.change} vs previous 7 days
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Log history</Text>
              <Text style={styles.detailCardBody}>
                This screen will show the full log series for {activeSnapshot.label.toLowerCase()}
                {" "}in a compact format. For now, this slide-in page establishes the interaction
                pattern and back navigation.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      ) : null}

      {menuVisible ? (
        <Animated.View
          pointerEvents={menuOpen ? "auto" : "none"}
          style={[
            styles.menuOverlay,
            {
              opacity: menuProgress,
              transform: [
                {
                  translateY: menuProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.menuSheet}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Choose a hub</Text>
              <Text style={styles.menuCaption}>Move through the system from here.</Text>
            </View>

            <View style={styles.menuList}>
              {HUBS.map((hub) => (
                <Pressable
                  key={hub}
                  onPress={() => {
                    setActiveHub(hub);
                    closeMenu();
                  }}
                  style={({ pressed }) => [
                    styles.menuRow,
                    hub === activeHub && styles.menuRowActive,
                    pressed && styles.menuRowPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuRowText,
                      hub === activeHub && styles.menuRowTextActive,
                    ]}
                  >
                    {hub}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityLabel="Close hub menu"
              onPress={closeMenu}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3ecdf",
  },
  topBarShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: "#efe1dc",
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hubTitle: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  hubNameAccent: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#8f4943",
  },
  hubNameBase: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "500",
    color: "#1d1d1b",
  },
  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonPressed: {
    backgroundColor: "#ead9d3",
  },
  menuIcon: {
    gap: 4,
  },
  menuLine: {
    width: 18,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#6b4a45",
  },
  navDivider: {
    height: 1,
    backgroundColor: "#d6bbb2",
    marginTop: 16,
  },
  scrollContent: {
    paddingTop: 115,
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 18,
  },
  bodyBlock: {
    gap: 12,
  },
  kicker: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "500",
    color: "#6b4a45",
  },
  sectionSwitchRow: {
    flexDirection: "row",
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d5c2b8",
    backgroundColor: "#f7eee9",
    overflow: "hidden",
  },
  sectionSwitch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  sectionSwitchActive: {
    backgroundColor: "#ead9d3",
  },
  sectionSwitchPressed: {
    backgroundColor: "#f2e4df",
  },
  sectionSwitchText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: "#34423f",
  },
  sectionSwitchTextActive: {
    color: "#6b3f3a",
  },
  hydrationCard: {
    backgroundColor: "#fbf7ef",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 18,
    gap: 16,
  },
  hydrationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8a6a3f",
  },
  hydrationValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#24313a",
    marginTop: 6,
  },
  metricSubtext: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5c6862",
  },
  hydrationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  hydrationButton: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#efe1dc",
    borderWidth: 1,
    borderColor: "#cfb2aa",
    alignItems: "center",
    justifyContent: "center",
  },
  hydrationButtonPressed: {
    backgroundColor: "#ead9d3",
  },
  hydrationButtonText: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "500",
    color: "#6b3f3a",
  },
  hydrationCountPill: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    backgroundColor: "#f7f0e3",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  hydrationCountText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "600",
    color: "#34423f",
  },
  snapshotBlock: {
    gap: 14,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "600",
    color: "#24313a",
  },
  snapshotList: {
    gap: 12,
  },
  snapshotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fbf7ef",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 18,
  },
  snapshotRowPressed: {
    backgroundColor: "#f4ebde",
  },
  snapshotCopy: {
    flex: 1,
    gap: 6,
  },
  snapshotLabel: {
    fontSize: 14,
    lineHeight: 19,
    color: "#6a716b",
  },
  snapshotValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#24313a",
  },
  snapshotDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  snapshotDeltaArrow: {
    fontSize: 15,
    lineHeight: 18,
    color: "#5d8455",
    fontWeight: "700",
  },
  snapshotDeltaDown: {
    color: "#8f4943",
  },
  snapshotDeltaText: {
    fontSize: 14,
    lineHeight: 19,
    color: "#5c6862",
  },
  snapshotChevron: {
    fontSize: 30,
    lineHeight: 32,
    color: "#8a6a3f",
  },
  placeholderCard: {
    backgroundColor: "#fbf7ef",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 22,
    gap: 10,
  },
  placeholderTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    color: "#24313a",
  },
  placeholderBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f5d57",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    borderRadius: 20,
    backgroundColor: "#8f4943",
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#6f624f",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 12,
  },
  fabPressed: {
    backgroundColor: "#7d3f3a",
  },
  fabText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#fff7f3",
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
    backgroundColor: "#f3ecdf",
  },
  detailTopBar: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#efe1dc",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfb2aa",
    backgroundColor: "#f5e8e3",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: "#ead9d3",
  },
  backButtonText: {
    fontSize: 28,
    lineHeight: 28,
    color: "#6b4a45",
    marginTop: -2,
  },
  detailTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: "#24313a",
  },
  detailSpacer: {
    width: 42,
  },
  detailContent: {
    padding: 20,
    gap: 16,
  },
  detailHero: {
    backgroundColor: "#fbf7ef",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 20,
    gap: 8,
  },
  detailValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600",
    color: "#24313a",
  },
  detailDelta: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5c6862",
  },
  detailCard: {
    backgroundColor: "#fbf7ef",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d8ccb6",
    padding: 20,
    gap: 10,
  },
  detailCardTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: "#24313a",
  },
  detailCardBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f5d57",
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    backgroundColor: "#f3ecdf",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  menuSheet: {
    flex: 1,
    justifyContent: "space-between",
  },
  menuHeader: {
    gap: 6,
    marginBottom: 28,
  },
  menuTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#24313a",
  },
  menuCaption: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5f6a64",
  },
  menuList: {
    flex: 1,
    gap: 10,
  },
  menuRow: {
    backgroundColor: "#fbf7ef",
    borderWidth: 1,
    borderColor: "#d8ccb6",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  menuRowPressed: {
    backgroundColor: "#f0e6d6",
  },
  menuRowActive: {
    backgroundColor: "#e8dcc4",
  },
  menuRowText: {
    fontSize: 22,
    lineHeight: 28,
    color: "#34423f",
    fontWeight: "500",
    textAlign: "center",
  },
  menuRowTextActive: {
    color: "#24313a",
    fontWeight: "700",
  },
  closeButton: {
    alignSelf: "center",
    minWidth: 120,
    marginTop: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ccbfa8",
    backgroundColor: "#fbf7ef",
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeButtonPressed: {
    backgroundColor: "#f0e6d6",
  },
  closeButtonText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "600",
    color: "#24313a",
  },
});
