import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

/* =========================================================
   TYPES
========================================================= */

export type AnnouncementPriority =
  | "LOW"
  | "NORMAL"
  | "IMPORTANT"
  | "URGENT";

export type AnnouncementType =
  | "traffic"
  | "transport"
  | "road"
  | "regulation"
  | "maintenance"
  | "public_notice"
  | "general";

export interface DepartmentAnnouncement {
  id: string;

  title: string;
  description: string;

  type: AnnouncementType;
  priority?: AnnouncementPriority;

  source?: string;

  date?: string | Date;

  active?: boolean;

  expiresAt?: string | Date;

  reference?: string;
}

interface DepartmentAnnouncementsProps {
  announcements?: DepartmentAnnouncement[];

  onAnnouncementPress?: (
    announcement: DepartmentAnnouncement
  ) => void;
}

/* =========================================================
   COLOURS
========================================================= */

const COLORS = {
  primary: "#0B4F8A",
  primaryDark: "#083B68",

  background: "#F3F5F7",
  card: "#FFFFFF",

  text: "#17212B",
  textLight: "#66737F",

  border: "#D9E0E6",

  success: "#18794E",
  warning: "#A16207",
  danger: "#B42318",

  softBlue: "#EAF3FA",
  softGreen: "#ECFDF3",
  softYellow: "#FFF8E6",
  softRed: "#FEF3F2",
};

/* =========================================================
   ICONS
========================================================= */

function getAnnouncementIcon(
  type: AnnouncementType
): React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"] {
  switch (type) {
    case "traffic":
      return "traffic-light-outline";

    case "transport":
      return "bus-outline";

    case "road":
      return "road-variant";

    case "regulation":
      return "file-document-outline";

    case "maintenance":
      return "cog-outline";

    case "public_notice":
      return "bullhorn-outline";

    case "general":
    default:
      return "information-outline";
  }
}

/* =========================================================
   PRIORITY CONFIG
========================================================= */

function getPriorityConfig(priority: AnnouncementPriority) {
  switch (priority) {
    case "LOW":
      return {
        label: "LOW",
        color: COLORS.success,
        backgroundColor: COLORS.softGreen,
      };

    case "IMPORTANT":
      return {
        label: "IMPORTANT",
        color: COLORS.warning,
        backgroundColor: COLORS.softYellow,
      };

    case "URGENT":
      return {
        label: "URGENT",
        color: COLORS.danger,
        backgroundColor: COLORS.softRed,
      };

    case "NORMAL":
    default:
      return {
        label: "NOTICE",
        color: COLORS.primary,
        backgroundColor: COLORS.softBlue,
      };
  }
}

/* =========================================================
   DATE FORMATTER
========================================================= */

function formatDate(value?: string | Date): string {
  if (!value) {
    return "Date not specified";
  }

  try {
    const date =
      value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(value);
  }
}

/* =========================================================
   ANNOUNCEMENT CARD
========================================================= */

