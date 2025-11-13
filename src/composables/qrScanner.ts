import { ref } from 'vue'
import QrScanner from 'qr-scanner'

/**
 * Composable for QR code scanning using device camera
 */
export function useQRScanner() {
  const isScanning = ref(false)
  const scanner = ref<QrScanner | null>(null)
  const error = ref<string | null>(null)
  const result = ref<string | null>(null)

  /**
   * Start the camera and begin scanning
   */
  async function startScanning(
    videoElement: HTMLVideoElement,
    onScanSuccess: (scanResult: string) => void,
  ) {
    try {
      error.value = null
      result.value = null

      // Create QR scanner instance
      scanner.value = new QrScanner(
        videoElement,
        (scanResult) => {
          result.value = scanResult.data
          onScanSuccess(scanResult.data)
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera on mobile
        },
      )

      // Start scanning
      await scanner.value.start()
      isScanning.value = true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to access camera'
      console.error('QR Scanner error:', err)
      throw err
    }
  }

  /**
   * Stop the camera and scanning
   */
  function stopScanning() {
    if (scanner.value) {
      scanner.value.stop()
      scanner.value.destroy()
      scanner.value = null
    }

    isScanning.value = false
  }

  /**
   * Cleanup on unmount
   */
  onUnmounted(() => {
    stopScanning()
  })

  return {
    isScanning,
    error,
    result,
    startScanning,
    stopScanning,
  }
}
