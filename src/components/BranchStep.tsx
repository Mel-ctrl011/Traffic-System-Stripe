
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/* =========================================================
   TYPES
========================================================= */

export interface AppointmentBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  hours: string;
  isOpen: boolean;
}

interface BranchStepProps {
  selectedBranch: AppointmentBranch | null;
  onSelectBranch: (branch: AppointmentBranch) => void;
}

/* =========================================================
   TEMPORARY BRANCH DATA
========================================================= */

/*
 * Temporary data for the UI.
 *
 * Later this will come from Firebase/API.
 */

const BRANCHES: AppointmentBranch[] = [
  {
    id: "1",
    name: "Pretoria Licensing Centre",
    address: "123 Paul Kruger Street",
    city: "Pretoria",
    province: "Gauteng",
    phone: "012 000 0000",
    hours: "08:00 - 16:00",
    isOpen: true,
  },
  {
    id: "2",
    name: "Centurion Licensing Centre",
    address: "45 Botha Avenue",
    city: "Centurion",
    province: "Gauteng",
    phone: "012 111 1111",
    hours: "08:00 - 16:00",
    isOpen: true,
  },
  {
    id: "3",
    name: "Soshanguve Licensing Centre",
    address: "78 Dr Machobane Street",
    city: "Soshanguve",
    province: "Gauteng",
    phone: "012 222 2222",
    hours: "08:00 - 16:00",
    isOpen: true,
  },
  {
    id: "4",
    name: "Mamelodi Licensing Centre",
    address: "22 Tsamaya Road",
    city: "Mamelodi",
    province: "Gauteng",
    phone: "012 333 3333",
    hours: "08:00 - 16:00",
    isOpen: false,
  },
  {
    id: "5",
    name: "Randburg Licensing Centre",
    address: "18 Bram Fischer Drive",
    city: "Randburg",
    province: "Gauteng",
    phone: "011 444 4444",
    hours: "08:00 - 16:00",
    isOpen: true,
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function BranchStep({
  selectedBranch,
  onSelectBranch,
}: BranchStepProps) {
  const [searchText, setSearchText] = useState("");

  /* =======================================================
     FILTER BRANCHES
  ======================================================= */

  const filteredBranches = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return BRANCHES;
    }

    return BRANCHES.filter((branch) => {
      return (
        branch.name.toLowerCase().includes(search) ||
        branch.city.toLowerCase().includes(search) ||
        branch.province
          .toLowerCase()
          .includes(search) ||
        branch.address
          .toLowerCase()
          .includes(search)
      );
    });
  }, [searchText]);

  /* =======================================================
     SELECT BRANCH
  ======================================================= */

  const handleSelectBranch = (
    branch: AppointmentBranch
  ) => {
    if (!branch.isOpen) {
      return;
    }

    onSelectBranch(branch);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ===================================================
          INTRODUCTION
      =================================================== */}

      <View style={styles.introduction}>
        <Text style={styles.title}>
          Select a branch
        </Text>

        <Text style={styles.description}>
          Choose the licensing centre where you want
          to complete your appointment.
        </Text>
      </View>

      {/* ===================================================
          SEARCH
      =================================================== */}

      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#64748B"
        />

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search branch, city or address"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchText("")}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ===================================================
          RESULTS HEADER
      =================================================== */}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          Available Branches
        </Text>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {filteredBranches.length}
          </Text>
        </View>
      </View>

      {/* ===================================================
          BRANCH LIST
      =================================================== */}

      <View style={styles.branchList}>
        {filteredBranches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="location-outline"
                size={28}
                color="#64748B"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No branches found
            </Text>

            <Text style={styles.emptyDescription}>
              Try searching for another branch, city
              or address.
            </Text>
          </View>
        ) : (
          filteredBranches.map((branch) => {
            const isSelected =
              selectedBranch?.id === branch.id;

            return (
              <TouchableOpacity
                key={branch.id}
                activeOpacity={0.8}
                disabled={!branch.isOpen}
                onPress={() =>
                  handleSelectBranch(branch)
                }
                style={[
                  styles.branchCard,
                  isSelected &&
                    styles.branchCardSelected,
                  !branch.isOpen &&
                    styles.branchCardClosed,
                ]}
              >
                {/* -----------------------------------------
                    BRANCH HEADER
                ----------------------------------------- */}

                <View style={styles.branchHeader}>
                  <View
                    style={[
                      styles.locationIcon,
                      isSelected &&
                        styles.locationIconSelected,
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={22}
                      color={
                        isSelected
                          ? "#FFFFFF"
                          : "#2563EB"
                      }
                    />
                  </View>

                  <View
                    style={styles.branchTitleContainer}
                  >
                    <Text
                      style={styles.branchName}
                      numberOfLines={2}
                    >
                      {branch.name}
                    </Text>

                    <Text
                      style={styles.branchLocation}
                    >
                      {branch.city}, {branch.province}
                    </Text>
                  </View>

                  {/* ---------------------------------------
                      RADIO
                  --------------------------------------- */}

                  <View
                    style={[
                      styles.radioOuter,
                      isSelected &&
                        styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={styles.radioInner}
                      />
                    )}
                  </View>
                </View>

                {/* -----------------------------------------
                    DIVIDER
                ----------------------------------------- */}

                <View style={styles.divider} />

                {/* -----------------------------------------
                    ADDRESS
                ----------------------------------------- */}

                <View style={styles.detailRow}>
                  <Ionicons
                    name="navigate-outline"
                    size={17}
                    color="#64748B"
                  />

                  <Text style={styles.detailText}>
                    {branch.address}, {branch.city}
                  </Text>
                </View>

                {/* -----------------------------------------
                    PHONE
                ----------------------------------------- */}

                <View style={styles.detailRow}>
                  <Ionicons
                    name="call-outline"
                    size={17}
                    color="#64748B"
                  />

                  <Text style={styles.detailText}>
                    {branch.phone}
                  </Text>
                </View>

                {/* -----------------------------------------
                    HOURS
                ----------------------------------------- */}

                <View style={styles.detailRow}>
                  <Ionicons
                    name="time-outline"
                    size={17}
                    color="#64748B"
                  />

                  <Text style={styles.detailText}>
                    {branch.hours}
                  </Text>
                </View>

                {/* -----------------------------------------
                    STATUS
                ----------------------------------------- */}

                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      branch.isOpen
                        ? styles.statusDotOpen
                        : styles.statusDotClosed,
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      branch.isOpen
                        ? styles.statusTextOpen
                        : styles.statusTextClosed,
                    ]}
                  >
                    {branch.isOpen
                      ? "Open"
                      : "Currently closed"}
                  </Text>
                </View>

                {/* -----------------------------------------
                    SELECTED MESSAGE
                ----------------------------------------- */}

                {isSelected && (
                  <View
                    style={styles.selectedContainer}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color="#16A34A"
                    />

                    <Text
                      style={styles.selectedText}
                    >
                      Branch selected
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ===================================================
          SELECTED BRANCH SUMMARY
      =================================================== */}

      {selectedBranch && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="checkmark"
              size={18}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>
              Selected branch
            </Text>

            <Text style={styles.summaryName}>
              {selectedBranch.name}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  content: {
    paddingBottom: 30,
  },

  /* -------------------------------------------------------
     INTRODUCTION
  ------------------------------------------------------- */

  introduction: {
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
  },

  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  searchContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 10,
    fontSize: 14,
    color: "#1E293B",
  },

  clearButton: {
    padding: 4,
  },

  /* -------------------------------------------------------
     RESULTS HEADER
  ------------------------------------------------------- */

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  resultsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },

  countBadge: {
    minWidth: 28,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },

  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* -------------------------------------------------------
     BRANCH LIST
  ------------------------------------------------------- */

  branchList: {
    gap: 12,
  },

  branchCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  branchCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FAFF",
  },

  branchCardClosed: {
    opacity: 0.55,
  },

  /* -------------------------------------------------------
     BRANCH HEADER
  ------------------------------------------------------- */

  branchHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 12,
  },

  locationIconSelected: {
    backgroundColor: "#2563EB",
  },

  branchTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },

  branchName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 20,
  },

  branchLocation: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  /* -------------------------------------------------------
     RADIO
  ------------------------------------------------------- */

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: "#2563EB",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },

  /* -------------------------------------------------------
     DIVIDER
  ------------------------------------------------------- */

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
  },

  /* -------------------------------------------------------
     DETAILS
  ------------------------------------------------------- */

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  detailText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },

  statusDotOpen: {
    backgroundColor: "#16A34A",
  },

  statusDotClosed: {
    backgroundColor: "#DC2626",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  statusTextOpen: {
    color: "#16A34A",
  },

  statusTextClosed: {
    color: "#DC2626",
  },

  /* -------------------------------------------------------
     SELECTED
  ------------------------------------------------------- */

  selectedContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#DCFCE7",
    gap: 6,
  },

  selectedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },

  /* -------------------------------------------------------
     SUMMARY
  ------------------------------------------------------- */

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 14,
    borderRadius: 13,
    backgroundColor: "#F0FDF4",
  },

  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    marginRight: 10,
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 2,
  },

  summaryName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },

  /* -------------------------------------------------------
     EMPTY
  ------------------------------------------------------- */

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },

  emptyDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    textAlign: "center",
  },
});

