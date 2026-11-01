import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CameraView,
  CameraType,
  useCameraPermissions,
} from "expo-camera";

import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

const COLORS = {
  navy: "#073B67",
  primary: "#0B4F8A",
  primaryDark: "#062F53",

  background: "#F3F5F7",
  white: "#FFFFFF",

  text: "#17212B",
  textLight: "#66737F",
  muted: "#8A949D",
  border: "#D9E0E6",

  success: "#18794E",
  successSoft: "#ECFDF3",

  danger: "#B42318",
  dangerSoft: "#FEF3F2",

  blueSoft: "#EAF3FA",
};

type ScannerState =
  | "camera"
  | "capturing"
  | "preview"
  | "success";

interface FaceVerificationScannerProps {
  visible: boolean;
  onClose: () => void;
  onVerified: (imageUri: string) => void;
}

export default function FaceVerificationScanner({
  visible,
  onClose,
  onVerified,
}: FaceVerificationScannerProps) {
  const cameraRef = useRef<CameraView | null>(null);

  const successTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [cameraReady, setCameraReady] =
    useState(false);

  const [state, setState] =
    useState<ScannerState>("camera");

  const [photoUri, setPhotoUri] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const [capturing, setCapturing] =
    useState(false);

  const scanAnimation =
    useRef(new Animated.Value(0)).current;

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // =========================================================
  // RESET WHEN OPENED
  // =========================================================

  useEffect(() => {
    if (!visible) {
      setCameraReady(false);
      setState("camera");
      setPhotoUri(null);
      setError("");
      setCapturing(false);

      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }

      return;
    }

    setCameraReady(false);
    setState("camera");
    setPhotoUri(null);
    setError("");
    setCapturing(false);
  }, [visible]);

  // =========================================================
  // SCAN ANIMATION
  // =========================================================

  useEffect(() => {
    if (
      !visible ||
      state !== "camera" ||
      !cameraReady
    ) {
      return;
    }

    scanAnimation.setValue(0);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),

        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [
    visible,
    state,
    cameraReady,
    scanAnimation,
  ]);

  const scanLinePosition =
    scanAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 300],
    });

  // =========================================================
  // REQUEST CAMERA PERMISSION
  // =========================================================

  const handleRequestPermission = async () => {
    setError("");

    try {
      const result = await requestPermission();

      console.log(
        "📷 CAMERA PERMISSION:",
        result.granted
      );

      if (!result.granted) {
        setError(
          "Camera access is required to complete face verification."
        );
      }
    } catch (error) {
      console.log(
        "❌ CAMERA PERMISSION ERROR:",
        error
      );

      setError(
        "Camera permission could not be requested."
      );
    }
  };

  // =========================================================
  // CAMERA READY
  // =========================================================

  const handleCameraReady = () => {
    console.log("=================================");
    console.log("📷 CAMERA READY");
    console.log("=================================");

    setCameraReady(true);
    setError("");
  };

  // =========================================================
  // CAMERA ERROR
  // =========================================================

  const handleCameraError = (event: any) => {
    console.log(
      "❌ CAMERA ERROR:",
      event
    );

    setCameraReady(false);

    setError(
      "The camera could not be started. Please close and reopen face verification."
    );
  };

  // =========================================================
  // CAPTURE PHOTO
  // =========================================================

  const handleCapture = async () => {
    console.log("=================================");
    console.log("📸 CAPTURE FACE BUTTON PRESSED");
    console.log("=================================");

    if (capturing) {
      console.log(
        "⚠️ Capture already running"
      );
      return;
    }

    if (!cameraRef.current) {
      console.log(
        "❌ CAMERA REF NOT AVAILABLE"
      );

      setError(
        "Camera is not available. Please reopen face verification."
      );

      return;
    }

    if (!cameraReady) {
      console.log(
        "❌ CAMERA NOT READY"
      );

      setError(
        "Camera is still starting. Please wait."
      );

      return;
    }

    try {
      setError("");
      setCapturing(true);
      setState("capturing");

      console.log(
        "📸 TAKING REAL CAMERA PHOTO..."
      );

      const photo =
        await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });

      console.log(
        "📸 PHOTO RESULT:",
        photo
      );

      if (!photo?.uri) {
        throw new Error(
          "Camera returned no image URI."
        );
      }

      console.log(
        "================================="
      );

      console.log(
        "✅ REAL FACE IMAGE CAPTURED"
      );

      console.log(
        "📸 URI:",
        photo.uri
      );

      console.log(
        "================================="
      );

      setPhotoUri(photo.uri);

      // Give the camera a moment to release
      // before showing the preview.
      setTimeout(() => {
        setState("preview");
      }, 400);
    } catch (error) {
      console.log(
        "❌ FACE CAPTURE FAILED:",
        error
      );

      setError(
        "We could not capture your face. Please try again."
      );

      setState("camera");
    } finally {
      setCapturing(false);
    }
  };

  // =========================================================
  // RETAKE
  // =========================================================

  const handleRetake = () => {
    console.log(
      "🔄 RETAKING FACE PHOTO"
    );

    setPhotoUri(null);
    setError("");
    setCameraReady(false);
    setCapturing(false);
    setState("camera");
  };

  // =========================================================
  // CONFIRM PHOTO
  // =========================================================

  const handleConfirm = () => {
    if (!photoUri) {
      setError(
        "No face image is available."
      );

      return;
    }

    console.log("=================================");
    console.log("✅ FACE IMAGE CONFIRMED");
    console.log("📸 IMAGE URI:", photoUri);
    console.log("=================================");

    setError("");
    setState("success");

    if (successTimerRef.current) {
      clearTimeout(
        successTimerRef.current
      );
    }

    successTimerRef.current =
      setTimeout(() => {
        console.log(
          "➡️ SENDING IMAGE TO PARENT"
        );

        onVerified(photoUri);

        successTimerRef.current = null;
      }, 900);
  };

  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {
    console.log(
      "❌ FACE VERIFICATION CLOSED"
    );

    if (successTimerRef.current) {
      clearTimeout(
        successTimerRef.current
      );

      successTimerRef.current = null;
    }

    setCameraReady(false);
    setState("camera");
    setPhotoUri(null);
    setError("");
    setCapturing(false);

    onClose();
  };

  // =========================================================
  // PERMISSION SCREEN
  // =========================================================

  const renderPermissionScreen = () => {
    return (
      <View style={styles.permissionScreen}>
        <View style={styles.permissionIcon}>
          <Ionicons
            name="camera-outline"
            size={38}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.permissionTitle}>
          Camera Access Required
        </Text>

        <Text style={styles.permissionDescription}>
          TrafficConnect SA requires access
          to your front camera to complete
          face verification.
        </Text>

        <View style={styles.officialNotice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={COLORS.primary}
          />

          <Text style={styles.officialNoticeText}>
            Your camera is used only during
            the face verification process.
          </Text>
        </View>

        {error !== "" && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={COLORS.danger}
            />

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryButton}
          onPress={handleRequestPermission}
        >
          <Ionicons
            name="camera-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.primaryButtonText}>
            Allow Camera Access
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.cancelButton}
          onPress={handleClose}
        >
          <Text style={styles.cancelButtonText}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // =========================================================
  // CAMERA SCREEN
  // =========================================================

  const renderCamera = () => {
    return (
      <View style={styles.cameraScreen}>

        {/* ================================================= */}
        {/* REAL CAMERA */}
        {/* ================================================= */}

        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="front"
          mode="picture"
          mirror
          onCameraReady={handleCameraReady}
          onMountError={handleCameraError}
        />

        {/* ================================================= */}
        {/* DARK GRADIENT-STYLE OVERLAY */}
        {/* ================================================= */}

        <View
          style={styles.cameraOverlay}
          pointerEvents="box-none"
        >

          {/* HEADER */}

          <View style={styles.cameraHeader}>
            <View>
              <Text style={styles.cameraEyebrow}>
                TRAFFICCONNECT SA
              </Text>

              <Text style={styles.cameraTitle}>
                Face Verification
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons
                name="close"
                size={25}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* INSTRUCTION */}

          <View style={styles.instructionCard}>
            <View style={styles.instructionIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.instructionInformation}>
              <Text style={styles.instructionTitle}>
                Position your face
              </Text>

              <Text style={styles.instructionDescription}>
                Look directly at the camera
                and place your face inside
                the frame.
              </Text>
            </View>
          </View>

          {/* FACE FRAME */}

          <View style={styles.faceFrameWrapper}>
            <View style={styles.faceFrame}>

              <View
                style={[
                  styles.corner,
                  styles.cornerTopLeft,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.cornerTopRight,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.cornerBottomLeft,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.cornerBottomRight,
                ]}
              />

              {cameraReady &&
                state === "camera" && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY:
                              scanLinePosition,
                          },
                        ],
                      },
                    ]}
                  />
                )}
            </View>
          </View>

          {/* CAMERA STATUS */}

          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              {cameraReady
                ? "Camera ready"
                : "Starting camera..."}
            </Text>
          </View>

          {/* ERROR */}

          {error !== "" && (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={COLORS.danger}
              />

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          )}

          {/* ================================================= */}
          {/* FIXED CAPTURE AREA */}
          {/* ================================================= */}

          <View
            style={styles.captureArea}
            pointerEvents="box-none"
          >

            <Text style={styles.cameraHint}>
              Make sure your face is clearly
              visible and well lit.
            </Text>

            {/* BIG BUTTON */}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCapture}
              disabled={
                !cameraReady ||
                state !== "camera" ||
                capturing
              }
              style={[
                styles.bigCaptureButton,
                (!cameraReady ||
                  state !== "camera" ||
                  capturing) &&
                  styles.bigCaptureButtonDisabled,
              ]}
            >
              <View style={styles.bigCaptureInner}>
                {capturing ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                  />
                ) : (
                  <Ionicons
                    name="camera"
                    size={30}
                    color={COLORS.primary}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* CLEAR LABEL */}

            <Text style={styles.captureLabel}>
              {cameraReady
                ? "CAPTURE FACE"
                : "STARTING CAMERA"}
            </Text>

            {/* EXTRA TAP TARGET */}

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!cameraReady}
              onPress={handleCapture}
              style={[
                styles.captureTextButton,
                !cameraReady &&
                  styles.captureTextButtonDisabled,
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.captureTextButtonText}>
                Tap here to take your photo
              </Text>
            </TouchableOpacity>

          </View>

        </View>
      </View>
    );
  };

  // =========================================================
  // CAPTURING
  // =========================================================

  const renderCapturing = () => {
    return (
      <View style={styles.processingScreen}>
        <View style={styles.processingIcon}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.processingTitle}>
          Processing Face
        </Text>

        <Text style={styles.processingDescription}>
          Please wait while your face image
          is prepared.
        </Text>

        <View style={styles.secureProcessing}>
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={COLORS.primary}
          />

          <Text style={styles.secureProcessingText}>
            Secure verification process
          </Text>
        </View>
      </View>
    );
  };

  // =========================================================
  // PREVIEW
  // =========================================================

  const renderPreview = () => {
    return (
      <View style={styles.previewScreen}>

        {/* HEADER */}

        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.modalEyebrow}>
              TRAFFICCONNECT SA
            </Text>

            <Text style={styles.modalTitle}>
              Confirm Your Face
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.darkCloseButton}
            onPress={handleClose}
          >
            <Ionicons
              name="close"
              size={22}
              color={COLORS.text}
            />
          </TouchableOpacity>
        </View>

        {/* PHOTO */}

        <View style={styles.previewImageWrapper}>

          {photoUri && (
            <Image
              source={{
                uri: photoUri,
              }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.previewBadge}>
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={COLORS.success}
            />

            <Text style={styles.previewBadgeText}>
              Face captured
            </Text>
          </View>
        </View>

        {/* INFORMATION */}

        <View style={styles.confirmInformation}>
          <View style={styles.confirmIcon}>
            <Ionicons
              name="person-outline"
              size={21}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.confirmTextContainer}>
            <Text style={styles.confirmTitle}>
              Is this photo clear?
            </Text>

            <Text style={styles.confirmDescription}>
              Make sure your entire face is
              visible before confirming.
            </Text>
          </View>
        </View>

        {error !== "" && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={COLORS.danger}
            />

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {/* ACTIONS */}

        <View style={styles.previewActions}>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.retakeButton}
            onPress={handleRetake}
          >
            <Ionicons
              name="refresh-outline"
              size={19}
              color={COLORS.primary}
            />

            <Text style={styles.retakeText}>
              Retake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Ionicons
              name="checkmark"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.confirmButtonText}>
              Confirm Face
            </Text>
          </TouchableOpacity>

        </View>

        {/* PRIVACY */}

        <View style={styles.privacyNotice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={COLORS.primary}
          />

          <Text style={styles.privacyText}>
            Your face image is handled
            securely during verification.
          </Text>
        </View>
      </View>
    );
  };

  // =========================================================
  // SUCCESS
  // =========================================================

  const renderSuccess = () => {
    return (
      <View style={styles.successScreen}>

        <View style={styles.successCircle}>
          <Ionicons
            name="checkmark"
            size={45}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.successTitle}>
          Face Verified
        </Text>

        <Text style={styles.successDescription}>
          Your face verification has been
          completed successfully.
        </Text>

        <View style={styles.successNotice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color={COLORS.success}
          />

          <Text style={styles.successNoticeText}>
            Security check complete
          </Text>
        </View>
      </View>
    );
  };

  // =========================================================
  // PERMISSION LOADING
  // =========================================================

  if (!permission) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
      >
        <View style={styles.loadingScreen}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Checking camera access...
          </Text>
        </View>
      </Modal>
    );
  }

  // =========================================================
  // MAIN MODAL
  // =========================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>

        {!permission.granted
          ? renderPermissionScreen()
          : state === "camera"
          ? renderCamera()
          : state === "capturing"
          ? renderCapturing()
          : state === "preview"
          ? renderPreview()
          : renderSuccess()}

      </View>
    </Modal>
  );
}

