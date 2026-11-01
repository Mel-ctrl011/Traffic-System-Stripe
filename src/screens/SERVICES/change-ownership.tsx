import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { useNavigation } from "@react-navigation/native";

import { db, storage } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

/* =========================================================
   COLOURS
========================================================= */

const COLORS = {
  primary: "#0B4F8A",
  primaryDark: "#083B68",
  background: "#F3F5F7",
  text: "#17212B",
  textLight: "#66737F",
  border: "#D9E0E6",
  success: "#18794E",
  warning: "#A16207",
  card: "#FFFFFF",
  error: "#B42318",
  softBlue: "#EAF3FA",
  softGreen: "#ECFDF3",
  softYellow: "#FFF8E6",
};

type UploadedFile = {
  name: string;
  uri: string;
  size: number;
  mimeType?: string;
};

type OwnershipForm = {
  newOwnerId: string;
  newOwnerName: string;
  newOwnerPhone: string;
  newOwnerStreet: string;
  newOwnerSuburb: string;
  newOwnerCity: string;
  newOwnerProvince: string;
  newOwnerPostalCode: string;
  transferReason: string;
};

type OwnershipDocuments = {
  buyerIdCopy: UploadedFile | null;
  proofOfOwnership: UploadedFile | null;
  saleAgreement: UploadedFile | null;
  vehicleLicence: UploadedFile | null;
};

type Vehicle = {
  vehicleId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  vin: string;
  engineNumber: string;
  licenceDisk?: {
    number: string;
    expiryDate: string;
    status: string;
  };
  ownership?: {
    owner: boolean;
    financed: boolean;
  };
  stolen?: boolean;
};

type ExistingApplication = {
  id: string;
  applicationId?: string;
  type: string;
  status: string;
  vehicle?: {
    make?: string;
    model?: string;
    registrationNumber?: string;
    vehicleId?: string;
  };
  createdAt?: any;
  updatedAt?: any;
  review?: {
    notes?: string | null;
    reviewedAt?: any;
  };
};

const EMPTY_FORM: OwnershipForm = {
  newOwnerId: "",
  newOwnerName: "",
  newOwnerPhone: "",
  newOwnerStreet: "",
  newOwnerSuburb: "",
  newOwnerCity: "",
  newOwnerProvince: "",
  newOwnerPostalCode: "",
  transferReason: "",
};

const EMPTY_DOCUMENTS: OwnershipDocuments = {
  buyerIdCopy: null,
  proofOfOwnership: null,
  saleAgreement: null,
  vehicleLicence: null,
};

const TRANSFER_REASONS = [
  {
    id: "sale",
    title: "Sale / Purchase",
    description: "Vehicle purchased from the current owner.",
  },
  {
    id: "donation",
    title: "Donation",
    description: "Vehicle transferred as a gift or donation.",
  },
  {
    id: "inheritance",
    title: "Inheritance",
    description: "Vehicle transferred following an inheritance.",
  },
  {
    id: "other",
    title: "Other",
    description: "Another valid reason for ownership change.",
  },
];

const createApplicationReference = () =>
  `OWN-${new Date().getFullYear()}-${Math.floor(
    10000 + Math.random() * 90000
  )}`;

const getFileExtension = (name: string) => {
  const parts = name.split(".");
  return parts.length > 1
    ? parts[parts.length - 1].toLowerCase()
    : "file";
};

const uploadApplicationDocument = async (
  file: UploadedFile,
  applicationId: string,
  documentType: string
) => {
  const response = await fetch(file.uri);

  if (!response.ok) {
    throw new Error(`Unable to read ${file.name}`);
  }

  const blob = await response.blob();
  const extension = getFileExtension(file.name);
  const storagePath =
    `applications/${applicationId}/documents/${documentType}.${extension}`;

  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: file.mimeType || "application/octet-stream",
  });

  const downloadURL = await getDownloadURL(storageRef);

  return {
    name: file.name,
    storagePath,
    downloadURL,
    size: file.size,
    contentType: file.mimeType || null,
  };
};

const getApplicationDate = (value: any): string => {
  if (!value) return "Date unavailable";

  try {
    const date = typeof value.toDate === "function"
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Date unavailable";
  }
};

const normalizeStatus = (status?: string) =>
  (status || "Submitted").trim();

