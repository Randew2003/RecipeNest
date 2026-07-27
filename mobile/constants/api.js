const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

// 10.0.2.2 points from the Android emulator to the development computer.
// Physical devices must set EXPO_PUBLIC_API_URL to the computer's LAN IP.
export const API_URL = (configuredUrl || "http://192.168.177.1:5001/api").replace(/\/$/, "");
