
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

import { useFocusEffect } from "@react-navigation/native";
const COLORS = {
  primary: "#003366",
  background: "#F4F7FB",
  card: "#FFFFFF",
  border: "#E1E7EF",
  text: "#17202A",
  muted: "#6B7280",
  softBlue: "#EAF2F8",
  softGreen: "#EAF7EF",
  success: "#2E7D32",
  danger: "#B42318",
  softRed: "#FDECEC",
  amber: "#9A6700",
  softAmber: "#FFF4DF",
};

type MenuItem = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  tint: string;
  background: string;
};

type ProfileChangeRequest = {
  id: string;
  userId?: string;
  citizenName?: string;
  currentValues?: {
    email?: string;
    phone?: string;
  };
  requestedChanges?: {
    email?: string;
    phone?: string;
  };
  status?: string;
  rejectionReason?: string;
  createdAt?: {
    toDate?: () => Date;
    toMillis?: () => number;
  } | null;
};

const MENU_ITEMS: MenuItem[] = [
  {
    id: "privacy",
    title: "Security and privacy",
    description: "Manage account security and privacy",
    icon: "shield-checkmark-outline",
    screen: "Privacy",
    tint: COLORS.success,
    background: COLORS.softGreen,
  },
  {
    id: "help",
    title: "Help and support",
    description: "Get help with TrafficConnect SA",
    icon: "help-circle-outline",
    screen: "Help",
    tint: "#087F8C",
    background: "#E6F6F7",
  },
  {
    id: "about",
    title: "About TrafficConnect SA",
    description: "App information and version details",
    icon: "information-circle-outline",
    screen: "About",
    tint: COLORS.muted,
    background: "#F0F2F4",
  },
];