// =============================================================
// STYLES
// =============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // =========================================================
  // LOADING
  // =========================================================

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 15,
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: "600",
  },

  // =========================================================
  // PERMISSION
  // =========================================================

  permissionScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: COLORS.background,
  },

  permissionIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueSoft,
    marginBottom: 22,
  },

  permissionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  permissionDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textLight,
    textAlign: "center",
    maxWidth: 350,
  },

  officialNotice: {
    width: "100%",
    marginTop: 24,
    padding: 15,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blueSoft,
  },

  officialNoticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
    fontWeight: "600",
  },

  primaryButton: {
    width: "100%",
    minHeight: 55,
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    marginLeft: 9,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  cancelButton: {
    marginTop: 14,
    padding: 12,
  },

  cancelButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: "700",
  },

  // =========================================================
  // CAMERA
  // =========================================================

  cameraScreen: {
    flex: 1,
    backgroundColor: "#000000",
  },

  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  cameraHeader: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },

  cameraEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    color: "#FFFFFF",
    opacity: 0.75,
  },

  cameraTitle: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  instructionCard: {
    position: "absolute",
    top: 125,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    zIndex: 20,
  },

  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueSoft,
  },

  instructionInformation: {
    flex: 1,
    marginLeft: 12,
  },

  instructionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  instructionDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textLight,
  },

  // =========================================================
  // FACE FRAME
  // =========================================================

  faceFrameWrapper: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.27,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },

  faceFrame: {
    width: Math.min(
      SCREEN_WIDTH * 0.68,
      285
    ),
    height: 340,
    borderRadius: 145,
    overflow: "hidden",
    position: "relative",
  },

  corner: {
    position: "absolute",
    width: 45,
    height: 45,
    borderColor: "#FFFFFF",
  },

  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 22,
  },

  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 22,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 22,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 22,
  },

  scanLine: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 0,
    height: 3,
    backgroundColor: "#FFFFFF",
    opacity: 0.9,
  },

  // =========================================================
  // STATUS
  // =========================================================

  statusContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.70,
    alignSelf: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 20,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // =========================================================
  // CAPTURE AREA
  // =========================================================

  captureArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 215,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.70)",
    zIndex: 30,
  },

  cameraHint: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
    opacity: 0.9,
  },

  bigCaptureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },

  bigCaptureButtonDisabled: {
    opacity: 0.5,
  },

  bigCaptureInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  captureLabel: {
    marginTop: 7,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  captureTextButton: {
    marginTop: 7,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },

  captureTextButtonDisabled: {
    opacity: 0.45,
  },

  captureTextButtonText: {
    marginLeft: 7,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  // =========================================================
  // ERROR
  // =========================================================

  errorBox: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 220,
    padding: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerSoft,
    zIndex: 40,
  },

  errorText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.danger,
    fontWeight: "600",
  },

  // =========================================================
  // PROCESSING
  // =========================================================

  processingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: COLORS.background,
  },

  processingIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueSoft,
  },

  processingTitle: {
    marginTop: 24,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },

  processingDescription: {
    marginTop: 10,
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.textLight,
  },

  secureProcessing: {
    marginTop: 24,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blueSoft,
  },

  secureProcessingText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // =========================================================
  // PREVIEW
  // =========================================================

  previewScreen: {
    flex: 1,
    paddingTop: 55,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    color: COLORS.primary,
  },

  modalTitle: {
    marginTop: 3,
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.text,
  },

  darkCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  previewImageWrapper: {
    marginTop: 25,
    height: SCREEN_HEIGHT * 0.53,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111111",
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  previewBadge: {
    position: "absolute",
    left: 15,
    bottom: 15,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successSoft,
  },

  previewBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.success,
  },

  confirmInformation: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  confirmIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueSoft,
  },

  confirmTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  confirmTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  confirmDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textLight,
  },

  previewActions: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },

  retakeButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  retakeText: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },

  confirmButton: {
    flex: 1.3,
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButtonText: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  privacyNotice: {
    marginTop: 18,
    padding: 13,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blueSoft,
  },

  privacyText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textLight,
    fontWeight: "600",
  },

  // =========================================================
  // SUCCESS
  // =========================================================

  successScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: COLORS.background,
  },

  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
  },

  successTitle: {
    marginTop: 25,
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  },

  successDescription: {
    marginTop: 10,
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.textLight,
  },

  successNotice: {
    marginTop: 25,
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successSoft,
  },

  successNoticeText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.success,
  },
});