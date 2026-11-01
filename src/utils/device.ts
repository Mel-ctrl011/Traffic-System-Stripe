import * as Device from "expo-device";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "TRAFFICCONNECT_DEVICE_ID";

export const getDeviceInfo = async () => {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    const raw = `
      ${Device.modelName ?? "unknown"}|
      ${Device.osName ?? "unknown"}|
      ${Device.osVersion ?? "unknown"}|
      ${Device.deviceName ?? "unknown"}
    `;

    deviceId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      raw
    );

    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return {
    deviceId,
    model: Device.modelName ?? "unknown",
    deviceName: Device.deviceName ?? "unknown",
    os: Device.osName ?? "unknown",
    osVersion: Device.osVersion ?? "unknown",
    brand: Device.brand ?? "unknown",
    deviceYearClass: Device.deviceYearClass ?? 0,
  };
};