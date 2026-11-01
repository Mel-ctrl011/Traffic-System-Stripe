import React from "react";
import { View, Text, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function QRScannerScreen() {

  /*
  =========================================================
  DATABASE INTEGRATION NOTE
  ---------------------------------------------------------
  This screen currently opens the device camera to scan a
  driver's license QR code.

  Future Enhancement:
  After a QR code is scanned, the extracted license
  information will be sent to the Department of Transport
  database for verification.
  =========================================================
  */

  const [permission, requestPermission] = useCameraPermissions();

  // Permission is still loading
  if (!permission) {
    return <View />;
  }

  // Permission has not been granted
  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 15,
          }}
        >
          Camera Permission Required
        </Text>

        <Text
          style={{
            textAlign: "center",
            marginBottom: 25,
            color: "#666",
          }}
        >
          This feature requires access to your camera to scan driver's license QR codes.
        </Text>

        <Button
          title="Allow Camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  /*
  ---------------------------------------------------------
  QR SCANNER
  ---------------------------------------------------------
  The camera is opened to scan a driver's license QR code.

  Future Enhancement:
  - Read the QR code data.
  - Send the scanned license number to the database.
  - Verify that the license exists.
  - Check whether the license is valid or expired.
  - Display the verification result to the user.
  ---------------------------------------------------------
  */

  return (
    <CameraView
      style={{ flex: 1 }}
    />
  );
}