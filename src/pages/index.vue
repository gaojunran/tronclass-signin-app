<script setup lang="ts">
import type {
  ScanHistory,
  SigninHistory,
  SigninResponse,
  DigitalSigninResponse,
  UserWithCookie,
} from "~/types/index";
import { formatRelativeTime } from "~/utils";
import { isTauri } from "~/utils/tauri";
import { getUserList, signin, signinDigital, getScanHistory, getSigninHistory } from "~/api";
import { useQRScanner } from "~/composables/qrScanner";
import { useQRPhoto } from "~/composables/qrPhoto";
import { useTauriQRScanner } from "~/composables/tauriQrScanner";

defineOptions({
  name: "IndexPage",
});

const userStore = useUserStore();
const router = useRouter();

// State
const step = ref<"config" | "select-user" | "main">("config");
const apiUrl = ref("");
const users = ref<UserWithCookie[]>([]);
const loading = ref(false);
const error = ref("");

// Recent scan history
const recentScans = ref<ScanHistory[]>([]);
const lastSignin = ref<SigninHistory | null>(null);

// User map for displaying names
const userMap = ref<Map<string, string>>(new Map());

// QR Scanner
const showScanner = ref(false);
const videoElement = ref<HTMLVideoElement | null>(null);
const { startScanning, stopScanning, isScanning } = useQRScanner();
const { triggerFileInput, isProcessing } = useQRPhoto();
const { startScanning: startTauriScanning, stopScanning: stopTauriScanning, isScanning: isTauriScanning } = useTauriQRScanner();

// Scan result display
const scanResult = ref<SigninResponse | null>(null);

// Digital signin dialog
const showDigitalDialog = ref(false);
const digitalCode = ref("");
const digitalResult = ref<DigitalSigninResponse | null>(null);

// Initialize
onMounted(async () => {
  if (userStore.apiEndpoint) {
    apiUrl.value = userStore.apiEndpoint;
    if (userStore.userId) {
      step.value = "main";
      await loadMainData();
    } else {
      step.value = "select-user";
      await loadUsers();
    }
  }
});

// Load users
async function loadUsers() {
  try {
    loading.value = true;
    error.value = "";
    users.value = await getUserList();
    // Build user map
    userMap.value = new Map(users.value.map((u) => [u.id, u.name]));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载用户列表失败";
  } finally {
    loading.value = false;
  }
}

// Set API endpoint
async function setApiEndpoint() {
  if (!apiUrl.value.trim()) {
    error.value = "请输入 API 端点 URL";
    return;
  }

  // Backdoor: if input is "613614", set to specific URL
  if (apiUrl.value.trim() === "613614") {
    apiUrl.value = "https://api.codenebula.top/tronclass";
  }

  userStore.setApiEndpoint(apiUrl.value.trim());
  step.value = "select-user";
  await loadUsers();
}

// Select user
function selectUser(user: UserWithCookie) {
  userStore.setUserId(user.id);
  userStore.setUserName(user.name);
  step.value = "main";
  loadMainData();
}

// Create new user
function createNewUser() {
  router.push("/create-user");
}

// Load main page data
async function loadMainData() {
  try {
    loading.value = true;
    const [scans, signins, allUsers] = await Promise.all([
      getScanHistory(3),
      getSigninHistory(1, userStore.userId),
      getUserList(),
    ]);
    recentScans.value = scans;
    lastSignin.value = signins.length > 0 ? signins[0] : null;
    // Build user map
    userMap.value = new Map(allUsers.map((u) => [u.id, u.name]));
  } catch (err) {
    console.error("加载数据失败:", err);
  } finally {
    loading.value = false;
  }
}