function formatRequestDate(request: ProfileChangeRequest): string {
  try {
    const date = request.createdAt?.toDate?.();

    if (!date || Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "Date unavailable";
  }
}

function getRequestStatus(status?: string) {
  const normalised = String(status ?? "pending").toLowerCase().trim();

  if (normalised === "approved") {
    return {
      label: "Approved",
      badge: styles.requestApprovedBadge,
      text: styles.requestApprovedText,
      icon: "checkmark-circle-outline" as const,
    };
  }

  if (normalised === "rejected") {
    return {
      label: "Rejected",
      badge: styles.requestRejectedBadge,
      text: styles.requestRejectedText,
      icon: "close-circle-outline" as const,
    };
  }

  if (normalised === "pending") {
    return {
      label: "Pending",
      badge: styles.requestPendingBadge,
      text: styles.requestPendingText,
      icon: "time-outline" as const,
    };
  }

  return {
    label: normalised || "Unknown",
    badge: styles.requestPendingBadge,
    text: styles.requestPendingText,
    icon: "help-circle-outline" as const,
  };
}

export default function ProfileScreen({ navigation }: any) {
const {
  user,
  loading,
  setUser,
  setIsLoggedIn,
  reloadUser,
} = useAuth() as any;

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [requestError, setRequestError] = useState("");

  const [profileRequests, setProfileRequests] = useState<
    ProfileChangeRequest[]
  >([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsLoadError, setRequestsLoadError] = useState("");

  const fullName = String(
    user?.fullName ?? user?.name ?? "Citizen"
  ).trim();

  const phone = user?.phone ? String(user.phone) : "Not added";
  const email = user?.email ? String(user.email) : "Not added";
  const idNumber = user?.idNumber ? String(user.idNumber) : "";

  // Use the existing citizen/user ID for linking requests to the profile.
  const citizenKey = String(
    user?.id ?? user?.userId ?? user?.uid ?? ""
  ).trim();

  const initials = useMemo(() => {
    const parts = fullName.split(/\s+/).filter(Boolean);

    if (!parts.length) return "C";

    return parts
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [fullName]);

  const maskedId = useMemo(() => {
    if (!idNumber) return "Not displayed";

    const digits = idNumber.replace(/\s/g, "");

    if (digits.length <= 4) return "••••";

    return `••••••••${digits.slice(-4)}`;
  }, [idNumber]);

  const accountStatus = user?.accountStatus
    ? String(user.accountStatus)
    : user?.verified
      ? "Verified account"
      : "Citizen account";

  // Listen for the logged-in citizen's profile-change requests.
  useEffect(() => {
    if (!citizenKey) {
      setProfileRequests([]);
      setRequestsLoading(false);
      setRequestsLoadError("");
      return;
    }

    setRequestsLoading(true);
    setRequestsLoadError("");

    const requestsQuery = query(
      collection(db, "profileChangeRequests"),
      where("userId", "==", citizenKey)
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as ProfileChangeRequest[];

        requests.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;

          return bTime - aTime;
        });

        setProfileRequests(requests);
        setRequestsLoading(false);
        setRequestsLoadError("");
      },
      (error) => {
        console.error(
          "Could not load profile-change requests:",
          error
        );

        setRequestsLoadError(
          "Your request history could not be loaded. Check your connection or database permissions."
        );
        setRequestsLoading(false);
      }
    );

    return unsubscribe;
  }, [citizenKey]);

  const openScreen = (screen: string, title: string) => {
    if (navigation?.navigate) {
      navigation.navigate(screen);
      return;
    }

    Alert.alert(
      title,
      "This screen is not available in the current navigation setup."
    );
  };

  const handleRequestProfileEdit = () => {
    setNewEmail(String(user?.email ?? ""));
    setNewPhone(String(user?.phone ?? ""));
    setRequestError("");
    setShowEditModal(true);
  };

  const handleSubmitProfileRequest = async () => {
    if (!citizenKey) {
      setRequestError(
        "We could not identify your citizen account. Please sign out and sign in again."
      );
      return;
    }

    const requestedEmail = newEmail.trim().toLowerCase();
    const requestedPhone = newPhone.trim();

    const currentEmail = String(user?.email ?? "")
      .trim()
      .toLowerCase();

    const currentPhone = String(user?.phone ?? "").trim();

    if (
      !requestedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)
    ) {
      setRequestError("Enter a valid email address.");
      return;
    }

    if (!/^0\d{9}$/.test(requestedPhone)) {
      setRequestError(
        "Enter a valid South African phone number, for example 0821234567."
      );
      return;
    }

    const requestedChanges: {
      email?: string;
      phone?: string;
    } = {};

    if (requestedEmail !== currentEmail) {
      requestedChanges.email = requestedEmail;
    }

    if (requestedPhone !== currentPhone) {
      requestedChanges.phone = requestedPhone;
    }

    if (Object.keys(requestedChanges).length === 0) {
      setRequestError(
        "You have not changed your email address or phone number."
      );
      return;
    }

    const hasPendingRequest = profileRequests.some(
      (request) =>
        String(request.status ?? "").toLowerCase() === "pending"
    );

    if (hasPendingRequest) {
      setRequestError(
        "You already have a pending request. Please wait for the administrator to review it."
      );
      return;
    }

    try {
      setSavingRequest(true);
      setRequestError("");

      const requestRef = await addDoc(
        collection(db, "profileChangeRequests"),
        {
          userId: citizenKey,
          authUid: user?.uid ?? null,
          citizenName: fullName,

          currentValues: {
            email: currentEmail,
            phone: currentPhone,
          },

          requestedChanges,

          status: "pending",
          rejectionReason: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      setShowEditModal(false);

      Alert.alert(
        "Request submitted",
        `Your profile-change request has been sent for administrator review.\n\nReference: ${requestRef.id}\n\nYour current profile details have not been changed.`
      );
    } catch (error) {
      console.error(
        "Could not submit profile-change request:",
        error
      );

      setRequestError(
        "Your request could not be saved. Please check your connection and Firestore permissions, then try again."
      );
    } finally {
      setSavingRequest(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await AsyncStorage.removeItem("userId");

      setShowLogoutModal(false);
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Profile logout failed:", error);

      Alert.alert(
        "Could not log out",
        "Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const renderMenuItem = (item: MenuItem, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        index === MENU_ITEMS.length - 1 && styles.lastMenuItem,
      ]}
      activeOpacity={0.75}
      onPress={() => openScreen(item.screen, item.title)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.description}`}
    >
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: item.background },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={21}
          color={item.tint}
        />
      </View>

      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuDescription}>
          {item.description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9AA3AD"
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />
          <Text style={styles.stateText}>
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="person-outline"
              size={30}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>No account found</Text>

          <Text style={styles.emptyDescription}>
            Please sign in to view your profile.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate?.("Login")}
          >
            <Text style={styles.primaryButtonText}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right"]}
    >
      <View style={styles.topHeader}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.eyebrow}>
            TRAFFICCONNECT SA
          </Text>

          <Text style={styles.pageTitle}>Profile</Text>

          <Text style={styles.pageSubtitle}>
            Manage your account
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="person-outline"
            size={22}
            color="#FFFFFF"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Citizen identity card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initials}
              </Text>
            </View>

            <View style={styles.profileIdentity}>
              <Text
                style={styles.profileName}
                numberOfLines={2}
              >
                {fullName}
              </Text>

              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    user?.verified && styles.verifiedDot,
                  ]}
                />

                <Text style={styles.statusText}>
                  {accountStatus}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={handleRequestProfileEdit}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Request a personal information change"
            >
              <Ionicons
                name="create-outline"
                size={17}
                color={COLORS.primary}
              />

              <Text style={styles.editButtonText}>
                Request edit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="call-outline"
                size={17}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>
                PHONE NUMBER
              </Text>

              <Text style={styles.detailValue}>
                {phone}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="mail-outline"
                size={17}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>
                EMAIL ADDRESS
              </Text>

              <Text style={styles.detailValue}>
                {email}
              </Text>
            </View>
          </View>

          {idNumber ? (
            <View style={[styles.detailRow, styles.lastDetailRow]}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="card-outline"
                  size={17}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>
                  ID NUMBER
                </Text>

                <Text style={styles.detailValue}>
                  {maskedId}
                </Text>
              </View>

              <Ionicons
                name="lock-closed-outline"
                size={15}
                color={COLORS.muted}
              />
            </View>
          ) : null}
        </View>

        {/* Profile-change notice */}
        <View style={styles.requestNotice}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={COLORS.primary}
          />

          <Text style={styles.requestNoticeText}>
            Contact detail changes require administrator approval.
            Your current details remain unchanged until a request
            is approved.
          </Text>
        </View>

        {/* Profile-change request history */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>
            My change requests
          </Text>

          <Text style={styles.sectionCaption}>
            Review status
          </Text>
        </View>

        {requestsLoading ? (
          <View style={styles.requestHistoryCard}>
            <ActivityIndicator color={COLORS.primary} />

            <Text style={styles.menuDescription}>
              Loading your requests...
            </Text>
          </View>
        ) : requestsLoadError ? (
          <View style={styles.requestHistoryCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={COLORS.danger}
            />

            <Text style={styles.requestHistoryError}>
              {requestsLoadError}
            </Text>
          </View>
        ) : profileRequests.length === 0 ? (
          <View style={styles.requestHistoryCard}>
            <Ionicons
              name="document-text-outline"
              size={22}
              color={COLORS.muted}
            />

            <Text style={styles.menuDescription}>
              You have not submitted any profile-change requests.
            </Text>
          </View>
        ) : (
          profileRequests.map((request) => {
            const requestStatus = getRequestStatus(request.status);
            const statusValue = String(
              request.status ?? "pending"
            ).toLowerCase();

            return (
              <View
                key={request.id}
                style={styles.requestHistoryCard}
              >
                <View style={styles.requestHistoryHeader}>
                  <View style={styles.requestHistoryTitleContainer}>
                    <Text style={styles.menuTitle}>
                      Profile change request
                    </Text>

                    <Text style={styles.menuDescription}>
                      Reference: {request.id}
                    </Text>

                    <Text style={styles.requestDate}>
                      Submitted: {formatRequestDate(request)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.requestStatusBadge,
                      requestStatus.badge,
                    ]}
                  >
                    <Ionicons
                      name={requestStatus.icon}
                      size={13}
                      color={
                        statusValue === "approved"
                          ? COLORS.success
                          : statusValue === "rejected"
                            ? COLORS.danger
                            : COLORS.amber
                      }
                    />

                    <Text
                      style={[
                        styles.requestStatusText,
                        requestStatus.text,
                      ]}
                    >
                      {requestStatus.label}
                    </Text>
                  </View>
                </View>

                {request.requestedChanges?.email ? (
                  <View style={styles.requestChangeRow}>
                    <Text style={styles.requestChangeLabel}>
                      New email
                    </Text>

                    <Text style={styles.requestChangeValue}>
                      {request.requestedChanges.email}
                    </Text>
                  </View>
                ) : null}

                {request.requestedChanges?.phone ? (
                  <View style={styles.requestChangeRow}>
                    <Text style={styles.requestChangeLabel}>
                      New phone
                    </Text>

                    <Text style={styles.requestChangeValue}>
                      {request.requestedChanges.phone}
                    </Text>
                  </View>
                ) : null}

                {statusValue === "pending" ? (
                  <View style={styles.pendingNotice}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={COLORS.amber}
                    />

                    <Text style={styles.pendingNoticeText}>
                      Waiting for administrative review.
                    </Text>
                  </View>
                ) : null}

                {statusValue === "approved" ? (
                  <View style={styles.approvedNotice}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={COLORS.success}
                    />

                    <Text style={styles.approvedNoticeText}>
                      Your request has been approved.
                    </Text>
                  </View>
                ) : null}

                {statusValue === "rejected" ? (
                  <View style={styles.rejectionReasonBox}>
                    <Text style={styles.rejectionReasonTitle}>
                      Administrator's reason
                    </Text>

                    <Text style={styles.rejectionReasonText}>
                      {request.rejectionReason?.trim() ||
                        "No rejection reason was provided."}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {/* Account menu */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Text style={styles.sectionCaption}>
            Security and support
          </Text>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map(renderMenuItem)}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutRow}
          activeOpacity={0.75}
          onPress={() => setShowLogoutModal(true)}
          accessibilityRole="button"
        >
          <View style={styles.logoutIcon}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color={COLORS.danger}
            />
          </View>

          <View style={styles.menuTextContainer}>
            <Text style={styles.logoutTitle}>Log out</Text>

            <Text style={styles.menuDescription}>
              Sign out of your account on this device
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color="#9AA3AD"
          />
        </TouchableOpacity>

        <Text style={styles.footerText}>
          TrafficConnect SA
        </Text>
      </ScrollView>

      {/* Request profile-change modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() =>
          !savingRequest && setShowEditModal(false)
        }
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.editModalScroll}
            contentContainerStyle={styles.editModalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.editRequestCard}>
              <View style={styles.editRequestHeader}>
                <View style={styles.editRequestIcon}>
                  <Ionicons
                    name="create-outline"
                    size={25}
                    color={COLORS.primary}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  disabled={savingRequest}
                  accessibilityRole="button"
                  accessibilityLabel="Close edit request"
                >
                  <Ionicons
                    name="close"
                    size={25}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.confirmTitle}>
                Request a profile change
              </Text>

              <Text style={styles.confirmMessage}>
                Enter your updated contact details. The administrator
                will review your request before your official profile
                is changed.
              </Text>

              <Text style={styles.editFieldLabel}>
                Email address
              </Text>

              <TextInput
                style={styles.editField}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#9AA3AD"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                editable={!savingRequest}
                accessibilityLabel="New email address"
              />

              <Text style={styles.editFieldLabel}>
                Phone number
              </Text>

              <TextInput
                style={styles.editField}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="e.g. 0821234567"
                placeholderTextColor="#9AA3AD"
                keyboardType="phone-pad"
                maxLength={10}
                editable={!savingRequest}
                accessibilityLabel="New phone number"
              />

              <View style={styles.editInfoBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={COLORS.primary}
                />

                <Text style={styles.editInfoText}>
                  Your request will be saved for administrator review.
                  Submitting it will not immediately change your profile.
                </Text>
              </View>

              {requestError ? (
                <View style={styles.editErrorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={COLORS.danger}
                  />

                  <Text style={styles.editRequestError}>
                    {requestError}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.submitRequestButton,
                  savingRequest && styles.disabledButton,
                ]}
                onPress={handleSubmitProfileRequest}
                disabled={savingRequest}
                activeOpacity={0.8}
              >
                {savingRequest ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />

                    <Text style={styles.confirmButtonText}>
                      Submitting request...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="send-outline"
                      size={17}
                      color="#FFFFFF"
                    />

                    <Text style={styles.confirmButtonText}>
                      Submit for approval
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editCancelButton}
                onPress={() => setShowEditModal(false)}
                disabled={savingRequest}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout confirmation modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          !loggingOut && setShowLogoutModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons
                name="log-out-outline"
                size={25}
                color={COLORS.danger}
              />
            </View>

            <Text style={styles.confirmTitle}>
              Log out?
            </Text>

            <Text style={styles.confirmMessage}>
              Are you sure you want to log out of TrafficConnect SA?
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  loggingOut && styles.disabledButton,
                ]}
                onPress={handleLogout}
                disabled={loggingOut}
                activeOpacity={0.8}
              >
                {loggingOut ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Log out
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  topHeader: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 14,
  },

  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

  pageTitle: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: "800",
    marginTop: 4,
  },

  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#14243A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "800",
  },

  profileIdentity: {
    flex: 1,
    minWidth: 0,
  },

  profileName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#9AA3AD",
    marginRight: 6,
  },

  verifiedDot: {
    backgroundColor: COLORS.success,
  },

  statusText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.softBlue,
    marginLeft: 8,
  },

  editButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 17,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  lastDetailRow: {
    marginBottom: 0,
  },

  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  detailTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  detailLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  requestNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderColor: "#D5E4F1",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },

  requestNoticeText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 8,
  },

  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 25,
    marginBottom: 11,
    paddingHorizontal: 2,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },

  sectionCaption: {
    color: COLORS.muted,
    fontSize: 11,
  },

  requestHistoryCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    gap: 9,
  },

  requestHistoryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  requestHistoryTitleContainer: {
    flex: 1,
    minWidth: 0,
  },

  requestDate: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },

  requestStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  requestPendingBadge: {
    backgroundColor: COLORS.softAmber,
  },

  requestPendingText: {
    color: COLORS.amber,
  },

  requestApprovedBadge: {
    backgroundColor: COLORS.softGreen,
  },

  requestApprovedText: {
    color: COLORS.success,
  },

  requestRejectedBadge: {
    backgroundColor: COLORS.softRed,
  },

  requestRejectedText: {
    color: COLORS.danger,
  },

  requestStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  requestChangeRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F5",
  },

  requestChangeLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 3,
  },

  requestChangeValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },

  pendingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.softAmber,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },

  pendingNoticeText: {
    flex: 1,
    color: COLORS.amber,
    fontSize: 11,
    lineHeight: 16,
  },

  approvedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.softGreen,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },

  approvedNoticeText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 11,
    lineHeight: 16,
  },

  rejectionReasonBox: {
    backgroundColor: COLORS.softRed,
    borderRadius: 10,
    padding: 11,
    marginTop: 4,
  },

  rejectionReasonTitle: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 5,
  },

  rejectionReasonText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },

  requestHistoryError: {
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },

  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F5",
  },

  lastMenuItem: {
    borderBottomWidth: 0,
  },

  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  menuTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  menuTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  menuDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 13,
  },

  logoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.softRed,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  logoutTitle: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "800",
  },

  footerText: {
    textAlign: "center",
    color: "#9AA3AD",
    fontSize: 11,
    marginTop: 22,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },

  stateText: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 12,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
  },

  emptyDescription: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(12, 24, 38, 0.48)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  editModalScroll: {
    width: "100%",
    flexGrow: 0,
    maxHeight: "100%",
  },

  editModalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 10,
  },

  editRequestCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 22,
  },

  editRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  editRequestIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },

  confirmIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.softRed,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  confirmTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },

  confirmMessage: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  editFieldLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 7,
  },

  editField: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },

  editInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderRadius: 11,
    padding: 11,
    marginTop: 15,
    gap: 8,
  },

  editInfoText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 11,
    lineHeight: 17,
  },

  editErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softRed,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 7,
  },

  editRequestError: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 18,
  },

  submitRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    marginTop: 20,
    minHeight: 48,
  },

  editCancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 9,
  },

  confirmActions: {
    flexDirection: "row",
    width: "100%",
    marginTop: 22,
  },

  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    minHeight: 45,
  },

  cancelButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  confirmButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    marginLeft: 8,
    minHeight: 45,
  },

  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.65,
  },
});
