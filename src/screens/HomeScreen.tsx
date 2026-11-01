

import { useAuth } from "../context/AuthContext";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import React, { ReactNode, useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../services/firebase";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import DriverLicenseCard from "../components/DriverLicenseCard";
import DevSeedFines from "../components/DevSeedFines";
import { seedCitizenIdentityData } from "../components/seedCitizenIdentityData";
import { seedCitizenExtras } from "../components/seedCitizenExtras";
import OutstandingAmountCard from "../components/OutstandingAmountCard";
import NextAppointmentCard from "./HOME/NextAppointmentCard";

/*
=========================================================
  REAL TRAFFIC / WEATHER COMPONENTS
=========================================================
*/

import LiveTraffic from "./Updates/LiveTraffic";
import TrafficIncidents from "./Updates/TrafficIncidents";
import WeatherAlerts from "./Updates/WeatherAlerts";

/*
=========================================================
  COLOURS
=========================================================
*/

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

/*
=========================================================
  TYPES
=========================================================
*/

type SectionHeaderProps = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

type StatusCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  status?: string;
  statusColor?: string;
  hideChevron?: boolean;
  onPress?: () => void;
};

type QuickActionProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  onPress?: () => void;
};

/*
=========================================================
  SCREEN
=========================================================
*/

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, loading: authLoading } = useAuth();
const citizenKey = String(
  user?.id ?? user?.userId ?? user?.idNumber ?? ""
).trim();

const [decisionCount, setDecisionCount] = useState(0);

useEffect(() => {
  if (authLoading || !citizenKey) {
    setDecisionCount(0);
    return;
  }

  const requestsQuery = query(
    collection(db, "profileChangeRequests"),
    where("userId", "==", citizenKey)
  );

  const unsubscribe = onSnapshot(
    requestsQuery,
    (snapshot) => {
      const decisions = snapshot.docs.filter((item) => {
        const status = String(item.data().status ?? "")
          .toLowerCase();

        return status === "approved" || status === "rejected";
      });

      setDecisionCount(decisions.length);
    },
    (error) => {
      console.error("Home notification counter error:", error);
      setDecisionCount(0);
    }
  );

  return unsubscribe;
}, [citizenKey, authLoading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* =================================================
              HEADER
          ================================================= */}

         
<View style={styles.header}>
  <View style={styles.headerIcon}>
    <Ionicons
      name="business-outline"
      size={23}
      color="#FFFFFF"
    />
  </View>

  <View style={styles.headerInformation}>
    <Text style={styles.eyebrow}>
      TRAFFICCONNECT SA
    </Text>

    <Text style={styles.title}>
      Citizen Portal
    </Text>
  </View>

  <View style={styles.headerIcons}>
    {/* Notifications */}
    <TouchableOpacity
      style={styles.iconButton}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("Notifications")}
    >
      <Ionicons
        name="notifications-outline"
        size={22}
        color={COLORS.primary}
      />

      {decisionCount > 0 && (
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {decisionCount > 99 ? "99+" : decisionCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>

    {/* Profile */}
    <TouchableOpacity
      style={styles.iconButton}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("Profile")}
    >
      <Ionicons
        name="person-circle-outline"
        size={25}
        color={COLORS.primary}
      />

      {decisionCount > 0 && (
        <View style={styles.profileUpdateDot} />
      )}
    </TouchableOpacity>
  </View>
</View>


          {/* =================================================
              LICENCE & VEHICLE STATUS
          ================================================= */}

          <SectionHeader
            title="Licence & Vehicle Status"
            description="Current status of your registered transport services."
            icon="document-text-outline"
          />

          <DriverLicenseCard />

         {!authLoading && user?.id ? (
  <OutstandingAmountCard
    citizenId={user.id}
    onPress={() =>
      navigation.navigate("OutstandingPenalties")
    }
  />
) : null}

          <NextAppointmentCard
            onPress={() =>
              navigation.navigate(
                "Appointments" as never
              )
            }
          />

         
          {/* =================================================
              TRAFFIC UPDATES
          ================================================= */}

          <SectionHeader
            title="Traffic Updates"
            description="Current traffic conditions affecting your journey."
            icon="car-outline"
          />

          <View style={styles.componentCard}>
            <LiveTraffic />
          </View>

          {/* =================================================
              ROAD CLOSURES
          ================================================= */}

         
       

          {/* =================================================
              WEATHER
          ================================================= */}

          <SectionHeader
            title="Weather"
            description="Current weather conditions for your area."
            icon="partly-sunny-outline"
          />

          <View style={styles.componentCard}>
            <WeatherAlerts />
          </View>
   <View style={styles.componentCard}>
            <TrafficIncidents />
          </View>
          {/* =================================================
              RECENT NOTIFICATIONS
          ================================================= */}

          <SectionHeader
            title="Recent Notifications"
            description="Recent updates and information from the department."
            icon="notifications-outline"
          />

          <TouchableOpacity
            style={styles.notificationCard}
            activeOpacity={0.8}
          >

            <View style={styles.notificationIcon}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.notificationInformation}>

              <Text style={styles.notificationTitle}>
                Driver's license ready for collection
              </Text>

              <Text style={styles.notificationDescription}>
                Your physical driver's licence is ready
                for collection.
              </Text>

            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textLight}
            />

          </TouchableOpacity>

          {/* =================================================
              ACCOUNT NOTICE
          ================================================= */}

          <View style={styles.notice}>

            <Ionicons
              name="information-circle-outline"
              size={19}
              color={COLORS.primary}
            />

            <Text style={styles.noticeText}>
              Transport information shown here is based
              on the records and services associated with
              your citizen account.
            </Text>

          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/*
=========================================================
  SECTION HEADER
=========================================================
*/

