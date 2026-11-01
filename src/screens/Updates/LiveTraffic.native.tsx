import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Circle,
  Marker,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * TrafficConnect native live traffic map.
 *
 * File: TrafficIncidents.native.tsx
 *
 * Native Android/iOS implementation.
 * The existing TrafficIncidents.tsx remains the web/Leaflet version.
 *
 * Shared Firestore collection: trafficIncidents
 */

const { width } = Dimensions.get("window");
const INCIDENTS_COLLECTION = "trafficIncidents";

const PRETORIA_BOUNDS = {
  minLat: -25.95,
  maxLat: -25.55,
  minLng: 28.05,
  maxLng: 28.45,
};

const PRETORIA_CENTER = {
  latitude: -25.7479,
  longitude: 28.2293,
};

const INITIAL_REGION: Region = {
  ...PRETORIA_CENTER,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

type IncidentType = "accident" | "construction" | "closure";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type TrafficIncident = {
  id: string;
  type: IncidentType;
  title: string;
  location: string;
  description: string;
  status: string;
  verificationStatus: "unverified" | "verified" | "resolved";
  reportedAtMs: number;
  coordinate: Coordinate;
  reporterId?: string | null;
};

const getIncidentConfig = (type: IncidentType) => {
  switch (type) {
    case "accident":
      return {
        icon: "car-crash",
        color: "#B42318",
        background: "#FEF3F2",
        label: "ACCIDENT",
        marker: "!",
      };
    case "construction":
      return {
        icon: "road-variant",
        color: "#A16207",
        background: "#FFF8E6",
        label: "ROADWORKS",
        marker: "R",
      };
    case "closure":
      return {
        icon: "close-octagon-outline",
        color: "#7A271A",
        background: "#FEE4E2",
        label: "ROAD CLOSURE",
        marker: "X",
      };
  }
};

function isInsidePretoria(coordinate: Coordinate) {
  return (
    coordinate.latitude >= PRETORIA_BOUNDS.minLat &&
    coordinate.latitude <= PRETORIA_BOUNDS.maxLat &&
    coordinate.longitude >= PRETORIA_BOUNDS.minLng &&
    coordinate.longitude <= PRETORIA_BOUNDS.maxLng
  );
}

function formatIncidentTime(timeMs: number) {
  if (!timeMs) return "Just now";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - timeMs) / 60000)
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  return `${Math.floor(hours / 24)} day(s) ago`;
}

