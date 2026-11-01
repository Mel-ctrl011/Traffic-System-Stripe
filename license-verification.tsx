import React from "react";
import { View, Text } from "react-native";

/*
=========================================================
DATABASE INTEGRATION NOTE
---------------------------------------------------------
The driver's license information is currently retrieved
from a local data file for development and testing.

Future Enhancement:
Replace the local data with driver's license information
retrieved from the Department of Transport database
after successful QR code verification.
=========================================================
*/
import { driverLicense } from "./src/screens/driver-license-data";

/*
---------------------------------------------------------
LICENSE STATUS CALCULATION
---------------------------------------------------------
Automatically checks whether the driver's license has
expired based on the expiry date.

Future Enhancement:
The expiry date will be retrieved from the database,
ensuring the status is always calculated using the most
recent information.
---------------------------------------------------------
*/
const expiry = new Date(driverLicense.expiryDate);
const today = new Date();

const isExpired = today > expiry;
const licenseStatus = isExpired ? "Expired" : "Valid";

/*
Records the date and time the license was verified.

Future Enhancement:
Store the verification timestamp in the database for
verification history and audit purposes.
*/
const lastVerified = new Date().toLocaleString();

export default function LicenseVerificationScreen() {
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
      <View
        style={{
          width: "100%",
          maxWidth: 360,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          overflow: "hidden",
          elevation: 5,
        }}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: isExpired ? "#C62828" : "#003366",
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 22,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {isExpired
              ? "DRIVER LICENSE EXPIRED"
              : "DRIVER LICENSE VERIFIED"}
          </Text>
        </View>

        {/* 
        =====================================================
        DRIVER INFORMATION
        -----------------------------------------------------
        The information below is currently displayed from
        locally stored data.

        Future Enhancement:
        Display the driver's information returned from the
        Department of Transport database after successful
        QR code verification.
        =====================================================
        */}
        <View style={{ padding: 20 }}>

          {/* Existing code remains unchanged */}

          ...
          
        </View>
      </View>
    </View>
  );
}