// Start QR scanning
async function startQRScan() {
  scanResult.value = null;
  digitalResult.value = null;

  // Check scan mode
  if (userStore.scanMode === 'photo') {
    // Photo upload mode
    const input = triggerFileInput(handleScanResult);
    input.click();
  } else {
    // Video stream mode (default)
    // Check if running in Tauri environment
    if (isTauri()) {
      // Use Tauri barcode scanner
      try {
        await startTauriScanning(handleScanResult);
      } catch (err) {
        console.warn("Tauri扫码失败，fallback到调试模式:", err);
        // Fallback to debug mode using last scan result
        await debugWithLastResult();
      }
    } else {
      // Use web-based QR scanner
      showScanner.value = true;
      await nextTick();

      if (videoElement.value) {
        try {
          await startScanning(videoElement.value, handleScanResult);
        } catch (err) {
          console.warn("无法启动摄像头，fallback到调试模式:", err);
          // Fallback to debug mode using last scan result
          await debugWithLastResult();
        }
      }
    }
  }
}

// Handle scan result
async function handleScanResult(result: string) {
  // Only stop scanning if in video mode
  if (userStore.scanMode === 'video') {
    if (isTauri()) {
      stopTauriScanning();
    } else {
      stopScanning();
    }
  }
  
  loading.value = true;

  try {
    const response = await signin(result, userStore.userId);
    scanResult.value = response;
    await loadMainData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "签到失败";
  } finally {
    loading.value = false;
    showScanner.value = false;
  }
}

// Close scanner
function closeScanner() {
  if (isTauri()) {
    stopTauriScanning();
  } else {
    stopScanning();
  }
  showScanner.value = false;
}

// Navigate to settings
function goToSettings() {
  router.push("/settings");
}

// Navigate to history
function goToHistory() {
  router.push("/history");
}

// Get user name by id
function getUserName(userId: string): string {
  return userMap.value.get(userId) || "未知用户";
}

// Start digital signin
function startDigitalSignin() {
  scanResult.value = null;
  digitalResult.value = null;
  digitalCode.value = "";
  showDigitalDialog.value = true;
}

// Handle digital signin
async function handleDigitalSignin() {
  loading.value = true;
  error.value = "";

  try {
    const response = await signinDigital(userStore.userId, digitalCode.value || undefined);
    digitalResult.value = response;
    scanResult.value = null; // Clear scan result
    showDigitalDialog.value = false; // Close dialog first
    await loadMainData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "数字签到失败";
  } finally {
    loading.value = false;
  }
}

// Close digital dialog
function closeDigitalDialog() {
  showDigitalDialog.value = false;
  digitalCode.value = "";
}

// Debug: use last scan result from backend
async function debugWithLastResult() {
  stopScanning();
  loading.value = true;

  try {
    // Fetch the most recent scan result from backend
    const lastScans = await getScanHistory(1);
    if (lastScans.length === 0) {
      error.value = "没有历史扫描记录";
      loading.value = false;
      showScanner.value = false;
      return;
    }

    const lastScanResult = lastScans[0].result;
    const response = await signin(lastScanResult, userStore.userId);
    scanResult.value = response;
    await loadMainData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "签到失败";
  } finally {
    loading.value = false;
    showScanner.value = false;
  }
}
</script>