export default function TrafficIncidents() {
  const mapRef = useRef<MapView | null>(null);
  const seenInitialSnapshotRef = useRef(false);
  const skipToastIdsRef = useRef<Set<string>>(new Set());

  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] =
    useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportType, setReportType] = useState<IncidentType>("accident");

  const [description, setDescription] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [useManualLocation, setUseManualLocation] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [locationBusy, setLocationBusy] = useState(false);

  const selectedIncident = incidents.find(
    (incident) => incident.id === selectedIncidentId
  );

  const notify = useCallback(
    (message: string, title = "TrafficConnect") => {
      Alert.alert(title, message);
    },
    []
  );

  // Listen for live reports from all connected clients.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, INCIDENTS_COLLECTION),
      (snapshot) => {
        const incoming: TrafficIncident[] = [];

        snapshot.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();

          const latitude = Number(data.latitude);
          const longitude = Number(data.longitude);

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
          }

          const coordinate = { latitude, longitude };

          if (!isInsidePretoria(coordinate)) return;

          const type: IncidentType =
            data.type === "construction" || data.type === "closure"
              ? data.type
              : "accident";

          const reportedAtMs =
            typeof data.reportedAtMs === "number"
              ? data.reportedAtMs
              : data.reportedAt?.toMillis?.() ?? 0;

          incoming.push({
            id: documentSnapshot.id,
            type,
            title:
              typeof data.title === "string"
                ? data.title
                : type === "accident"
                ? "Accident Reported"
                : type === "construction"
                ? "Construction Zone"
                : "Road Closure",
            location:
              typeof data.location === "string"
                ? data.location
                : "Pretoria",
            description:
              typeof data.description === "string"
                ? data.description
                : "",
            status:
              typeof data.status === "string"
                ? data.status
                : "Reported",
            verificationStatus:
              data.verificationStatus === "verified" ||
              data.verificationStatus === "resolved"
                ? data.verificationStatus
                : "unverified",
            reportedAtMs,
            coordinate,
            reporterId:
              typeof data.reporterId === "string"
                ? data.reporterId
                : null,
          });
        });

        incoming.sort((a, b) => b.reportedAtMs - a.reportedAtMs);
        setIncidents(incoming);
        setLoadingIncidents(false);

        // Don't show alerts for old reports when the app first opens.
        if (seenInitialSnapshotRef.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== "added") return;

            if (skipToastIdsRef.current.has(change.doc.id)) {
              skipToastIdsRef.current.delete(change.doc.id);
              return;
            }

            const data = change.doc.data();
            const latitude = Number(data.latitude);
            const longitude = Number(data.longitude);

            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude) ||
              !isInsidePretoria({
                latitude,
                longitude,
              })
            ) {
              return;
            }

            const incidentName =
              data.type === "construction"
                ? "New roadworks reported"
                : data.type === "closure"
                ? "New road closure reported"
                : "New accident reported";

            Alert.alert(
              "New traffic report",
              `${incidentName} in ${data.location || "Pretoria"}.`
            );
          });
        }

        seenInitialSnapshotRef.current = true;
      },
      (error) => {
        console.error("Traffic incident listener error:", error);
        setLoadingIncidents(false);

        notify(
          "Could not load live incidents. Check your internet connection and Firestore rules.",
          "Connection error"
        );
      }
    );

    return unsubscribe;
  }, [notify]);

  const moveToIncident = (incident: TrafficIncident) => {
    setSelectedIncidentId(incident.id);

    mapRef.current?.animateToRegion(
      {
        ...incident.coordinate,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      600
    );
  };

  const resetMap = () => {
    setSelectedIncidentId(null);
    mapRef.current?.animateToRegion(INITIAL_REGION, 600);
  };

  const fitIncidents = () => {
    if (!mapRef.current) return;

    if (incidents.length === 0) {
      resetMap();
      return;
    }

    mapRef.current.fitToCoordinates(
      incidents.map((incident) => incident.coordinate),
      {
        edgePadding: {
          top: 80,
          right: 55,
          bottom: 100,
          left: 55,
        },
        animated: true,
      }
    );
  };

  const handleGetLocation = async () => {
    setLocationBusy(true);

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        notify(
          "Location permission was denied. Allow location access in your phone settings, or enter the coordinates manually.",
          "Location permission"
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinate: Coordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      if (!isInsidePretoria(coordinate)) {
        notify(
          "Your current location is outside this Pretoria-focused map. Enter coordinates within the Pretoria map area.",
          "Outside map area"
        );
        return;
      }

      setManualLatitude(coordinate.latitude.toFixed(6));
      setManualLongitude(coordinate.longitude.toFixed(6));
      setUseManualLocation(true);

      notify("Your current location has been captured.", "Location ready");
    } catch (error) {
      console.error("Could not get device location:", error);

      notify(
        "Could not get your location. Check that your phone's location service is enabled, or enter the coordinates manually.",
        "Location error"
      );
    } finally {
      setLocationBusy(false);
    }
  };

  const openReportModal = () => {
    setReportType("accident");
    setDescription("");
    setManualLatitude("");
    setManualLongitude("");
    setUseManualLocation(false);
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (submitting) return;

    const cleanDescription = description.trim();

    if (cleanDescription.length > 500) {
      notify("Please keep the description under 500 characters.");
      return;
    }

    let coordinate: Coordinate;

    if (useManualLocation) {
      const latitude = Number(manualLatitude);
      const longitude = Number(manualLongitude);

      if (
        manualLatitude.trim() === "" ||
        manualLongitude.trim() === "" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        notify("Enter a valid latitude and longitude.");
        return;
      }

      coordinate = { latitude, longitude };
    } else {
      try {
        setLocationBusy(true);

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== "granted") {
          notify(
            "Location permission is required. Allow access or enter the coordinates manually.",
            "Location permission"
          );
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        coordinate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (error) {
        console.error("Location lookup failed:", error);

        notify(
          "Could not get your location. Try again or enter coordinates manually.",
          "Location error"
        );
        return;
      } finally {
        setLocationBusy(false);
      }
    }

    if (!isInsidePretoria(coordinate)) {
      notify(
        "Please report an incident within the Pretoria map area.",
        "Outside map area"
      );
      return;
    }

    setSubmitting(true);

    try {
      let reporterId: string | null = null;

      try {
        reporterId = await AsyncStorage.getItem("userId");
      } catch (storageError) {
        console.warn("Could not read the userId from storage:", storageError);
      }

      const title =
        reportType === "accident"
          ? "Accident Reported"
          : reportType === "construction"
          ? "Construction Zone"
          : "Road Closure";

      const newIncident = await addDoc(
        collection(db, INCIDENTS_COLLECTION),
        {
          type: reportType,
          title,
          location: "Pretoria area",
          description: cleanDescription,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          status: "Reported",
          verificationStatus: "unverified",
          reporterId,
          reportedAt: serverTimestamp(),
          reportedAtMs: Date.now(),
          source: "public_report",
        }
      );

      skipToastIdsRef.current.add(newIncident.id);

      setReportModalVisible(false);
      setSelectedIncidentId(newIncident.id);

      mapRef.current?.animateToRegion(
        {
          ...coordinate,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        },
        600
      );

      notify(
        "Your report was saved and shared with connected users.",
        "Report submitted"
      );
    } catch (error) {
      console.error("Failed to submit traffic incident:", error);

      notify(
        "The report could not be saved. Check your internet connection and Firestore permissions.",
        "Submission failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          toolbarEnabled
          loadingEnabled
          onMapReady={() => {
            console.log("TrafficConnect native map is ready.");
          }}
        >
          {incidents.map((incident) => {
            const config = getIncidentConfig(incident.type);
            const selected = selectedIncidentId === incident.id;

            return (
              <React.Fragment key={incident.id}>
                <Circle
                  center={incident.coordinate}
                  radius={180}
                  strokeColor={`${config.color}70`}
                  strokeWidth={1}
                  fillColor={`${config.color}14`}
                />

                <Marker
                  coordinate={incident.coordinate}
                  title={incident.title}
                  description={
                    incident.description ||
                    config.label
                  }
                  onPress={() => moveToIncident(incident)}
                  tracksViewChanges={false}
                >
                  <View
                    style={[
                      styles.markerOuter,
                      {
                        backgroundColor: `${config.color}25`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.markerInner,
                        {
                          backgroundColor: config.color,
                          borderWidth: selected ? 4 : 2,
                        },
                      ]}
                    >
                      <Text style={styles.markerText}>
                        {config.marker}
                      </Text>
                    </View>
                  </View>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapView>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE INCIDENTS</Text>
        </View>

        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() =>
              mapRef.current?.getCamera().then((camera) => {
                mapRef.current?.animateCamera(
                  { zoom: (camera.zoom ?? 11) + 1 },
                  { duration: 250 }
                );
              })
            }
            accessibilityLabel="Zoom in"
          >
            <MaterialCommunityIcons
              name="plus"
              size={21}
              color="#17212B"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapButton}
            onPress={() =>
              mapRef.current?.getCamera().then((camera) => {
                mapRef.current?.animateCamera(
                  { zoom: Math.max(3, (camera.zoom ?? 11) - 1) },
                  { duration: 250 }
                );
              })
            }
            accessibilityLabel="Zoom out"
          >
            <MaterialCommunityIcons
              name="minus"
              size={21}
              color="#17212B"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapButton}
            onPress={resetMap}
            accessibilityLabel="Reset Pretoria map"
          >
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={19}
              color="#0B4F8A"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapButton}
            onPress={fitIncidents}
            accessibilityLabel="Show all incidents"
          >
            <MaterialCommunityIcons
              name="map-marker-multiple"
              size={19}
              color="#0B4F8A"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.mapInfo}>
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={15}
            color="#0B4F8A"
          />
          <Text style={styles.mapInfoText}>Pretoria, Gauteng</Text>
        </View>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={openReportModal}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="plus-circle"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.reportButtonText}>Report incident</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded((value) => !value)}
        style={styles.expandButton}
      >
        <View style={styles.expandHandle} />

        <View style={styles.expandContent}>
          <View style={{ flex: 1 }}>
            <View style={styles.activeTitleRow}>
              <View style={styles.activeIndicator} />
              <Text style={styles.expandTitle}>
                {loadingIncidents
                  ? "Loading incidents..."
                  : `${incidents.length} incident${
                      incidents.length === 1 ? "" : "s"
                    } in Pretoria`}
              </Text>
            </View>

            <Text style={styles.expandSubtitle}>
              Live updates from community reports
            </Text>
          </View>

          <MaterialCommunityIcons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={28}
            color="#17212B"
          />
        </View>
      </TouchableOpacity>

      {selectedIncident && (
        <View style={styles.selectedContainer}>
          <IncidentDetails incident={selectedIncident} />

          <TouchableOpacity
            onPress={() => setSelectedIncidentId(null)}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>
              Clear selection
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {expanded && (
        <View style={styles.incidentList}>
          {loadingIncidents ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#0B4F8A" />
              <Text style={styles.emptyText}>
                Loading live incidents...
              </Text>
            </View>
          ) : incidents.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={28}
                color="#067647"
              />
              <Text style={styles.emptyTitle}>
                No incidents reported
              </Text>
              <Text style={styles.emptyText}>
                Be the first to report a traffic incident in Pretoria.
              </Text>
            </View>
          ) : (
            incidents.map((incident) => {
              const config = getIncidentConfig(incident.type);
              const selected = selectedIncidentId === incident.id;

              return (
                <TouchableOpacity
                  key={incident.id}
                  activeOpacity={0.8}
                  onPress={() => moveToIncident(incident)}
                  style={[
                    styles.incidentRow,
                    selected && styles.incidentRowSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.incidentIcon,
                      { backgroundColor: config.background },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={config.icon as any}
                      size={21}
                      color={config.color}
                    />
                  </View>

                  <View style={styles.incidentRowContent}>
                    <Text style={styles.incidentTitle}>
                      {incident.title}
                    </Text>
                    <Text style={styles.incidentLocation}>
                      {incident.location}
                    </Text>
                    <Text style={styles.incidentStatus}>
                      {incident.verificationStatus === "verified"
                        ? "Verified"
                        : incident.verificationStatus === "resolved"
                        ? "Resolved"
                        : "Unverified report"}
                    </Text>
                  </View>

                  <View style={styles.incidentRight}>
                    <Text style={styles.incidentTime}>
                      {formatIncidentTime(incident.reportedAtMs)}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color="#8A96A3"
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Report a traffic incident
                </Text>
                <Text style={styles.modalSubtitle}>
                  Reports remain unverified until reviewed.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setReportModalVisible(false)}
                style={styles.modalCloseButton}
                accessibilityLabel="Close report form"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color="#344054"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScroll}
            >
              <Text style={styles.fieldLabel}>What happened?</Text>

              <View style={styles.typeRow}>
                {(
                  [
                    ["accident", "Accident", "car-crash"],
                    ["construction", "Roadworks", "road-variant"],
                    ["closure", "Closure", "close-octagon-outline"],
                  ] as const
                ).map(([type, label, icon]) => {
                  const active = reportType === type;
                  const config = getIncidentConfig(type);

                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setReportType(type)}
                      style={[
                        styles.typeOption,
                        active && {
                          borderColor: config.color,
                          backgroundColor: config.background,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={22}
                        color={config.color}
                      />
                      <Text
                        style={[
                          styles.typeOptionText,
                          active && { color: config.color },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Incident location</Text>

              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetLocation}
                disabled={locationBusy || submitting}
              >
                {locationBusy ? (
                  <ActivityIndicator color="#0B4F8A" />
                ) : (
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={21}
                    color="#0B4F8A"
                  />
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.locationButtonTitle}>
                    Use my current location
                  </Text>
                  <Text style={styles.locationButtonSubtitle}>
                    Allow location access when your phone asks.
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.manualLocationHeader}>
                <Text style={styles.fieldLabel}>
                  Or enter coordinates manually
                </Text>
                <Text style={styles.optionalText}>Pretoria only</Text>
              </View>

              <View style={styles.coordinateRow}>
                <TextInput
                  value={manualLatitude}
                  onChangeText={(value) => {
                    setManualLatitude(value);
                    setUseManualLocation(true);
                  }}
                  placeholder="Latitude e.g. -25.7479"
                  keyboardType="numbers-and-punctuation"
                  style={styles.coordinateInput}
                  autoCapitalize="none"
                />

                <TextInput
                  value={manualLongitude}
                  onChangeText={(value) => {
                    setManualLongitude(value);
                    setUseManualLocation(true);
                  }}
                  placeholder="Longitude e.g. 28.2293"
                  keyboardType="numbers-and-punctuation"
                  style={styles.coordinateInput}
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.helperText}>
                GPS fills in the coordinates. You can also edit them.
              </Text>

              <Text style={styles.fieldLabel}>
                Description (optional)
              </Text>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Example: One lane is blocked after an accident."
                multiline
                maxLength={500}
                textAlignVertical="top"
                style={styles.descriptionInput}
              />

              <Text style={styles.characterCount}>
                {description.length}/500
              </Text>

              <View style={styles.privacyNote}>
                <MaterialCommunityIcons
                  name="shield-lock-outline"
                  size={19}
                  color="#175CD3"
                />
                <Text style={styles.privacyText}>
                  Your name and contact details are not displayed on the
                  map. A private account reference may be saved for abuse
                  prevention.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={submitReport}
                disabled={submitting || locationBusy}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="send"
                      size={19}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitButtonText}>
                      Submit incident report
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setReportModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function IncidentDetails({
  incident,
}: {
  incident: TrafficIncident;
}) {
  const config = getIncidentConfig(incident.type);

  return (
    <View style={styles.detailsCard}>
      <View
        style={[
          styles.detailsIcon,
          { backgroundColor: config.background },
        ]}
      >
        <MaterialCommunityIcons
          name={config.icon as any}
          size={24}
          color={config.color}
        />
      </View>

      <View style={styles.detailsContent}>
        <View style={styles.detailsTopRow}>
          <Text style={styles.detailsTitle}>{incident.title}</Text>
          <Text style={[styles.priorityText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>

        <Text style={styles.detailsLocation}>
          {incident.location}
        </Text>

        {!!incident.description && (
          <Text style={styles.detailsDescription}>
            {incident.description}
          </Text>
        )}

        <View style={styles.detailsBottom}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: config.color },
              ]}
            />
            <Text style={styles.statusText}>
              {incident.verificationStatus === "resolved"
                ? "Resolved"
                : incident.verificationStatus === "verified"
                ? "Verified"
                : "Awaiting verification"}
            </Text>
          </View>

          <Text style={styles.timeText}>
            {formatIncidentTime(incident.reportedAtMs)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  mapContainer: {
    width: "100%",
    height: width > 700 ? 430 : 390,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#DCE5DF",
    borderWidth: 1,
    borderColor: "#D1D9DE",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  liveBadge: {
    position: "absolute",
    top: 15,
    left: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#067647",
    marginRight: 7,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#17212B",
    letterSpacing: 0.8,
  },
  mapControls: {
    position: "absolute",
    right: 14,
    top: 15,
    gap: 7,
  },
  mapButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  mapInfo: {
    position: "absolute",
    right: 14,
    bottom: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 12,
    elevation: 3,
  },
  mapInfoText: {
    marginLeft: 5,
    fontSize: 9,
    fontWeight: "800",
    color: "#4C5965",
  },
  reportButton: {
    position: "absolute",
    bottom: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#0B4F8A",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    elevation: 4,
  },
  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  markerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  markerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  markerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  expandButton: {
    marginTop: -1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 7,
    paddingBottom: 15,
  },
  expandHandle: {
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#CDD4DA",
    alignSelf: "center",
    marginBottom: 10,
  },
  expandContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#067647",
    marginRight: 7,
  },
  expandTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#17212B",
  },
  expandSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#7A8792",
  },
  selectedContainer: {
    marginTop: 12,
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    elevation: 1,
  },
  detailsIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailsContent: {
    flex: 1,
  },
  detailsTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  detailsTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#17212B",
  },
  priorityText: {
    fontSize: 9,
    fontWeight: "900",
  },
  detailsLocation: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: "#66737F",
  },
  detailsDescription: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#596673",
  },
  detailsBottom: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F5C68",
  },
  timeText: {
    fontSize: 10,
    color: "#89949E",
  },
  clearButton: {
    alignSelf: "flex-end",
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0B4F8A",
  },
  incidentList: {
    marginTop: 12,
    gap: 8,
  },
  incidentRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  incidentRowSelected: {
    borderColor: "#0B4F8A",
    backgroundColor: "#F7FBFF",
  },
  incidentIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  incidentRowContent: {
    flex: 1,
  },
  incidentTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#17212B",
  },
  incidentLocation: {
    marginTop: 2,
    fontSize: 11,
    color: "#66737F",
  },
  incidentStatus: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: "#7A8792",
  },
  incidentRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },
  incidentTime: {
    fontSize: 9,
    color: "#89949E",
    marginBottom: 5,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#17212B",
  },
  emptyText: {
    fontSize: 12,
    color: "#66737F",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,40,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#17212B",
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#66737F",
  },
  modalCloseButton: {
    padding: 6,
    marginLeft: 8,
  },
  modalScroll: {
    paddingBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#344054",
    marginTop: 13,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeOption: {
    flex: 1,
    minHeight: 76,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    gap: 6,
  },
  typeOptionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475467",
    textAlign: "center",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: "#B2CCFF",
    backgroundColor: "#F5F8FF",
    borderRadius: 13,
    padding: 12,
  },
  locationButtonTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#17212B",
  },
  locationButtonSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: "#66737F",
  },
  manualLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  optionalText: {
    fontSize: 10,
    color: "#66737F",
  },
  coordinateRow: {
    flexDirection: "row",
    gap: 8,
  },
  coordinateInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 11,
    color: "#17212B",
  },
  helperText: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 15,
    color: "#66737F",
  },
  descriptionInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    color: "#17212B",
  },
  characterCount: {
    marginTop: 4,
    textAlign: "right",
    fontSize: 10,
    color: "#66737F",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 14,
    backgroundColor: "#EFF8FF",
    borderRadius: 12,
    padding: 11,
  },
  privacyText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: "#344054",
  },
  submitButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0B4F8A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 13,
  },
  cancelButtonText: {
    color: "#475467",
    fontSize: 12,
    fontWeight: "800",
  },
});
