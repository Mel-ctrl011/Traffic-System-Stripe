import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  disableNetwork,
} from "firebase/firestore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
/* =========================================================
   TYPES
========================================================= */

type FilterType =
  | "All"
  | "Outstanding"
  | "Paid"
  | "Disputed";

type Fine = {
  id?: string;
  ticketId?: string;
  reference?: string;

  type?: string;
  category?: string;
  offence?: string;
  description?: string;

  date?: string;
  issuedAt?: string;
  offenceDate?: string;

  location?: string;
  cameraLocation?: string;

  vehicleId?: string;
  registrationNumber?: string;

  recordedSpeed?: number;
  speed?: number;
  speedLimit?: number;

  amount?: number;
  fineAmount?: number;
  outstandingAmount?: number;

  status?: string;
  paymentStatus?: string;

  dueDate?: string;

  paymentReference?: string;
  paidAt?: string | null;

  [key: string]: any;
};

/* =========================================================
   SCREEN
========================================================= */

export default function SpeedCameraTicketsScreen({
  navigation,
}: any) {
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] =
    useState<FilterType>("All");

  const [selectedFine, setSelectedFine] =
    useState<Fine | null>(null);

  const [finesFromFirestore, setFinesFromFirestore] =
    useState<Fine[]>([]);

  const [loadingFines, setLoadingFines] =
    useState(true);

  /* =====================================================
     DEBUG USER
  ===================================================== */

  console.log("======================================");
  console.log("🚦 SPEED CAMERA SCREEN");
  console.log("======================================");

  console.log("👤 USER:", user);
  console.log("🆔 USER ID:", user?.idNumber);
  console.log("👤 USER NAME:", user?.fullName);
  console.log("📱 PHONE:", user?.phone);

  /* =====================================================
     LOAD FINES FROM TOP-LEVEL fines COLLECTION
  ===================================================== */

  useEffect(() => {
    const loadFines = async () => {
      if (!user?.idNumber) {
        console.log(
          "❌ Cannot load fines: user.idNumber missing"
        );

        setFinesFromFirestore([]);
        setLoadingFines(false);
        return;
      }

      try {
        setLoadingFines(true);

        console.log(
          "🔎 Searching fines for citizenId:",
          user.idNumber
        );

        const finesQuery = query(
          collection(db, "fines"),
          where(
            "citizenId",
            "==",
            user.idNumber
          )
        );

        const snapshot =
          await getDocs(finesQuery);

        console.log(
          "📦 Firestore fines documents:",
          snapshot.size
        );

        const loadedFines: Fine[] =
          snapshot.docs.map((fineDoc) => {
            const data = fineDoc.data();

            console.log(
              "🎫 FINE FOUND:",
              fineDoc.id,
              data
            );

            return {
              id: fineDoc.id,
              ...data,
            } as Fine;
          });

        console.log(
          "======================================"
        );

        console.log(
          "🚦 SPEED CAMERA FINES LOADED:",
          loadedFines.length
        );

        console.log(
          "======================================"
        );

        setFinesFromFirestore(
          loadedFines
        );
      } catch (error) {
        console.error(
          "❌ ERROR LOADING FINES:",
          error
        );

        setFinesFromFirestore([]);
      } finally {
        setLoadingFines(false);
      }
    };

    loadFines();
  }, [user?.idNumber]);
  /* =======================================================
     READ FINES FROM AUTH USER
     
     AuthContext should load:
     
     citizens/{userId}
     
     and user.fines should contain:
     
     [
       {
         ticketId: "...",
         type: "speed_camera",
         ...
       }
     ]
  ======================================================= */