function AnnouncementCard({
  announcement,
  onPress,
}: {
  announcement: DepartmentAnnouncement;
  onPress?: (
    announcement: DepartmentAnnouncement
  ) => void;
}) {
  const priority =
    getPriorityConfig(
      announcement.priority ?? "NORMAL"
    );

  const icon = getAnnouncementIcon(
    announcement.type
  );

  const isActive =
    announcement.active !== false;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.card,
        !isActive && styles.inactiveCard,
      ]}
      onPress={() => onPress?.(announcement)}
      disabled={!onPress}
    >
      {/* ===================================================
          TOP
      =================================================== */}

      <View style={styles.cardTop}>
        {/* ICON */}

        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={icon}
            size={23}
            color={COLORS.primary}
          />
        </View>

        {/* TITLE AREA */}

        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text
              style={styles.title}
              numberOfLines={2}
            >
              {announcement.title}
            </Text>

            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor:
                    priority.backgroundColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.priorityText,
                  {
                    color: priority.color,
                  },
                ]}
              >
                {priority.label}
              </Text>
            </View>
          </View>

          {/* SOURCE */}

          {announcement.source && (
            <View style={styles.sourceRow}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={12}
                color={COLORS.primary}
              />

              <Text
                style={styles.sourceText}
                numberOfLines={1}
              >
                {announcement.source}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ===================================================
          DESCRIPTION
      =================================================== */}

      <Text style={styles.description}>
        {announcement.description}
      </Text>

      {/* ===================================================
          INFORMATION
      =================================================== */}

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons
            name="calendar-outline"
            size={13}
            color={COLORS.textLight}
          />

          <View>
            <Text style={styles.infoLabel}>
              PUBLISHED
            </Text>

            <Text style={styles.infoValue}>
              {formatDate(announcement.date)}
            </Text>
          </View>
        </View>

        {announcement.expiresAt && (
          <>
            <View style={styles.divider} />

            <View style={styles.infoItem}>
              <Ionicons
                name="time-outline"
                size={13}
                color={COLORS.textLight}
              />

              <View>
                <Text style={styles.infoLabel}>
                  EXPIRES
                </Text>

                <Text style={styles.infoValue}>
                  {formatDate(
                    announcement.expiresAt
                  )}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <View style={styles.footer}>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isActive
                  ? COLORS.success
                  : COLORS.textLight,
              },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              {
                color: isActive
                  ? COLORS.success
                  : COLORS.textLight,
              },
            ]}
          >
            {isActive ? "ACTIVE NOTICE" : "INACTIVE"}
          </Text>
        </View>

        {onPress && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsText}>
              View details
            </Text>

            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.primary}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyAnnouncements() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons
          name="bullhorn-outline"
          size={28}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.emptyTitle}>
        No Active Announcements
      </Text>

      <Text style={styles.emptyDescription}>
        There are currently no official traffic or
        transport announcements available.
      </Text>

      <Text style={styles.emptyUpdated}>
        Information will appear here when published.
      </Text>
    </View>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function DepartmentAnnouncements({
  announcements = [],
  onAnnouncementPress,
}: DepartmentAnnouncementsProps) {
  const activeAnnouncements =
    announcements.filter(
      (announcement) =>
        announcement.active !== false
    );

  return (
    <View style={styles.container}>
      {/* =================================================
          ANNOUNCEMENTS
      ================================================= */}

      {activeAnnouncements.length === 0 ? (
        <EmptyAnnouncements />
      ) : (
        activeAnnouncements.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            onPress={onAnnouncementPress}
          />
        ))
      )}
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  /* =====================================================
     CARD
  ===================================================== */

  card: {
    backgroundColor: COLORS.card,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 12,

    padding: 13,

    marginBottom: 10,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,

    elevation: 2,
  },

  inactiveCard: {
    opacity: 0.6,
  },

  /* =====================================================
     TOP
  ===================================================== */

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  iconContainer: {
    width: 44,
    height: 44,

    borderRadius: 10,

    backgroundColor: COLORS.softBlue,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  titleContainer: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",

    gap: 7,
  },

  title: {
    flex: 1,

    fontSize: 14,
    lineHeight: 19,

    fontWeight: "800",

    color: COLORS.text,
  },

  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 20,
  },

  priorityText: {
    fontSize: 8,
    fontWeight: "900",

    letterSpacing: 0.3,
  },

  /* =====================================================
     SOURCE
  ===================================================== */

  sourceRow: {
    flexDirection: "row",
    alignItems: "center",

    marginTop: 5,

    gap: 4,
  },

  sourceText: {
    flex: 1,

    fontSize: 9,
    fontWeight: "700",

    color: COLORS.primary,
  },

  /* =====================================================
     DESCRIPTION
  ===================================================== */

  description: {
    marginTop: 11,

    fontSize: 11,
    lineHeight: 17,

    color: COLORS.textLight,
  },

  /* =====================================================
     INFORMATION
  ===================================================== */

  infoContainer: {
    flexDirection: "row",
    alignItems: "center",

    marginTop: 12,

    paddingTop: 10,

    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
  },

  infoItem: {
    flex: 1,

    flexDirection: "row",
    alignItems: "center",

    gap: 6,
  },

  divider: {
    width: 1,
    height: 26,

    backgroundColor: COLORS.border,

    marginHorizontal: 8,
  },

  infoLabel: {
    fontSize: 7,

    fontWeight: "800",

    color: COLORS.textLight,

    letterSpacing: 0.5,
  },

  infoValue: {
    marginTop: 2,

    fontSize: 9,

    fontWeight: "700",

    color: COLORS.text,
  },

  /* =====================================================
     FOOTER
  ===================================================== */

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginTop: 11,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",

    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,

    borderRadius: 3,
  },

  statusText: {
    fontSize: 8,

    fontWeight: "900",

    letterSpacing: 0.4,
  },

  detailsContainer: {
    flexDirection: "row",
    alignItems: "center",

    gap: 2,
  },

  detailsText: {
    fontSize: 9,

    fontWeight: "800",

    color: COLORS.primary,
  },

  /* =====================================================
     EMPTY STATE
  ===================================================== */

  emptyCard: {
    backgroundColor: COLORS.card,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 12,

    paddingHorizontal: 20,
    paddingVertical: 24,

    alignItems: "center",

    marginBottom: 10,
  },

  emptyIcon: {
    width: 52,
    height: 52,

    borderRadius: 16,

    backgroundColor: COLORS.softBlue,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 14,

    fontWeight: "800",

    color: COLORS.text,

    textAlign: "center",
  },

  emptyDescription: {
    marginTop: 5,

    maxWidth: 300,

    fontSize: 10,

    lineHeight: 16,

    color: COLORS.textLight,

    textAlign: "center",
  },

  emptyUpdated: {
    marginTop: 9,

    fontSize: 8,

    color: COLORS.textLight,

    textAlign: "center",
  },
});