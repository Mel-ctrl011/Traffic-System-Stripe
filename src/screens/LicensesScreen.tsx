
import React from "react";
import {
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

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
   SCREEN
========================================================= */

export default function MyLicensesScreen() {
  const { user } = useAuth();

  const vehicles = user?.vehicles ?? [];
  const driverLicense = user?.driverLicense;

  const validDriverLicense =
    driverLicense?.status === "Valid";

  const collectionReady =
    user?.collection?.readyForCollection === true;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="card-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerInformation}>
            <Text style={styles.eyebrow}>
              CITIZEN SERVICES
            </Text>

            <Text style={styles.title}>
              My Licences
            </Text>

            <Text style={styles.subtitle}>
              View your driving licence, registered
              vehicles and licence collection status.
            </Text>
          </View>
        </View>

        {/* ACCOUNT SUMMARY */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.summaryInformation}>
              <Text style={styles.summaryLabel}>
                REGISTERED CITIZEN
              </Text>

              <Text style={styles.summaryName}>
                {user?.fullName ?? "Citizen"}
              </Text>

              <Text style={styles.summaryId}>
                ID Number:{" "}
                {user?.idNumber ?? "Not available"}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryStats}>
            <SummaryStat
              value={driverLicense ? "1" : "0"}
              label="Driver Licence"
            />

            <View style={styles.statDivider} />

            <SummaryStat
              value={String(vehicles.length)}
              label="Vehicles"
            />

            <View style={styles.statDivider} />

            <SummaryStat
              value={
                user?.ownership?.verified
                  ? "Verified"
                  : "Pending"
              }
              label="Ownership"
            />
          </View>
        </View>

        {/* DRIVER LICENCE */}

        <SectionHeader
          title="Driver's Licence"
          description="Your registered driving licence information."
          icon="card-outline"
        />

        <View style={styles.licenseCard}>
          <View style={styles.licenseHeader}>
            <View style={styles.licenseBadge}>
              <Ionicons
                name="card-outline"
                size={24}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.licenseHeaderInfo}>
              <Text style={styles.licenseTitle}>
                Driver's Licence
              </Text>

              <Text style={styles.licenseNumber}>
                {driverLicense?.number ?? "Not available"}
              </Text>
            </View>

            <StatusBadge
              label={driverLicense?.status ?? "Unknown"}
              type={
                validDriverLicense
                  ? "success"
                  : "warning"
              }
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <InfoItem
              label="Licence Number"
              value={driverLicense?.number ?? "Not available"}
            />

            <InfoItem
              label="Card Number"
              value={driverLicense?.cardNumber ?? "Not available"}
            />

            <InfoItem
              label="Licence Class"
              value={driverLicense?.class ?? "Not available"}
            />

            <InfoItem
              label="Issue Date"
              value={driverLicense?.issueDate ?? "Not available"}
            />

            <InfoItem
              label="Expiry Date"
              value={driverLicense?.expiryDate ?? "Not available"}
            />

            <InfoItem
              label="Status"
              value={driverLicense?.status ?? "Unknown"}
              valueType={
                validDriverLicense
                  ? "success"
                  : "warning"
              }
            />
          </View>
        </View>

        {/* DRIVER ACTIONS */}

        <ActionItem
          icon="card-outline"
          title="Digital Driver's Licence"
          description="View your digital licence information."
          screen="DigitalLicense"
        />

        <ActionItem
          icon="refresh-outline"
          title="Renew Driver's Licence"
          description="Start the process to renew your driving licence."
          screen="RenewDriverLicense"
        />

        {/* REGISTERED VEHICLES */}

        <SectionHeader
          title="Registered Vehicles"
          description="Vehicles currently associated with your citizen account."
          icon="car-outline"
        />

        {/* OWNERSHIP STATUS */}

        <View style={styles.ownershipCard}>
          <View style={styles.ownershipIcon}>
            <Ionicons
              name={
                user?.ownership?.verified
                  ? "shield-checkmark-outline"
                  : "shield-outline"
              }
              size={22}
              color={
                user?.ownership?.verified
                  ? COLORS.success
                  : COLORS.warning
              }
            />
          </View>

          <View style={styles.ownershipInformation}>
            <Text style={styles.ownershipTitle}>
              Vehicle Ownership
            </Text>

            <Text style={styles.ownershipDescription}>
              {user?.ownership?.verified
                ? "Your vehicle ownership information has been verified."
                : "Your vehicle ownership information has not yet been verified."}
            </Text>
          </View>

          <StatusBadge
            label={
              user?.ownership?.verified
                ? "Verified"
                : "Pending"
            }
            type={
              user?.ownership?.verified
                ? "success"
                : "warning"
            }
          />
        </View>

        {/* VEHICLE LIST */}

        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <View
              key={vehicle.vehicleId}
              style={styles.vehicleCard}
            >
              <View style={styles.vehicleTop}>
                <View style={styles.vehicleIcon}>
                  <Ionicons
                    name="car-outline"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.vehicleMain}>
                  <Text style={styles.vehicleRegistration}>
                    {vehicle.registrationNumber ||
                      "Registration unavailable"}
                  </Text>

                  <Text style={styles.vehicleName}>
                    {vehicle.make} {vehicle.model}
                  </Text>

                  <Text style={styles.vehicleYear}>
                    {vehicle.year} • {vehicle.colour}
                  </Text>
                </View>

                <StatusBadge
                  label={
                    vehicle.stolen
                      ? "Stolen"
                      : vehicle.roadworthy
                      ? "Roadworthy"
                      : "Check"
                  }
                  type={
                    vehicle.stolen
                      ? "danger"
                      : vehicle.roadworthy
                      ? "success"
                      : "warning"
                  }
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.vehicleDetails}>
                <VehicleDetail
                  label="VIN"
                  value={vehicle.vin || "Not available"}
                />

                <VehicleDetail
                  label="Engine Number"
                  value={vehicle.engineNumber || "Not available"}
                />

                <VehicleDetail
                  label="Licence Disc"
                  value={vehicle.licenceDisk?.number || "Not available"}
                />

                <VehicleDetail
                  label="Licence Expiry"
                  value={
                    vehicle.licenceDisk?.expiryDate ||
                    "Not available"
                  }
                />
              </View>

              <View style={styles.vehicleFooter}>
                <View style={styles.vehicleOwnership}>
                  <Ionicons
                    name={
                      vehicle.ownership?.owner
                        ? "person-circle-outline"
                        : "people-outline"
                    }
                    size={16}
                    color={COLORS.textLight}
                  />

                  <Text style={styles.vehicleFooterText}>
                    {vehicle.ownership?.owner
                      ? "Registered owner"
                      : "Ownership not confirmed"}
                  </Text>
                </View>

                {vehicle.ownership?.financed && (
                  <View style={styles.financeBadge}>
                    <Text style={styles.financeText}>
                      FINANCED
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons
              name="car-outline"
              size={30}
              color={COLORS.textLight}
            />

            <Text style={styles.emptyTitle}>
              No Vehicles Registered
            </Text>

            <Text style={styles.emptyDescription}>
              There are currently no vehicles
              associated with your citizen account.
            </Text>
          </View>
        )}

        {/* REMAINING VEHICLE ACTION */}

        <ActionItem
          icon="information-circle-outline"
          title="Vehicle Information"
          description="View detailed information about your registered vehicles."
          screen="VehicleInformation"
        />

        {/* LICENCE COLLECTION */}

        <SectionHeader
          title="Licence Collection"
          description="Information about your physical licence card."
          icon="cube-outline"
        />

        <View style={styles.collectionCard}>
          <View style={styles.collectionHeader}>
            <View style={styles.collectionIcon}>
              <Ionicons
                name="cube-outline"
                size={23}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.collectionInformation}>
              <Text style={styles.collectionTitle}>
                Card Production
              </Text>

              <Text style={styles.collectionDescription}>
                Current status of your physical licence card.
              </Text>
            </View>

            <StatusBadge
              label={
                user?.collection?.productionStatus ?? "Unknown"
              }
              type={
                collectionReady
                  ? "success"
                  : "warning"
              }
            />
          </View>

          <View style={styles.divider} />

          <CollectionRow
            icon="checkmark-circle-outline"
            label="Ready for Collection"
            value={collectionReady ? "Ready" : "Not Ready"}
            type={
              collectionReady
                ? "success"
                : "warning"
            }
          />

          <CollectionRow
            icon="location-outline"
            label="Collection Centre"
            value={
              user?.collection?.location ?? "Not available"
            }
          />
        </View>

        {/* ACCOUNT NOTICE */}

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={COLORS.primary}
          />

          <Text style={styles.noticeText}>
            Licence and vehicle information shown
            here is based on the records associated
            with your citizen account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.sectionHeaderInformation}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   SUMMARY STAT
