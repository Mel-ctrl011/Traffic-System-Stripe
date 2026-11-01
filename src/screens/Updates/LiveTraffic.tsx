import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * TrafficConnect live incident map.
 *
 * IMPORTANT:
 * Leaflet is a web mapping library. This component must run in a web /
 * React Native Web target. It will not render a Leaflet map in a native
 * Android/iOS view without a WebView or a native map library.
 *
 * Firestore collection used: trafficIncidents
 */

const { width } = Dimensions.get("window");
const INCIDENTS_COLLECTION = "trafficIncidents";

// Approximate Pretoria coverage. Reports outside this rectangle are not
// displayed by this Pretoria-focused screen.
// Approximate Tshwane coverage.
// This is a bounding rectangle, not the exact municipal boundary.
const TSHWANE_BOUNDS = {
  minLat: -26.0,
  maxLat: -25.30,
  minLng: 27.80,
  maxLng: 28.80,
};

const PRETORIA_CENTER: [number, number] = [-25.7479, 28.2293];



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
  reportedAt?: any;
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
        label: "UNVERIFIED REPORT",
        marker: "!",
      };
    case "construction":
      return {
        icon: "road-variant",
        color: "#A16207",
        background: "#FFF8E6",
        label: "ROADWORKS REPORT",
        marker: "⚒",
      };
    case "closure":
      return {
        icon: "close-octagon-outline",
        color: "#7A271A",
        background: "#FEE4E2",
        label: "CLOSURE REPORT",
        marker: "×",
      };
  }
};

function isInsideTshwane(coordinate: Coordinate) {
  return (
    coordinate.latitude >= TSHWANE_BOUNDS.minLat &&
    coordinate.latitude <= TSHWANE_BOUNDS.maxLat &&
    coordinate.longitude >= TSHWANE_BOUNDS.minLng &&
    coordinate.longitude <= TSHWANE_BOUNDS.maxLng
  );
}