const allFines: Fine[] = useMemo(() => {
  return finesFromFirestore;
}, [finesFromFirestore]);

  /* =======================================================
     GET SPEED CAMERA FINES
  ======================================================= */

  const fines: Fine[] = useMemo(() => {
    return allFines.filter((fine) => {
      const type = String(
        fine.type ??
          fine.category ??
          fine.offence ??
          fine.description ??
          ""
      ).toLowerCase();

      return (
        type.includes("speed") ||
        type.includes("camera")
      );
    });
  }, [allFines]);

  /* =======================================================
     STATUS
  ======================================================= */

  const getStatus = (fine: Fine): FilterType => {
    const status = String(
      fine.paymentStatus ??
        fine.status ??
        ""
    ).toLowerCase();

    if (
      status.includes("paid") ||
      status.includes("settled")
    ) {
      return "Paid";
    }

    if (
      status.includes("dispute") ||
      status.includes("review")
    ) {
      return "Disputed";
    }

    return "Outstanding";
  };

  /* =======================================================
     AMOUNT
  ======================================================= */

  const getAmount = (fine: Fine): number => {
    const amount = Number(
      fine.outstandingAmount ??
        fine.fineAmount ??
        fine.amount ??
        0
    );

    return Number.isFinite(amount)
      ? amount
      : 0;
  };

  /* =======================================================
     FILTERED FINES
  ======================================================= */

  const filteredFines = useMemo(() => {
    if (activeFilter === "All") {
      return fines;
    }

    return fines.filter(
      (fine) => getStatus(fine) === activeFilter
    );
  }, [fines, activeFilter]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalTickets = fines.length;

  const outstandingTickets = fines.filter(
    (fine) => getStatus(fine) === "Outstanding"
  );

  const paidTickets = fines.filter(
    (fine) => getStatus(fine) === "Paid"
  );

  const disputedTickets = fines.filter(
    (fine) => getStatus(fine) === "Disputed"
  );

  const outstandingAmount =
    outstandingTickets.reduce(
      (total, fine) =>
        total + getAmount(fine),
      0
    );

  const paidAmount =
    paidTickets.reduce(
      (total, fine) =>
        total + getAmount(fine),
      0
    );

  /* =======================================================
     DATE
  ======================================================= */

  const formatDate = (date?: string) => {
    if (!date) {
      return "Date unavailable";
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-ZA",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /* =======================================================
     CURRENCY
  ======================================================= */

  const formatCurrency = (
    amount: number
  ) => {
    return `R ${amount.toLocaleString(
      "en-ZA",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  /* =======================================================
     REFERENCE
  ======================================================= */

  const getReference = (
    fine: Fine
  ) => {
    return (
      fine.ticketId ??
      fine.reference ??
      fine.id ??
      "Not Available"
    );
  };

  /* =======================================================
     VEHICLE REGISTRATION
  ======================================================= */

  const getRegistration = (
    fine: Fine
  ) => {
    if (fine.registrationNumber) {
      return fine.registrationNumber;
    }

    /*
     * If the fine only stores vehicleId,
     * try to find the vehicle in the citizen's
     * vehicles array.
     */

    if (
      fine.vehicleId &&
      Array.isArray(user?.vehicles)
    ) {
      const vehicle = (
        user.vehicles as any[]
      ).find(
        (item) =>
          item?.vehicleId ===
          fine.vehicleId
      );

      if (vehicle?.registrationNumber) {
        return vehicle.registrationNumber;
      }
    }

    return "Vehicle not specified";
  };

  /* =======================================================
     VEHICLE DETAILS
  ======================================================= */

  const getVehicle = (
    fine: Fine
  ) => {
    if (
      fine.vehicleId &&
      Array.isArray(user?.vehicles)
    ) {
      const vehicle = (
        user.vehicles as any[]
      ).find(
        (item) =>
          item?.vehicleId ===
          fine.vehicleId
      );

      if (vehicle) {
        return `${vehicle.make ?? ""} ${
          vehicle.model ?? ""
        }`.trim();
      }
    }

    return "Vehicle information unavailable";
  };

  /* =======================================================
     PAYMENT
     
     IMPORTANT:
     
     This does NOT mark the fine as paid.
     
     The actual payment screen/provider should
     confirm payment first.
  ======================================================= */

  const handlePayment = (
    fine: Fine
  ) => {
    const reference =
      getReference(fine);

    const amount =
      getAmount(fine);

    setSelectedFine(null);

    /*
     * If your project already has a payment
     * screen, change this route name to yours.
     */

    if (navigation?.navigate) {
      navigation.navigate(
        "TrafficFinePayment",
        {
          fineId: reference,
          ticketId: reference,
          amount,
          fine,
        }
      );

      return;
    }

    Alert.alert(
      "Payment",
      `Payment for ${reference}\n\nAmount: ${formatCurrency(
        amount
      )}\n\nConnect this button to your traffic fine payment screen.`,
      [
        {
          text: "OK",
        },
      ]
    );
  };

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <MaterialIcons
            name="check-circle-outline"
            size={42}
            color="#1565C0"
          />
        </View>

        <Text style={styles.emptyTitle}>
          No Speed Camera Tickets
        </Text>

        <Text style={styles.emptyText}>
          {activeFilter === "All"
            ? "You currently have no speed camera violations recorded on your account."
            : `You currently have no ${activeFilter.toLowerCase()} speed camera tickets.`}
        </Text>
      </View>
    );
  };

  /* =======================================================
     FINE CARD
  ======================================================= */

  const renderFineCard = (
    fine: Fine,
    index: number
  ) => {
    const status =
      getStatus(fine);

    const amount =
      getAmount(fine);

    const recordedSpeed =
      fine.recordedSpeed ??
      fine.speed;

    const speedLimit =
      fine.speedLimit;

    const isPaid =
      status === "Paid";

    const offenceDate =
      fine.date ??
      fine.issuedAt ??
      fine.offenceDate;

    return (
      <View
        key={`${getReference(
          fine
        )}-${index}`}
        style={styles.ticketCard}
      >
        {/* OFFICIAL HEADER */}

        <View style={styles.officialHeader}>
          <View
            style={
              styles.officialHeaderLeft
            }
          >
            <View
              style={
                styles.officialEmblem
              }
            >
              <MaterialIcons
                name="account-balance"
                size={20}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text
                style={
                  styles.officialCountry
                }
              >
                REPUBLIC OF SOUTH AFRICA
              </Text>

              <Text
                style={
                  styles.officialDepartment
                }
              >
                TRAFFIC ENFORCEMENT SERVICES
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.officialDocument
            }
          >
            TRAFFIC{"\n"}NOTICE
          </Text>
        </View>

        {/* REFERENCE */}

        <View
          style={
            styles.referenceSection
          }
        >
          <View>
            <Text
              style={
                styles.referenceLabel
              }
            >
              NOTICE REFERENCE
            </Text>

            <Text
              style={
                styles.referenceValue
              }
            >
              {getReference(fine)}
            </Text>
          </View>

          <StatusBadge
            status={status}
          />
        </View>

        {/* OFFICIAL LINE */}

        <View
          style={styles.officialRule}
        >
          <View
            style={styles.ruleBlue}
          />

          <View
            style={styles.ruleGold}
          />
        </View>

        {/* OFFENCE */}

        <View
          style={
            styles.offenceSection
          }
        >
          <View
            style={
              styles.offenceAccent
            }
          />

          <View
            style={
              styles.offenceContent
            }
          >
            <Text
              style={styles.fieldLabel}
            >
              OFFENCE
            </Text>

            <Text
              style={
                styles.offenceTitle
              }
            >
              {fine.offence ??
                fine.description ??
                "Speed Camera Violation"}
            </Text>

            <Text
              style={
                styles.offenceDate
              }
            >
              Recorded on{" "}
              {formatDate(
                offenceDate
              )}
            </Text>
          </View>

          <View
            style={styles.speedBadge}
          >
            <MaterialIcons
              name="speed"
              size={18}
              color="#1565C0"
            />

            <Text
              style={
                styles.speedBadgeValue
              }
            >
              {recordedSpeed !==
              undefined
                ? `${recordedSpeed}`
                : "--"}
            </Text>

            <Text
              style={
                styles.speedBadgeUnit
              }
            >
              km/h
            </Text>
          </View>
        </View>

        {/* INFORMATION GRID */}

        <View
          style={
            styles.officialInfoGrid
          }
        >
          <GovernmentInfo
            label="VEHICLE REGISTRATION"
            value={getRegistration(
              fine
            )}
          />

          <GovernmentInfo
            label="SPEED LIMIT"
            value={
              speedLimit !==
              undefined
                ? `${speedLimit} km/h`
                : "Not available"
            }
          />

          <GovernmentInfo
            label="LOCATION"
            value={
              fine.location ??
              fine.cameraLocation ??
              "Location unavailable"
            }
          />

          <GovernmentInfo
            label="OFFENCE DATE"
            value={formatDate(
              offenceDate
            )}
          />
        </View>

        {/* AMOUNT */}

        <View
          style={styles.amountSection}
        >
          <View>
            <Text
              style={
                styles.amountSectionLabel
              }
            >
              {isPaid
                ? "FINE AMOUNT"
                : "OUTSTANDING AMOUNT"}
            </Text>

            <Text
              style={
                styles.officialAmount
              }
            >
              {formatCurrency(
                amount
              )}
            </Text>
          </View>

          {!isPaid && (
            <View
              style={
                styles.paymentIndicator
              }
            >
              <MaterialIcons
                name="payments"
                size={17}
                color="#1565C0"
              />

              <Text
                style={
                  styles.paymentIndicatorText
                }
              >
                PAYMENT REQUIRED
              </Text>
            </View>
          )}
        </View>

        {/* DUE DATE */}

        {fine.dueDate &&
          !isPaid && (
            <View
              style={
                styles.officialDueDate
              }
            >
              <MaterialIcons
                name="event"
                size={19}
                color="#A15C00"
              />

              <View
                style={
                  styles.dueDateContent
                }
              >
                <Text
                  style={
                    styles.dueDateOfficialLabel
                  }
                >
                  PAYMENT DUE
                </Text>

                <Text
                  style={
                    styles.dueDateOfficialValue
                  }
                >
                  {formatDate(
                    fine.dueDate
                  )}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color="#A15C00"
              />
            </View>
          )}

        {/* ACTIONS */}

        <View
          style={
            styles.officialActions
          }
        >
          <TouchableOpacity
            style={
              styles.officialDetailsButton
            }
            onPress={() =>
              setSelectedFine(
                fine
              )
            }
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.officialDetailsText
              }
            >
              VIEW NOTICE
            </Text>

            <Ionicons
              name="chevron-forward"
              size={17}
              color="#1565C0"
            />
          </TouchableOpacity>

          {!isPaid && (
            <TouchableOpacity
              style={
                styles.officialPayButton
              }
              onPress={() =>
                handlePayment(
                  fine
                )
              }
              activeOpacity={0.85}
            >
              <MaterialIcons
                name="payments"
                size={18}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.officialPayText
                }
              >
                PAY FINE
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FOOTER */}

        <View
          style={styles.noticeFooter}
        >
          <Text
            style={
              styles.noticeFooterText
            }
          >
            TRAFFIC ENFORCEMENT
          </Text>

          <Text
            style={
              styles.noticeFooterText
            }
          >
            ELECTRONIC NOTICE
          </Text>

          <Text
            style={
              styles.noticeFooterText
            }
          >
            {getReference(fine)}
          </Text>
        </View>
      </View>
    );
  };

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View
            style={
              styles.headerTextContainer
            }
          >
            <View
              style={styles.titleRow}
            >
              <View
                style={
                  styles.titleAccent
                }
              />

              <View>
                <Text
                  style={styles.title}
                >
                  Speed Camera Tickets
                </Text>

                <Text
                  style={
                    styles.subtitle
                  }
                >
                  View and manage speeding
                  violations recorded
                  against your vehicle.
                </Text>
              </View>
            </View>
          </View>

          <View
            style={styles.headerIcon}
          >
            <MaterialIcons
              name="local-police"
              size={26}
              color="#1565C0"
            />
          </View>
        </View>

        {/* SUMMARY */}

        <View
          style={styles.summarySection}
        >
          <View
            style={
              styles.sectionHeaderRow
            }
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                ACCOUNT OVERVIEW
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Ticket Summary
              </Text>
            </View>

            <View
              style={
                styles.summaryCount
              }
            >
              <Text
                style={
                  styles.summaryCountText
                }
              >
                {totalTickets}
              </Text>
            </View>
          </View>

          <View
            style={styles.summaryRow}
          >
            <SummaryCard
              icon="receipt-long"
              label="Total Tickets"
              value={String(
                totalTickets
              )}
            />

            <SummaryCard
              icon="warning"
              label="Outstanding"
              value={String(
                outstandingTickets.length
              )}
            />
          </View>

          <View
            style={styles.amountCard}
          >
            <View
              style={styles.amountIcon}
            >
              <MaterialIcons
                name="payments"
                size={24}
                color="#1565C0"
              />
            </View>

            <View
              style={styles.amountInfo}
            >
              <Text
                style={styles.amountLabel}
              >
                Outstanding Amount
              </Text>

              <Text
                style={styles.amountValue}
              >
                {formatCurrency(
                  outstandingAmount
                )}
              </Text>
            </View>

            <View
              style={styles.paidInfo}
            >
              <Text
                style={styles.paidLabel}
              >
                Paid
              </Text>

              <Text
                style={styles.paidValue}
              >
                {paidTickets.length}
              </Text>
            </View>
          </View>
        </View>

        {/* INFO */}

        <View
          style={styles.infoBanner}
        >
          <View
            style={
              styles.infoBannerIcon
            }
          >
            <MaterialIcons
              name="verified-user"
              size={20}
              color="#1565C0"
            />
          </View>

          <View
            style={
              styles.infoBannerContent
            }
          >
            <Text
              style={
                styles.infoBannerTitle
              }
            >
              Official Traffic Record
            </Text>

            <Text
              style={
                styles.infoBannerText
              }
            >
              Speed camera notices may
              include the recorded speed,
              applicable speed limit,
              location and payment
              deadline.
            </Text>
          </View>
        </View>

        {/* FILTERS */}

        <View
          style={styles.filterSection}
        >
          <Text
            style={styles.sectionEyebrow}
          >
            RECORDS
          </Text>

          <Text
            style={styles.sectionTitle}
          >
            Your Tickets
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filterRow
            }
          >
            {(
              [
                "All",
                "Outstanding",
                "Paid",
                "Disputed",
              ] as FilterType[]
            ).map((filter) => {
              const active =
                activeFilter ===
                filter;

              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    active &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() =>
                    setActiveFilter(
                      filter
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active &&
                        styles.filterTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* TICKETS */}

        <View
          style={styles.ticketsSection}
        >
          {filteredFines.length ===
          0
            ? renderEmptyState()
            : filteredFines.map(
                renderFineCard
              )}
        </View>

        {/* FOOTER */}

        <View
          style={styles.footer}
        >
          <MaterialIcons
            name="security"
            size={17}
            color="#777"
          />

          <Text
            style={styles.footerText}
          >
            Your traffic information is
            securely associated with your
            citizen account.
          </Text>
        </View>
      </ScrollView>

      {/* ===================================================
          DETAILS MODAL
      =================================================== */}

      <Modal
        visible={
          selectedFine !== null
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedFine(null)
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={
              styles.modalContainer
            }
          >
            {/* MODAL HEADER */}

            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={
                    styles.modalEyebrow
                  }
                >
                  OFFICIAL NOTICE
                </Text>

                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Ticket Details
                </Text>

                <Text
                  style={
                    styles.modalReference
                  }
                >
                  {selectedFine
                    ? getReference(
                        selectedFine
                      )
                    : ""}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={() =>
                  setSelectedFine(
                    null
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#333"
                />
              </TouchableOpacity>
            </View>

            {selectedFine && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >
                <StatusBadge
                  status={getStatus(
                    selectedFine
                  )}
                  large
                />

                <View
                  style={
                    styles.modalDetails
                  }
                >
                  <DetailRow
                    label="NOTICE REFERENCE"
                    value={getReference(
                      selectedFine
                    )}
                  />

                  <DetailRow
                    label="OFFENCE"
                    value={
                      selectedFine.offence ??
                      selectedFine.description ??
                      "Speed Camera Violation"
                    }
                  />

                  <DetailRow
                    label="DATE"
                    value={formatDate(
                      selectedFine.date ??
                        selectedFine.issuedAt ??
                        selectedFine.offenceDate
                    )}
                  />

                  <DetailRow
                    label="LOCATION"
                    value={
                      selectedFine.location ??
                      selectedFine.cameraLocation ??
                      "Not available"
                    }
                  />

                  <DetailRow
                    label="VEHICLE"
                    value={getRegistration(
                      selectedFine
                    )}
                  />

                  <DetailRow
                    label="VEHICLE MODEL"
                    value={getVehicle(
                      selectedFine
                    )}
                  />

                  <DetailRow
                    label="RECORDED SPEED"
                    value={
                      selectedFine.recordedSpeed !==
                        undefined ||
                      selectedFine.speed !==
                        undefined
                        ? `${
                            selectedFine.recordedSpeed ??
                            selectedFine.speed
                          } km/h`
                        : "Not available"
                    }
                  />

                  <DetailRow
                    label="SPEED LIMIT"
                    value={
                      selectedFine.speedLimit !==
                      undefined
                        ? `${selectedFine.speedLimit} km/h`
                        : "Not available"
                    }
                  />

                  <DetailRow
                    label="FINE AMOUNT"
                    value={formatCurrency(
                      getAmount(
                        selectedFine
                      )
                    )}
                  />

                  <DetailRow
                    label="PAYMENT STATUS"
                    value={getStatus(
                      selectedFine
                    )}
                  />

                  <DetailRow
                    label="DUE DATE"
                    value={
                      selectedFine.dueDate
                        ? formatDate(
                            selectedFine.dueDate
                          )
                        : "Not specified"
                    }
                  />

                  {selectedFine.paymentReference && (
                    <DetailRow
                      label="PAYMENT REFERENCE"
                      value={
                        selectedFine.paymentReference
                      }
                    />
                  )}
                </View>

                {getStatus(
                  selectedFine
                ) !== "Paid" && (
                  <TouchableOpacity
                    style={
                      styles.modalPayButton
                    }
                    onPress={() =>
                      handlePayment(
                        selectedFine
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="payments"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalPayText
                      }
                    >
                      PAY FINE
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.summaryCard}
    >
      <View
        style={styles.summaryIcon}
      >
        <MaterialIcons
          name={icon}
          size={22}
          color="#1565C0"
        />
      </View>

      <Text
        style={styles.summaryLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.summaryValue}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   GOVERNMENT INFO
========================================================= */

function GovernmentInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.governmentInfo}
    >
      <Text
        style={
          styles.governmentInfoLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.governmentInfoValue
        }
        numberOfLines={2}
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
  status,
  large = false,
}: {
  status: string;
  large?: boolean;
}) {
  const normalized =
    status.toLowerCase();

  const isPaid =
    normalized === "paid";

  const isDisputed =
    normalized === "disputed";

  return (
    <View
      style={[
        styles.statusBadge,
        large &&
          styles.statusBadgeLarge,
        isPaid &&
          styles.statusPaid,
        isDisputed &&
          styles.statusDisputed,
      ]}
    >
      <View
        style={[
          styles.statusDot,
          isPaid &&
            styles.statusDotPaid,
          isDisputed &&
            styles.statusDotDisputed,
        ]}
      />

      <Text
        style={[
          styles.statusText,
          isPaid &&
            styles.statusTextPaid,
          isDisputed &&
            styles.statusTextDisputed,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.detailRow}
    >
      <Text
        style={styles.detailLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.detailValue}
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
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    marginTop: 12,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTextContainer: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  titleAccent: {
    width: 4,
    height: 50,
    borderRadius: 3,
    backgroundColor: "#1565C0",
    marginRight: 11,
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#003366",
    letterSpacing: -0.4,
  },

  subtitle: {
    marginTop: 5,
    color: "#6D757C",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 290,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EAF2FA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  /* SECTION */

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#8A949D",
    marginBottom: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#003366",
    marginBottom: 12,
  },

  summarySection: {
    marginBottom: 20,
  },

  summaryCount: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EAF2FA",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryCountText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#1565C0",
  },

  /* SUMMARY */

  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E7EB",
  },

  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EAF2FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  summaryLabel: {
    color: "#7C858D",
    fontSize: 11,
    marginBottom: 4,
  },

  summaryValue: {
    color: "#17212B",
    fontSize: 22,
    fontWeight: "900",
  },

  amountCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E7EB",
  },

  amountIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EAF2FA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  amountInfo: {
    flex: 1,
  },

  amountLabel: {
    color: "#7C858D",
    fontSize: 11,
  },

  amountValue: {
    color: "#003366",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 3,
  },

  paidInfo: {
    alignItems: "flex-end",
  },

  paidLabel: {
    color: "#7C858D",
    fontSize: 11,
  },

  paidValue: {
    color: "#2E7D32",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },

  /* INFO */

  infoBanner: {
    backgroundColor: "#EEF5FA",
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#D8E7F2",
  },

  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  infoBannerContent: {
    flex: 1,
    marginLeft: 10,
  },

  infoBannerTitle: {
    color: "#164C73",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 3,
  },

  infoBannerText: {
    color: "#557083",
    fontSize: 12,
    lineHeight: 18,
  },

  /* FILTER */

  filterSection: {
    marginBottom: 14,
  },

  filterRow: {
    paddingBottom: 5,
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE2E7",
  },

  filterButtonActive: {
    backgroundColor: "#1565C0",
    borderColor: "#1565C0",
  },

  filterText: {
    color: "#59636B",
    fontWeight: "700",
    fontSize: 12,
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  /* TICKET */

  ticketsSection: {
    marginTop: 4,
  },

  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCE3E9",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  /* OFFICIAL HEADER */

  officialHeader: {
    backgroundColor: "#003B70",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  officialHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  officialEmblem: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor:
      "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  officialCountry: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  officialDepartment: {
    color: "#C9D9E8",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.45,
    marginTop: 3,
  },

  officialDocument: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    textAlign: "right",
    lineHeight: 11,
  },

  /* REFERENCE */

  referenceSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  referenceLabel: {
    color: "#8A949D",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  referenceValue: {
    color: "#17212B",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
    letterSpacing: 0.3,
  },

  /* LINE */

  officialRule: {
    height: 3,
    flexDirection: "row",
  },

  ruleBlue: {
    flex: 1,
    backgroundColor: "#003B70",
  },

  ruleGold: {
    width: "25%",
    backgroundColor: "#C9A227",
  },

  /* OFFENCE */

  offenceSection: {
    margin: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  offenceAccent: {
    width: 3,
    height: 57,
    borderRadius: 2,
    backgroundColor: "#1565C0",
    marginRight: 12,
  },

  offenceContent: {
    flex: 1,
  },

  fieldLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#8A949D",
    letterSpacing: 0.7,
  },

  offenceTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "900",
    color: "#17212B",
  },

  offenceDate: {
    marginTop: 4,
    fontSize: 11,
    color: "#7C858D",
  },

  /* SPEED */

  speedBadge: {
    minWidth: 62,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#EFF5FA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  speedBadgeValue: {
    color: "#003B70",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 1,
  },

  speedBadgeUnit: {
    color: "#70808E",
    fontSize: 8,
    fontWeight: "700",
  },

  /* INFO GRID */

  officialInfoGrid: {
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8ECEF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
    flexDirection: "row",
    flexWrap: "wrap",
  },

  governmentInfo: {
    width: "50%",
    paddingVertical: 12,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },

  governmentInfoLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#8A949D",
    letterSpacing: 0.6,
  },

  governmentInfoValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "#26333D",
    lineHeight: 17,
  },

  /* STATUS */

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFF3E0",
  },

  statusBadgeLarge: {
    alignSelf: "flex-start",
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  statusPaid: {
    backgroundColor: "#E8F5E9",
  },

  statusDisputed: {
    backgroundColor: "#E3F2FD",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E65100",
    marginRight: 5,
  },

  statusDotPaid: {
    backgroundColor: "#2E7D32",
  },

  statusDotDisputed: {
    backgroundColor: "#1565C0",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E65100",
  },

  statusTextPaid: {
    color: "#2E7D32",
  },

  statusTextDisputed: {
    color: "#1565C0",
  },

  /* AMOUNT */

  amountSection: {
    margin: 16,
    padding: 14,
    backgroundColor: "#F6F8FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E9ED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  amountSectionLabel: {
    color: "#7A858E",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  officialAmount: {
    color: "#003B70",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },

  paymentIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },

  paymentIndicatorText: {
    color: "#1565C0",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 3,
  },

  /* DUE DATE */

  officialDueDate: {
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFF8EC",
    borderWidth: 1,
    borderColor: "#F1D7A8",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  dueDateContent: {
    flex: 1,
    marginLeft: 9,
  },

  dueDateOfficialLabel: {
    color: "#9A681D",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  dueDateOfficialValue: {
    color: "#7B4D0C",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },

  /* ACTIONS */

  officialActions: {
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    gap: 9,
  },

  officialDetailsButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD9E5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    backgroundColor: "#FFFFFF",
  },

  officialDetailsText: {
    color: "#1565C0",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  officialPayButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#1565C0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  officialPayText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  /* FOOTER */

  noticeFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  noticeFooterText: {
    color: "#A0A8AE",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E1E6EA",
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EAF2FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#003366",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    color: "#777",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  /* FOOTER */

  footer: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },

  footerText: {
    marginLeft: 7,
    color: "#888",
    fontSize: 11,
    textAlign: "center",
    flex: 1,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#F4F6F8",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: "85%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  modalEyebrow: {
    color: "#8A949D",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 3,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#003366",
  },

  modalReference: {
    color: "#777",
    fontSize: 12,
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  modalDetails: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E1E6EA",
  },

  detailRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F2",
  },

  detailLabel: {
    color: "#888",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginBottom: 4,
  },

  detailValue: {
    color: "#222",
    fontSize: 15,
    fontWeight: "800",
  },

  modalPayButton: {
    backgroundColor: "#1565C0",
    minHeight: 50,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  modalPayText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});