function SectionHeader({
  title,
  description,
  icon,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>

      <View style={styles.sectionHeaderIcon}>
        <Ionicons
          name={
            icon ??
            "information-circle-outline"
          }
          size={19}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.sectionHeaderInformation}>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        {description && (
          <Text style={styles.sectionDescription}>
            {description}
          </Text>
        )}

      </View>
    </View>
  );
}

/*
=========================================================
  STATUS CARD
=========================================================
*/

function StatusCard({
  icon,
  title,
  subtitle,
  status,
  statusColor,
  hideChevron,
  onPress,
}: StatusCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={onPress}
    >

      <View style={styles.cardRow}>

        {icon}

        <View style={styles.cardContent}>

          <Text style={styles.cardTitle}>
            {title}
          </Text>

          <Text style={styles.cardSubtitle}>
            {subtitle}
          </Text>

        </View>

        {status && (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusColor === COLORS.success
                    ? COLORS.softGreen
                    : statusColor === COLORS.warning
                    ? COLORS.softYellow
                    : COLORS.softBlue,
              },
            ]}
          >

            <Text
              style={[
                styles.statusBadgeText,
                {
                  color:
                    statusColor ??
                    COLORS.primary,
                },
              ]}
            >
              {status}
            </Text>

          </View>
        )}

        {!hideChevron && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.textLight}
            style={styles.cardChevron}
          />
        )}

      </View>
    </TouchableOpacity>
  );
}

/*
=========================================================
  QUICK ACTION
=========================================================
*/

function QuickAction({
  icon,
  title,
  onPress,
}: QuickActionProps) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      activeOpacity={0.8}
      onPress={onPress}
    >

      <View style={styles.quickActionIcon}>

        <MaterialIcons
          name={icon}
          size={25}
          color={COLORS.primary}
        />

      </View>

      <Text style={styles.quickActionTitle}>
        {title}
      </Text>

      <Text style={styles.quickActionDescription}>
        Access service
      </Text>

      <View style={styles.quickActionArrow}>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={COLORS.textLight}
        />

      </View>

    </TouchableOpacity>
  );
}

/*
=========================================================
  STYLES
=========================================================
*/

const styles = StyleSheet.create({

  /*
  =======================================================
    SAFE AREA
  =======================================================
  */

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  wrapper: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 30,
    paddingBottom: 60,
  },

  /*
  =======================================================
    HEADER
  =======================================================
  */

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
    paddingRight: 5,
    marginTop: 10,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.primary,
  },

  title: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 25,
  },

  subtitle: {
    marginTop: 4,
    color: COLORS.textLight,
    fontSize: 11,
    lineHeight: 17,
  },

  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  /*
  =======================================================
    SECTION
  =======================================================
  */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
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

  /*
  =======================================================
    REAL COMPONENT WRAPPER
  =======================================================
  */

  componentCard: {
    width: "100%",
    marginBottom: 10,
  },

  /*
  =======================================================
    STATUS CARDS
  =======================================================
  */

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 9,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusIcon: {
    width: 43,
    height: 43,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  statusIconWarning: {
    width: 43,
    height: 43,
    borderRadius: 9,
    backgroundColor: COLORS.softYellow,
    alignItems: "center",
    justifyContent: "center",
  },

  cardContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 7,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  cardSubtitle: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  cardChevron: {
    marginLeft: 5,
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 5,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },

  /*
  =======================================================
    QUICK ACTION GRID
  =======================================================
  */

  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  quickAction: {
    width: "48.5%",
    minHeight: 126,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    position: "relative",
  },

  quickActionIcon: {
    width: 43,
    height: 43,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  quickActionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  quickActionDescription: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  quickActionArrow: {
    position: "absolute",
    right: 12,
    top: 14,
  },

  /*
  =======================================================
    NOTIFICATIONS
  =======================================================
  */

  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 9,
  },

  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationInformation: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  notificationTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  notificationDescription: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  /*
  =======================================================
    NOTICE
  =======================================================
  */

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
 


counterBadge: {
  position: "absolute",
  top: -5,
  right: -5,
  minWidth: 18,
  height: 18,
  paddingHorizontal: 4,
  borderRadius: 9,
  backgroundColor: "#D92D20",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  borderColor: COLORS.background,
},

counterText: {
  color: "#FFFFFF",
  fontSize: 9,
  fontWeight: "800",
},

profileUpdateDot: {
  position: "absolute",
  top: 3,
  right: 3,
  width: 9,
  height: 9,
  borderRadius: 5,
  backgroundColor: "#D92D20",
  borderWidth: 1,
  borderColor: COLORS.card,
},

});