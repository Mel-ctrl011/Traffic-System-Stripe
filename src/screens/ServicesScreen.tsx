
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

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

export default function ServicesScreen() {
    const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="grid-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerInformation}>
            <Text style={styles.eyebrow}>
              CITIZEN SERVICES
            </Text>

            <Text style={styles.title}>
              Services
            </Text>

            <Text style={styles.subtitle}>
              All traffic department services in one
              place.
            </Text>
          </View>
        </View>

        {/* APPOINTMENTS */}

        <Section
          title="Appointments"
          description="Book and manage your traffic department appointments."
          icon="calendar-outline"
        >
          <ServiceItem
            icon="calendar-today"
            title="Book an Appointment"
            description="Choose a traffic service, branch, date and available time."
            screen="AppointmentBooking"
          />

          <ServiceItem
            icon="event"
            title="My Appointments"
            description="View your upcoming appointments and manage your bookings."
            screen="MyAppointments"
          />

         
        </Section>

        {/* VEHICLE SERVICES */}

        <Section
          title="Vehicle Services"
          description="Manage your vehicle registration and ownership services."
          icon="car-outline"
        >
          <ServiceItem
            icon="directions-car"
            title="Vehicle Registration"
            description="Register a new vehicle or manage your vehicle registration."
            screen="VehicleRegistration"
          />

          <ServiceItem
            icon="swap-horiz"
            title="Change of Ownership"
            description="Update the registered owner of a vehicle."
            screen="ChangeOwnership"
          />
        </Section>
```tsx
        {/* APPLICATIONS */}
        <Section
          title="Applications & Tracking"
          description="Keep track of the traffic services you've applied for."
          icon="clipboard-outline"
        >
          <TouchableOpacity
            style={styles.applicationsCard}
            activeOpacity={0.85}
            onPress={() => {
              navigation.navigate("ApplicationsDashboard" as never);
            }}
          >
            {/* ICON */}
            <View style={styles.applicationsIcon}>
              <Ionicons
                name="document-text-outline"
                size={29}
                color="#FFFFFF"
              />
            </View>

            {/* TEXT */}
            <View style={styles.applicationsTextContainer}>
              <Text style={styles.applicationsTitle}>
                My Applications
              </Text>

              <Text style={styles.applicationsDescription}>
                Track your vehicle registration and change-of-ownership
                applications. See whether they are submitted, being
                reviewed, approved or rejected.
              </Text>

              {/* ACTION LABEL */}
              <View style={styles.applicationsAction}>
                <Text style={styles.applicationsActionText}>
                  View Application Status
                </Text>

                <Ionicons
                  name="arrow-forward-circle"
                  size={20}
                  color="#0B4F8A"
                />
              </View>
            </View>

            {/* CHEVRON */}
            <Ionicons
              name="chevron-forward"
              size={19}
              color="#0B4F8A"
            />
          </TouchableOpacity>
        </Section>
```

        {/* DRIVER & SAFETY */}

        <Section
          title="Driver & Safety"
          description="Services related to driver licensing and road safety."
          icon="shield-checkmark-outline"
        >
          <ServiceItem
            icon="assignment"
            title="Eye Test"
            description="Complete or manage your driver licence eye test."
            screen="EyeTest"
          />
        </Section>

        {/* BOTTOM NOTICE */}

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={COLORS.primary}
          />

          <Text style={styles.noticeText}>
            Select a service above to view requirements,
            available options and application information.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   SECTION
========================================================= */

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {/* SECTION HEADER */}

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

      {/* SECTION ITEMS */}

      {children}
    </View>
  );
}

/* =========================================================
   SERVICE ITEM
========================================================= */

function ServiceItem({
  icon,
  title,
  description,
  screen,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  screen: string;
}) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    const parentNavigation = navigation.getParent();

    if (parentNavigation) {
      parentNavigation.navigate(screen);
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      {/* ICON */}

      <View style={styles.iconContainer}>
        <MaterialIcons
          name={icon}
          size={21}
          color={COLORS.primary}
        />
      </View>

      {/* TEXT */}

      <View style={styles.textContainer}>
        <Text style={styles.itemText}>
          {title}
        </Text>

        <Text style={styles.itemDescription}>
          {description}
        </Text>
      </View>

      {/* CHEVRON */}

      <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.textLight}
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* SAFE AREA */

  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  contentContainer: {
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 60,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 22,
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

  /* SECTION */

  section: {
    marginBottom: 22,
  },

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

  /* SERVICE ITEM */

  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 9,
  },

  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  textContainer: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  itemText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  itemDescription: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
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
    marginTop: 2,
  },

  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.text,
  },

  /* APPLICATIONS DASHBOARD */

  applicationsCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EAF3FA",
    borderWidth: 1.5,
    borderColor: "#9FC5E3",
    borderRadius: 14,
    padding: 15,
    marginTop: 2,
    shadowColor: "#0B4F8A",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },

  applicationsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0B4F8A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  applicationsTextContainer: {
    flex: 1,
    marginRight: 8,
  },

  applicationsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#083B68",
    marginBottom: 6,
  },

  applicationsDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#445566",
  },

  applicationsAction: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7DDED",
    gap: 7,
  },

  applicationsActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0B4F8A",
  },

});
