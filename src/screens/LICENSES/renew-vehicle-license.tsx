
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";

type RenewalRequest = {
  vehicleId: string;
  status: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: unknown;
  reviewedBy?: string;
};

export default function RenewVehicleLicenseScreen() {
  const { user } = useAuth();
const citizenId = user?.idNumber;
const citizenName = user?.fullName || "";
  const [renewalRequests, setRenewalRequests] = useState<
    Record<string, RenewalRequest>
  >({});
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submittingVehicleId, setSubmittingVehicleId] = useState<
    string | null
  >(null);

  // Listen for renewal decisions in Firestore.
  useEffect(() => {
    console.log(
      "[Renewal Debug] Screen mounted. Citizen ID:",
      user?.idNumber
    );

    if (!user?.idNumber) {
      console.warn(
        "[Renewal Debug] No citizen ID found in AuthContext."
      );
      setRenewalRequests({});
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);

    console.log(
      "[Renewal Debug] Firebase collection: vehicleRenewalRequests"
    );
    console.log(
      "[Renewal Debug] Query condition: citizenId ==",
      user.idNumber
    );

    const requestsQuery = query(
      collection(db, "vehicleRenewalRequests"),
      where("citizenId", "==", user.idNumber)
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        console.log(
          "[Renewal Debug] Snapshot received. Document count:",
          snapshot.size
        );

        console.log(
          "[Renewal Debug] Snapshot metadata:",
          {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
          }
        );

        const requests: Record<string, RenewalRequest> = {};

        snapshot.docs.forEach((requestDoc) => {
          const data = requestDoc.data();
          const vehicleId = data.vehicleId || requestDoc.id;

          console.log("-----------------------------------");
          console.log(
            "[Renewal Debug] Firestore document ID:",
            requestDoc.id
          );
          console.log(
            "[Renewal Debug] Vehicle ID:",
            vehicleId
          );
          console.log(
            "[Renewal Debug] Saved citizen ID:",
            data.citizenId
          );
          console.log(
            "[Renewal Debug] Registration:",
            data.registrationNumber
          );
          console.log(
            "[Renewal Debug] Status received from Firebase:",
            data.status
          );
          console.log(
            "[Renewal Debug] Rejection reason:",
            data.rejectionReason
          );
          console.log(
            "[Renewal Debug] Full Firestore document:",
            data
          );

          requests[vehicleId] = {
            vehicleId,
            status: data.status || "Pending",
            rejectionReason: data.rejectionReason || "",
            submittedAt: data.submittedAt || "",
            reviewedAt: data.reviewedAt,
            reviewedBy: data.reviewedBy || "",
          };
        });

        console.log(
          "[Renewal Debug] Vehicle IDs found:",
          Object.keys(requests)
        );

        console.log(
          "[Renewal Debug] Status map:",
          Object.fromEntries(
            Object.entries(requests).map(([id, request]) => [
              id,
              request.status,
            ])
          )
        );

        setRenewalRequests(requests);
        setLoadingRequests(false);
      },
      (error) => {
        console.error(
          "[Renewal Debug] Firestore listener error code:",
          error.code
        );
        console.error(
          "[Renewal Debug] Firestore listener error message:",
          error.message
        );

        setLoadingRequests(false);

        Alert.alert(
          "Unable to load renewal status",
          `Firebase error: ${error.code || error.message}`
        );
      }
    );

    return () => {
      console.log("[Renewal Debug] Stopping Firestore listener.");
      unsubscribe();
    };
  }, [user?.idNumber]);

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>
          Loading your account...
        </Text>
      </View>
    );
  }

  const vehicles = user.vehicles ?? [];

  async function submitRenewal(vehicle: any) {
    const vehicleId = vehicle.vehicleId;

    console.log("[Renewal Debug] Submit button pressed:", {
      vehicleId,
      registrationNumber: vehicle.registrationNumber,
      citizenId: user.idNumber,
    });

    if (!vehicleId) {
      Alert.alert(
        "Vehicle information missing",
        "This vehicle does not have a vehicle ID. Please contact support."
      );
      return;
    }

    if (!user.idNumber) {
      Alert.alert(
        "Account information missing",
        "Your ID number could not be found. Please sign in again."
      );
      return;
    }

    const existingRequest = renewalRequests[vehicleId];
    const currentStatus = existingRequest
      ? normalizeStatus(existingRequest.status)
      : null;

    console.log("[Renewal Debug] Existing request before submission:", {
      vehicleId,
      existingRequest,
      normalizedStatus: currentStatus,
    });

    if (currentStatus === "Pending") {
      Alert.alert(
        "Request already submitted",
        "Your renewal request is awaiting administrative review."
      );
      return;
    }

    if (currentStatus === "Approved") {
      Alert.alert(
        "Already approved",
        "This vehicle's renewal request has already been approved."
      );
      return;
    }

    const message =
      currentStatus === "Rejected"
        ? "Your previous request was rejected. Would you like to submit it again?"
        : "Submit a vehicle licence renewal request for administrative review?";

    Alert.alert("Confirm renewal request", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        onPress: () => {
          void saveRenewal(vehicle);
        },
      },
    ]);
  }

  async function saveRenewal(vehicle: any) {
    const vehicleId = vehicle.vehicleId;

    try {
      setSubmittingVehicleId(vehicleId);

      const requestRef = doc(
        db,
        "vehicleRenewalRequests",
        vehicleId
      );

      console.log(
        "[Renewal Debug] Writing renewal request to:",
        "vehicleRenewalRequests/" + vehicleId
      );

      await setDoc(requestRef, {
     citizenId: citizenId!,
fullName: citizenName,
        vehicleId,
        registrationNumber: vehicle.registrationNumber || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        licenceDisk: vehicle.licenceDisk || null,
        submittedAt: new Date().toISOString(),
        status: "Pending",
        rejectionReason: "",
        reviewedAt: null,
        reviewedBy: "",
        updatedAt: new Date().toISOString(),
      });

      console.log(
        "[Renewal Debug] Request saved successfully. Status set to Pending."
      );

      Alert.alert(
        "Request submitted",
        "Your vehicle licence renewal request has been submitted and is awaiting administrative review."
      );
    } catch (error: any) {
      console.error(
        "[Renewal Debug] Submission failed:",
        error?.code,
        error?.message,
        error
      );

      Alert.alert(
        "Submission failed",
        error?.message || "Unable to submit your request. Please try again."
      );
    } finally {
      setSubmittingVehicleId(null);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.title}>
        Renew Vehicle Licence
      </Text>

      <Text style={styles.subtitle}>
        Select a vehicle to renew its licence disk and track your application.
      </Text>

      {loadingRequests && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color="#003366" />
          <Text style={styles.loadingBannerText}>
            Checking your renewal requests...
          </Text>
        </View>
      )}

      {!loadingRequests && (
        <Text style={styles.debugSummary}>
          Renewal requests found: {Object.keys(renewalRequests).length}
        </Text>
      )}

      {vehicles.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons
            name="directions-car"
            size={60}
            color="#999"
          />
          <Text style={styles.emptyText}>
            No registered vehicles found.
          </Text>
        </View>
      ) : (
        vehicles.map((vehicle: any, index: number) => {
          const expired =
            !!vehicle.licenceDisk?.expiryDate &&
            new Date(vehicle.licenceDisk.expiryDate) <= new Date();

          const request = vehicle.vehicleId
            ? renewalRequests[vehicle.vehicleId]
            : undefined;
console.log("[RENEWAL MATCH CHECK]", {
  loggedInCitizenId: user.idNumber,
  vehicleIdOnScreen: vehicle.vehicleId,
  registrationOnScreen: vehicle.registrationNumber,
  matchingRequest: renewalRequests[vehicle.vehicleId],
  allRenewalVehicleIds: Object.keys(renewalRequests),
});
          const requestStatus = request
            ? normalizeStatus(request.status)
            : null;

          const isSubmitting =
            submittingVehicleId === vehicle.vehicleId;

          const alreadyPending = requestStatus === "Pending";
          const alreadyApproved = requestStatus === "Approved";

          console.log("[Renewal Debug] Vehicle displayed:", {
            vehicleId: vehicle.vehicleId,
            registrationNumber: vehicle.registrationNumber,
            requestFound: !!request,
            rawStatus: request?.status,
            displayedStatus: requestStatus,
          });

          return (
            <View
              key={vehicle.vehicleId || index}
              style={styles.card}
            >
              <View style={styles.header}>
                <MaterialIcons
                  name="directions-car"
                  size={35}
                  color="#003366"
                />

                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.vehicle}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.registration}>
                    {vehicle.registrationNumber || "No registration number"}
                  </Text>
                </View>
              </View>

              <Row
                label="Licence Disk"
                value={vehicle.licenceDisk?.number}
              />
              <Row
                label="Expiry Date"
                value={vehicle.licenceDisk?.expiryDate}
              />
              <Row
                label="Disk Status"
                value={vehicle.licenceDisk?.status}
              />

              <View
                style={[
                  styles.status,
                  {
                    backgroundColor: expired ? "#FDECEA" : "#E8F5E9",
                  },
                ]}
              >
                <MaterialIcons
                  name={expired ? "warning" : "verified"}
                  size={24}
                  color={expired ? "#D32F2F" : "#2E7D32"}
                />
                <Text
                  style={{
                    color: expired ? "#D32F2F" : "#2E7D32",
                    marginLeft: 10,
                    fontWeight: "700",
                    flex: 1,
                  }}
                >
                  {expired
                    ? "Licence Disk Expired"
                    : "Licence Disk Valid"}
                </Text>
              </View>

              {requestStatus ? (
                <View
                  style={[
                    styles.requestStatusCard,
                    requestStatus === "Pending" && styles.pendingCard,
                    requestStatus === "Approved" && styles.approvedCard,
                    requestStatus === "Rejected" && styles.rejectedCard,
                  ]}
                >
                  <View style={styles.requestStatusHeading}>
                    <MaterialIcons
                      name={
                        requestStatus === "Pending"
                          ? "hourglass-top"
                          : requestStatus === "Approved"
                          ? "check-circle"
                          : "cancel"
                      }
                      size={23}
                      color={
                        requestStatus === "Pending"
                          ? "#946200"
                          : requestStatus === "Approved"
                          ? "#237A3B"
                          : "#C62828"
                      }
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestStatusLabel}>
                        Renewal Request
                      </Text>
                      <Text
                        style={[
                          styles.requestStatusValue,
                          requestStatus === "Pending" && { color: "#946200" },
                          requestStatus === "Approved" && { color: "#237A3B" },
                          requestStatus === "Rejected" && { color: "#C62828" },
                        ]}
                      >
                        {requestStatus}
                      </Text>
                    </View>
                  </View>

                  {requestStatus === "Pending" && (
                    <Text style={styles.requestStatusDescription}>
                      Your request is waiting for administrative review.
                    </Text>
                  )}

                  {requestStatus === "Approved" && (
                    <Text style={styles.requestStatusDescription}>
                      Your renewal request has been approved. Follow any
                      further instructions from the relevant authority.
                    </Text>
                  )}

                  {requestStatus === "Rejected" && (
                    <>
                      <Text style={styles.requestStatusDescription}>
                        Your renewal request was not approved.
                      </Text>

                    {!!request?.rejectionReason && (
  <View style={styles.reasonBox}>
    <Text style={styles.reasonTitle}>
      Reason provided by administration
    </Text>
    <Text style={styles.reasonText}>
      {request.rejectionReason}
    </Text>
  </View>
)}
                    </>
                  )}

                {!!request?.submittedAt && (
  <Text style={styles.submittedDate}>
    Submitted: {formatDate(request.submittedAt)}
  </Text>
)}
                </View>
              ) : (
                <View style={styles.noRequestCard}>
                  <MaterialIcons
                    name="info-outline"
                    size={20}
                    color="#526174"
                  />
                  <Text style={styles.noRequestText}>
                    No renewal request was found for this vehicle.
                  </Text>
                </View>
              )}

              {alreadyPending || alreadyApproved ? (
                <View style={styles.disabledButton}>
                  <MaterialIcons
                    name={alreadyApproved ? "check-circle" : "schedule"}
                    size={21}
                    color="#fff"
                  />
                  <Text style={styles.buttonText}>
                    {alreadyApproved
                      ? "Request Approved"
                      : "Awaiting Review"}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                  disabled={isSubmitting}
                  onPress={() => submitRenewal(vehicle)}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <MaterialIcons
                      name="refresh"
                      size={22}
                      color="#fff"
                    />
                  )}
                  <Text style={styles.buttonText}>
                    {isSubmitting
                      ? "Submitting..."
                      : requestStatus === "Rejected"
                      ? "Resubmit Renewal Request"
                      : "Renew Licence Disk"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function normalizeStatus(status?: string) {
  const value = (status || "").trim().toLowerCase();

  if (value === "approved" || value === "accepted") {
    return "Approved";
  }

  if (value === "rejected" || value === "declined") {
    return "Rejected";
  }

  if (value === "pending") {
    return "Pending";
  }

  return status || "Unknown";
}

function formatDate(value?: string) {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 20,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#003366",
  },
  subtitle: {
    color: "#666",
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 20,
  },
  debugSummary: {
    color: "#526174",
    fontSize: 12,
    marginBottom: 12,
  },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#EAF2FA",
    borderRadius: 10,
    marginBottom: 16,
  },
  loadingBannerText: {
    color: "#003366",
    marginLeft: 10,
    fontSize: 13,
  },
  empty: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 15,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 15,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  vehicle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
  },
  registration: {
    color: "#666",
    marginTop: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 8,
  },
  label: {
    color: "#666",
    fontWeight: "600",
  },
  value: {
    flexShrink: 1,
    textAlign: "right",
    fontWeight: "700",
    color: "#263238",
  },
  status: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  requestStatusCard: {
    marginTop: 16,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingCard: {
    backgroundColor: "#FFF8E6",
    borderColor: "#F0D89B",
  },
  approvedCard: {
    backgroundColor: "#EAF7ED",
    borderColor: "#B8E0C1",
  },
  rejectedCard: {
    backgroundColor: "#FFF0F0",
    borderColor: "#F1C0C0",
  },
  requestStatusHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requestStatusLabel: {
    color: "#526174",
    fontSize: 12,
  },
  requestStatusValue: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  requestStatusDescription: {
    color: "#4D5968",
    lineHeight: 19,
    fontSize: 13,
    marginTop: 12,
  },
  reasonBox: {
    marginTop: 12,
    padding: 11,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  reasonTitle: {
    fontWeight: "700",
    fontSize: 12,
    color: "#8F2020",
    marginBottom: 5,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5E2525",
  },
  submittedDate: {
    marginTop: 12,
    fontSize: 11,
    color: "#697586",
  },
  noRequestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F0F3F7",
    borderRadius: 10,
  },
  noRequestText: {
    flex: 1,
    color: "#526174",
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#003366",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  disabledButton: {
    marginTop: 20,
    backgroundColor: "#718096",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 15,
  },
});
