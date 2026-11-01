import { db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/* =========================
   SIGNUP / VERIFICATION
========================= */

export async function verifyUser(
  idNumber: string,
  phone: string,
  device?: any
) {
  try {
    const ref = doc(db, "citizens", idNumber);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {
        success: false,
        message: "User not found in system",
      };
    }

    const data = snap.data();

    if (data.phone !== phone) {
      return {
        success: false,
        message: "Phone number does not match records",
      };
    }

    const devices = data.devices || {};
    const deviceId = device?.deviceId;

    let isNewDevice = false;

    if (deviceId && !devices[deviceId]) {
      isNewDevice = true;
    }

    // optional: block new devices during signup
    if (isNewDevice && data.lockNewDevices === true) {
      return {
        success: false,
        message: "New device detected. Verification required.",
      };
    }

    // store device if new
    if (deviceId && isNewDevice) {
      await updateDoc(ref, {
        [`devices.${deviceId}`]: {
          model: device.model || "unknown",
          os: device.os || "unknown",
          osVersion: device.osVersion || "unknown",
          firstSeen: new Date().toISOString(),
          trusted: true,
        },
      });
    }

    if (data.verified === true) {
      return {
        success: true,
        message: "Account already verified",
      };
    }

    await updateDoc(ref, {
      verified: true,
      lastLoginDevice: deviceId || null,
    });

    return {
      success: true,
      message: "Account verified successfully",
    };
  } catch (error: any) {
    console.log("verifyUser error:", error);

    return {
      success: false,
      message: error?.message || "Verification failed",
    };
  }
}

/* =========================
   LOGIN / DEVICE CHECK
========================= */

export async function verifyLogin(idNumber: string, device: any) {
  try {
    const ref = doc(db, "citizens", idNumber);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {
        success: false,
        message: "User not found",
      };
    }

    const data = snap.data();
    const devices = data.devices || {};
    const deviceId = device.deviceId;

    // 🔴 NEW DEVICE
    if (!devices[deviceId]) {
      await updateDoc(ref, {
        [`suspiciousDevices.${deviceId}`]: {
          model: device.model,
          os: device.os,
          time: new Date().toISOString(),
          reason: "new device login attempt",
        },
      });

      return {
        success: false,
        message: "New device detected. Verification required.",
      };
    }

    // 🟢 SUCCESS LOGIN
    await updateDoc(ref, {
      lastLoginDevice: deviceId,
      lastLoginAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Login successful",
        userId: idNumber,
    };
  } catch (error) {
    console.log("login error:", error);

    return {
      success: false,
      message: "Login failed",
    };
  }
}