========================================================= */

function SummaryStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatValue}>
        {value}
      </Text>

      <Text style={styles.summaryStatLabel}>
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
  valueType,
}: {
  label: string;
  value: string;
  valueType?: "success" | "warning";
}) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.infoValue,
          valueType === "success" && {
            color: COLORS.success,
          },
          valueType === "warning" && {
            color: COLORS.warning,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  label,
  type,
}: {
  label: string;
  type: "success" | "warning" | "danger";
}) {
  const background =
    type === "success"
      ? COLORS.softGreen
      : type === "warning"
      ? COLORS.softYellow
      : COLORS.softRed;

  const color =
    type === "success"
      ? COLORS.success
      : type === "warning"
      ? COLORS.warning
      : COLORS.danger;

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: background,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   ACTION ITEM
========================================================= */

function ActionItem({
  title,
  description,
  icon,
  screen,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
}) {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={styles.actionItem}
      activeOpacity={0.8}
      onPress={() => navigation.navigate(screen)}
    >
      <View style={styles.actionIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.actionInformation}>
        <Text style={styles.actionTitle}>
          {title}
        </Text>

        <Text style={styles.actionDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.textLight}
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   VEHICLE DETAIL
========================================================= */

function VehicleDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.vehicleDetail}>
      <Text style={styles.vehicleDetailLabel}>
        {label}
      </Text>

      <Text style={styles.vehicleDetailValue}>
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   COLLECTION ROW
========================================================= */

function CollectionRow({
  icon,
  label,
  value,
  type,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  type?: "success" | "warning";
}) {
  return (
    <View style={styles.collectionRow}>
      <Ionicons
        name={icon}
        size={19}
        color={
          type === "success"
            ? COLORS.success
            : type === "warning"
            ? COLORS.warning
            : COLORS.textLight
        }
      />

      <Text style={styles.collectionRowLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.collectionRowValue,
          type === "success" && {
            color: COLORS.success,
          },
          type === "warning" && {
            color: COLORS.warning,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 60,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 17,
  },

  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerInformation: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.primary,
  },

  title: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 4,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
  },

  /* SUMMARY */

  summaryCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    marginBottom: 22,
  },

  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryInformation: {
    flex: 1,
    marginLeft: 11,
  },

  summaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.7,
  },

  summaryName: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  summaryId: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textLight,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryStat: {
    flex: 1,
    alignItems: "center",
  },

  summaryStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },

  summaryStatLabel: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: "center",
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  sectionHeaderInformation: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionDescription: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: 11,
    lineHeight: 16,
  },

  /* DRIVER LICENCE */

  licenseCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },

  licenseHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  licenseBadge: {
    width: 43,
    height: 43,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  licenseHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },

  licenseTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  licenseNumber: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textLight,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  infoItem: {
    width: "50%",
    paddingBottom: 13,
    paddingRight: 8,
  },

  infoLabel: {
    fontSize: 10,
    color: COLORS.textLight,
  },

  infoValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 5,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },

  /* ACTIONS */

  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 9,
  },

  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  actionInformation: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  actionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  actionDescription: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  /* OWNERSHIP */

  ownershipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },

  ownershipIcon: {
    width: 39,
    height: 39,
    borderRadius: 8,
    backgroundColor: COLORS.softGreen,
    alignItems: "center",
    justifyContent: "center",
  },

  ownershipInformation: {
    flex: 1,
    marginLeft: 10,
    marginRight: 7,
  },

  ownershipTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  ownershipDescription: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: 10,
    lineHeight: 15,
  },

  /* VEHICLES */

  vehicleCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },

  vehicleTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  vehicleIcon: {
    width: 43,
    height: 43,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleMain: {
    flex: 1,
    marginLeft: 10,
    marginRight: 7,
  },

  vehicleRegistration: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  vehicleName: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  vehicleYear: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.textLight,
  },

  vehicleDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  vehicleDetail: {
    width: "50%",
    paddingBottom: 12,
  },

  vehicleDetailLabel: {
    fontSize: 9,
    color: COLORS.textLight,
  },

  vehicleDetailValue: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },

  vehicleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },

  vehicleOwnership: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  vehicleFooterText: {
    marginLeft: 5,
    fontSize: 10,
    color: COLORS.textLight,
  },

  financeBadge: {
    backgroundColor: COLORS.softYellow,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },

  financeText: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.warning,
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
    marginBottom: 10,
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  emptyDescription: {
    marginTop: 5,
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 17,
  },

  /* COLLECTION */

  collectionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },

  collectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  collectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  collectionInformation: {
    flex: 1,
    marginLeft: 10,
    marginRight: 7,
  },

  collectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  collectionDescription: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },

  collectionRowLabel: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11,
    color: COLORS.textLight,
  },

  collectionRowValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  /* NOTICE */

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 9,
    padding: 11,
    marginTop: 8,
  },

  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.text,
  },
});
