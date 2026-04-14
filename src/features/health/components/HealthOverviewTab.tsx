import { Pressable, Text, View } from "react-native";
import type { SnapshotItem, SnapshotKey } from "../types";

type HealthOverviewTabProps = {
  styles: any;
  hasLoggedToday: boolean;
  snapshotItems: SnapshotItem[];
  onOpenDetail: (key: SnapshotKey) => void;
};

export function HealthOverviewTab({
  styles,
  hasLoggedToday,
  snapshotItems,
  onOpenDetail,
}: HealthOverviewTabProps) {
  return (
    <>
      <View style={styles.snapshotBlock}>
        <View style={styles.snapshotHeader}>
          <Text style={styles.title}>A Snapshot</Text>
          {hasLoggedToday ? (
            <View style={styles.loggedBadge}>
              <Text style={styles.loggedBadgeText}>Logged today</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.snapshotList}>
          {snapshotItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onOpenDetail(item.key)}
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
  );
}
