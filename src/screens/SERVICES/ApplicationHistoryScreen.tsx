import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

// Change this if your registration screen uses a different route name.
const VEHICLE_REGISTRATION_ROUTE = "VehicleRegistration";

const COLORS = {
  primary: "#0B4F8A",
  background: "#F3F5F7",
  text: "#17212B",
  textLight: "#66737F",
  border: "#D9E0E6",
  card: "#FFFFFF",
  success: "#18794E",
  warning: "#A16207",
  error: "#B42318",
  softBlue: "#EAF3FA",
  softGreen: "#ECFDF3",
  softYellow: "#FFF8E6",
  softRed: "#FEF3F2",
};

type StatusBucket = "Pending" | "Approved" | "Rejected";
type Filter = "All" | StatusBucket;

type HistoryItem = {
  id: string;
  applicationId: string;
  status: StatusBucket;
  rawStatus: string;
  rejectionReason: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  applicantName: string;
  vehicleLabel: string;
  vehicleType: string;
  vin: string;
  engineNumber: string;
  colour: string;
  resubmissionOf: string;
  documents: Record<string, any>;
};

const FILTERS: Filter[] = ["All", "Pending", "Approved", "Rejected"];

const DOCUMENT_LABELS: Record<string, string> = {
  idCopy: "Identity Document",
  proofOfResidence: "Proof of Residence",
  proofOfOwnership: "Proof of Ownership",
  policeClearance: "Police Clearance Certificate",
  roadworthy: "Roadworthy Certificate",
};

function normalizeStatus(status: unknown): StatusBucket {
  if (typeof status !== "string" || !status.trim()) return "Pending";

  const value = status.trim().toLowerCase();

  if (value === "approved" || value === "accepted") return "Approved";
  if (value === "rejected" || value === "declined") return "Rejected";

  return "Pending";
}

function getRejectionReason(data: Record<string, any>): string {
  if (
    typeof data.rejectionReason === "string" &&
    data.rejectionReason.trim()
  ) {
    return data.rejectionReason.trim();
  }

  if (
    typeof data.review?.rejectionReason === "string" &&
    data.review.rejectionReason.trim()
  ) {
    return data.review.rejectionReason.trim();
  }

  return "";
}

