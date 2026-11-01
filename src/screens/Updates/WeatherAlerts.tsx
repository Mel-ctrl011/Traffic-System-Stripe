
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  CurrentWeather,
  DrivingCondition,
  HourlyWeather,
  WeatherData,
  WeatherCondition,
  getDrivingCondition,
  getDrivingConditionLabel,
  getPretoriaWeather,
  getWeatherLabel,
} from "../../services/weatherApi";

// ============================================================
// TYPES
// ============================================================

type AlertType = "rain" | "fog" | "cold";

type WeatherAlert = {
  id: string;
  type: AlertType;
  title: string;
  location: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type WeatherIconName =
  keyof typeof MaterialCommunityIcons.glyphMap;

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  primary: "#145DA0",
  primaryLight: "#EAF3FC",
  background: "#F4F7FA",
  card: "#FFFFFF",
  text: "#172B3A",
  muted: "#718096",
  border: "#E2E8F0",
  green: "#18794E",
  greenBg: "#EAF7F0",
  amber: "#946200",
  amberBg: "#FFF5DE",
  red: "#B42318",
  redBg: "#FDEDEC",
};

// ============================================================
// HELPERS
// ============================================================

function getWeatherIcon(
  condition: WeatherCondition,
  isDay = true
): WeatherIconName {
  switch (condition) {
    case "clear":
      return isDay ? "weather-sunny" : "weather-night";
    case "partly_cloudy":
      return isDay
        ? "weather-partly-cloudy"
        : "weather-night-partly-cloudy";
    case "cloudy":
      return "weather-cloudy";
    case "fog":
      return "weather-fog";
    case "rain":
      return "weather-rainy";
    case "heavy_rain":
      return "weather-pouring";
    case "snow":
      return "weather-snowy";
    case "thunderstorm":
      return "weather-lightning-rainy";
    default:
      return "weather-cloudy";
  }
}

function getVisibilityLabel(visibility: number) {
  const km = visibility / 1000;

  if (km >= 10) return "Excellent";
  if (km >= 5) return "Good";
  if (km >= 2) return "Reduced";
  return "Poor";
}

function getDrivingConfig(condition: DrivingCondition) {
  switch (condition) {
    case "good":
      return {
        color: COLORS.green,
        background: COLORS.greenBg,
        icon: "check-circle-outline" as const,
        title: "Good conditions",
        description: "Weather is currently favourable for driving.",
      };

    case "fair":
      return {
        color: COLORS.amber,
        background: COLORS.amberBg,
        icon: "alert-circle-outline" as const,
        title: "Drive with caution",
        description: "Weather may affect visibility or road conditions.",
      };

    case "poor":
      return {
        color: COLORS.red,
        background: COLORS.redBg,
        icon: "alert-outline" as const,
        title: "Poor driving conditions",
        description: "Allow more stopping distance and reduce speed.",
      };

    case "dangerous":
      return {
        color: COLORS.red,
        background: COLORS.redBg,
        icon: "weather-lightning-rainy" as const,
        title: "Dangerous conditions",
        description: "Severe weather may create hazardous driving conditions.",
      };

    default:
      return {
        color: COLORS.muted,
        background: COLORS.background,
        icon: "help-circle-outline" as const,
        title: "Conditions unavailable",
        description: "Driving conditions could not be determined.",
      };
  }
}

function buildAlerts(weather: CurrentWeather): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  if (
    weather.condition === "rain" ||
    weather.condition === "heavy_rain"
  ) {
    alerts.push({
      id: "rain",
      type: "rain",
      title:
        weather.condition === "heavy_rain"
          ? "Heavy rain"
          : "Rain detected",
      location: "Pretoria",
      description:
        "Rain may reduce visibility and increase stopping distance.",
      icon:
        weather.condition === "heavy_rain"
          ? "weather-pouring"
          : "weather-rainy",
    });
  }

  if (weather.condition === "fog") {
    alerts.push({
      id: "fog",
      type: "fog",
      title: "Reduced visibility",
      location: "Pretoria",
      description:
        "Use headlights and reduce speed in foggy conditions.",
      icon: "weather-fog",
    });
  }

  if (weather.condition === "thunderstorm") {
    alerts.push({
      id: "storm",
      type: "rain",
      title: "Thunderstorm activity",
      location: "Pretoria",
      description:
        "Storms may create hazardous driving conditions.",
      icon: "weather-lightning-rainy",
    });
  }

  if (weather.temperature <= 10) {
    alerts.push({
      id: "cold",
      type: "cold",
      title: "Cold conditions",
      location: "Pretoria",
      description:
        "Drive carefully and remain alert to changing conditions.",
      icon: "thermometer-low",
    });
  }

  return alerts;
}

