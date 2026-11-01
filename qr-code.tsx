import React from "react";
import { View, Text } from "react-native";
import QRCode from "react-native-qrcode-svg";

/*
=========================================================
DATABASE INTEGRATION NOTE
---------------------------------------------------------
The driver's license information is currently imported
from a local data file for development purposes.

Future Enhancement:
Retrieve the authenticated user's driver's license
information from the database (e.g., Firebase or SQL)
instead of using locally stored data.
=========================================================
*/
import { driverLicense } from "./src/screens/driver-license-data";

export default function QRCodeScreen() {

  /*
  -------------------------------------------------------
  DATABASE NOTE
  -------------------------------------------------------
  These fields will be populated from the driver's
  license record stored in the database.
  Only essential information required for verification
  is included in the QR code to protect sensitive data.
  -------------------------------------------------------
  */
  const qrData = {
    fullName: driverLicense.fullName,
    initials: driverLicense.initials,
    licenseNumber: driverLicense.licenseNumber,
    licenseCategory: driverLicense.licenseCategory,
    expiryDate: driverLicense.expiryDate,
    status: driverLicense.status,
  };

  /*
  Converts the driver's license information into a JSON
  string that can be encoded inside the QR code.

  Future Enhancement:
  Generate this QR code using live data retrieved from
  the Department of Transport database.
  */
  const qrValue = JSON.stringify(qrData);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F7FA",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 10,
        }}
      >
        Driver License QR
      </Text>

      <Text
        style={{
          textAlign: "center",
          color: "#555",
          marginBottom: 25,
        }}
      >
        Scan this QR code to verify the driver's license.
      </Text>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          padding: 20,
          borderRadius: 20,
          elevation: 5,
        }}
      >
        {/*
        QR code generated from the driver's license
        information.

        Future Enhancement:
        The QR code will automatically update whenever
        the driver's license information changes in the
        database.
        */}
        <QRCode
          value={qrValue}
          size={220}
        />
      </View>

      <Text
        style={{
          marginTop: 20,
          fontSize: 14,
          color: "#666",
        }}
      >
        License Number
      </Text>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        {driverLicense.licenseNumber}
      </Text>

      <Text
        style={{
          marginTop: 15,
          fontSize: 14,
          color: "#666",
        }}
      >
        License Holder
      </Text>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 25,
        }}
      >
        {driverLicense.fullName}
      </Text>

      <Text
        style={{
          textAlign: "center",
          color: "#777",
          fontSize: 13,
          paddingHorizontal: 20,
        }}
      >
        Only authorized traffic officers can scan this QR code for license verification.
      </Text>
    </View>
  );
}