<script setup lang="ts">
import type { SigninResponse } from "~/types/index";
import { signin } from "~/api";
import { useQRScanner } from "~/composables/qrScanner";
import { useQRPhoto } from "~/composables/qrPhoto";

defineOptions({
  name: "SharePage",
});

const route = useRoute();
const userStore = useUserStore();

// Get parameters from URL
const endpoint = ref<string>("");
const userId = ref<string>("");
const loading = ref(false);
const error = ref("");

// Save original endpoint to restore later
const originalEndpoint = ref<string>("");

// QR Scanner
const showScanner = ref(false);
const videoElement = ref<HTMLVideoElement | null>(null);
const { startScanning, stopScanning, isScanning } = useQRScanner();
const { triggerFileInput, isProcessing } = useQRPhoto();

// Scan result display
const scanResult = ref<SigninResponse | null>(null);

// Initialize
onMounted(async () => {
  // Get parameters from URL
  endpoint.value = (route.query.endpoint as string) || "";
  userId.value = (route.query.user_id as string) || "";

  if (!endpoint.value || !userId.value) {
    error.value = "无效的分享链接：缺少必要参数";
    return;
  }

  // Save original endpoint and set temporary endpoint
  originalEndpoint.value = userStore.apiEndpoint;
  userStore.setApiEndpoint(endpoint.value);

  // Auto start scanning
  await nextTick();
  startQRScan();
});

// Restore original endpoint on unmount
onUnmounted(() => {
  if (originalEndpoint.value) {
    userStore.setApiEndpoint(originalEndpoint.value);
  }
});

// Start QR scanning
async function startQRScan() {
  scanResult.value = null;
  error.value = "";

  // Check scan mode
  if (userStore.scanMode === 'photo') {
    // Photo upload mode
    const input = triggerFileInput(handleScanResult);
    input.click();
  } else {
    // Video stream mode (default)
    showScanner.value = true;
    await nextTick();

    if (videoElement.value) {
      try {
        await startScanning(videoElement.value, handleScanResult);
      } catch (err) {
        error.value = "无法启动摄像头，请检查权限设置";
        console.error("摄像头启动失败:", err);
      }
    }
  }
}

// Handle scan result
async function handleScanResult(result: string) {
  // Only stop scanning if in video mode
  if (userStore.scanMode === 'video') {
    stopScanning();
  }
  
  loading.value = true;
  error.value = "";

  try {
    const response = await signin(result, userId.value);
    scanResult.value = response;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "签到失败";
  } finally {
    loading.value = false;
    showScanner.value = false;
  }
}

// Retry scanning
function retryScan() {
  scanResult.value = null;
  error.value = "";
  startQRScan();
}

// Get user name by id
function getUserName(userId: string): string {
  return userId;
}
</script>

<template>
  <div min-h-screen bg-neutral-900 text-neutral-100 p-6>
    <div max-w-4xl mx-auto mt-10>
      <!-- Header -->
      <div text-center mb-8>
        <div text-3xl font-bold mb-2 flex items-center justify-center>
          <div i-carbon-qr-code inline-block mr-2 />
          代签到
        </div>
        <div text-sm text-neutral-400>
          扫描二维码为他人签到
        </div>
      </div>

      <!-- Error Display -->
      <div
        v-if="error && !showScanner"
        bg-red-900
        bg-opacity-20
        border-1
        border-red-700
        rounded-lg
        p-6
        text-center
        mb-6
      >
        <div i-carbon-warning text-4xl text-red-400 mb-3 />
        <div text-red-400 text-lg mb-4>{{ error }}</div>
        <button
          v-if="endpoint && userId"
          bg-orange-600
          hover:bg-orange-500
          px-6
          py-3
          rounded
          @click="retryScan"
        >
          重试
        </button>
      </div>

      <!-- Scan Result Display -->
      <div
        v-if="scanResult"
        bg-neutral-800
        border-1
        border-neutral-700
        rounded-lg
        p-6
        mb-6
      >
        <div text-lg font-bold mb-4 flex items-center justify-center>
          <div i-carbon-checkmark-filled text-green-400 mr-2 text-2xl />
          签到完成
        </div>

        <div mb-4>
          <div text-sm text-neutral-400 mb-2 text-center>扫码结果：</div>
          <div text-sm font-mono bg-neutral-900 p-3 rounded break-all>
            {{ scanResult.scan_result.result }}
          </div>
        </div>

        <div>
          <div text-sm text-neutral-400 mb-2 text-center>
            签到结果（{{ scanResult.signin_results.length }} 人）：
          </div>
          <div space-y-2>
            <div
              v-for="signinItem in scanResult.signin_results"
              :key="signinItem.id"
              bg-neutral-900
              p-3
              rounded
              text-sm
            >
              <div flex items-center justify-between>
                <div font-medium>{{ getUserName(signinItem.user_id) }}</div>
                <div
                  :class="
                    signinItem.response_code === 200
                      ? 'text-green-400'
                      : 'text-red-400'
                  "
                >
                  {{ signinItem.response_code }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          mt-4
          bg-orange-600
          hover:bg-orange-500
          px-6
          py-3
          rounded
          w-full
          @click="retryScan"
        >
          继续扫码
        </button>
      </div>

      <!-- QR Scanner -->
      <div v-if="showScanner" max-w-2xl mx-auto>
        <div
          bg-neutral-800
          border-1
          border-neutral-700
          rounded-lg
          overflow-hidden
          relative
        >
          <video ref="videoElement" w-full h-auto max-h-70vh object-contain />

          <!-- Loading Overlay -->
          <div
            v-if="loading"
            absolute
            inset-0
            bg-black
            bg-opacity-80
            flex
            flex-col
            items-center
            justify-center
          >
            <div i-carbon-circle-dash text-6xl text-orange-500 animate-spin />
            <div text-lg text-white mt-4>正在处理签到...</div>
          </div>
        </div>

        <div text-sm text-neutral-400 text-center mt-4>
          <span v-if="!loading">将二维码放置在框内</span>
          <span v-else>请稍候，正在签到</span>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
