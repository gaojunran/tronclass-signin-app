# Tronclass 签到应用

一个支持畅课平台批量二维码签到和自动签到的 Web 应用。灵感来自 [KrsMt-0113/XMU-Rollcall-bot_qrCode](https://github.com/KrsMt-0113/XMU-Rollcall-bot_qrCode) 等项目。

> [!CAUTION]
> 注意该项目不涉及二维码解密、批量签到等内容，它们应该在 **开发者自部署的后端** 中实现。因此本项目不承担由于使用者不当使用而造成的任何后果。

## 功能特性

- ⚡ 仅需一个人扫码，为所有启用的用户自动批量签到
- 📱 使用设备摄像头扫描二维码
- 📊 扫码和签到历史记录追踪
- ✨ 前后端解耦，支持自定义后端 API 端点，轻松适配你的大学！
- (WIP) 数字签到和雷达签到支持

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **样式**：UnoCSS
- **一站式框架**：[vitesse](https://github.com/antfu-collective/vitesse)

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 生产构建
pnpm run build
```

## 项目结构

```
src/
├── api/           # API 客户端函数
├── components/    # 可复用的 Vue 组件
├── composables/   # Vue 组合式函数（二维码扫描器等）
├── layouts/       # 页面布局
├── pages/         # 应用页面
│   ├── index.vue       # 主页（扫码和仪表板）
│   ├── create-user.vue # 用户创建页面
│   ├── settings.vue    # 用户设置页面
│   └── history.vue     # 历史记录页面
├── stores/        # Pinia 状态存储
├── styles/        # 全局样式
├── types/         # TypeScript 类型定义
└── utils/         # 工具函数
```

## API 端点

应用需要以下后端 API 端点：

- `GET /user/list` - 列出所有用户
- `POST /user/add` - 创建新用户
- `POST /user/remove/<id>` - 删除用户
- `POST /user/rename/<id>` - 重命名用户
- `POST /user/refresh/<id>` - 更新用户 Cookie
- `POST /user/auto/<id>` - 更新自动签到设置
- `POST /signin` - 提交扫描结果并触发签到
- `GET /history/scan` - 获取扫码历史
- `GET /history/signin` - 获取签到历史
- (WIP) `GET /backend` - 获取后端 API 信息

[学在重邮后端](https://github.com/gaojunran/tronclass-signin-api-cqupt) 是一个示例的后端实现，使用 Hono + Deno + Prisma + Postgres 构建。你可以基于自己的技术栈，构建自己大学的 API 端点。

## 许可证

MIT
