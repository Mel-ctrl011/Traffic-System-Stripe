import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../../services/firebase";
import { uploadDocumentToCloudinary } from "../../services/cloudinary";
import { useAuth } from "../../context/AuthContext";

const COLORS = {
  primary: "#0B4F8A",
  primaryDark: "#083B68",
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

type UploadedFile = {
  name: string;
  uri: string;
  size: number;
};

type VehicleType = {
  id: string;
  name: string;
  description: string;
};

type RegistrationForm = {
  idNumber: string;
  fullName: string;
  phone: string;
  address: string;
  vehicleType: string;
  vin: string;
  engineNumber: string;
  make: string;
  model: string;
  year: string;
  colour: string;
};

type RegistrationDocuments = {
  idCopy: UploadedFile | null;
  proofOfResidence: UploadedFile | null;
  proofOfOwnership: UploadedFile | null;
  policeClearance: UploadedFile | null;
  roadworthy: UploadedFile | null;
};

type DocumentKey = keyof RegistrationDocuments;

const DOCUMENT_KEYS: DocumentKey[] = [
  "idCopy",
  "proofOfResidence",
  "proofOfOwnership",
  "policeClearance",
  "roadworthy",
];

const VEHICLE_TYPES: VehicleType[] = [
  {
    id: "light",
    name: "Light Motor Vehicle",
    description: "Passenger vehicles and light vehicles",
  },
  {
    id: "heavy",
    name: "Heavy Motor Vehicle",
    description: "Heavy goods vehicles and trucks",
  },
  {
    id: "motorcycle",
    name: "Motorcycle",
    description: "Motorcycles and scooters",
  },
  {
    id: "trailer",
    name: "Trailer",
    description: "Trailers, caravans and similar vehicles",
  },
];

const INITIAL_FORM: RegistrationForm = {
  idNumber: "",
  fullName: "",
  phone: "",
  address: "",
  vehicleType: "",
  vin: "",
  engineNumber: "",
  make: "",
  model: "",
  year: "",
  colour: "",
};

const INITIAL_DOCUMENTS: RegistrationDocuments = {
  idCopy: null,
  proofOfResidence: null,
  proofOfOwnership: null,
  policeClearance: null,
  roadworthy: null,
};

function normalizeStatus(status: unknown): string {
  if (typeof status !== "string" || !status.trim()) {
    return "Submitted";
  }

  const value = status.trim().toLowerCase();

  if (value === "approved" || value === "accepted") {
    return "Approved";
  }

  if (value === "rejected" || value === "declined") {
    return "Rejected";
  }

  if (
    value === "pending" ||
    value === "submitted" ||
    value === "awaiting verification" ||
    value === "under review"
  ) {
    return "Pending";
  }

  return status.trim();
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export default function VehicleRegistrationScreen() {
  const navigation = useNavigation<any>();
  const { user, loading: authLoading, isLoggedIn } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [checkingExistingApplication, setCheckingExistingApplication] =
    useState(true);

  const [submittedApplicationId, setSubmittedApplicationId] =
    useState<string | null>(null);

  const [submittedApplicationStatus, setSubmittedApplicationStatus] =
    useState("Submitted");

  const [submittedApplicationRejectionReason, setSubmittedApplicationRejectionReason] =
    useState("");

  // Saved data of the latest application (used for the summary and resubmit).
  const [latestApplication, setLatestApplication] =
    useState<Record<string, any> | null>(null);

  // Resubmit mode: the citizen is fixing a rejected application.
  const [resubmitMode, setResubmitMode] = useState(false);
  const [existingDocuments, setExistingDocuments] =
    useState<Record<string, any>>({});

  const [form, setForm] = useState<RegistrationForm>(INITIAL_FORM);
  const [documents, setDocuments] =
    useState<RegistrationDocuments>(INITIAL_DOCUMENTS);

  // Fill the applicant details from the signed-in citizen profile.
  useEffect(() => {
    if (!user) return;

    const addressValue: unknown = user.address;
    const addressObject =
      addressValue && typeof addressValue === "object"
        ? (addressValue as Record<string, unknown>)
        : null;

    const formattedAddress =
      typeof addressValue === "string"
        ? addressValue
        : addressObject
          ? [
              addressObject.street,
              addressObject.suburb,
              addressObject.city,
              addressObject.province,
              addressObject.postalCode,
            ]
              .filter(
                (value): value is string =>
                  typeof value === "string" && value.trim().length > 0
              )
              .join(", ")
          : "";

    setForm((previous) => ({
      ...previous,
      idNumber: previous.idNumber || user.idNumber || "",
      fullName: previous.fullName || user.fullName || "",
      phone: previous.phone || user.phone || "",
      address: previous.address || formattedAddress,
    }));
  }, [user]);

  // Listen continuously for this citizen's registration application.
  // Admin dashboard changes will update the confirmation screen automatically.
  useEffect(() => {
    if (authLoading) {
      setCheckingExistingApplication(true);
      return;
    }

    if (!user?.id || !isLoggedIn) {
      setSubmittedApplicationId(null);
      setSubmittedApplicationStatus("Submitted");
      setSubmittedApplicationRejectionReason("");
      setLatestApplication(null);
      setCheckingExistingApplication(false);
      return;
    }

    setCheckingExistingApplication(true);

    const applicationsQuery = query(
      collection(db, "vehicleApplications"),
      where("userId", "==", user.id)
    );

    const unsubscribe = onSnapshot(
      applicationsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setSubmittedApplicationId(null);
          setSubmittedApplicationStatus("Submitted");
          setSubmittedApplicationRejectionReason("");
          setLatestApplication(null);
          setCheckingExistingApplication(false);
          return;
        }

        // Show the newest application belonging to this citizen.
        // "estimate" keeps a just-submitted application (whose server
        // timestamp is still pending) at the top of the list.
        const createdAtOf = (
          snap: (typeof snapshot.docs)[number]
        ): number =>
          snap
            .data({ serverTimestamps: "estimate" })
            .createdAt?.toMillis?.() ?? 0;

        const sortedApplications = [...snapshot.docs].sort(
          (a, b) => createdAtOf(b) - createdAtOf(a)
        );

        const latest = sortedApplications[0];
        const data = latest.data();

        setSubmittedApplicationId(
          typeof data.applicationId === "string" && data.applicationId.trim()
            ? data.applicationId
            : latest.id
        );

        const normalized = normalizeStatus(data.status);

        setSubmittedApplicationStatus(normalized);
        setSubmittedApplicationRejectionReason(getRejectionReason(data));
        setLatestApplication(data);
        setCheckingExistingApplication(false);

        console.log("[VehicleRegistration] Application update:", {
          documentId: latest.id,
          applicationId: data.applicationId,
          status: normalized,
          rejectionReason: getRejectionReason(data),
        });
      },
      (error) => {
        console.error(
          "[VehicleRegistration] Application listener failed:",
          error
        );

        setCheckingExistingApplication(false);

        Alert.alert(
          "Application Status Unavailable",
          "We could not retrieve your application status. Please check your connection and try again."
        );
      }
    );

    return unsubscribe;
  }, [user?.id, isLoggedIn, authLoading]);

  const updateForm = (field: keyof RegistrationForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  // A document is satisfied by a newly picked file, or (when resubmitting)
  // by the one already saved on the rejected application.
  const hasDocument = (key: DocumentKey) =>
    !!documents[key] || (resubmitMode && !!existingDocuments[key]);

  const startResubmit = () => {
    if (!latestApplication) return;

    const applicant = latestApplication.applicant ?? {};
    const vehicle = latestApplication.vehicle ?? {};

    setForm((previous) => ({
      ...previous,
      idNumber: applicant.idNumber ?? previous.idNumber,
      fullName: applicant.fullName ?? previous.fullName,
      phone: applicant.phone ?? previous.phone,
      address: applicant.address ?? previous.address,
      vehicleType: vehicle.vehicleType ?? "",
      vin: vehicle.vin ?? "",
      engineNumber: vehicle.engineNumber ?? "",
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      year: vehicle.year ? String(vehicle.year) : "",
      colour: vehicle.colour ?? "",
    }));

    setExistingDocuments(latestApplication.documents ?? {});
    setDocuments(INITIAL_DOCUMENTS);
    setStep(1);
    setResubmitMode(true);
  };

  const cancelResubmit = () => {
    setResubmitMode(false);
    setStep(1);
    setDocuments(INITIAL_DOCUMENTS);
    setExistingDocuments({});
  };

  const pickDocument = async (documentType: DocumentKey) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      setDocuments((previous) => ({
        ...previous,
        [documentType]: {
          name: asset.name,
          uri: asset.uri,
          size: asset.size ?? 0,
        },
      }));
    } catch (error) {
      console.error("[VehicleRegistration] Document picker error:", error);

      Alert.alert(
        "Document Error",
        "The document could not be selected. Please try again."
      );
    }
  };

  const removeDocument = (documentType: DocumentKey) => {
    setDocuments((previous) => ({
      ...previous,
      [documentType]: null,
    }));
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      if (
        !form.idNumber.trim() ||
        !form.fullName.trim() ||
        !form.phone.trim() ||
        !form.address.trim()
      ) {
        Alert.alert(
          "Incomplete Application",
          "Please complete all applicant details before continuing."
        );
        return false;
      }

      if (!/^\d{13}$/.test(form.idNumber.trim())) {
        Alert.alert(
          "Invalid Identity Number",
          "Please enter a valid 13-digit South African identity number."
        );
        return false;
      }

      if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ""))) {
        Alert.alert(
          "Invalid Contact Number",
          "Please enter a valid South African mobile number."
        );
        return false;
      }

      return true;
    }

    if (step === 2) {
      if (
        !form.vehicleType ||
        !form.vin.trim() ||
        !form.engineNumber.trim() ||
        !form.make.trim() ||
        !form.model.trim() ||
        !form.year.trim() ||
        !form.colour.trim()
      ) {
        Alert.alert(
          "Incomplete Vehicle Information",
          "Please complete all required vehicle details."
        );
        return false;
      }

      const year = Number(form.year);
      const currentYear = new Date().getFullYear();

      if (
        !/^\d{4}$/.test(form.year) ||
        year < 1900 ||
        year > currentYear + 1
      ) {
        Alert.alert(
          "Invalid Vehicle Year",
          "Please enter a valid vehicle manufacturing year."
        );
        return false;
      }

      if (form.vin.trim().length < 5) {
        Alert.alert(
          "Invalid VIN / Chassis Number",
          "Please enter the vehicle identification or chassis number."
        );
        return false;
      }

      return true;
    }

    if (step === 3) {
      const missingDocuments = DOCUMENT_KEYS.some((key) => !hasDocument(key));

      if (missingDocuments) {
        Alert.alert(
          "Required Documents Missing",
          "Please upload all five required documents before submitting."
        );
        return false;
      }
    }

    return true;
  };

  const handleBack = () => {
    if (submitting) return;

    if (step > 1) {
      setStep((previous) => previous - 1);
    } else if (resubmitMode) {
      cancelResubmit();
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (submitting || !validateStep()) return;

    if (step < 3) {
      setStep((previous) => previous + 1);
      return;
    }

    Alert.alert(
      resubmitMode ? "Confirm Resubmission" : "Confirm Application",
      "Please confirm that your information and supporting documents are accurate.",
      [
        { text: "Review Again", style: "cancel" },
        {
          text: resubmitMode ? "Resubmit Application" : "Submit Application",
          onPress: handleSubmit,
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (authLoading) {
      Alert.alert(
        "Please Wait",
        "Your citizen profile is still loading. Please try again."
      );
      return;
    }

    if (!user?.id || !isLoggedIn) {
      Alert.alert(
        "Sign-In Required",
        "Please sign in again before submitting your application."
      );
      return;
    }

    if (step !== 3 || !validateStep()) return;

    if (DOCUMENT_KEYS.some((key) => !hasDocument(key))) {
      Alert.alert(
        "Required Documents Missing",
        "Please attach all required documents."
      );
      return;
    }

    try {
      setSubmitting(true);

      const applicationRef = doc(collection(db, "vehicleApplications"));

      const applicationId = `VR-${applicationRef.id
        .slice(0, 8)
        .toUpperCase()}`;

      console.log("[VehicleRegistration] Starting:", applicationId);

      // Upload newly picked documents to Cloudinary. When resubmitting,
      // documents that were not replaced reuse the saved reference.
      const resolveDocument = async (key: DocumentKey) => {
        const file = documents[key];

        if (file) {
          const uploaded = await uploadDocumentToCloudinary(
            file,
            applicationRef.id
          );
          return { ...uploaded, fileName: file.name };
        }

        return existingDocuments[key];
      };

      const [
        idCopy,
        proofOfResidence,
        proofOfOwnership,
        policeClearance,
        roadworthy,
      ] = await Promise.all(DOCUMENT_KEYS.map(resolveDocument));

      const applicant = {
        idNumber: form.idNumber.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.replace(/\s/g, ""),
        address: form.address.trim(),
      };

      await setDoc(applicationRef, {
        applicationId,

        // Keep these identifiers consistent with Application History.
        userId: user.id,
        citizenId: user.id,
        createdBy: user.id,

        status: "Submitted",
        rejectionReason: "",

        // Links a resubmission back to the rejected application.
        ...(resubmitMode && submittedApplicationId
          ? { resubmissionOf: submittedApplicationId }
          : {}),

        applicant,

        vehicle: {
          vehicleType: form.vehicleType,
          vin: form.vin.trim(),
          engineNumber: form.engineNumber.trim(),
          make: form.make.trim(),
          model: form.model.trim(),
          year: Number(form.year),
          colour: form.colour.trim(),
        },

        documents: {
          idCopy,
          proofOfResidence,
          proofOfOwnership,
          policeClearance,
          roadworthy,
        },

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("[VehicleRegistration] Firestore saved:", applicationRef.id);

      // The Firestore listener will also receive this application.
      setSubmittedApplicationId(applicationId);
      setSubmittedApplicationStatus("Submitted");
      setSubmittedApplicationRejectionReason("");

      setResubmitMode(false);
      setExistingDocuments({});
      setDocuments(INITIAL_DOCUMENTS);
      setStep(1);
    } catch (error) {
      console.error("[VehicleRegistration] Submission failed:", error);

      Alert.alert(
        "Submission Unsuccessful",
        error instanceof Error
          ? error.message
          : "We could not upload your documents or save your application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitle =
    step === 1
      ? "Applicant Details"
      : step === 2
        ? "Vehicle Details"
        : "Supporting Documents";

  const normalizedStatus = normalizeStatus(submittedApplicationStatus);
  const applicationApproved = normalizedStatus === "Approved";
  const applicationRejected = normalizedStatus === "Rejected";
  const applicationPending = !applicationApproved && !applicationRejected;

  const applicationStatusLabel = applicationApproved
    ? "Approved"
    : applicationRejected
      ? "Rejected"
      : normalizedStatus === "Pending" || normalizedStatus === "Submitted"
        ? "Awaiting Verification"
        : normalizedStatus;

  const statusColor = applicationApproved
    ? COLORS.success
    : applicationRejected
      ? COLORS.error
      : COLORS.warning;

  const statusBackground = applicationApproved
    ? COLORS.softGreen
    : applicationRejected
      ? COLORS.softRed
      : COLORS.softYellow;

  const statusBorder = applicationApproved
    ? "#B7E4C7"
    : applicationRejected
      ? "#FECDCA"
      : "#F0D9A4";

  const rejectionReasonText =
    submittedApplicationRejectionReason ||
    "No rejection reason has been provided yet. Please contact the administration for more information.";

  const renderInput = (
    label: string,
    field: keyof RegistrationForm,
    placeholder: string,
    options?: {
      keyboardType?: "default" | "numeric" | "phone-pad";
      multiline?: boolean;
      maxLength?: number;
      autoCapitalize?: "none" | "sentences" | "words" | "characters";
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label} *</Text>
      <TextInput
        style={[
          styles.input,
          options?.multiline && styles.multilineInput,
        ]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={form[field]}
        keyboardType={options?.keyboardType ?? "default"}
        multiline={options?.multiline}
        textAlignVertical={options?.multiline ? "top" : "center"}
        maxLength={options?.maxLength}
        autoCapitalize={options?.autoCapitalize ?? "sentences"}
        onChangeText={(value) => {
          if (field === "idNumber" || field === "year") {
            updateForm(field, value.replace(/\D/g, ""));
          } else if (field === "vin" || field === "engineNumber") {
            updateForm(field, value.toUpperCase());
          } else {
            updateForm(field, value);
          }
        }}
      />
    </View>
  );

  const renderDocumentUpload = (
    label: string,
    documentType: DocumentKey,
    description: string
  ) => {
    const file = documents[documentType];
    const savedFile =
      resubmitMode && !file ? existingDocuments[documentType] : null;

    return (
      <View style={styles.documentGroup} key={documentType}>
        <Text style={styles.documentLabel}>{label} *</Text>
        <Text style={styles.documentDescription}>{description}</Text>

        {file ? (
          <View style={styles.filePreview}>
            <Ionicons
              name="checkmark-circle"
              size={25}
              color={COLORS.success}
            />
            <View style={styles.fileInformation}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileStatus}>
                {resubmitMode ? "New document attached" : "Document attached"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => removeDocument(documentType)}
              style={styles.removeButton}
              accessibilityLabel={`Remove ${label}`}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ) : savedFile ? (
          <View style={styles.savedFilePreview}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={COLORS.primary}
            />
            <View style={styles.fileInformation}>
              <Text style={styles.fileName} numberOfLines={1}>
                {savedFile.fileName || "Previously uploaded document"}
              </Text>
              <Text style={styles.savedFileStatus}>
                On file from your previous application
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => pickDocument(documentType)}
              style={styles.replaceButton}
              accessibilityLabel={`Replace ${label}`}
            >
              <Text style={styles.replaceButtonText}>Replace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={() => pickDocument(documentType)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="document-attach-outline"
              size={25}
              color={COLORS.primary}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.uploadTitle}>Select document</Text>
              <Text style={styles.uploadHint}>PDF, JPG or PNG</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={19}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (authLoading || checkingExistingApplication) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>
          Checking your vehicle registration...
        </Text>
        <Text style={styles.loadingDescription}>
          Retrieving your saved application and its latest status.
        </Text>
      </SafeAreaView>
    );
  }

  // Status screen: one layout per state (Pending / Approved / Rejected).
  if (submittedApplicationId && !resubmitMode) {
    const savedApplicant = latestApplication?.applicant ?? {};
    const savedVehicle = latestApplication?.vehicle ?? {};

    const vehicleLabel =
      savedVehicle.make && savedVehicle.model
        ? `${savedVehicle.make} ${savedVehicle.model}${
            savedVehicle.year ? ` (${savedVehicle.year})` : ""
          }`
        : "Not available";

    const heroTitle = applicationApproved
      ? "Application Approved"
      : applicationRejected
        ? "Application Rejected"
        : "Application Submitted";

    const heroDescription = applicationApproved
      ? "Your vehicle registration has been approved."
      : applicationRejected
        ? "Your application needs changes before it can be approved."
        : "Your application is waiting for administrative review.";

    const heroIcon = applicationApproved
      ? "checkmark-circle"
      : applicationRejected
        ? "close-circle"
        : "time";

    // Progress tracker: Submitted -> Under Review -> Decision.
    const trackerSteps = [
      { label: "Submitted", done: true, active: false },
      { label: "Under Review", done: !applicationPending, active: applicationPending },
      { label: "Decision", done: !applicationPending, active: false },
    ];

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.confirmationContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Status hero */}
          <View style={styles.confirmationCard}>
            <View
              style={[
                styles.confirmationIcon,
                { backgroundColor: statusBackground },
              ]}
            >
              <Ionicons name={heroIcon as any} size={54} color={statusColor} />
            </View>

            <Text style={styles.confirmationEyebrow}>
              VEHICLE REGISTRATION
            </Text>
            <Text style={styles.confirmationTitle}>{heroTitle}</Text>
            <Text style={styles.confirmationDescription}>
              {heroDescription}
            </Text>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusBackground,
                  borderColor: statusBorder,
                },
              ]}
            >
              <Ionicons
                name={
                  applicationApproved
                    ? "checkmark-circle-outline"
                    : applicationRejected
                      ? "close-circle-outline"
                      : "time-outline"
                }
                size={18}
                color={statusColor}
              />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {applicationStatusLabel}
              </Text>
            </View>

            {/* Progress tracker */}
            <View style={styles.tracker}>
              {trackerSteps.map((item, index) => (
                <React.Fragment key={item.label}>
                  <View style={styles.trackerStep}>
                    <View
                      style={[
                        styles.trackerDot,
                        item.done && {
                          backgroundColor:
                            index === 2 ? statusColor : COLORS.primary,
                        },
                        item.active && {
                          backgroundColor: COLORS.warning,
                        },
                      ]}
                    >
                      {item.done && (
                        <Ionicons
                          name={
                            index === 2 && applicationRejected
                              ? "close"
                              : "checkmark"
                          }
                          size={13}
                          color="#FFFFFF"
                        />
                      )}
                      {item.active && (
                        <View style={styles.trackerDotInner} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.trackerLabel,
                        (item.done || item.active) && styles.trackerLabelOn,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {index < trackerSteps.length - 1 && (
                    <View
                      style={[
                        styles.trackerLine,
                        trackerSteps[index + 1].done && {
                          backgroundColor: COLORS.primary,
                        },
                      ]}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* 2. Rejection reason: the hero of the rejected state */}
          {applicationRejected && (
            <View style={styles.rejectionPanel}>
              <View style={styles.rejectionHeader}>
                <Ionicons
                  name="alert-circle"
                  size={21}
                  color={COLORS.error}
                />
                <Text style={styles.rejectionTitle}>
                  Reason for rejection
                </Text>
              </View>
              <Text style={styles.rejectionDescription}>
                {rejectionReasonText}
              </Text>
            </View>
          )}

          {/* 3. Application summary */}
          <View style={[styles.card, styles.statusSummaryCard]}>
            <View style={styles.summaryHeader}>
              <Ionicons
                name="clipboard-outline"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.summaryTitle}>Application Details</Text>
            </View>

            <SummaryRow label="Reference" value={submittedApplicationId} />
            <SummaryRow
              label="Applicant"
              value={
                savedApplicant.fullName ||
                user?.fullName ||
                form.fullName ||
                "Not available"
              }
            />
            <SummaryRow label="Vehicle" value={vehicleLabel} />
            <SummaryRow
              label="Vehicle Type"
              value={savedVehicle.vehicleType || "Not available"}
            />
          </View>

          {/* 4. What happens next */}
          <View style={[styles.card, styles.nextCard]}>
            <Text style={styles.nextStepsTitle}>
              {applicationApproved
                ? "What happens next"
                : applicationRejected
                  ? "What you can do"
                  : "What to expect"}
            </Text>

            {applicationPending && (
              <>
                <View style={styles.nextStepRow}>
                  <Ionicons
                    name="sync-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                  <Text style={styles.nextStepText}>
                    This screen updates automatically when an administrator
                    makes a decision.
                  </Text>
                </View>
                <View style={styles.nextStepRow}>
                  <Ionicons
                    name="bookmark-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                  <Text style={styles.nextStepText}>
                    Keep your reference number for any enquiries.
                  </Text>
                </View>
              </>
            )}

            {applicationApproved && (
              <>
                <View style={styles.nextStepRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={COLORS.success}
                  />
                  <Text style={styles.nextStepText}>
                    Your details and documents were verified. No further
                    action is required on this application.
                  </Text>
                </View>
                <View style={styles.nextStepRow}>
                  <Ionicons
                    name="folder-open-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                  <Text style={styles.nextStepText}>
                    Keep your reference number and review your application in
                    Application History.
                  </Text>
                </View>
              </>
            )}

            {applicationRejected && (
              <>
                <View style={styles.nextStepRow}>
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                  <Text style={styles.nextStepText}>
                    Tap Fix & Resubmit. Your details are filled in already, so
                    only change what the reason above points to.
                  </Text>
                </View>
                <View style={styles.nextStepRow}>
                  <Ionicons
                    name="documents-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                  <Text style={styles.nextStepText}>
                    Replace only the documents that need correcting. The rest
                    stay on file.
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* 5. Actions */}
          {applicationRejected ? (
            <TouchableOpacity
              style={styles.confirmationPrimaryButton}
              activeOpacity={0.85}
              onPress={startResubmit}
            >
              <Ionicons name="refresh-outline" size={19} color="#FFFFFF" />
              <Text style={styles.confirmationPrimaryButtonText}>
                Fix & Resubmit
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.confirmationPrimaryButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("ApplicationHistory")}
            >
              <Ionicons name="folder-open-outline" size={19} color="#FFFFFF" />
              <Text style={styles.confirmationPrimaryButtonText}>
                View Application History
              </Text>
            </TouchableOpacity>
          )}

          {applicationRejected && (
            <TouchableOpacity
              style={styles.outlineButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("ApplicationHistory")}
            >
              <Text style={styles.outlineButtonText}>
                View Application History
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.confirmationSecondaryButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.confirmationSecondaryButtonText}>
              Return to Previous Screen
            </Text>
          </TouchableOpacity>

          <View style={styles.confirmationFooter}>
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color={COLORS.textLight}
            />
            <Text style={styles.confirmationFooterText}>
              Status shown is the latest saved on your application.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.departmentMark}>
            <Ionicons name="car-outline" size={23} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1, marginLeft: 11 }}>
            <Text style={styles.departmentTitle}>VEHICLE REGISTRATION</Text>
            <Text style={styles.departmentSubtitle}>Citizen Services</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {resubmitMode
            ? "Update & Resubmit Application"
            : "Vehicle Registration Application"}
        </Text>
        <Text style={styles.subtitle}>
          {resubmitMode
            ? "Review your saved details, correct what was flagged and resubmit."
            : "Complete the application below to submit your vehicle registration request."}
        </Text>

        <View style={styles.progressContainer}>
          {[1, 2, 3].map((item) => (
            <React.Fragment key={item}>
              <View
                style={[
                  styles.progressCircle,
                  step >= item && styles.progressCircleActive,
                ]}
              >
                {item < step ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.progressNumber,
                      step >= item && styles.progressNumberActive,
                    ]}
                  >
                    {item}
                  </Text>
                )}
              </View>

              {item < 3 && (
                <View
                  style={[
                    styles.progressLine,
                    step > item && styles.progressLineActive,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.progressLabel}>
          Step {step} of 3 {" • "} {stepTitle}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {resubmitMode ? (
          <View style={styles.reasonBanner}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.rejectionTitle}>
                Fix this before resubmitting
              </Text>
            </View>
            <Text style={styles.rejectionDescription}>
              {rejectionReasonText}
            </Text>
          </View>
        ) : (
          <View style={styles.noticeBox}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={COLORS.primary}
            />
            <Text style={styles.noticeText}>
              Please ensure that all information supplied is accurate and that
              supporting documents are clear and legible. Applications may be
              subject to verification.
            </Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>A</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeader}>Applicant Details</Text>
                <Text style={styles.sectionDescription}>
                  Details of the registered owner or applicant.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {renderInput(
              "South African ID Number",
              "idNumber",
              "Enter 13-digit ID number",
              { keyboardType: "numeric", maxLength: 13 }
            )}

            {renderInput(
              "Full Names and Surname",
              "fullName",
              "As reflected on identity document"
            )}

            {renderInput("Contact Number", "phone", "e.g. 082 123 4567", {
              keyboardType: "phone-pad",
            })}

            {renderInput(
              "Residential Address",
              "address",
              "Street, suburb, city and postal code",
              { multiline: true }
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>B</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeader}>Vehicle Details</Text>
                <Text style={styles.sectionDescription}>
                  Provide identifying information for the vehicle.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>Vehicle Classification *</Text>

            <View style={styles.vehicleTypes}>
              {VEHICLE_TYPES.map((vehicle) => {
                const selected = form.vehicleType === vehicle.name;

                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      styles.optionCard,
                      selected && styles.optionCardActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => updateForm("vehicleType", vehicle.name)}
                  >
                    <View
                      style={[styles.radio, selected && styles.radioActive]}
                    >
                      {selected && <View style={styles.radioInner} />}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>{vehicle.name}</Text>
                      <Text style={styles.optionDescription}>
                        {vehicle.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {renderInput(
              "VIN / Chassis Number",
              "vin",
              "Enter VIN or chassis number",
              { autoCapitalize: "characters" }
            )}

            {renderInput("Engine Number", "engineNumber", "Enter engine number", {
              autoCapitalize: "characters",
            })}

            <View style={styles.twoColumn}>
              <View style={styles.column}>
                {renderInput("Make", "make", "Toyota")}
              </View>
              <View style={styles.column}>
                {renderInput("Model", "model", "Corolla")}
              </View>
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.column}>
                {renderInput("Year", "year", "2020", {
                  keyboardType: "numeric",
                  maxLength: 4,
                })}
              </View>
              <View style={styles.column}>
                {renderInput("Colour", "colour", "White")}
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionNumber}>
                  <Text style={styles.sectionNumberText}>C</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeader}>Supporting Documents</Text>
                  <Text style={styles.sectionDescription}>
                    {resubmitMode
                      ? "Replace only the documents that need correcting."
                      : "Attach the supporting documentation for this application."}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.documentNotice}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color={COLORS.primary}
                />
                <Text style={styles.documentNoticeText}>
                  Documents must be clear, complete and readable. Only upload
                  documents belonging to this application.
                </Text>
              </View>

              {renderDocumentUpload(
                "Identity Document",
                "idCopy",
                "Copy of the applicant's identity document."
              )}

              {renderDocumentUpload(
                "Proof of Residence",
                "proofOfResidence",
                "Recent document confirming the applicant's address."
              )}

              {renderDocumentUpload(
                "Proof of Ownership",
                "proofOfOwnership",
                "Proof of ownership, purchase or transfer of the vehicle."
              )}

              {renderDocumentUpload(
                "Police Clearance Certificate",
                "policeClearance",
                "Police clearance documentation where applicable."
              )}

              {renderDocumentUpload(
                "Roadworthy Certificate",
                "roadworthy",
                "Valid roadworthiness documentation where required."
              )}
            </View>

            <View style={[styles.card, styles.summaryCard]}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="clipboard-outline"
                  size={21}
                  color={COLORS.primary}
                />
                <Text style={styles.summaryTitle}>Application Summary</Text>
              </View>

              <SummaryRow
                label="Applicant"
                value={form.fullName || "Not provided"}
              />

              <SummaryRow
                label="Vehicle"
                value={
                  form.make && form.model
                    ? `${form.make} ${form.model}`
                    : "Not provided"
                }
              />

              <SummaryRow
                label="Vehicle Type"
                value={form.vehicleType || "Not selected"}
              />

              <SummaryRow
                label="Vehicle Year"
                value={form.year || "Not provided"}
              />
            </View>
          </>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={handleBack}
            disabled={submitting}
          >
            <Ionicons
              name={step === 1 ? "close-outline" : "arrow-back-outline"}
              size={19}
              color={COLORS.text}
            />
            <Text style={styles.secondaryButtonText}>
              {step === 1 ? "Cancel" : "Previous"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              submitting && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={submitting}
            onPress={handleNext}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {step === 3
                    ? resubmitMode
                      ? "Resubmit Application"
                      : "Submit Application"
                    : "Continue"}
                </Text>
                <Ionicons
                  name={step === 3 ? "checkmark" : "arrow-forward"}
                  size={19}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Ionicons
            name="lock-closed-outline"
            size={15}
            color={COLORS.textLight}
          />
          <Text style={styles.footerText}>
            Submission does not constitute final registration approval.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  loadingDescription: {
    marginTop: 7,
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },
  departmentMark: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  departmentTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.primary,
  },
  departmentSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
  },
  title: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 5,
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 19,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 19,
  },
  progressCircle: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#E7EBEF",
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleActive: {
    backgroundColor: COLORS.primary,
  },
  progressNumber: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "800",
  },
  progressNumberActive: {
    color: "#FFFFFF",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#DCE2E7",
    marginHorizontal: 6,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    marginTop: 8,
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "700",
  },
  container: {
    padding: 15,
    paddingBottom: 35,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 9,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    marginLeft: 9,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
  reasonBanner: {
    backgroundColor: COLORS.softRed,
    borderWidth: 1,
    borderColor: "#FECDCA",
    borderRadius: 9,
    padding: 12,
    marginBottom: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  sectionNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  sectionDescription: {
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    color: COLORS.text,
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },
  column: {
    flex: 1,
  },
  vehicleTypes: {
    marginTop: 8,
    marginBottom: 13,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    marginBottom: 9,
    backgroundColor: "#FFFFFF",
  },
  optionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.softBlue,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#B8C2CB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  radioActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  optionDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
    lineHeight: 16,
  },
  documentNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    padding: 11,
    borderRadius: 8,
    marginBottom: 17,
  },
  documentNoticeText: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 17,
  },
  documentGroup: {
    marginBottom: 19,
  },
  documentLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  documentDescription: {
    color: COLORS.textLight,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  uploadBox: {
    minHeight: 63,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B8CBD9",
    borderRadius: 8,
    paddingHorizontal: 11,
    backgroundColor: "#FAFCFD",
  },
  uploadTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  uploadHint: {
    color: COLORS.textLight,
    fontSize: 10,
    marginTop: 3,
  },
  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B8DEC9",
    backgroundColor: COLORS.softGreen,
    padding: 10,
    borderRadius: 8,
  },
  savedFilePreview: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7DDED",
    backgroundColor: COLORS.softBlue,
    padding: 10,
    borderRadius: 8,
  },
  fileInformation: {
    flex: 1,
    marginLeft: 9,
  },
  fileName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  fileStatus: {
    color: COLORS.success,
    fontSize: 10,
    marginTop: 3,
    fontWeight: "600",
  },
  savedFileStatus: {
    color: COLORS.primary,
    fontSize: 10,
    marginTop: 3,
    fontWeight: "600",
  },
  removeButton: {
    marginLeft: 8,
    padding: 5,
  },
  replaceButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },
  replaceButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryCard: {
    marginTop: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },
  summaryTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryLabel: {
    color: COLORS.textLight,
    fontSize: 12,
  },
  summaryValue: {
    flex: 1,
    textAlign: "right",
    marginLeft: 15,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 15,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 2,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginTop: 17,
    paddingHorizontal: 10,
  },
  footerText: {
    flex: 1,
    marginLeft: 7,
    color: COLORS.textLight,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },

  // ---- Status screen ----
  confirmationContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  confirmationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  confirmationIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  confirmationEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: COLORS.primary,
    textAlign: "center",
  },
  confirmationTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 8,
  },
  confirmationDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  tracker: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 24,
  },
  trackerStep: {
    alignItems: "center",
    width: 74,
  },
  trackerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E7EBEF",
    alignItems: "center",
    justifyContent: "center",
  },
  trackerDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  trackerLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textLight,
    textAlign: "center",
  },
  trackerLabelOn: {
    color: COLORS.text,
  },
  trackerLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#DCE2E7",
    marginTop: 11,
  },
  rejectionPanel: {
    marginTop: 12,
    padding: 15,
    borderRadius: 12,
    backgroundColor: COLORS.softRed,
    borderWidth: 1,
    borderColor: "#FECDCA",
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
  },
  rejectionTitle: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: "800",
  },
  rejectionDescription: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  statusSummaryCard: {
    marginTop: 12,
    paddingBottom: 8,
  },
  nextCard: {
    marginTop: 12,
  },
  nextStepsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 13,
  },
  nextStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginBottom: 12,
  },
  nextStepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textLight,
  },
  confirmationPrimaryButton: {
    width: "100%",
    minHeight: 51,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 16,
  },
  confirmationPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  outlineButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  confirmationSecondaryButton: {
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  confirmationSecondaryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textLight,
  },
  confirmationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
  },
  confirmationFooterText: {
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