function formatIncidentTime(timeMs: number) {
  if (!timeMs) return "Just now";
  const minutes = Math.max(0, Math.floor((Date.now() - timeMs) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
}

function createIncidentIcon(incident: TrafficIncident, selected: boolean) {
  const config = getIncidentConfig(incident.type);
  return L.divIcon({
    className: "traffic-incident-marker",
    html: `
      <div style="position:relative;width:54px;height:54px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:48px;height:48px;border-radius:50%;background:${config.color};opacity:.16;"></div>
        <div style="position:relative;width:38px;height:38px;border-radius:50%;background:${config.color};border:${selected ? "4px" : "3px"} solid white;box-shadow:0 3px 10px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;color:white;font-size:19px;font-weight:900;">
          ${config.marker}
        </div>
      </div>`,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });
}

function IncidentDetails({ incident }: { incident: TrafficIncident }) {
  const config = getIncidentConfig(incident.type);
  return (
    <View style={styles.detailsCard}>
      <View style={[styles.detailsIcon, { backgroundColor: config.background }]}>
        <MaterialCommunityIcons name={config.icon as any} size={24} color={config.color} />
      </View>
      <View style={styles.detailsContent}>
        <View style={styles.detailsTopRow}>
          <Text style={styles.detailsTitle}>{incident.title}</Text>
          <Text style={[styles.priorityText, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={styles.detailsLocation}>{incident.location}</Text>
        {!!incident.description && (
          <Text style={styles.detailsDescription}>{incident.description}</Text>
        )}
        <View style={styles.detailsBottom}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={styles.statusText}>
              {incident.verificationStatus === "resolved"
                ? "Resolved"
                : incident.verificationStatus === "verified"
                ? "Verified"
                : "Awaiting verification"}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatIncidentTime(incident.reportedAtMs)}</Text>
        </View>
      </View>
    </View>
  );
}

function Toast({
  message,
  kind,
  onClose,
}: {
  message: string;
  kind: "success" | "error" | "info";
  onClose: () => void;
}) {
  if (!message) return null;
  const color =
    kind === "success" ? "#067647" : kind === "error" ? "#B42318" : "#175CD3";
  const background =
    kind === "success" ? "#ECFDF3" : kind === "error" ? "#FEF3F2" : "#EFF8FF";
  return (
    <View style={[styles.toast, { borderColor: color, backgroundColor: background }]}>
      <MaterialCommunityIcons
        name={kind === "success" ? "check-circle" : kind === "error" ? "alert-circle" : "information"}
        size={22}
        color={color}
      />
      <Text style={[styles.toastText, { color }]}>{message}</Text>
      <TouchableOpacity onPress={onClose} accessibilityLabel="Dismiss message">
        <MaterialCommunityIcons name="close" size={19} color={color} />
      </TouchableOpacity>
    </View>
  );
}

export default function TrafficIncidents() {
  // Leaflet needs a real DOM element. This is for web / React Native Web.
  const mapElementRef = useRef<any>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selectedLocationMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const incidentCirclesRef = useRef<Record<string, L.Circle>>({});
  const seenInitialSnapshotRef = useRef(false);
  const skipToastIdsRef = useRef<Set<string>>(new Set());

  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportType, setReportType] = useState<IncidentType>("accident");
  const [description, setDescription] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastKind, setToastKind] = useState<"success" | "error" | "info">("info");
  const [locationBusy, setLocationBusy] = useState(false);

  const showToast = useCallback(
    (message: string, kind: "success" | "error" | "info" = "info") => {
      setToastMessage(message);
      setToastKind(kind);
    },
    []
  );

  const clearToast = useCallback(() => setToastMessage(""), []);

  // Automatically dismiss toast messages after five seconds.
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const getCurrentLocation = useCallback((): Promise<Coordinate> => {
    return new Promise((resolve, reject) => {
      if (Platform.OS !== "web" || typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Current location is available in the web version only. Choose a location manually."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          const message =
            error.code === 1
              ? "Location permission was denied. Choose a location manually."
              : error.code === 2
              ? "Your current location could not be found. Choose a location manually."
              : "Getting your location took too long. Try again or choose a location manually.";
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
      );
    });
  }, []);

  // Listen to Firestore. Every connected user receives new/updated reports.
  useEffect(() => {
    const incidentsRef = collection(db, INCIDENTS_COLLECTION);

    const unsubscribe = onSnapshot(
      incidentsRef,
      (snapshot) => {
        const incoming: TrafficIncident[] = [];

        snapshot.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          const latitude = Number(data.latitude);
          const longitude = Number(data.longitude);

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

          const coordinate = { latitude, longitude };
          if (!isInsideTshwane(coordinate)) return;

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
            location: typeof data.location === "string" ? data.location : "Pretoria",
            description: typeof data.description === "string" ? data.description : "",
            status: typeof data.status === "string" ? data.status : "Reported",
            verificationStatus:
              data.verificationStatus === "verified" || data.verificationStatus === "resolved"
                ? data.verificationStatus
                : "unverified",
            reportedAt: data.reportedAt,
            reportedAtMs,
            coordinate,
            // Kept in memory only; never displayed in public UI.
            reporterId: typeof data.reporterId === "string" ? data.reporterId : null,
          });
        });

        incoming.sort((a, b) => b.reportedAtMs - a.reportedAtMs);
        setIncidents(incoming);
        setLoadingIncidents(false);

        // Do not toast every existing incident on first page load.
        if (seenInitialSnapshotRef.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== "added") return;
            if (skipToastIdsRef.current.has(change.doc.id)) {
              skipToastIdsRef.current.delete(change.doc.id);
              return;
            }
            const data = change.doc.data();
            const lat = Number(data.latitude);
            const lng = Number(data.longitude);
            if (
              Number.isFinite(lat) &&
              Number.isFinite(lng) &&
              isInsideTshwane({ latitude: lat, longitude: lng })
            ) {
              const title =
                data.type === "construction"
                  ? "New roadworks reported"
                  : data.type === "closure"
                  ? "New road closure reported"
                  : "New accident reported";
              showToast(`${title} in ${data.location || "Pretoria"}.`, "info");
            }
          });
        }
        seenInitialSnapshotRef.current = true;
      },
      (error) => {
        console.error("Traffic incident listener error:", error);
        setLoadingIncidents(false);
        showToast("Could not load live incidents. Check your connection and Firestore rules.", "error");
      }
    );

    return unsubscribe;
  }, [showToast]);

  // Initialise the map once.
  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    try {
      const map = L.map(mapElementRef.current, {
        center: PRETORIA_CENTER,
        zoom: 11,
        zoomControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        attributionControl: true,
      });

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      }).addTo(map);
// Let the user select the location where an incident happened.
map.on("click", (event: L.LeafletMouseEvent) => {
  const coordinate: Coordinate = {
    latitude: event.latlng.lat,
    longitude: event.latlng.lng,
  };

  if (!isInsideTshwane(coordinate)) {
    showToast(
      "Please choose a location within the Tshwane coverage area.",
      "error"
    );
    return;
  }

  // Fill the same coordinate fields already used by the report form.
  setManualLatitude(coordinate.latitude.toFixed(6));
  setManualLongitude(coordinate.longitude.toFixed(6));
  setUseManualLocation(true);

  // Create the selection marker once, then move it on future taps.
  if (!selectedLocationMarkerRef.current) {
    selectedLocationMarkerRef.current = L.marker(
      [coordinate.latitude, coordinate.longitude],
      {
        icon: L.divIcon({
          className: "selected-report-location",
          html: `
            <div style="
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #0B4F8A;
              border: 4px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,.35);
            "></div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }
    ).addTo(map);
  } else {
    selectedLocationMarkerRef.current.setLatLng([
      coordinate.latitude,
      coordinate.longitude,
    ]);
  }

  showToast("Location selected. Open the report form to continue.", "success");
});
      const timer = window.setTimeout(() => map.invalidateSize(), 250);

      return () => {
        window.clearTimeout(timer);
        map.remove();
        mapRef.current = null;
        markersRef.current = {};
        incidentCirclesRef.current = {};
      };
    } catch (error) {
      console.error("Leaflet map initialisation failed:", error);
      showToast("The map could not start. This Leaflet screen must run on web.", "error");
    }
  }, [showToast]);

  // Keep Leaflet markers in sync with Firestore state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeIds = new Set(incidents.map((incident) => incident.id));

    Object.keys(markersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        markersRef.current[id]?.remove();
        incidentCirclesRef.current[id]?.remove();
        delete markersRef.current[id];
        delete incidentCirclesRef.current[id];
      }
    });

    incidents.forEach((incident) => {
      const point: [number, number] = [
        incident.coordinate.latitude,
        incident.coordinate.longitude,
      ];
      const selected = selectedIncidentId === incident.id;
      const config = getIncidentConfig(incident.type);

      if (!markersRef.current[incident.id]) {
        const marker = L.marker(point, {
          icon: createIncidentIcon(incident, selected),
        });

        marker.on("click", () => {
          setSelectedIncidentId(incident.id);
          map.flyTo(point, 14, { duration: 0.6 });
        });

        marker.addTo(map);
        markersRef.current[incident.id] = marker;

        incidentCirclesRef.current[incident.id] = L.circle(point, {
          radius: 180,
          color: config.color,
          weight: 1,
          opacity: 0.35,
          fillColor: config.color,
          fillOpacity: 0.08,
        }).addTo(map);
      } else {
        markersRef.current[incident.id].setLatLng(point);
        markersRef.current[incident.id].setIcon(createIncidentIcon(incident, selected));
        incidentCirclesRef.current[incident.id]?.setLatLng(point);
      }
    });
  }, [incidents, selectedIncidentId]);

  const selectedIncident = incidents.find((item) => item.id === selectedIncidentId);

  const handleGetLocation = async () => {
    setLocationBusy(true);
    try {
      const coordinate = await getCurrentLocation();
    if (!isInsideTshwane(coordinate)) {
  showToast(
    "Please report an incident within the Tshwane coverage area.",
    "error"
  );
  return;
}
      setManualLatitude(coordinate.latitude.toFixed(6));
      setManualLongitude(coordinate.longitude.toFixed(6));
      setUseManualLocation(true);
      showToast("Current location captured.", "success");
    } catch (error: any) {
      showToast(error?.message || "Could not get your location.", "error");
    } finally {
      setLocationBusy(false);
    }
  };

const openReportModal = () => {
  setReportType("accident");
  setDescription("");

  // Preserve the map-selected location or the last captured GPS location.
  setReportModalVisible(true);
};

  const submitReport = async () => {
    if (submitting) return;

    const cleanDescription = description.trim();
    if (cleanDescription.length > 500) {
      showToast("Please keep the description under 500 characters.", "error");
      return;
    }

    let coordinate: Coordinate;
    if (useManualLocation) {
      const latitude = Number(manualLatitude);
      const longitude = Number(manualLongitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        showToast("Get your current location or enter valid latitude and longitude.", "error");
        return;
      }

      coordinate = { latitude, longitude };
    } else {
      try {
        setLocationBusy(true);
        coordinate = await getCurrentLocation();
      } catch (error: any) {
        showToast(error?.message || "Location is required. Choose a location manually.", "error");
        setLocationBusy(false);
        return;
      } finally {
        setLocationBusy(false);
      }
    }

  if (!isInsideTshwane(coordinate)) {
  showToast(
    "Your current location is outside the Tshwane coverage area. Choose a point on the map instead.",
    "error"
  );
  return;
}

    setSubmitting(true);
    try {
      // This project stores the signed-in citizen ID in AsyncStorage as "userId".
      // Do not save/display a person's name, phone number or ID number in public incident data.
      let reporterId: string | null = null;
      try {
        reporterId = await AsyncStorage.getItem("userId");
      } catch {
        reporterId = null;
      }

      const title =
        reportType === "accident"
          ? "Accident Reported"
          : reportType === "construction"
          ? "Construction Zone"
          : "Road Closure";

      const newIncident = await addDoc(collection(db, INCIDENTS_COLLECTION), {
        type: reportType,
        title,
        location: "Tshwane area",
        description: cleanDescription,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        status: "Reported",
        verificationStatus: "unverified",
        reporterId,
        reportedAt: serverTimestamp(),
        reportedAtMs: Date.now(),
        source: "public_report",
      });

      // Avoid showing a duplicate incoming-incident toast on the reporter's own device.
      skipToastIdsRef.current.add(newIncident.id);

      setReportModalVisible(false);
      setSelectedIncidentId(newIncident.id);
      mapRef.current?.flyTo(
        [coordinate.latitude, coordinate.longitude],
        14,
        { duration: 0.6 }
      );
      showToast("Report submitted. The incident is now shared with connected users.", "success");
    } catch (error) {
      console.error("Failed to submit traffic incident:", error);
      showToast("The report could not be saved. Check your internet connection and Firestore rules.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const resetMap = () => mapRef.current?.flyTo(PRETORIA_CENTER, 11, { duration: 0.6 });

  const fitIncidents = () => {
    const map = mapRef.current;
    if (!map || incidents.length === 0) {
      resetMap();
      return;
    }

    const bounds = L.latLngBounds(
      incidents.map((incident) => [
        incident.coordinate.latitude,
        incident.coordinate.longitude,
      ] as [number, number])
    );
    map.fitBounds(bounds, { padding: [55, 55], maxZoom: 12, animate: true });
  };

  const selectIncident = (incident: TrafficIncident) => {
    setSelectedIncidentId(incident.id);
    mapRef.current?.flyTo(
      [incident.coordinate.latitude, incident.coordinate.longitude],
      14,
      { duration: 0.6 }
    );
  };

  return (
    <View style={styles.container}>
      <Toast message={toastMessage} kind={toastKind} onClose={clearToast} />

      <View style={styles.mapContainer}>
        <View
          // Leaflet requires a DOM element. This works on web / React Native Web.
          ref={mapElementRef}
          style={styles.map as any}
        />

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE INCIDENTS</Text>
        </View>

        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapButton} onPress={zoomIn} accessibilityLabel="Zoom in">
            <MaterialCommunityIcons name="plus" size={21} color="#17212B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={zoomOut} accessibilityLabel="Zoom out">
            <MaterialCommunityIcons name="minus" size={21} color="#17212B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={resetMap} accessibilityLabel="Reset Pretoria map">
            <MaterialCommunityIcons name="crosshairs-gps" size={19} color="#0B4F8A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={fitIncidents} accessibilityLabel="Show all incidents">
            <MaterialCommunityIcons name="map-marker-multiple" size={19} color="#0B4F8A" />
          </TouchableOpacity>
        </View>

        <View style={styles.mapInfo}>
          <MaterialCommunityIcons name="map-marker-radius" size={14} color="#0B4F8A" />
          <Text style={styles.mapInfoText}>Pretoria, Gauteng</Text>
        </View>

        <TouchableOpacity style={styles.reportButton} onPress={openReportModal} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFFFF" />
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
          <View>
            <View style={styles.activeTitleRow}>
              <View style={styles.activeIndicator} />
              <Text style={styles.expandTitle}>
                {loadingIncidents ? "Loading incidents…" : `${incidents.length} incident${incidents.length === 1 ? "" : "s"} in Pretoria`}
              </Text>
            </View>
            <Text style={styles.expandSubtitle}>Live updates from community reports</Text>
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
          <TouchableOpacity onPress={() => setSelectedIncidentId(null)} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear selection</Text>
          </TouchableOpacity>
        </View>
      )}

      {expanded && (
        <View style={styles.incidentList}>
          {loadingIncidents ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#0B4F8A" />
              <Text style={styles.emptyText}>Loading live incidents…</Text>
            </View>
          ) : incidents.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle-outline" size={28} color="#067647" />
              <Text style={styles.emptyTitle}>No incidents reported</Text>
              <Text style={styles.emptyText}>Be the first to report a traffic incident in Pretoria.</Text>
            </View>
          ) : (
            incidents.map((incident) => {
              const config = getIncidentConfig(incident.type);
              const isSelected = selectedIncidentId === incident.id;

              return (
                <TouchableOpacity
                  key={incident.id}
                  activeOpacity={0.8}
                  onPress={() => selectIncident(incident)}
                  style={[styles.incidentRow, isSelected && styles.incidentRowSelected]}
                >
                  <View style={[styles.incidentIcon, { backgroundColor: config.background }]}>
                    <MaterialCommunityIcons name={config.icon as any} size={21} color={config.color} />
                  </View>
                  <View style={styles.incidentRowContent}>
                    <Text style={styles.incidentTitle}>{incident.title}</Text>
                    <Text style={styles.incidentLocation}>{incident.location}</Text>
                    <Text style={styles.incidentStatus}>
                      {incident.verificationStatus === "verified"
                        ? "Verified"
                        : incident.verificationStatus === "resolved"
                        ? "Resolved"
                        : "Unverified report"}
                    </Text>
                  </View>
                  <View style={styles.incidentRight}>
                    <Text style={styles.incidentTime}>{formatIncidentTime(incident.reportedAtMs)}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#8A96A3" />
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
                <Text style={styles.modalTitle}>Report a traffic incident</Text>
                <Text style={styles.modalSubtitle}>Reports are marked unverified until reviewed.</Text>
              </View>
              <TouchableOpacity
                onPress={() => setReportModalVisible(false)}
                style={styles.modalCloseButton}
                accessibilityLabel="Close report form"
              >
                <MaterialCommunityIcons name="close" size={22} color="#344054" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
              <Text style={styles.fieldLabel}>What happened?</Text>
              <View style={styles.typeRow}>
                {([
                  ["accident", "Accident", "car-crash"],
                  ["construction", "Roadworks", "road-variant"],
                  ["closure", "Closure", "close-octagon-outline"],
                ] as const).map(([type, label, icon]) => {
                  const active = reportType === type;
                  const config = getIncidentConfig(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setReportType(type)}
                      style={[
                        styles.typeOption,
                        active && { borderColor: config.color, backgroundColor: config.background },
                      ]}
                    >
                      <MaterialCommunityIcons name={icon as any} size={22} color={config.color} />
                      <Text style={[styles.typeOptionText, active && { color: config.color }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Incident location</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetLocation}
                disabled={locationBusy}
              >
                {locationBusy ? (
                  <ActivityIndicator color="#0B4F8A" />
                ) : (
                  <MaterialCommunityIcons name="crosshairs-gps" size={21} color="#0B4F8A" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationButtonTitle}>Use my current location</Text>
                  <Text style={styles.locationButtonSubtitle}>Your browser will ask for location permission.</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.manualLocationHeader}>
                <Text style={styles.fieldLabel}>Or enter coordinates manually</Text>
<Text style={styles.optionalText}>Tshwane coverage area</Text>
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
                If you use GPS, the coordinates fill in here. You can edit them if needed.
              </Text>

              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Example: One lane is blocked after an accident."
                multiline
                maxLength={500}
                textAlignVertical="top"
                style={styles.descriptionInput}
              />
              <Text style={styles.characterCount}>{description.length}/500</Text>

              <View style={styles.privacyNote}>
                <MaterialCommunityIcons name="shield-lock-outline" size={19} color="#175CD3" />
                <Text style={styles.privacyText}>
                  Your name and contact details are not shown on the map. A private account reference may be saved for abuse prevention.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={submitReport}
                disabled={submitting || locationBusy}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={19} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit incident report</Text>
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

const styles = StyleSheet.create({
  container: { width: "100%" },
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
  map: { width: "100%", height: "100%" },
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
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#067647", marginRight: 7 },
  liveText: { fontSize: 10, fontWeight: "900", color: "#17212B", letterSpacing: 0.8 },
  mapControls: { position: "absolute", right: 14, top: 15, gap: 7 },
  mapButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
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
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapInfoText: { marginLeft: 5, fontSize: 9, fontWeight: "800", color: "#4C5965" },
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
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  reportButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
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
  expandHandle: { width: 38, height: 4, borderRadius: 3, backgroundColor: "#CDD4DA", alignSelf: "center", marginBottom: 10 },
  expandContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activeTitleRow: { flexDirection: "row", alignItems: "center" },
  activeIndicator: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#067647", marginRight: 7 },
  expandTitle: { fontSize: 15, fontWeight: "800", color: "#17212B" },
  expandSubtitle: { marginTop: 3, fontSize: 11, color: "#7A8792" },
  selectedContainer: { marginTop: 12 },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  detailsIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  detailsContent: { flex: 1 },
  detailsTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  detailsTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#17212B" },
  priorityText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  detailsLocation: { marginTop: 3, fontSize: 12, fontWeight: "600", color: "#66737F" },
  detailsDescription: { marginTop: 8, fontSize: 12, lineHeight: 18, color: "#596673" },
  detailsBottom: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: "700", color: "#4F5C68" },
  timeText: { fontSize: 10, color: "#89949E" },
  clearButton: { alignSelf: "flex-end", marginTop: 7, paddingHorizontal: 8, paddingVertical: 5 },
  clearButtonText: { fontSize: 11, fontWeight: "700", color: "#0B4F8A" },
  incidentList: { marginTop: 12, gap: 8 },
  incidentRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  incidentRowSelected: { borderColor: "#0B4F8A", backgroundColor: "#F7FBFF" },
  incidentIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 11 },
  incidentRowContent: { flex: 1 },
  incidentTitle: { fontSize: 13, fontWeight: "800", color: "#17212B" },
  incidentLocation: { marginTop: 2, fontSize: 11, color: "#66737F" },
  incidentStatus: { marginTop: 4, fontSize: 10, fontWeight: "700", color: "#7A8792" },
  incidentRight: { alignItems: "flex-end", justifyContent: "center", marginLeft: 8 },
  incidentTime: { fontSize: 9, color: "#89949E", marginBottom: 5 },
  emptyState: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D9E0E6", borderRadius: 16, padding: 24, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#17212B" },
  emptyText: { fontSize: 12, color: "#66737F", textAlign: "center" },
  toast: {
    position: "absolute",
    zIndex: 10000,
    top: 10,
    left: 10,
    right: 10,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  toastText: { flex: 1, fontSize: 12, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16,24,40,0.55)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#17212B" },
  modalSubtitle: { marginTop: 4, fontSize: 12, color: "#66737F" },
  modalCloseButton: { padding: 6, marginLeft: 8 },
  modalScroll: { paddingBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "800", color: "#344054", marginTop: 13, marginBottom: 8 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeOption: { flex: 1, minHeight: 76, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, gap: 6 },
  typeOptionText: { fontSize: 11, fontWeight: "800", color: "#475467", textAlign: "center" },
  locationButton: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "#B2CCFF", backgroundColor: "#F5F8FF", borderRadius: 13, padding: 12 },
  locationButtonTitle: { fontSize: 12, fontWeight: "800", color: "#17212B" },
  locationButtonSubtitle: { marginTop: 3, fontSize: 10, color: "#66737F" },
  manualLocationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  optionalText: { fontSize: 10, color: "#66737F" },
  coordinateRow: { flexDirection: "row", gap: 8 },
  coordinateInput: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 11, fontSize: 11, color: "#17212B" },
  helperText: { marginTop: 6, fontSize: 10, lineHeight: 15, color: "#66737F" },
  descriptionInput: { minHeight: 90, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 12, padding: 12, fontSize: 12, color: "#17212B" },
  characterCount: { marginTop: 4, textAlign: "right", fontSize: 10, color: "#66737F" },
  privacyNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14, backgroundColor: "#EFF8FF", borderRadius: 12, padding: 11 },
  privacyText: { flex: 1, fontSize: 10, lineHeight: 15, color: "#344054" },
  submitButton: { marginTop: 16, minHeight: 48, borderRadius: 12, backgroundColor: "#0B4F8A", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  cancelButton: { alignItems: "center", paddingVertical: 13 },
  cancelButtonText: { color: "#475467", fontSize: 12, fontWeight: "800" },
});