<template>
  <div min-h-screen bg-neutral-900 text-neutral-100 p-6>
    <!-- Step 1: API Configuration -->
    <div v-if="step === 'config'" max-w-md mx-auto mt-20>
      <div text-3xl font-bold mb-8 flex items-center>
        <div i-carbon-qr-code inline-block mr-2 />
        畅课签到助手
      </div>

      <div mb-6>
        <label text-sm text-neutral-400 mb-2 block>API 端点 URL</label>
        <input
          v-model="apiUrl"
          type="url"
          placeholder="https://api.example.com"
          bg-neutral-800
          border-1
          border-neutral-700
          rounded
          px-4
          py-3
          w-full
          focus:outline-none
          focus:border-neutral-500
          @keydown.enter="setApiEndpoint"
        />
      </div>

      <button
        bg-neutral-700
        hover:bg-neutral-600
        px-6
        py-3
        rounded
        w-full
        :disabled="loading"
        @click="setApiEndpoint"
      >
        {{ loading ? "连接中..." : "继续" }}
      </button>

      <div v-if="error" mt-4 text-red-400 text-sm>
        {{ error }}
      </div>
    </div>

    <!-- Step 2: User Selection -->
    <div v-else-if="step === 'select-user'" max-w-2xl mx-auto mt-10>
      <div text-2xl font-bold mb-6>选择你的账号</div>

      <div v-if="loading" text-center py-10>
        <div i-carbon-loading animate-spin text-4xl />
      </div>

      <div v-else>
        <div space-y-3 mb-6>
          <div
            v-for="user in users"
            :key="user.id"
            bg-neutral-800
            hover:bg-neutral-750
            border-1
            border-neutral-700
            rounded
            p-4
            cursor-pointer
            @click="selectUser(user)"
          >
            <div flex items-center justify-between>
              <div>
                <div text-lg font-medium>{{ user.name }}</div>
                <div text-sm text-neutral-400>
                  自动签到：{{ user.is_auto ? "是" : "否" }}
                </div>
                <div v-if="user.expires" text-xs text-neutral-500 mt-1>
                  Cookie 过期时间：{{
                    new Date(user.expires).toLocaleDateString()
                  }}
                </div>
              </div>
              <div i-carbon-chevron-right text-xl text-neutral-500 />
            </div>
          </div>
        </div>

        <button
          bg-neutral-700
          hover:bg-neutral-600
          px-6
          py-3
          rounded
          w-full
          @click="createNewUser"
        >
          <div i-carbon-add inline-block mr-2 />
          创建新用户
        </button>
      </div>

      <div v-if="error" mt-4 text-red-400 text-sm>
        {{ error }}
      </div>
    </div>

    <!-- Step 3: Main Page -->
    <div v-else-if="step === 'main'" max-w-4xl mx-auto mt-10>
      <!-- Header -->
      <div flex items-center justify-between mb-8>
        <div>
          <div text-2xl font-bold>欢迎，{{ userStore.userName }}</div>
          <div text-sm text-neutral-400 mt-1>
            上次签到：{{
              lastSignin
                ? formatRelativeTime(lastSignin.created_at)
                : "从未签到"
            }}
          </div>
        </div>
        <button
          bg-neutral-800
          hover:bg-neutral-700
          p-3
          rounded
          @click="goToSettings"
        >
          <div i-carbon-settings text-xl />
        </button>
      </div>

      <!-- Scan Result Display -->
      <div
        v-if="scanResult"
        bg-neutral-800
        border-1
        border-neutral-700
        rounded
        p-6
        mb-6
      >
        <div text-lg font-bold mb-4 flex items-center>
          <div i-carbon-checkmark-filled text-green-400 mr-2 />
          扫码签到完成
        </div>

        <div>
          <div text-sm text-neutral-400 mb-2>
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
              <div flex items-center justify-between mb-2>
                <div font-medium>{{ getUserName(signinItem.user_id) }}</div>
                <div
                  :class="
                    signinItem.response_code === 200
                      ? 'text-green-400'
                      : signinItem.response_code === null
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  "
                >
                  {{ signinItem.response_code ?? '失败' }}
                </div>
              </div>
              <!-- Show full response on failure -->
              <div 
                v-if="signinItem.response_code !== 200"
                mt-2
                pt-2
                border-t-1
                border-neutral-800
              >
                <div 
                  text-xs
                  font-mono
                  bg-neutral-950
                  p-2
                  rounded
                  text-red-400
                  break-all
                  max-h-40
                  overflow-y-auto
                >
                  {{ typeof signinItem.response_data === 'string' 
                     ? signinItem.response_data 
                     : JSON.stringify(signinItem.response_data, null, 2) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          mt-4
          bg-neutral-700
          hover:bg-neutral-600
          px-4
          py-2
          rounded
          text-sm
          @click="scanResult = null"
        >
          关闭
        </button>
      </div>

      <!-- Digital Signin Result Display -->
      <div
        v-if="digitalResult"
        bg-neutral-800
        border-1
        border-neutral-700
        rounded
        p-6
        mb-6
      >
        <div text-lg font-bold mb-4 flex items-center>
          <div i-carbon-checkmark-filled text-blue-400 mr-2 />
          数字签到完成
        </div>

        <!-- Signin Code Display -->
        <div mb-4>
          <div text-sm text-neutral-400 mb-1>使用的签到码：</div>
          <div text-lg font-mono bg-neutral-900 p-3 rounded text-center tracking-widest font-bold text-blue-400>
            {{ 
              digitalResult.signin_results.length > 0 && 
              digitalResult.signin_results[0].request_data?.numberCode 
                ? digitalResult.signin_results[0].request_data.numberCode 
                : '遍历破解'
            }}
          </div>
        </div>

        <!-- Signin Results -->
        <div>
          <div text-sm text-neutral-400 mb-2>
            签到结果（{{ digitalResult.signin_results.length }} 人）：
          </div>
          <div space-y-2>
            <div
              v-for="signinItem in digitalResult.signin_results"
              :key="signinItem.id"
              bg-neutral-900
              p-3
              rounded
              text-sm
            >
              <div flex items-center justify-between mb-2>
                <div font-medium>{{ getUserName(signinItem.user_id) }}</div>
                <div
                  :class="
                    signinItem.response_code === 200
                      ? 'text-green-400'
                      : signinItem.response_code === null
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  "
                >
                  {{ signinItem.response_code ?? '失败' }}
                </div>
              </div>
              <!-- Show full response on failure -->
              <div 
                v-if="signinItem.response_code !== 200"
                mt-2
                pt-2
                border-t-1
                border-neutral-800
              >
                <div 
                  text-xs
                  font-mono
                  bg-neutral-950
                  p-2
                  rounded
                  text-red-400
                  break-all
                  max-h-40
                  overflow-y-auto
                >
                  {{ typeof signinItem.response_data === 'string' 
                     ? signinItem.response_data 
                     : JSON.stringify(signinItem.response_data, null, 2) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          mt-4
          bg-neutral-700
          hover:bg-neutral-600
          px-4
          py-2
          rounded
          text-sm
          @click="digitalResult = null"
        >
          关闭
        </button>
      </div>

      <!-- Scan Button -->
      <button
        bg-orange-600
        hover:bg-orange-500
        text-white
        px-8
        py-4
        rounded-lg
        text-lg
        font-medium
        w-full
        mb-4
        flex
        items-center
        justify-center
        :disabled="loading || isScanning"
        @click="startQRScan"
      >
        <div i-carbon-qr-code mr-2 text-2xl />
        <span>{{ isScanning ? "扫码中..." : "扫码签到" }}</span>
      </button>

      <!-- Digital Signin Button -->
      <button
        bg-blue-600
        hover:bg-blue-500
        text-white
        px-8
        py-4
        rounded-lg
        text-lg
        font-medium
        w-full
        mb-8
        flex
        items-center
        justify-center
        :disabled="loading"
        @click="startDigitalSignin"
      >
        <div i-carbon-keyboard mr-2 text-2xl />
        <span>数字签到</span>
      </button>

      <!-- Recent Scans -->
      <div mb-8>
        <div flex items-center justify-between mb-4>
          <div text-lg font-bold>最近扫码</div>
          <button
            text-sm
            text-neutral-400
            hover:text-neutral-200
            flex
            items-center
            gap-1
            @click="goToHistory"
          >
            <span>查看全部</span>
            <div i-carbon-chevron-right />
          </button>
        </div>

        <div v-if="recentScans.length === 0" text-center py-8 text-neutral-500>
          暂无扫码记录
        </div>

        <div v-else space-y-3>
          <div
            v-for="scan in recentScans"
            :key="scan.id"
            bg-neutral-800
            border-1
            border-neutral-700
            rounded
            p-4
          >
            <div flex items-start justify-between>
              <div flex-1 mr-4>
                <div text-base font-medium text-neutral-200 mb-2>
                  {{ getUserName(scan.user_id) }}
                </div>
                <div text-sm text-neutral-400>
                  {{ formatRelativeTime(scan.created_at) }}
                </div>
              </div>
              <div i-carbon-qr-code text-xl text-neutral-600 />
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div
        v-if="error"
        bg-red-900
        bg-opacity-20
        border-1
        border-red-700
        rounded
        p-4
        text-red-400
        text-sm
      >
        {{ error }}
      </div>
    </div>

    <!-- Digital Signin Dialog -->
    <div
      v-if="showDigitalDialog"
      fixed
      inset-0
      bg-black
      bg-opacity-90
      z-50
      flex
      items-center
      justify-center
      p-6
    >
      <div max-w-md w-full bg-neutral-800 rounded-lg p-6>
        <div flex items-center justify-between mb-4>
          <div text-xl font-bold>数字签到</div>
          <button
            bg-neutral-700
            hover:bg-neutral-600
            p-2
            rounded
            @click="closeDigitalDialog"
          >
            <div i-carbon-close text-xl />
          </button>
        </div>

        <div mb-4>
          <label text-sm text-neutral-400 mb-2 block>
            签到码（可选）
          </label>
          <input
            v-model="digitalCode"
            type="text"
            placeholder="输入数字签到码"
            bg-neutral-900
            border-1
            border-neutral-700
            rounded
            px-4
            py-3
            w-full
            text-center
            text-2xl
            tracking-widest
            font-mono
            focus:outline-none
            focus:border-blue-500
            @keydown.enter="handleDigitalSignin"
          />
          <div text-xs text-neutral-500 mt-2 text-center>
            留空则使用遍历破解方式，签到课程由 API 后端自动确定
          </div>
        </div>

        <button
          bg-blue-600
          hover:bg-blue-500
          text-white
          px-6
          py-3
          rounded
          w-full
          :disabled="loading"
          @click="handleDigitalSignin"
        >
          {{ loading ? "签到中..." : "开始签到" }}
        </button>

        <!-- Error Display with Full Response -->
        <div v-if="error" mt-4>
          <div 
            bg-neutral-900
            border-1
            border-red-900
            rounded
            p-3
            text-xs
            font-mono
            text-red-400
            break-all
            max-h-60
            overflow-y-auto
          >
            {{ error }}
          </div>
        </div>
      </div>
    </div>

    <!-- QR Scanner Modal -->
    <div
      v-if="showScanner"
      fixed
      inset-0
      bg-black
      bg-opacity-90
      z-50
      flex
      items-center
      justify-center
      p-6
    >
      <div max-w-2xl w-full flex flex-col>
        <div flex items-center justify-between mb-4 flex-shrink-0>
          <div text-xl font-bold>扫描二维码</div>
          <div flex items-center gap-2>
            <button
              bg-yellow-700
              hover:bg-yellow-600
              px-3
              py-2
              rounded
              text-sm
              flex
              items-center
              gap-1
              :disabled="loading"
              @click="debugWithLastResult"
            >
              <div i-carbon-debug text-base />
              <span>调试</span>
            </button>
            <button
              bg-neutral-800
              hover:bg-neutral-700
              p-2
              rounded
              @click="closeScanner"
            >
              <div i-carbon-close text-xl />
            </button>
          </div>
        </div>

        <div
          bg-neutral-900
          rounded-lg
          overflow-hidden
          relative
          flex-shrink
          min-h-0
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

        <div text-sm text-neutral-400 text-center mt-4 flex-shrink-0>
          <span v-if="!loading">将二维码放置在框内</span>
          <span v-else>请稍候，正在为所有用户签到</span>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
