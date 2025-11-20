import { ref } from 'vue'
import QrScanner from 'qr-scanner'

/**
 * Composable for QR code scanning using photo upload
 */
export function useQRPhoto() {
  const isProcessing = ref(false)
  const error = ref<string | null>(null)
  const result = ref<string | null>(null)

  /**
   * Scan QR code from an image file
   */
  async function scanFromFile(
    file: File,
    onScanSuccess: (scanResult: string) => void,
  ) {
    try {
      isProcessing.value = true
      error.value = null
      result.value = null

      // Scan QR code from the file
      const scanResult = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      })

      result.value = scanResult.data
      onScanSuccess(scanResult.data)
    }
    catch (err) {
      // Provide user-friendly error message
      const errorMessage = err instanceof Error && err.message.includes('No QR code found')
        ? '未能识别到二维码，请确保照片清晰且包含完整的二维码'
        : '无法从图片中扫描二维码，请重试'
      
      error.value = errorMessage
      console.error('QR Photo scan error:', err)
      
      // Show alert to user
      alert(errorMessage)
      
      throw new Error(errorMessage)
    }
    finally {
      isProcessing.value = false
    }
  }

  /**
   * Create a file input element and trigger file selection
   */
  function triggerFileInput(onScanSuccess: (scanResult: string) => void): HTMLInputElement {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Use back camera on mobile

    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]

      if (file) {
        try {
          await scanFromFile(file, onScanSuccess)
        }
        catch (err) {
          // Error already handled in scanFromFile
        }
      }
    })

    return input
  }

  return {
    isProcessing,
    error,
    result,
    scanFromFile,
    triggerFileInput,
  }
}
