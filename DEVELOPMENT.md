# 批量扫码签到应用 - 开发进度

## ✅ 已完成：第一步和第二步

### 第一步：TS 数据类型设计 ✅

已在 `src/types/index.ts` 中定义了所有数据类型：

- **User**: 用户基本信息（id, name, is_auto）
- **Cookie**: Cookie 信息（id, user_id, value, expires, created_at）
- **UserWithCookie**: 带有最新 cookie 的用户信息
- **ScanHistory**: 扫码历史记录
- **SigninHistory**: 签到历史记录
- **SigninResponse**: 签到接口响应
- **UserAddResponse**: 添加用户接口响应

📄 详细文档：`src/types/README.md`

### 第二步：后端接口封装 ✅

已在 `src/api/index.ts` 中封装了所有后端接口：

#### 用户管理接口
- `getUserList()`: 获取所有用户列表
- `addUser(name)`: 添加新用户
- `removeUser(id)`: 删除用户
- `renameUser(id, new_name)`: 重命名用户
- `refreshUserCookie(id, cookie)`: 更新用户 cookie
- `updateUserAuto(id, is_auto)`: 更新自动签到设置

#### 签到接口
- `signin(scan_result)`: 扫码签到

#### 历史记录接口
- `getSigninHistory(count?, user_id?)`: 获取签到历史
- `getScanHistory(count?, user_id?)`: 获取扫码历史

#### 特性
- ✅ 所有 POST 请求自动添加 `ua_info` 字段
- ✅ 支持 User-Agent Client Hints，回退到传统 UA
- ✅ 统一的错误处理
- ✅ API 端点可配置

📄 详细文档：`src/api/README.md`

### 额外完成的工作 ✅

#### 1. Pinia Store 配置
- 更新了 `src/stores/user.ts`，用于存储：
  - 当前用户 ID
  - API 端点 URL
- 配置了持久化插件（自动保存到 localStorage）

#### 2. 工具函数
创建了 `src/utils/index.ts`，包含：
- `formatRelativeTime()`: 格式化相对时间（如 "2 hours ago"）
- `generateId()`: 生成唯一 ID
- `formatDate()`: 格式化日期
- `truncate()`: 截断文本

#### 3. QR 扫描器 Composable
创建了 `src/composables/qrScanner.ts`：
- 封装了 QR 码扫描功能
- 使用 `qr-scanner` 库
- 支持摄像头访问和实时扫描
- 自动清理资源

#### 4. 依赖安装
- ✅ `pinia-plugin-persistedstate`: Pinia 持久化插件
- ✅ `qr-scanner`: QR 码扫描库

## 📋 下一步：第三步 - 搭建前端

需要在 `src/pages` 中创建以下页面：

### 页面结构
1. **初始设置页面**: 输入 API 端点 URL
2. **用户选择/创建页面**: 选择或创建用户
3. **主页**: 
   - 扫码签到按钮
   - 最近 3 条扫码记录
   - 最近一次签到时间
4. **设置页面**: 
   - 修改用户名
   - 更新自动签到设置
   - 更新 cookie
   - 删除账号
5. **历史记录页面**: 
   - 扫码历史（分页）
   - 签到历史（分页）

### 设计要求
- 暗黑风格
- 少用蓝色紫色
- 简洁的 UI 设计
- 少用阴影等廉价视觉效果

## 使用说明

### 设置 API 端点

```typescript
import { setApiEndpoint } from '~/api'

setApiEndpoint('http://localhost:8000')
```

### 使用 Store

```typescript
import { useUserStore } from '~/stores/user'

const userStore = useUserStore()
userStore.setUserId('user-id')
userStore.setApiEndpoint('http://localhost:8000')
```

### 使用 QR 扫描器

```typescript
import { useQRScanner } from '~/composables/qrScanner'

const { startScanning, stopScanning, isScanning } = useQRScanner()

// 开始扫描
await startScanning(videoElement, (result) => {
  console.log('扫描结果:', result)
})

// 停止扫描
stopScanning()
```

## 项目结构

```
src/
├── api/
│   ├── index.ts          # API 接口封装
│   └── README.md         # API 文档
├── types/
│   ├── index.ts          # 类型定义
│   └── README.md         # 类型文档
├── stores/
│   └── user.ts           # 用户状态管理
├── composables/
│   ├── qrScanner.ts      # QR 扫描器
│   └── dark.ts           # 暗黑模式
├── utils/
│   └── index.ts          # 工具函数
└── pages/
    └── (待创建)           # 页面组件
```
