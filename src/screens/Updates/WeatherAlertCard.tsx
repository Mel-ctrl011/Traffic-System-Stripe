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

export type WeatherAlertSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type WeatherAlertType =
  | "rain"
  | "heavy_rain"
  | "thunderstorm"
  | "fog"
  | "wind"
  | "flood"
  | "heat"
  | "cold"
  | "general";

export interface WeatherAlert {
  id: string;

  title: string;
  description: string;

  type: WeatherAlertType;
  severity: WeatherAlertSeverity;

  location: string;

  status?: "ACTIVE" | "EXPIRED" | "CANCELLED";

  issuedAt?: string | Date;
  expiresAt?: string | Date;

  source?: string;

  affectedRoads?: string[];

  drivingAdvice?: string;

  createdBy?: string;
}

interface WeatherAlertCardProps {
  alert: WeatherAlert;

  onPress?: (alert: WeatherAlert) => void;

  onViewAffectedRoads?: (alert: WeatherAlert) => void;

  showAffectedRoadsButton?: boolean;
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

  critical: "#8B1E1E",
  softCritical: "#FFF1F1",
};

/* =========================================================
   HELPERS
========================================================= */

function getSeverityConfig(severity: WeatherAlertSeverity) {
  switch (severity) {
    case "LOW":
      return {
        label: "LOW",
        color: COLORS.success,
        backgroundColor: COLORS.softGreen,
        icon: "information-outline" as const,
      };

    case "MEDIUM":
      return {
        label: "MEDIUM",
        color: COLORS.warning,
        backgroundColor: COLORS.softYellow,
        icon: "alert-outline" as const,
      };

    case "HIGH":
      return {
        label: "HIGH",
        color: COLORS.danger,
        backgroundColor: COLORS.softRed,
        icon: "alert-circle-outline" as const,
      };

    case "CRITICAL":
      return {
        label: "CRITICAL",
        color: COLORS.critical,
        backgroundColor: COLORS.softCritical,
        icon: "alert-octagon-outline" as const,
      };

    default:
      return {
        label: "MEDIUM",
        color: COLORS.warning,
        backgroundColor: COLORS.softYellow,
        icon: "alert-outline" as const,
      };
  }
}

function getWeatherIcon(
  type: WeatherAlertType
): React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  switch (type) {
    case "rain":
      return "weather-rainy";

    case "heavy_rain":
      return "weather-pouring";

    case "thunderstorm":
      return "weather-lightning-rainy";

    case "fog":
      return "weather-fog";

    case "wind":
      return "weather-windy";

    case "flood":
      return "water-alert";

    case "heat":
      return "weather-sunny-alert";

    case "cold":
      return "snowflake-alert";

    default:
      return "weather-cloudy-alert";
  }
}

