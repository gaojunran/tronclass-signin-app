import { ref } from "vue";
import {
  scan,
  Format,
  checkPermissions,
  requestPermissions,
  openAppSettings,
  cancel,
} from "@tauri-apps/plugin-barcode-scanner";
import type { PermissionState } from "@tauri-apps/plugin-barcode-scanner";

/**
 * Composable for QR code scanning using Tauri barcode scanner
 */
export function useTauriQRScanner() {
  const isScanning = ref(false);
  const error = ref<string | null>(null);
  const result = ref<string | null>(null);

  /**
   * Check camera permission status
   */
  async function checkCameraPermission(): Promise<PermissionState> {
    try {
      return await checkPermissions();
    } catch (err) {
      console.error("Failed to check permissions:", err);
      throw err;
    }
  }

  /**
   * Request camera permission
   */
  async function requestCameraPermission(): Promise<PermissionState> {
    try {
      return await requestPermissions();
    } catch (err) {
      console.error("Failed to request permissions:", err);
      throw err;
    }
  }

  /**
   * Open app settings for manual permission grant
   */
  async function openSettings(): Promise<void> {
    try {
      await openAppSettings();
    } catch (err) {
      console.error("Failed to open settings:", err);
      throw err;
    }
  }

  /**
   * Start scanning with Tauri barcode scanner
   */
  async function startScanning(onScanSuccess: (scanResult: string) => void) {
    try {
      error.value = null;
      result.value = null;

      // Check permission first
      let permissionState = await checkCameraPermission();

      // Request permission if not granted
      if (
        permissionState === "prompt" ||
        permissionState === "prompt-with-rationale"
      ) {
        permissionState = await requestCameraPermission();
      }

      // Handle denied permission
      if (permissionState === "denied") {
        error.value = "摄像头权限被拒绝，请在设置中手动开启";
        const shouldOpenSettings =
          confirm("摄像头权限被拒绝，是否打开设置页面？");
        if (shouldOpenSettings) {
          await openSettings();
        }
        throw new Error("Camera permission denied");
      }

      // Start scanning
      isScanning.value = true;
      const scanResult = await scan({
        windowed: false,
        formats: [Format.QRCode],
      });

      if (scanResult && scanResult.content) {
        result.value = scanResult.content;
        onScanSuccess(scanResult.content);
      }
    } catch (err) {
      if (err instanceof Error && err.message !== "Camera permission denied") {
        error.value = err.message || "Failed to scan QR code";
        console.error("Tauri QR Scanner error:", err);
      }
      throw err;
    } finally {
      isScanning.value = false;
    }
  }

  /**
   * Cancel the current scan
   */
  async function stopScanning() {
    try {
      await cancel();
      isScanning.value = false;
    } catch (err) {
      console.error("Failed to cancel scan:", err);
    }
  }

  /**
   * Cleanup on unmount
   */
  onUnmounted(() => {
    if (isScanning.value) {
      stopScanning();
    }
  });

  return {
    isScanning,
    error,
    result,
    startScanning,
    stopScanning,
    checkCameraPermission,
    requestCameraPermission,
    openSettings,
  };
}