function formatDate(date: Date | null): string {
  if (!date) return "Just now";

  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | null): string {
  if (!date) return "Just now";

  return `${formatDate(date)}, ${date.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function statusStyle(status: StatusBucket) {
  if (status === "Approved") {
    return {
      color: COLORS.success,
      background: COLORS.softGreen,
      border: "#B7E4C7",
      icon: "checkmark-circle" as const,
      label: "Approved",
    };
  }

  if (status === "Rejected") {
    return {
      color: COLORS.error,
      background: COLORS.softRed,
      border: "#FECDCA",
      icon: "close-circle" as const,
      label: "Rejected",
    };
  }

  return {
    color: COLORS.warning,
    background: COLORS.softYellow,
    border: "#F0D9A4",
    icon: "time" as const,
    label: "Awaiting Verification",
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "Not available"}</Text>
    </View>
  );
}

export default function ApplicationHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user, loading: authLoading, isLoggedIn } = useAuth();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user?.id || !isLoggedIn) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);

    const applicationsQuery = query(
      collection(db, "vehicleApplications"),
      where("userId", "==", user.id)
    );

    const unsubscribe = onSnapshot(
      applicationsQuery,
      (snapshot) => {
        const mapped: HistoryItem[] = snapshot.docs.map((snap) => {
          // "estimate" keeps a just-submitted application in the right place
          // while its server timestamp is still pending.
          const data = snap.data({ serverTimestamps: "estimate" });

          const applicant = data.applicant ?? {};
          const vehicle = data.vehicle ?? {};

          const make = typeof vehicle.make === "string" ? vehicle.make : "";
          const model = typeof vehicle.model === "string" ? vehicle.model : "";
          const year = vehicle.year ? ` (${vehicle.year})` : "";

          return {
            id: snap.id,
            applicationId:
              typeof data.applicationId === "string" && data.applicationId.trim()
                ? data.applicationId
                : snap.id,
            status: normalizeStatus(data.status),
            rawStatus: typeof data.status === "string" ? data.status : "",
            rejectionReason: getRejectionReason(data),
            createdAt: data.createdAt?.toDate?.() ?? null,
            updatedAt: data.updatedAt?.toDate?.() ?? null,
            applicantName: applicant.fullName ?? "",
            vehicleLabel:
              make || model ? `${make} ${model}${year}`.trim() : "Vehicle",
            vehicleType: vehicle.vehicleType ?? "",
            vin: vehicle.vin ?? "",
            engineNumber: vehicle.engineNumber ?? "",
            colour: vehicle.colour ?? "",
            resubmissionOf:
              typeof data.resubmissionOf === "string" ? data.resubmissionOf : "",
            documents: data.documents ?? {},
          };
        });

        mapped.sort(
          (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        );

        setItems(mapped);
        setLoading(false);
      },
      (error) => {
        console.error("[ApplicationHistory] Listener failed:", error);
        setLoadError(true);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.id, isLoggedIn, authLoading]);

  // Which application replaced which: rejected "VR-A" -> resubmitted as "VR-B".
  const resubmittedAs = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach((item) => {
      if (item.resubmissionOf) map[item.resubmissionOf] = item.applicationId;
    });
    return map;
  }, [items]);

  const counts = useMemo(
    () => ({
      All: items.length,
      Pending: items.filter((item) => item.status === "Pending").length,
      Approved: items.filter((item) => item.status === "Approved").length,
      Rejected: items.filter((item) => item.status === "Rejected").length,
    }),
    [items]
  );

  const visibleItems = useMemo(
    () =>
      filter === "All" ? items : items.filter((item) => item.status === filter),
    [items, filter]
  );

  const openDocument = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("[ApplicationHistory] Could not open document:", error);
    }
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const look = statusStyle(item.status);
    const expanded = expandedId === item.id;
    const replacedBy = resubmittedAs[item.applicationId];
    const canResubmit = item.status === "Rejected" && !replacedBy;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpandedId(expanded ? null : item.id)}
          style={styles.cardHeader}
        >
          <View
            style={[styles.cardIcon, { backgroundColor: look.background }]}
          >
            <Ionicons name={look.icon} size={22} color={look.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardReference}>{item.applicationId}</Text>
            <Text style={styles.cardVehicle} numberOfLines={1}>
              {item.vehicleLabel}
            </Text>
            <Text style={styles.cardDate}>
              Submitted {formatDate(item.createdAt)}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <View
              style={[
                styles.badge,
                { backgroundColor: look.background, borderColor: look.border },
              ]}
            >
              <Text style={[styles.badgeText, { color: look.color }]}>
                {look.label}
              </Text>
            </View>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={COLORS.textLight}
            />
          </View>
        </TouchableOpacity>

        {(item.resubmissionOf || replacedBy) && (
          <View style={styles.chainRow}>
            <Ionicons name="git-branch-outline" size={14} color={COLORS.primary} />
            <Text style={styles.chainText}>
              {item.resubmissionOf
                ? `Resubmission of ${item.resubmissionOf}`
                : `Resubmitted as ${replacedBy}`}
            </Text>
          </View>
        )}

        {item.status === "Rejected" && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>Reason for rejection</Text>
            <Text style={styles.reasonText}>
              {item.rejectionReason ||
                "No rejection reason has been provided yet."}
            </Text>
          </View>
        )}

        {expanded && (
          <View style={styles.expanded}>
            <Text style={styles.sectionLabel}>APPLICATION</Text>
            <DetailRow label="Applicant" value={item.applicantName} />
            <DetailRow label="Submitted" value={formatDateTime(item.createdAt)} />
            <DetailRow
              label="Last updated"
              value={formatDateTime(item.updatedAt)}
            />

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
              VEHICLE
            </Text>
            <DetailRow label="Type" value={item.vehicleType} />
            <DetailRow label="VIN / Chassis" value={item.vin} />
            <DetailRow label="Engine number" value={item.engineNumber} />
            <DetailRow label="Colour" value={item.colour} />

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
              DOCUMENTS
            </Text>
            {Object.keys(DOCUMENT_LABELS).map((key) => {
              const saved = item.documents[key];
              const url = saved?.secureUrl || saved?.secure_url || saved?.url;

              return (
                <View key={key} style={styles.documentRow}>
                  <Ionicons
                    name={saved ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={saved ? COLORS.success : COLORS.textLight}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.documentTitle}>
                      {DOCUMENT_LABELS[key]}
                    </Text>
                    {!!saved?.fileName && (
                      <Text style={styles.documentFile} numberOfLines={1}>
                        {saved.fileName}
                      </Text>
                    )}
                  </View>
                  {!!url && (
                    <TouchableOpacity
                      onPress={() => openDocument(url)}
                      style={styles.viewButton}
                    >
                      <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {canResubmit && (
          <TouchableOpacity
            style={styles.resubmitButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(VEHICLE_REGISTRATION_ROUTE)}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.resubmitButtonText}>Fix & Resubmit</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statNumber}>{counts.All}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>
            {counts.Pending}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={[styles.statNumber, { color: COLORS.success }]}>
            {counts.Approved}
          </Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={[styles.statNumber, { color: COLORS.error }]}>
            {counts.Rejected}
          </Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = filter === item;

          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, active && styles.filterChipActive]}
              activeOpacity={0.8}
              onPress={() => setFilter(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {item} ({counts[item]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="folder-open-outline" size={36} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>
        {items.length === 0
          ? "No applications yet"
          : `No ${filter.toLowerCase()} applications`}
      </Text>
      <Text style={styles.emptyText}>
        {items.length === 0
          ? "Your vehicle registration applications will appear here once you submit one."
          : "Try a different filter to see your other applications."}
      </Text>

      {items.length === 0 && (
        <TouchableOpacity
          style={styles.emptyButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(VEHICLE_REGISTRATION_ROUTE)}
        >
          <Text style={styles.emptyButtonText}>Start Application</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Application History</Text>
          <Text style={styles.headerSubtitle}>Vehicle registration</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centeredText}>Loading your applications...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.error} />
          <Text style={styles.emptyTitle}>Could not load history</Text>
          <Text style={styles.emptyText}>
            Please check your connection and open this screen again.
          </Text>
        </View>
      ) : !user?.id || !isLoggedIn ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={40} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Sign-in required</Text>
          <Text style={styles.emptyText}>
            Sign in to see your application history.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  listContent: {
    padding: 15,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  centeredText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textLight,
    marginTop: 3,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardReference: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  cardVehicle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 3,
  },
  cardDate: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  chainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: COLORS.softBlue,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chainText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  reasonBox: {
    marginTop: 12,
    backgroundColor: COLORS.softRed,
    borderWidth: 1,
    borderColor: "#FECDCA",
    borderRadius: 9,
    padding: 12,
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.error,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.text,
  },
  expanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  detailValue: {
    flex: 1,
    marginLeft: 14,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  documentTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  documentFile: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  viewButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },
  resubmitButton: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resubmitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 22,
    minHeight: 46,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