function getAlertColors(type: AlertType) {
  switch (type) {
    case "rain":
      return {
        color: COLORS.primary,
        background: COLORS.primaryLight,
        label: "RAIN",
      };
    case "fog":
      return {
        color: "#596777",
        background: "#EDF1F5",
        label: "VISIBILITY",
      };
    case "cold":
      return {
        color: "#596777",
        background: "#EDF1F5",
        label: "COLD",
      };
  }
}

// ============================================================
// REUSABLE COMPONENTS
// ============================================================

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: WeatherIconName;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        )}
      </View>

      {!!icon && (
        <MaterialCommunityIcons
          name={icon}
          size={21}
          color={COLORS.primary}
        />
      )}
    </View>
  );
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: WeatherIconName;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={17}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DrivingConditions({
  weather,
}: {
  weather: CurrentWeather;
}) {
  const condition = getDrivingCondition(weather);
  const config = getDrivingConfig(condition);

  return (
    <View style={styles.card}>
      <SectionHeading
        title="Driving conditions"
        subtitle="Assessment based on current weather"
        icon="car-connected"
      />

      <View
        style={[
          styles.drivingBanner,
          { backgroundColor: config.background },
        ]}
      >
        <View
          style={[
            styles.drivingIcon,
            { backgroundColor: config.color },
          ]}
        >
          <MaterialCommunityIcons
            name={config.icon}
            size={22}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.drivingCopy}>
          <Text style={[styles.drivingTitle, { color: config.color }]}>
            {getDrivingConditionLabel(condition)}
          </Text>

          <Text style={styles.drivingDescription}>
            {config.description}
          </Text>
        </View>
      </View>

      <View style={styles.drivingMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Rain</Text>
          <Text style={styles.metricValue}>
            {weather.rain.toFixed(1)} mm
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Visibility</Text>
          <Text style={styles.metricValue}>
            {getVisibilityLabel(weather.visibility)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Wind</Text>
          <Text style={styles.metricValue}>
            {Math.round(weather.windSpeed)} km/h
          </Text>
        </View>
      </View>
    </View>
  );
}

function HourlyForecast({
  hourly,
}: {
  hourly: HourlyWeather[];
}) {
  const forecast = hourly.slice(0, 8);

  return (
    <View style={styles.card}>
      <SectionHeading
        title="Hourly forecast"
        subtitle="Conditions throughout the day"
        icon="clock-outline"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.forecastRow}
      >
        {forecast.map((item, index) => {
          const date = new Date(item.time);

          const timeLabel =
            index === 0
              ? "Now"
              : date.toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });

          return (
            <View
              key={`${item.time}-${index}`}
              style={[
                styles.forecastItem,
                index === 0 && styles.forecastItemActive,
              ]}
            >
              <Text
                style={[
                  styles.forecastTime,
                  index === 0 && styles.forecastTimeActive,
                ]}
              >
                {timeLabel}
              </Text>

              <MaterialCommunityIcons
                name={getWeatherIcon(item.condition)}
                size={25}
                color={index === 0 ? COLORS.primary : COLORS.muted}
              />

              <Text style={styles.forecastTemperature}>
                {Math.round(item.temperature)}°
              </Text>

              <View style={styles.forecastRain}>
                <MaterialCommunityIcons
                  name="water"
                  size={11}
                  color={COLORS.primary}
                />
                <Text style={styles.forecastRainText}>
                  {item.precipitationProbability}%
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function AlertCard({
  alert,
  selected,
  onPress,
}: {
  alert: WeatherAlert;
  selected: boolean;
  onPress: () => void;
}) {
  const config = getAlertColors(alert.type);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.alertCard,
        selected && styles.alertCardSelected,
      ]}
    >
      <View
        style={[
          styles.alertIcon,
          { backgroundColor: config.background },
        ]}
      >
        <MaterialCommunityIcons
          name={alert.icon}
          size={23}
          color={config.color}
        />
      </View>

      <View style={styles.alertCopy}>
        <View style={styles.alertTitleRow}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <Text
            style={[
              styles.alertTag,
              { color: config.color, backgroundColor: config.background },
            ]}
          >
            {config.label}
          </Text>
        </View>

        <Text style={styles.alertLocation}>{alert.location}</Text>
        <Text style={styles.alertDescription}>
          {alert.description}
        </Text>
      </View>

      <MaterialCommunityIcons
        name={selected ? "chevron-down" : "chevron-right"}
        size={21}
        color={COLORS.muted}
      />
    </TouchableOpacity>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function WeatherAlerts() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(
    null
  );

  const loadWeather = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result = await getPretoriaWeather();
      setWeather(result);
    } catch (err) {
      console.error("Weather API error:", err);
      setError("Unable to load current weather data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWeather();

    const interval = setInterval(() => {
      void loadWeather(true);
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadWeather]);

  // Loading
  if (loading && !weather) {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.stateCard}>
          <MaterialCommunityIcons
            name="weather-partly-cloudy"
            size={42}
            color={COLORS.primary}
          />
          <ActivityIndicator
            color={COLORS.primary}
            style={{ marginTop: 14 }}
          />
          <Text style={styles.stateTitle}>Loading weather</Text>
          <Text style={styles.stateDescription}>
            Getting current Pretoria conditions...
          </Text>
        </View>
      </View>
    );
  }

  // Error
  if (error && !weather) {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.stateCard}>
          <MaterialCommunityIcons
            name="cloud-alert-outline"
            size={42}
            color={COLORS.red}
          />
          <Text style={styles.stateTitle}>Weather unavailable</Text>
          <Text style={styles.stateDescription}>{error}</Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadWeather()}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!weather) return null;

  const current = weather.current;
  const alerts = buildAlerts(current);
  const condition = getDrivingCondition(current);
  const driving = getDrivingConfig(condition);

  const selected = alerts.find(
    (alert) => alert.id === selectedAlert
  );

  return (
    <View style={styles.container}>
      {/* WEATHER OVERVIEW */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.location}>
                Pretoria, Gauteng
              </Text>
            </View>

            <Text style={styles.heroCaption}>Current weather</Text>
          </View>

          <TouchableOpacity
            onPress={() => void loadWeather(true)}
            disabled={refreshing}
            style={styles.refreshButton}
            accessibilityLabel="Refresh weather"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <MaterialCommunityIcons
                name="refresh"
                size={21}
                color={COLORS.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroMain}>
          <View>
            <Text style={styles.temperature}>
              {Math.round(current.temperature)}°
            </Text>
            <Text style={styles.condition}>
              {getWeatherLabel(current.condition)}
            </Text>
            <Text style={styles.feelsLike}>
              Feels like {Math.round(current.apparentTemperature)}°
            </Text>
          </View>

          <View style={styles.heroWeatherIcon}>
            <MaterialCommunityIcons
              name={getWeatherIcon(current.condition, current.isDay)}
              size={76}
              color={COLORS.primary}
            />
          </View>
        </View>

        <View style={styles.liveRow}>
          <View style={styles.liveIndicator} />
          <Text style={styles.liveText}>Weather data available</Text>
          <Text style={styles.updatedText}>
            Updated{" "}
            {new Date(weather.fetchedAt).toLocaleTimeString("en-ZA", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatItem
            icon="water-outline"
            value={`${current.humidity}%`}
            label="Humidity"
          />
          <StatItem
            icon="weather-windy"
            value={`${Math.round(current.windSpeed)}`}
            label="Wind km/h"
          />
          <StatItem
            icon="eye-outline"
            value={getVisibilityLabel(current.visibility)}
            label="Visibility"
          />
          <StatItem
            icon="weather-rainy"
            value={`${current.precipitation.toFixed(1)} mm`}
            label="Rain"
          />
        </View>
      </View>

      {/* MONITORING STATUS */}
      <View style={styles.monitoringBar}>
        <View
          style={[
            styles.monitoringIcon,
            { backgroundColor: driving.background },
          ]}
        >
          <MaterialCommunityIcons
            name={driving.icon}
            size={21}
            color={driving.color}
          />
        </View>

        <View style={styles.monitoringCopy}>
          <Text style={styles.monitoringTitle}>
            {driving.title}
          </Text>
          <Text style={styles.monitoringSubtitle}>
            Weather-based driving assessment
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: driving.background },
          ]}
        >
          <Text style={[styles.statusPillText, { color: driving.color }]}>
            {condition.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* DRIVING CONDITIONS */}
      <DrivingConditions weather={current} />

      {/* FORECAST */}
      <HourlyForecast hourly={weather.hourly} />

      {/* WEATHER ALERTS */}
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpanded((value) => !value)}
          style={styles.alertsHeader}
        >
          <View style={styles.alertsHeaderLeft}>
            <View style={styles.alertsHeaderIcon}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Weather alerts</Text>
              <Text style={styles.sectionSubtitle}>
                {alerts.length > 0
                  ? `${alerts.length} condition${alerts.length === 1 ? "" : "s"} detected`
                  : "No significant weather alerts detected"}
              </Text>
            </View>
          </View>

          <MaterialCommunityIcons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={23}
            color={COLORS.muted}
          />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.alertsList}>
            {alerts.length === 0 ? (
              <View style={styles.allClear}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={29}
                  color={COLORS.green}
                />
                <View style={styles.allClearCopy}>
                  <Text style={styles.allClearTitle}>All clear</Text>
                  <Text style={styles.allClearDescription}>
                    No significant weather alerts were detected by the
                    current weather conditions.
                  </Text>
                </View>
              </View>
            ) : (
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  selected={selectedAlert === alert.id}
                  onPress={() =>
                    setSelectedAlert((previous) =>
                      previous === alert.id ? null : alert.id
                    )
                  }
                />
              ))
            )}
          </View>
        )}

        {selected && expanded && (
          <View style={styles.selectedAlert}>
            <Text style={styles.selectedAlertTitle}>
              {selected.title}
            </Text>
            <Text style={styles.selectedAlertDescription}>
              {selected.description}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.footer}>
        TrafficConnectSystem · Weather information for Pretoria
      </Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 12,
  },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
  },

  hero: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 19,
    overflow: "hidden",
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  location: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  heroCaption: {
    marginTop: 5,
    fontSize: 11,
    color: COLORS.muted,
  },

  refreshButton: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  heroMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },

  temperature: {
    fontSize: 59,
    lineHeight: 65,
    fontWeight: "800",
    letterSpacing: -2,
    color: COLORS.text,
  },

  condition: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },

  feelsLike: {
    marginTop: 5,
    fontSize: 11,
    color: COLORS.muted,
  },

  heroWeatherIcon: {
    width: 104,
    height: 104,
    borderRadius: 27,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginRight: 7,
  },

  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.green,
  },

  updatedText: {
    marginLeft: "auto",
    fontSize: 10,
    color: COLORS.muted,
  },

  statsRow: {
    flexDirection: "row",
    paddingTop: 15,
  },

  statItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },

  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  statValue: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  statLabel: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.muted,
    textAlign: "center",
  },

  monitoringBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 13,
    gap: 10,
  },

  monitoringIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  monitoringCopy: {
    flex: 1,
  },

  monitoringTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  monitoringSubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.muted,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },

  statusPillText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
  },

  drivingBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginTop: 15,
    gap: 11,
  },

  drivingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  drivingCopy: {
    flex: 1,
  },

  drivingTitle: {
    fontSize: 12,
    fontWeight: "800",
  },

  drivingDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
  },

  drivingMetrics: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  metric: {
    flex: 1,
    alignItems: "center",
  },

  metricLabel: {
    fontSize: 10,
    color: COLORS.muted,
  },

  metricValue: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  metricDivider: {
    width: 1,
    height: 29,
    backgroundColor: COLORS.border,
  },

  forecastRow: {
    paddingTop: 15,
    gap: 9,
  },

  forecastItem: {
    width: 65,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    gap: 9,
  },

  forecastItemActive: {
    backgroundColor: COLORS.primaryLight,
  },

  forecastTime: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
  },

  forecastTimeActive: {
    color: COLORS.primary,
  },

  forecastTemperature: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  forecastRain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  forecastRainText: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: "700",
  },

  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  alertsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
  },

  alertsHeaderIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  alertsList: {
    marginTop: 14,
    gap: 9,
  },

  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
  },

  alertCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#FAFCFF",
  },

  alertIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  alertCopy: {
    flex: 1,
  },

  alertTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  alertTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  alertTag: {
    overflow: "hidden",
    fontSize: 7,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
  },

  alertLocation: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
  },

  alertDescription: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
  },

  allClear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 14,
    borderRadius: 13,
    backgroundColor: COLORS.greenBg,
  },

  allClearCopy: {
    flex: 1,
  },

  allClearTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.green,
  },

  allClearDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
  },

  selectedAlert: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },

  selectedAlertTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },

  selectedAlertDescription: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.text,
  },

  footer: {
    paddingVertical: 5,
    fontSize: 9,
    textAlign: "center",
    color: COLORS.muted,
  },

  stateContainer: {
    width: "100%",
    justifyContent: "center",
    paddingVertical: 25,
  },

  stateCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 26,
  },

  stateTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  stateDescription: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    color: COLORS.muted,
  },

  retryButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 11,
  },

  retryText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
