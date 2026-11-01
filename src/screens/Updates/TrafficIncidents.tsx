
import React, { useState } from "react";

import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

/* =========================================================
   i-TRAFFIC CONFIGURATION

   Source: https://www.i-traffic.co.za/

   Region:
   GP = Gauteng

   Layers:
   Congestion, Closures, Incidents, Construction,
   TrafficSpeeds and Cameras

   This is an embedded third-party map.
   It is NOT a direct incident-data API.
========================================================= */

const TRAFFIC_SOURCE = "i-TRAFFIC South Africa";

const TRAFFIC_SOURCE_URL =
  "https://www.i-traffic.co.za/";

const TRAFFIC_MAP_URL =
  "https://www.i-traffic.co.za/Map/EmbeddedMap?region=GP&layers=Congestion,Closures,Incidents,Construction,TrafficSpeeds,Cameras&size=0";

/* =========================================================
   TYPES
========================================================= */

type MapLayer = {
  id: string;
  label: string;
  icon: string;
  color: string;
};

/* =========================================================
   DISPLAYED MAP LAYERS

   These describe the layers requested in the embed URL.
   They are not independent data feeds.
========================================================= */

const MAP_LAYERS: MapLayer[] = [
  {
    id: "speeds",
    label: "Traffic speeds",
    icon: "speedometer",
    color: "#0B4F8A",
  },
  {
    id: "congestion",
    label: "Congestion",
    icon: "car-multiple",
    color: "#A16207",
  },
  {
    id: "incidents",
    label: "Incidents",
    icon: "alert-circle-outline",
    color: "#B42318",
  },
  {
    id: "closures",
    label: "Road closures",
    icon: "road-variant",
    color: "#7A271A",
  },
  {
    id: "construction",
    label: "Roadworks",
    icon: "cone",
    color: "#C07808",
  },
  {
    id: "cameras",
    label: "Cameras",
    icon: "cctv",
    color: "#475467",
  },
];

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function TrafficIncidents() {
  const [expanded, setExpanded] = useState(false);

  const [showSourceInfo, setShowSourceInfo] =
    useState(false);

  const [mapVersion, setMapVersion] = useState(0);

  const [mapLoadFailed, setMapLoadFailed] =
    useState(false);

  const mapHeight = expanded ? 640 : 430;

  /* =======================================================
     REFRESH MAP

     Reloads the embedded map.
     The actual traffic refresh interval is controlled
     by i-TRAFFIC, not by this application.
  ======================================================= */

  const refreshMap = () => {
    setMapLoadFailed(false);
    setMapVersion((current) => current + 1);
  };

  /* =======================================================
     OPEN MAP DIRECTLY

     Useful if the embedded map does not load.
  ======================================================= */

  const openExternalMap = async () => {
    try {
      await Linking.openURL(TRAFFIC_MAP_URL);
    } catch (error) {
      console.error(
        "[TrafficIncidents] Could not open i-TRAFFIC map:",
        error
      );
    }
  };

  /* =======================================================
     OPEN SOURCE WEBSITE
  ======================================================= */

  const openTrafficSource = async () => {
    try {
      await Linking.openURL(TRAFFIC_SOURCE_URL);
    } catch (error) {
      console.error(
        "[TrafficIncidents] Could not open traffic source:",
        error
      );
    }
  };

  /* =======================================================
     WEB MAP

     React Native does not provide a native iframe.
     React Native Web can render an HTML iframe.

     On native Android/iOS, we show a fallback message
     and offer to open the map in a browser.
  ======================================================= */

  const renderEmbeddedMap = () => {
    if (Platform.OS !== "web") {
      return (
        <View style={styles.nativeFallback}>
          <View style={styles.fallbackIcon}>
            <MaterialCommunityIcons
              name="web"
              size={32}
              color="#0B4F8A"
            />
          </View>

          <Text style={styles.fallbackTitle}>
            Open the live traffic map
          </Text>

          <Text style={styles.fallbackDescription}>
            The i-TRAFFIC map is embedded for the web
            dashboard. Open it in your browser to view
            Gauteng traffic information.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openExternalMap}
            style={styles.primaryButton}
          >
            <MaterialCommunityIcons
              name="open-in-new"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Open i-TRAFFIC map
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mapLoadFailed) {
      return (
        <View style={styles.nativeFallback}>
          <View style={styles.fallbackIcon}>
            <MaterialCommunityIcons
              name="map-alert-outline"
              size={32}
              color="#B42318"
            />
          </View>

          <Text style={styles.fallbackTitle}>
            Map unavailable
          </Text>

          <Text style={styles.fallbackDescription}>
            The embedded map could not be displayed.
            This may be caused by a connection issue or
            restrictions on embedding the map.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={refreshMap}
            style={styles.primaryButton}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Try again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openExternalMap}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              Open map in browser
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    /*
      Use React.createElement for the HTML iframe.

      This avoids treating the iframe as a React Native
      native component in TypeScript.
    */

    return React.createElement("iframe" as any, {
      key: mapVersion,
      title: "i-TRAFFIC Gauteng Traffic Map",
      src: TRAFFIC_MAP_URL,
      width: "100%",
      height: String(mapHeight),
      frameBorder: "0",
      scrolling: "no",
      allowFullScreen: true,
      onError: () => setMapLoadFailed(true),
      style: {
        display: "block",
        width: "100%",
        height: `${mapHeight}px`,
        border: "none",
        backgroundColor: "#E8EEF2",
      },
    });
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.eyebrow}>
            TRAFFIC CONNECT
          </Text>

          <Text style={styles.title}>
            Gauteng Traffic
          </Text>

          <Text style={styles.subtitle}>
            Traffic information for Gauteng roads
          </Text>
        </View>

        <View style={styles.sourceIcon}>
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={25}
            color="#0B4F8A"
          />
        </View>
      </View>

      {/* =================================================
          SOURCE AND REGION
      ================================================= */}

      <View style={styles.metadataRow}>
        <View style={styles.metadataBadge}>
          <MaterialCommunityIcons
            name="map-marker"
            size={14}
            color="#0B4F8A"
          />

          <Text style={styles.metadataText}>
            Gauteng, South Africa
          </Text>
        </View>

        <View style={styles.sourceBadge}>
          <View style={styles.sourceDot} />

          <Text style={styles.sourceBadgeText}>
            i-TRAFFIC
          </Text>
        </View>
      </View>

      {/* =================================================
          MAP CARD
      ================================================= */}

      <View style={styles.mapCard}>
        <View style={styles.mapCardHeader}>
          <View style={styles.mapHeaderLeft}>
            <View style={styles.mapHeaderIcon}>
              <MaterialCommunityIcons
                name="map"
                size={20}
                color="#0B4F8A"
              />
            </View>

            <View style={styles.mapHeaderText}>
              <Text style={styles.mapCardTitle}>
                Live traffic map
              </Text>

              <Text style={styles.mapCardSubtitle}>
                Provided by {TRAFFIC_SOURCE}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={refreshMap}
            style={styles.refreshButton}
            accessibilityLabel="Reload traffic map"
          >
            <MaterialCommunityIcons
              name="refresh"
              size={20}
              color="#0B4F8A"
            />
          </TouchableOpacity>
        </View>

        {/* MAP */}

        <View
          style={[
            styles.mapFrame,
            {
              height:
                Platform.OS === "web"
                  ? mapHeight
                  : undefined,
            },
          ]}
        >
          {renderEmbeddedMap()}
        </View>

        {/* MAP FOOTER */}

        <View style={styles.mapFooter}>
          <View style={styles.mapFooterLeft}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color="#66737F"
            />

            <Text style={styles.mapFooterText}>
              Map data supplied by i-TRAFFIC
            </Text>
          </View>

          <TouchableOpacity
            onPress={openExternalMap}
            activeOpacity={0.75}
            style={styles.externalButton}
          >
            <Text style={styles.externalButtonText}>
              Open map
            </Text>

            <MaterialCommunityIcons
              name="open-in-new"
              size={14}
              color="#0B4F8A"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* =================================================
          MAP ACTIONS
      ================================================= */}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            setExpanded((current) => !current)
          }
          style={styles.actionButton}
        >
          <MaterialCommunityIcons
            name={
              expanded
                ? "arrow-collapse"
                : "arrow-expand"
            }
            size={19}
            color="#0B4F8A"
          />

          <Text style={styles.actionButtonText}>
            {expanded ? "Show smaller map" : "Expand map"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            setShowSourceInfo((current) => !current)
          }
          style={styles.actionButton}
        >
          <MaterialCommunityIcons
            name="database-check-outline"
            size={19}
            color="#0B4F8A"
          />

          <Text style={styles.actionButtonText}>
            Data source
          </Text>
        </TouchableOpacity>
      </View>

      {/* =================================================
          LAYERS INFORMATION
      ================================================= */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Map layers
        </Text>

        <Text style={styles.sectionDescription}>
          These are the layers requested in the i-TRAFFIC
          embedded map. Their actual availability depends
          on the provider.
        </Text>

        <View style={styles.layersGrid}>
          {MAP_LAYERS.map((layer) => (
            <View
              key={layer.id}
              style={styles.layerItem}
            >
              <View
                style={[
                  styles.layerIcon,
                  {
                    backgroundColor: `${layer.color}12`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={layer.icon as any}
                  size={20}
                  color={layer.color}
                />
              </View>

              <Text style={styles.layerLabel}>
                {layer.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* =================================================
          SOURCE INFORMATION
      ================================================= */}

      {showSourceInfo && (
        <View style={styles.sourceInfoCard}>
          <View style={styles.sourceInfoHeader}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={22}
              color="#0B4F8A"
            />

            <Text style={styles.sourceInfoTitle}>
              Traffic information source
            </Text>
          </View>

          <Text style={styles.sourceInfoBody}>
            TrafficConnectSystem displays the embedded
            traffic map supplied by i-TRAFFIC South Africa.
            The map is requested for Gauteng using the
            GP region setting.
          </Text>

          <Text style={styles.sourceInfoBody}>
            Traffic speeds, congestion, incidents,
            closures, roadworks and cameras are requested
            through the map's layer settings.
          </Text>

          <Text style={styles.sourceInfoBody}>
            TrafficConnectSystem does not independently
            verify the information displayed inside the
            embedded map. The map provider controls its
            data, updates, markers and availability.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openTrafficSource}
            style={styles.sourceLinkButton}
          >
            <Text style={styles.sourceLinkText}>
              Visit i-TRAFFIC website
            </Text>

            <MaterialCommunityIcons
              name="open-in-new"
              size={16}
              color="#0B4F8A"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* =================================================
          LAYER DETAILS
      ================================================= */}

      <View style={styles.noticeCard}>
        <MaterialCommunityIcons
          name="information-outline"
          size={21}
          color="#0B4F8A"
        />

        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle}>
            About this map
          </Text>

          <Text style={styles.noticeText}>
            This is an embedded third-party map, not a
            direct feed into our Firestore database.
            Reloading the map reloads the embed; it does
            not guarantee that the provider has refreshed
            its traffic data.
          </Text>
        </View>
      </View>

      {/* =================================================
          FOOTER
      ================================================= */}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Traffic data source: {TRAFFIC_SOURCE}
        </Text>

        <Text style={styles.footerSubtext}>
          Coverage requested: Gauteng (GP)
        </Text>
      </View>
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#F4F7FB",
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  headerTextContainer: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#0B4F8A",
    marginBottom: 5,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#17212B",
  },

  subtitle: {
    fontSize: 13,
    color: "#66737F",
    marginTop: 5,
  },

  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#E8F1FA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  /* METADATA */

  metadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
  },

  metadataBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F1FA",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
  },

  metadataText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0B4F8A",
    marginLeft: 5,
  },

  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
  },

  sourceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16803C",
    marginRight: 6,
  },

  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#344054",
  },

  /* MAP CARD */

  mapCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 20,
    overflow: "hidden",
  },

  mapCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  mapHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  mapHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#E8F1FA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  mapHeaderText: {
    flex: 1,
  },

  mapCardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#17212B",
  },

  mapCardSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: "#66737F",
  },

  refreshButton: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#F0F5FA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  mapFrame: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#E8EEF2",
  },

  mapFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#E8EDF1",
  },

  mapFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  mapFooterText: {
    fontSize: 10,
    color: "#66737F",
    marginLeft: 6,
  },

  externalButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },

  externalButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0B4F8A",
    marginRight: 5,
  },

  /* ACTIONS */

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 12,
  },

  actionButton: {
    flex: 1,
    minWidth: 135,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  actionButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#344054",
    marginLeft: 7,
  },

  /* LAYERS */

  section: {
    marginTop: 23,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#17212B",
  },

  sectionDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#66737F",
  },

  layersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 13,
  },

  layerItem: {
    width: "31%",
    minWidth: 95,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E6EB",
    borderRadius: 14,
  },

  layerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  layerLabel: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    color: "#344054",
  },

  /* SOURCE DETAILS */

  sourceInfoCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#D9E5F0",
    backgroundColor: "#FFFFFF",
  },

  sourceInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sourceInfoTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#17212B",
    marginLeft: 8,
  },

  sourceInfoBody: {
    fontSize: 12,
    lineHeight: 19,
    color: "#596673",
    marginBottom: 10,
  },

  sourceLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 7,
  },

  sourceLinkText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0B4F8A",
    marginRight: 6,
  },

  /* NOTICE */

  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    marginTop: 18,
    backgroundColor: "#EAF3FB",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#D5E7F7",
  },

  noticeContent: {
    flex: 1,
    marginLeft: 10,
  },

  noticeTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#174A78",
  },

  noticeText: {
    fontSize: 11,
    lineHeight: 18,
    color: "#425C73",
    marginTop: 5,
  },

  /* FALLBACK */

  nativeFallback: {
    minHeight: 360,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F7FB",
  },

  fallbackIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#E8F1FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  fallbackTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#17212B",
    textAlign: "center",
  },

  fallbackDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: "#66737F",
    textAlign: "center",
    marginTop: 9,
    marginBottom: 17,
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B4F8A",
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 12,
  },

  primaryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 7,
  },

  secondaryButton: {
    marginTop: 12,
    padding: 9,
  },

  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0B4F8A",
  },

  /* FOOTER */

  footer: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 12,
  },

  footerText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#596673",
    textAlign: "center",
  },

  footerSubtext: {
    fontSize: 10,
    color: "#89949E",
    marginTop: 5,
    textAlign: "center",
  },
});
