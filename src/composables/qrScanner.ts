import { ref } from 'vue'
import QrScanner from 'qr-scanner'

/**
 * Check if the native BarcodeDetector API is available and supports QR codes
 */
async function isBarcodeDetectorAvailable(): Promise<boolean> {
  if (!('BarcodeDetector' in window)) {
    return false
  }
  try {
    const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats()
    return supportedFormats.includes('qr_code')
  }
  catch {
    return false
  }
}

/**
 * Composable for QR code scanning using device camera
 * Prefers native BarcodeDetector API, falls back to qr-scanner library
 */
export function useQRScanner() {
  const isScanning = ref(false)
  const scanner = ref<QrScanner | null>(null)
  const error = ref<string | null>(null)
  const result = ref<string | null>(null)

  // Native BarcodeDetector state
  let nativeDetector: any = null
  let nativeStream: MediaStream | null = null
  let nativeAnimationFrameId: number | null = null

  /**
   * Start scanning using native BarcodeDetector API
   */
  async function startNativeScanning(
    videoElement: HTMLVideoElement,
    onScanSuccess: (scanResult: string) => void,
  ) {
    nativeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    nativeStream = stream
    videoElement.srcObject = stream
    await videoElement.play()
    isScanning.value = true

    // Continuously detect barcodes from video frames
    const detect = async () => {
      if (!isScanning.value)
        return
      try {
        const barcodes = await nativeDetector.detect(videoElement)
        if (barcodes.length > 0) {
          const data = barcodes[0].rawValue
          if (data) {
            result.value = data
            onScanSuccess(data)
            return // Stop scanning after first successful result
          }
        }
      }
      catch (err) {
        // Detection frame error, continue scanning
        console.debug('BarcodeDetector frame error:', err)
      }
      nativeAnimationFrameId = requestAnimationFrame(detect)
    }
    nativeAnimationFrameId = requestAnimationFrame(detect)
  }

  /**
   * Stop native BarcodeDetector scanning
   */
  function stopNativeScanning() {
    if (nativeAnimationFrameId !== null) {
      cancelAnimationFrame(nativeAnimationFrameId)
      nativeAnimationFrameId = null
    }
    if (nativeStream) {
      nativeStream.getTracks().forEach(track => track.stop())
      nativeStream = null
    }
    nativeDetector = null
    isScanning.value = false
  }

  /**
   * Start scanning using qr-scanner library (fallback)
   */
  async function startQrScannerLibrary(
    videoElement: HTMLVideoElement,
    onScanSuccess: (scanResult: string) => void,
  ) {
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
        preferredCamera: 'environment',
      },
    )
    await scanner.value.start()
    isScanning.value = true
  }

  /**
   * Start the camera and begin scanning
   * Prefers native BarcodeDetector, falls back to qr-scanner library
   */
  async function startScanning(
    videoElement: HTMLVideoElement,
    onScanSuccess: (scanResult: string) => void,
  ) {
    try {
      error.value = null
      result.value = null

      const useNative = await isBarcodeDetectorAvailable()
      if (useNative) {
        console.log('Using native BarcodeDetector API for QR scanning')
        await startNativeScanning(videoElement, onScanSuccess)
      }
      else {
        console.log('BarcodeDetector not available, falling back to qr-scanner library')
        await startQrScannerLibrary(videoElement, onScanSuccess)
      }
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
    // Stop native scanner if active
    stopNativeScanning()

    // Stop qr-scanner library if active
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