function formatDate(value?: string | Date): string {
  if (!value) {
    return "Not specified";
  }

  try {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(value);
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function WeatherAlertCard({
  alert,
  onPress,
  onViewAffectedRoads,
  showAffectedRoadsButton = true,
}: WeatherAlertCardProps) {
  const severity = getSeverityConfig(alert.severity);

  const weatherIcon = getWeatherIcon(alert.type);

  const status = alert.status ?? "ACTIVE";

  const isActive = status === "ACTIVE";
  const isCritical = alert.severity === "CRITICAL";

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.card,

        isCritical && styles.criticalCard,

        !isActive && styles.inactiveCard,
      ]}
      onPress={() => onPress?.(alert)}
      disabled={!onPress}
    >
      {/* =====================================================
          CRITICAL WARNING STRIP
      ===================================================== */}

      {isCritical && isActive && (
        <View style={styles.criticalStrip}>
          <MaterialCommunityIcons
            name="alert-octagon"
            size={15}
            color="#FFFFFF"
          />

          <Text style={styles.criticalStripText}>
            CRITICAL WEATHER WARNING
          </Text>
        </View>
      )}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <View style={styles.header}>
        <View
          style={[
            styles.weatherIconContainer,

            {
              backgroundColor: severity.backgroundColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={weatherIcon}
            size={25}
            color={severity.color}
          />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                isCritical && styles.criticalTitle,
              ]}
              numberOfLines={2}
            >
              {alert.title}
            </Text>

            <View
              style={[
                styles.severityBadge,
                {
                  backgroundColor: severity.backgroundColor,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={severity.icon}
                size={11}
                color={severity.color}
              />

              <Text
                style={[
                  styles.severityText,
                  {
                    color: severity.color,
                  },
                ]}
              >
                {severity.label}
              </Text>
            </View>
          </View>

          {/* =================================================
              LOCATION
          ================================================= */}

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={13}
              color={COLORS.primary}
            />

            <Text
              style={styles.location}
              numberOfLines={1}
            >
              {alert.location}
            </Text>
          </View>
        </View>
      </View>

      {/* =====================================================
          DESCRIPTION
      ===================================================== */}

      <Text style={styles.description}>
        {alert.description}
      </Text>

      {/* =====================================================
          DRIVING ADVICE
      ===================================================== */}

      {alert.drivingAdvice && (
        <View style={styles.adviceBox}>
          <View style={styles.adviceIcon}>
            <MaterialCommunityIcons
              name="steering"
              size={17}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.adviceContent}>
            <Text style={styles.adviceTitle}>
              Driving advice
            </Text>

            <Text style={styles.adviceText}>
              {alert.drivingAdvice}
            </Text>
          </View>
        </View>
      )}

      {/* =====================================================
          STATUS
      ===================================================== */}

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,

            isActive
              ? styles.activeBadge
              : styles.inactiveBadge,
          ]}
        >
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
            {status}
          </Text>
        </View>

        {alert.source && (
          <Text
            style={styles.source}
            numberOfLines={1}
          >
            {alert.source}
          </Text>
        )}
      </View>

      {/* =====================================================
          TIMING
      ===================================================== */}

      <View style={styles.timingContainer}>
        <View style={styles.timeItem}>
          <Ionicons
            name="time-outline"
            size={13}
            color={COLORS.textLight}
          />

          <View>
            <Text style={styles.timeLabel}>
              ISSUED
            </Text>

            <Text style={styles.timeValue}>
              {formatDate(alert.issuedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.timeDivider} />

        <View style={styles.timeItem}>
          <Ionicons
            name="hourglass-outline"
            size={13}
            color={COLORS.textLight}
          />

          <View>
            <Text style={styles.timeLabel}>
              EXPIRES
            </Text>

            <Text style={styles.timeValue}>
              {formatDate(alert.expiresAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* =====================================================
          AFFECTED ROADS
      ===================================================== */}

      {showAffectedRoadsButton &&
        alert.affectedRoads &&
        alert.affectedRoads.length > 0 && (
          <TouchableOpacity
            style={styles.roadsButton}
            activeOpacity={0.8}
            onPress={(event) => {
              event.stopPropagation?.();

              onViewAffectedRoads?.(alert);
            }}
          >
            <MaterialCommunityIcons
              name="road-variant"
              size={17}
              color={COLORS.primary}
            />

            <Text style={styles.roadsButtonText}>
              View affected roads
            </Text>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <View style={styles.footer}>
        <View style={styles.issuedBy}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={14}
            color={COLORS.textLight}
          />

          <Text style={styles.issuedByText}>
            Issued by {alert.source || "TrafficConnect SA"}
          </Text>
        </View>

        {onPress && (
          <View style={styles.detailsLink}>
            <Text style={styles.detailsText}>
              Details
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
   STYLES
========================================================= */

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 12,

    marginBottom: 10,

    overflow: "hidden",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,

    elevation: 2,
  },

  criticalCard: {
    borderColor: "#E5B5B5",
  },

  inactiveCard: {
    opacity: 0.65,
  },

  /* =======================================================
     CRITICAL STRIP
  ======================================================= */

  criticalStrip: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: COLORS.critical,

    paddingHorizontal: 13,
    paddingVertical: 7,

    gap: 6,
  },

  criticalStripText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",

    paddingHorizontal: 13,
    paddingTop: 13,
  },

  weatherIconContainer: {
    width: 46,
    height: 46,

    borderRadius: 11,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  headerContent: {
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

  criticalTitle: {
    color: COLORS.critical,
  },

  severityBadge: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 20,

    gap: 3,
  },

  severityText: {
    fontSize: 8,
    fontWeight: "900",

    letterSpacing: 0.3,
  },

  /* =======================================================
     LOCATION
  ======================================================= */

  locationRow: {
    flexDirection: "row",
    alignItems: "center",

    marginTop: 5,

    gap: 4,
  },

  location: {
    flex: 1,

    fontSize: 10,
    fontWeight: "700",

    color: COLORS.primary,
  },

  /* =======================================================
     DESCRIPTION
  ======================================================= */

  description: {
    marginHorizontal: 13,
    marginTop: 10,

    fontSize: 11,
    lineHeight: 17,

    color: COLORS.textLight,
  },

  /* =======================================================
     DRIVING ADVICE
  ======================================================= */

  adviceBox: {
    flexDirection: "row",

    marginHorizontal: 13,
    marginTop: 11,

    padding: 9,

    borderRadius: 9,

    backgroundColor: COLORS.softBlue,

    borderWidth: 1,
    borderColor: "#C7DDED",
  },

  adviceIcon: {
    width: 28,
    height: 28,

    borderRadius: 7,

    backgroundColor: "#DCECF8",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 8,
  },

  adviceContent: {
    flex: 1,
  },

  adviceTitle: {
    fontSize: 9,
    fontWeight: "900",

    color: COLORS.primary,

    marginBottom: 2,
  },

  adviceText: {
    fontSize: 10,
    lineHeight: 15,

    color: COLORS.text,
  },

  /* =======================================================
     STATUS
  ======================================================= */

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginHorizontal: 13,
    marginTop: 11,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 20,

    gap: 5,
  },

  activeBadge: {
    backgroundColor: COLORS.softGreen,
  },

  inactiveBadge: {
    backgroundColor: "#F1F3F5",
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

  source: {
    flex: 1,

    marginLeft: 8,

    textAlign: "right",

    fontSize: 9,
    fontWeight: "700",

    color: COLORS.textLight,
  },

  /* =======================================================
     TIMING
  ======================================================= */

  timingContainer: {
    flexDirection: "row",
    alignItems: "center",

    marginHorizontal: 13,
    marginTop: 10,

    paddingTop: 10,

    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
  },

  timeItem: {
    flex: 1,

    flexDirection: "row",
    alignItems: "center",

    gap: 6,
  },

  timeDivider: {
    width: 1,
    height: 25,

    backgroundColor: COLORS.border,

    marginHorizontal: 7,
  },

  timeLabel: {
    fontSize: 7,
    fontWeight: "800",

    color: COLORS.textLight,

    letterSpacing: 0.5,
  },

  timeValue: {
    marginTop: 2,

    fontSize: 9,
    fontWeight: "700",

    color: COLORS.text,
  },

  /* =======================================================
     ROADS BUTTON
  ======================================================= */

  roadsButton: {
    flexDirection: "row",
    alignItems: "center",

    marginHorizontal: 13,
    marginTop: 11,

    paddingVertical: 9,
    paddingHorizontal: 10,

    borderRadius: 8,

    backgroundColor: COLORS.softBlue,

    gap: 6,
  },

  roadsButtonText: {
    flex: 1,

    fontSize: 10,
    fontWeight: "800",

    color: COLORS.primary,
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginHorizontal: 13,
    marginTop: 10,
    marginBottom: 12,
  },

  issuedBy: {
    flexDirection: "row",
    alignItems: "center",

    flex: 1,

    gap: 5,
  },

  issuedByText: {
    fontSize: 8,

    color: COLORS.textLight,
  },

  detailsLink: {
    flexDirection: "row",
    alignItems: "center",

    gap: 2,
  },

  detailsText: {
    fontSize: 9,
    fontWeight: "800",

    color: COLORS.primary,
  },
});