// An application is "decided" once an administrator approved or rejected it.
const isDecided = (status?: string) =>
  ["approved", "rejected"].includes((status || "").trim().toLowerCase());

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
      return COLORS.success;
    case "rejected":
      return COLORS.error;
    case "under review":
    case "under_review":
      return COLORS.warning;
    default:
      return COLORS.primary;
  }
};

export default function ChangeOwnershipScreen() {
  const navigation = useNavigation<any>();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Existing-application tracking
  const [checkingApplication, setCheckingApplication] = useState(true);
  const [checkError, setCheckError] = useState(false);
  const [existingApplication, setExistingApplication] =
    useState<ExistingApplication | null>(null);

  // True while the citizen is filling in a fresh application
  // after a previous one was approved or rejected.
  const [startingNew, setStartingNew] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedVehicleId, setSelectedVehicleId] =
    useState<string | null>(null);

  const [form, setForm] = useState<OwnershipForm>(EMPTY_FORM);
  const [documents, setDocuments] =
    useState<OwnershipDocuments>(EMPTY_DOCUMENTS);

  const ownedVehicles = useMemo(() => {
    if (!user?.vehicles) return [];

    return user.vehicles.filter(
      (vehicle: Vehicle) =>
        vehicle.ownership?.owner === true &&
        vehicle.stolen !== true
    ) as Vehicle[];
  }, [user]);

  const selectedVehicle = useMemo(
    () =>
      ownedVehicles.find(
        (vehicle) => vehicle.vehicleId === selectedVehicleId
      ) || null,
    [ownedVehicles, selectedVehicleId]
  );

  /*
   * LIVE LISTENER FOR THE CITIZEN'S OWNERSHIP APPLICATIONS
   *
   * New records are matched using userId.
   * Legacy records are also matched using submittedBy.
   * Admin decisions made on the dashboard appear here automatically.
   */
  const checkExistingApplication = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setExistingApplication(null);
      setCheckingApplication(false);
      return;
    }

    setCheckingApplication(true);
    setCheckError(false);

    const sources: Record<string, ExistingApplication[]> = {};

    const publish = () => {
      const merged = new Map<string, ExistingApplication>();

      Object.values(sources)
        .flat()
        .forEach((record) => merged.set(record.id, record));

      const list = Array.from(merged.values()).sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

      setExistingApplication(list[0] || null);
      setCheckingApplication(false);
    };

    const listen = (key: string, applicationsQuery: any) =>
      onSnapshot(
        applicationsQuery,
        (snapshot: any) => {
          sources[key] = snapshot.docs
            .map((item: any) => ({
              id: item.id,
              ...item.data({ serverTimestamps: "estimate" }),
            }))
            .filter((record: any) => record.type === "ownership_transfer");

          publish();
        },
        (error: any) => {
          console.log("Ownership application listener error:", error);
          setCheckError(true);
          setCheckingApplication(false);
        }
      );

    const unsubscribers: Array<() => void> = [];

    if (user.id) {
      unsubscribers.push(
        listen(
          "userId",
          query(
            collection(db, "applications"),
            where("userId", "==", user.id)
          )
        )
      );
    }

    // Backward compatibility with applications created
    // before userId tracking was added.
    if (user.idNumber) {
      unsubscribers.push(
        listen(
          "submittedBy",
          query(
            collection(db, "applications"),
            where("submittedBy", "==", user.idNumber)
          )
        )
      );
    }

    if (unsubscribers.length === 0) {
      setExistingApplication(null);
      setCheckingApplication(false);
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [authLoading, user, reloadKey]);

  const updateForm = (
    field: keyof OwnershipForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const pickDocument = async (
    documentType: keyof OwnershipDocuments
  ) => {
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
          mimeType: asset.mimeType,
        },
      }));
    } catch (error) {
      console.log("Document picker error:", error);

      Alert.alert(
        "Document Error",
        "The document could not be selected. Please try again."
      );
    }
  };

  const removeDocument = (
    documentType: keyof OwnershipDocuments
  ) => {
    setDocuments((previous) => ({
      ...previous,
      [documentType]: null,
    }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!selectedVehicle) {
        Alert.alert(
          "Select a Vehicle",
          "Please select one of your vehicles before continuing."
        );
        return false;
      }

      if (!form.transferReason) {
        Alert.alert(
          "Select Transfer Reason",
          "Please select the reason for the ownership change."
        );
        return false;
      }

      return true;
    }

    if (step === 2) {
      if (
        !form.newOwnerId.trim() ||
        !form.newOwnerName.trim() ||
        !form.newOwnerPhone.trim() ||
        !form.newOwnerStreet.trim() ||
        !form.newOwnerSuburb.trim() ||
        !form.newOwnerCity.trim() ||
        !form.newOwnerProvince.trim() ||
        !form.newOwnerPostalCode.trim()
      ) {
        Alert.alert(
          "Incomplete New Owner Details",
          "Please complete all required new-owner information."
        );
        return false;
      }

      if (!/^\d{13}$/.test(form.newOwnerId.trim())) {
        Alert.alert(
          "Invalid ID Number",
          "The new owner's ID number must contain exactly 13 digits."
        );
        return false;
      }

      return true;
    }

    if (step === 3) {
      if (
        !documents.buyerIdCopy ||
        !documents.proofOfOwnership ||
        !documents.vehicleLicence
      ) {
        Alert.alert(
          "Required Documents Missing",
          "Please upload the required documents before continuing."
        );
        return false;
      }

      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 4) setStep((previous) => previous + 1);
  };

  const handleBack = () => {
    if (submitting) return;

    if (step > 1) {
      setStep((previous) => previous - 1);
    } else if (startingNew && existingApplication) {
      // Return to the previous application's result screen.
      setStartingNew(false);
    } else {
      navigation.goBack();
    }
  };

  // Clears the form and opens a fresh application.
  const beginNewApplication = () => {
    setForm(EMPTY_FORM);
    setDocuments(EMPTY_DOCUMENTS);
    setSelectedVehicleId(null);
    setStep(1);
    setStartingNew(true);
  };

  /*
   * SUBMIT APPLICATION
   *
   * The identity fields are saved alongside the existing
   * submittedBy field. Existing vehicle and document fields
   * remain in place.
   */
  const handleSubmit = async () => {
    if (submitting) return;

    if (!user) {
      Alert.alert(
        "Session Required",
        "Please sign in again before submitting your application."
      );
      return;
    }

    if (!selectedVehicle) {
      Alert.alert("Vehicle Required", "Please select a vehicle.");
      return;
    }

    if (checkingApplication) {
      Alert.alert(
        "Please Wait",
        "We are checking your existing applications."
      );
      return;
    }

    if (checkError) {
      Alert.alert(
        "Unable to Verify",
        "We could not check your existing applications. Please try again before submitting."
      );
      return;
    }

    // Block a new application only while the last one is still undecided.
    if (existingApplication && !isDecided(existingApplication.status)) {
      Alert.alert(
        "Application Already Exists",
        "You already have an ownership-transfer application awaiting a decision."
      );
      return;
    }

    let applicationRef: any = null;

    try {
      setSubmitting(true);

      const applicationReference = createApplicationReference();

      applicationRef = await addDoc(
        collection(db, "applications"),
        {
          applicationId: applicationReference,
          type: "ownership_transfer",

          // Identity tracking for future visits.
          userId: user.id || null,
          citizenId: user.id || null,
          createdBy: user.id || null,

          // Kept for compatibility with existing records.
          submittedBy: user.idNumber || null,

          status: "Submitted",

          vehicle: {
            vehicleId: selectedVehicle.vehicleId,
            registrationNumber: selectedVehicle.registrationNumber,
            vin: selectedVehicle.vin,
            engineNumber: selectedVehicle.engineNumber,
            make: selectedVehicle.make,
            model: selectedVehicle.model,
            year: selectedVehicle.year,
            colour: selectedVehicle.colour,
            licenceDisk: selectedVehicle.licenceDisk || null,
          },

          currentOwner: {
            citizenId: user.id || null,
            fullName: user.fullName || "",
            idNumber: user.idNumber || "",
            phone: user.phone || "",
            address: user.address || null,
          },

          newOwner: {
            citizenId: null,
            fullName: form.newOwnerName.trim(),
            idNumber: form.newOwnerId.trim(),
            phone: form.newOwnerPhone.trim(),
            address: {
              street: form.newOwnerStreet.trim(),
              suburb: form.newOwnerSuburb.trim(),
              city: form.newOwnerCity.trim(),
              province: form.newOwnerProvince.trim(),
              postalCode: form.newOwnerPostalCode.trim(),
            },
          },

          transferReason: form.transferReason,
          documents: {},

          review: {
            reviewedBy: null,
            reviewedAt: null,
            notes: null,
          },

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      const documentEntries: Record<string, any> = {};

      if (documents.buyerIdCopy) {
        documentEntries.buyerIdCopy =
          await uploadApplicationDocument(
            documents.buyerIdCopy,
            applicationRef.id,
            "buyer-id"
          );
      }

      if (documents.proofOfOwnership) {
        documentEntries.proofOfOwnership =
          await uploadApplicationDocument(
            documents.proofOfOwnership,
            applicationRef.id,
            "proof-of-ownership"
          );
      }

      if (documents.saleAgreement) {
        documentEntries.saleAgreement =
          await uploadApplicationDocument(
            documents.saleAgreement,
            applicationRef.id,
            "sale-agreement"
          );
      }

      if (documents.vehicleLicence) {
        documentEntries.vehicleLicence =
          await uploadApplicationDocument(
            documents.vehicleLicence,
            applicationRef.id,
            "vehicle-licence"
          );
      }

      await updateDoc(applicationRef, {
        documents: documentEntries,
        updatedAt: serverTimestamp(),
      });

      // Immediately show the tracked application.
      // The live listener keeps it up to date afterwards.
      setExistingApplication({
        id: applicationRef.id,
        applicationId: applicationReference,
        type: "ownership_transfer",
        status: "Submitted",
        vehicle: {
          vehicleId: selectedVehicle.vehicleId,
          registrationNumber: selectedVehicle.registrationNumber,
          make: selectedVehicle.make,
          model: selectedVehicle.model,
        },
      });

      setStartingNew(false);
      setStep(1);
      setForm(EMPTY_FORM);
      setDocuments(EMPTY_DOCUMENTS);
      setSelectedVehicleId(null);

      Alert.alert(
        "Application Submitted",
        `Your ownership-transfer application has been submitted successfully.\n\nReference:\n${applicationReference}`,
        [
          {
            text: "View Application History",
            onPress: () =>
              navigation.navigate("ApplicationHistory"),
          },
          {
            text: "Done",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.log("Ownership application error:", error);

      /*
       * If the Firestore record was created but a document
       * upload failed, keep the record in Firestore. Tell the
       * citizen to retry/check the application rather than
       * creating another record automatically.
       */
      if (applicationRef) {
        setCheckError(true);
      }

      Alert.alert(
        "Submission Unsuccessful",
        applicationRef
          ? "The application record was created, but one or more documents may not have uploaded. Please check your application history before trying again."
          : "We could not submit your application. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     SHARED UI HELPERS
  ========================================================= */

  const SummaryRow = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>
        {value || "Not provided"}
      </Text>
    </View>
  );

  const renderDocumentUpload = (
    label: string,
    documentType: keyof OwnershipDocuments,
    description: string,
    required = true
  ) => {
    const file = documents[documentType];

    return (
      <View style={styles.documentGroup} key={documentType}>
        <View style={styles.documentHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.documentLabel}>{label}</Text>
            <Text style={styles.documentDescription}>
              {description}
            </Text>
          </View>

          {required && (
            <Text style={styles.requiredBadge}>REQUIRED</Text>
          )}
        </View>

        {!file ? (
          <TouchableOpacity
            style={styles.uploadBox}
            activeOpacity={0.8}
            onPress={() => pickDocument(documentType)}
          >
            <View style={styles.uploadIcon}>
              <Ionicons
                name="document-attach-outline"
                size={23}
                color={COLORS.primary}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.uploadTitle}>
                Select document
              </Text>
              <Text style={styles.uploadHint}>
                PDF, JPG or PNG
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.filePreview}>
            <View style={styles.fileIcon}>
              <Ionicons
                name="checkmark"
                size={20}
                color={COLORS.success}
              />
            </View>

            <View style={styles.fileInformation}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileStatus}>
                Document attached
              </Text>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeDocument(documentType)}
            >
              <Ionicons
                name="trash-outline"
                size={19}
                color={COLORS.error}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderNotice = (message: string) => (
    <View style={styles.noticeBox}>
      <Ionicons
        name="information-circle-outline"
        size={21}
        color={COLORS.primary}
      />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (authLoading || checkingApplication) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />
          <Text style={styles.loadingText}>
            {authLoading
              ? "Loading your citizen profile..."
              : "Checking your ownership applications..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =========================================================
     NO USER
  ========================================================= */

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="person-circle-outline"
            size={58}
            color={COLORS.textLight}
          />
          <Text style={styles.emptyTitle}>
            Session unavailable
          </Text>
          <Text style={styles.emptyText}>
            Please sign in again to continue.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =========================================================
     LOOKUP ERROR
  ========================================================= */

  if (checkError && !existingApplication) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              Vehicle Ownership
            </Text>
            <Text style={styles.headerSubtitle}>
              Citizen Services
            </Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons
            name="cloud-offline-outline"
            size={52}
            color={COLORS.warning}
          />
          <Text style={styles.emptyTitle}>
            Could not check applications
          </Text>
          <Text style={styles.emptyText}>
            We need to verify whether you already have an
            ownership-transfer application before opening a
            new form.
          </Text>

          <TouchableOpacity
            style={[styles.btnPrimary, { flex: 0, paddingHorizontal: 24 }]}
            onPress={checkExistingApplication}
          >
            <Text style={styles.btnPrimaryText}>
              Try Again
            </Text>
            <Ionicons
              name="refresh"
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* =========================================================
     EXISTING APPLICATION / DECISION SCREEN
  ========================================================= */

  if (existingApplication && !startingNew) {
    const applicationStatus = normalizeStatus(
      existingApplication.status
    );
    const statusKey = applicationStatus.toLowerCase();
    const approved = statusKey === "approved";
    const rejected = statusKey === "rejected";

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              Vehicle Ownership
            </Text>
            <Text style={styles.headerSubtitle}>
              Citizen Services
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusHero}>
            <View
              style={[
                styles.statusHeroIcon,
                approved && { backgroundColor: COLORS.softGreen },
                rejected && { backgroundColor: "#FEECEC" },
              ]}
            >
              <Ionicons
                name={
                  approved
                    ? "checkmark-circle-outline"
                    : rejected
                      ? "close-circle-outline"
                      : "document-text-outline"
                }
                size={38}
                color={
                  approved
                    ? COLORS.success
                    : rejected
                      ? COLORS.error
                      : COLORS.primary
                }
              />
            </View>

            <Text style={styles.statusHeroTitle}>
              {approved
                ? "Transfer Successful"
                : rejected
                  ? "Transfer Rejected"
                  : "Ownership Application Submitted"}
            </Text>

            <Text style={styles.statusHeroDescription}>
              {approved
                ? "Your ownership-transfer application was successful."
                : rejected
                  ? "Your application was not successful. Please read the reason below, then submit a new application."
                  : "Your application is saved against your citizen profile and is waiting for administrative review."}
            </Text>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: approved
                    ? COLORS.softGreen
                    : rejected
                      ? "#FEECEC"
                      : COLORS.softBlue,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(applicationStatus) },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(applicationStatus) },
                ]}
              >
                {applicationStatus}
              </Text>
            </View>
          </View>

          {rejected && (
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                Reason for Rejection
              </Text>
              <View style={styles.reviewNotes}>
                <Text style={[styles.noticeText, { marginLeft: 0 }]}>
                  {existingApplication.review?.notes ||
                    "No reason has been provided yet. Please contact the relevant department for more information."}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>
              Application Details
            </Text>
            <Text style={styles.sectionDescription}>
              Your saved ownership-transfer request.
            </Text>

            <View style={styles.divider} />

            <SummaryRow
              label="Reference"
              value={
                existingApplication.applicationId ||
                existingApplication.id
              }
            />

            <SummaryRow
              label="Application Type"
              value="Change Vehicle Ownership"
            />

            <SummaryRow
              label="Vehicle"
              value={
                existingApplication.vehicle
                  ? `${existingApplication.vehicle.make || ""} ${
                      existingApplication.vehicle.model || ""
                    }`.trim() || "Vehicle details saved"
                  : "Vehicle details saved"
              }
            />

            <SummaryRow
              label="Registration"
              value={
                existingApplication.vehicle?.registrationNumber ||
                "Not available"
              }
            />

            <SummaryRow
              label="Submitted"
              value={getApplicationDate(
                existingApplication.createdAt
              )}
            />

            <SummaryRow
              label="Current Status"
              value={applicationStatus}
            />
          </View>

          {!isDecided(existingApplication.status) && (
            <View style={styles.noticeBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={COLORS.primary}
              />
              <Text style={styles.noticeText}>
                Your application will be reviewed before any
                ownership information is changed. This screen
                updates automatically when a decision is made.
              </Text>
            </View>
          )}

          {isDecided(existingApplication.status) && (
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.8}
              onPress={beginNewApplication}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.btnPrimaryText}>
                Start New Application
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.btnPrimary,
              isDecided(existingApplication.status) && {
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.primary,
              },
            ]}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("ApplicationHistory")
            }
          >
            <Text
              style={[
                styles.btnPrimaryText,
                isDecided(existingApplication.status) && {
                  color: COLORS.primary,
                },
              ]}
            >
              View Application History
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={
                isDecided(existingApplication.status)
                  ? COLORS.primary
                  : "#FFFFFF"
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.8}
            onPress={checkExistingApplication}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={COLORS.text}
            />
            <Text style={styles.btnSecondaryText}>
              Refresh Status
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* =========================================================
     NEW APPLICATION FORM
  ========================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          disabled={submitting}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={COLORS.text}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Vehicle Ownership
          </Text>
          <Text style={styles.headerSubtitle}>
            Citizen Services
          </Text>
        </View>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.title}>
          Change Vehicle Ownership
        </Text>
        <Text style={styles.subtitle}>
          Submit a request to transfer the registered ownership
          of one of your vehicles.
        </Text>

        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((item) => (
            <React.Fragment key={item}>
              <View
                style={[
                  styles.progressCircle,
                  step >= item && styles.progressCircleActive,
                ]}
              >
                {step > item ? (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#FFFFFF"
                  />
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

              {item < 4 && (
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
          Step {step} of 4
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            {renderNotice(
              "Select a vehicle already registered to you. Your current-owner information will be taken from your citizen profile."
            )}

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                Select Vehicle
              </Text>
              <Text style={styles.sectionDescription}>
                Only vehicles currently owned by you are shown.
              </Text>
              <View style={styles.divider} />

              {ownedVehicles.length === 0 ? (
                <View style={styles.emptyVehicle}>
                  <Ionicons
                    name="car-outline"
                    size={42}
                    color={COLORS.textLight}
                  />
                  <Text style={styles.emptyTitle}>
                    No eligible vehicles
                  </Text>
                  <Text style={styles.emptyText}>
                    You currently have no vehicle available for
                    an ownership transfer.
                  </Text>
                </View>
              ) : (
                ownedVehicles.map((vehicle) => {
                  const selected =
                    selectedVehicleId === vehicle.vehicleId;

                  return (
                    <TouchableOpacity
                      key={vehicle.vehicleId}
                      style={[
                        styles.vehicleCard,
                        selected && styles.vehicleCardActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() =>
                        setSelectedVehicleId(vehicle.vehicleId)
                      }
                    >
                      <View style={styles.vehicleIcon}>
                        <Ionicons
                          name="car-sport-outline"
                          size={25}
                          color={COLORS.primary}
                        />
                      </View>

                      <View style={styles.vehicleInformation}>
                        <Text style={styles.vehicleTitle}>
                          {vehicle.make} {vehicle.model}
                        </Text>
                        <Text style={styles.vehicleRegistration}>
                          {vehicle.registrationNumber}
                        </Text>
                        <Text style={styles.vehicleMeta}>
                          {vehicle.year} • {vehicle.colour} • VIN{" "}
                          {vehicle.vin}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radio,
                          selected && styles.radioActive,
                        ]}
                      >
                        {selected && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {selectedVehicle && (
                <>
                  <Text style={styles.label}>
                    Reason for Ownership Change *
                  </Text>

                  {TRANSFER_REASONS.map((reason) => {
                    const selected =
                      form.transferReason === reason.id;

                    return (
                      <TouchableOpacity
                        key={reason.id}
                        style={[
                          styles.reasonCard,
                          selected && styles.reasonCardActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() =>
                          updateForm("transferReason", reason.id)
                        }
                      >
                        <View
                          style={[
                            styles.radio,
                            selected && styles.radioActive,
                          ]}
                        >
                          {selected && (
                            <View style={styles.radioInner} />
                          )}
                        </View>

                        <View style={styles.reasonInformation}>
                          <Text style={styles.reasonTitle}>
                            {reason.title}
                          </Text>
                          <Text style={styles.reasonDescription}>
                            {reason.description}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            {renderNotice(
              "Your current-owner details are taken from your citizen profile. Enter the new owner's details below."
            )}

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                Current Owner
              </Text>
              <View style={styles.divider} />

              <SummaryRow
                label="Full Name"
                value={user.fullName || "Not available"}
              />
              <SummaryRow
                label="ID Number"
                value={user.idNumber || "Not available"}
              />
              <SummaryRow
                label="Phone"
                value={user.phone || "Not available"}
              />
              <SummaryRow
                label="Address"
                value={
                  user.address
                    ? [
                        user.address.street,
                        user.address.suburb,
                        user.address.city,
                      ].filter(Boolean).join(", ")
                    : "Not available"
                }
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                New Owner
              </Text>
              <Text style={styles.sectionDescription}>
                Enter the details of the person who will receive
                the vehicle.
              </Text>
              <View style={styles.divider} />

              <Text style={styles.label}>ID Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="13 digit ID number"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                maxLength={13}
                value={form.newOwnerId}
                onChangeText={(value) =>
                  updateForm("newOwnerId", value.replace(/\D/g, ""))
                }
              />

              <Text style={styles.label}>Full Names *</Text>
              <TextInput
                style={styles.input}
                placeholder="As reflected on ID"
                placeholderTextColor={COLORS.textLight}
                value={form.newOwnerName}
                onChangeText={(value) =>
                  updateForm("newOwnerName", value)
                }
              />

              <Text style={styles.label}>Contact Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 082 123 4567"
                placeholderTextColor={COLORS.textLight}
                keyboardType="phone-pad"
                value={form.newOwnerPhone}
                onChangeText={(value) =>
                  updateForm("newOwnerPhone", value)
                }
              />

              <Text style={styles.label}>
                Residential Address *
              </Text>

              {([
                ["Street", "newOwnerStreet"],
                ["Suburb", "newOwnerSuburb"],
                ["City", "newOwnerCity"],
                ["Province", "newOwnerProvince"],
                ["Postal Code", "newOwnerPostalCode"],
              ] as const).map(([label, field]) => (
                <TextInput
                  key={field}
                  style={[styles.input, styles.addressInput]}
                  placeholder={label}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType={
                    field === "newOwnerPostalCode"
                      ? "numeric"
                      : "default"
                  }
                  value={form[field]}
                  onChangeText={(value) =>
                    updateForm(field, value)
                  }
                />
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>
              Supporting Documents
            </Text>
            <Text style={styles.sectionDescription}>
              Upload documents required to support the ownership
              transfer.
            </Text>
            <View style={styles.divider} />

            {renderNotice(
              "Documents must be clear and readable. PDF, JPG and PNG files are accepted."
            )}

            {renderDocumentUpload(
              "New Owner ID Copy",
              "buyerIdCopy",
              "Identity document belonging to the new owner."
            )}

            {renderDocumentUpload(
              "Proof of Ownership",
              "proofOfOwnership",
              "Document supporting the ownership transaction."
            )}

            {renderDocumentUpload(
              "Sale Agreement / Transfer Document",
              "saleAgreement",
              "Required where applicable.",
              false
            )}

            {renderDocumentUpload(
              "Vehicle Licence / Licence Disc",
              "vehicleLicence",
              "Copy of the current vehicle licence documentation."
            )}
          </View>
        )}

        {step === 4 && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                Review Application
              </Text>
              <Text style={styles.sectionDescription}>
                Check everything before submitting your request.
              </Text>
              <View style={styles.divider} />

              <Text style={styles.reviewSectionTitle}>
                Vehicle
              </Text>
              <SummaryRow
                label="Vehicle"
                value={
                  selectedVehicle
                    ? `${selectedVehicle.make} ${selectedVehicle.model}`
                    : ""
                }
              />
              <SummaryRow
                label="Registration"
                value={selectedVehicle?.registrationNumber || ""}
              />
              <SummaryRow
                label="VIN"
                value={selectedVehicle?.vin || ""}
              />
              <SummaryRow
                label="Reason"
                value={
                  TRANSFER_REASONS.find(
                    (item) => item.id === form.transferReason
                  )?.title || ""
                }
              />

              <Text style={styles.reviewSectionTitle}>
                Current Owner
              </Text>
              <SummaryRow
                label="Name"
                value={user.fullName || ""}
              />
              <SummaryRow
                label="ID"
                value={user.idNumber || ""}
              />

              <Text style={styles.reviewSectionTitle}>
                New Owner
              </Text>
              <SummaryRow
                label="Name"
                value={form.newOwnerName}
              />
              <SummaryRow
                label="ID"
                value={form.newOwnerId}
              />
              <SummaryRow
                label="Phone"
                value={form.newOwnerPhone}
              />
              <SummaryRow
                label="Address"
                value={[
                  form.newOwnerStreet,
                  form.newOwnerSuburb,
                  form.newOwnerCity,
                  form.newOwnerProvince,
                  form.newOwnerPostalCode,
                ].filter(Boolean).join(", ")}
              />

              <Text style={styles.reviewSectionTitle}>
                Documents
              </Text>
              {Object.entries(documents).map(([key, file]) => (
                <SummaryRow
                  key={key}
                  label={key}
                  value={file ? file.name : "Not attached"}
                />
              ))}
            </View>

            <View style={styles.declarationBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={COLORS.primary}
              />
              <Text style={styles.declarationText}>
                By submitting this application, you confirm that
                the information provided is accurate and that
                the supporting documents are valid.
              </Text>
            </View>
          </>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.8}
            disabled={submitting}
            onPress={handleBack}
          >
            <Ionicons
              name={step === 1 ? "close-outline" : "arrow-back-outline"}
              size={18}
              color={COLORS.text}
            />
            <Text style={styles.btnSecondaryText}>
              {step === 1 ? "Cancel" : "Previous"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnPrimary,
              submitting && styles.btnPrimaryDisabled,
            ]}
            activeOpacity={0.8}
            disabled={submitting}
            onPress={step === 4 ? handleSubmit : handleNext}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>
                  Submitting...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.btnPrimaryText}>
                  {step === 4 ? "Submit Application" : "Continue"}
                </Text>
                <Ionicons
                  name={step === 4 ? "checkmark" : "arrow-forward"}
                  size={18}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={COLORS.textLight}
          />
          <Text style={styles.footerText}>
            Your application will be reviewed before any ownership
            information is changed. Submitting this application
            does not immediately transfer the vehicle.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 13,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textLight,
  },
  titleSection: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  title: {
    fontSize: 21,
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
    marginTop: 18,
  },
  progressCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#E7EBEF",
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleActive: {
    backgroundColor: COLORS.primary,
  },
  progressNumber: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "800",
  },
  progressNumberActive: {
    color: "#FFFFFF",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#DCE2E7",
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    marginTop: 7,
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "700",
  },
  container: {
    padding: 15,
    paddingBottom: 45,
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
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
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
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 7,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: "#FFFFFF",
  },
  addressInput: {
    marginBottom: 9,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginBottom: 10,
  },
  vehicleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.softBlue,
  },
  vehicleIcon: {
    width: 47,
    height: 47,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleInformation: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  vehicleRegistration: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  vehicleMeta: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textLight,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#B8C2CB",
    alignItems: "center",
    justifyContent: "center",
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
  reasonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    marginBottom: 9,
  },
  reasonCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.softBlue,
  },
  reasonInformation: {
    flex: 1,
    marginLeft: 11,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  reasonDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
    lineHeight: 16,
  },
  emptyVehicle: {
    alignItems: "center",
    paddingVertical: 25,
  },
  documentGroup: {
    marginBottom: 18,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 7,
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
    marginTop: 2,
    paddingRight: 5,
  },
  requiredBadge: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.primary,
    backgroundColor: COLORS.softBlue,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 7,
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
  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 7,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  uploadHint: {
    color: COLORS.textLight,
    fontSize: 10,
    marginTop: 2,
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
  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: 7,
    backgroundColor: "#D8F3E5",
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 2,
    fontWeight: "600",
  },
  removeButton: {
    marginLeft: 8,
    padding: 5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
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
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 15,
    marginBottom: 5,
  },
  declarationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softYellow,
    borderWidth: 1,
    borderColor: "#F2D58A",
    padding: 12,
    borderRadius: 9,
    marginBottom: 14,
  },
  declarationText: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 17,
  },
  actions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 2,
    marginBottom: 5,
  },
  btnSecondary: {
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
    marginBottom: 10,
  },
  btnSecondaryText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  btnPrimary: {
    flex: 2,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  btnPrimaryDisabled: {
    opacity: 0.55,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginTop: 14,
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
  statusHero: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 22,
    marginBottom: 14,
  },
  statusHeroIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  statusHeroTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  statusHeroDescription: {
    marginTop: 8,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 15,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  reviewNotes: {
    backgroundColor: COLORS.softYellow,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  reviewNotesTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
});