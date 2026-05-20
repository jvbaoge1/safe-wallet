# imToken 十周年 AI 共创活动 — 提交材料

## 作品信息

| 项目 | 内容 |
|------|------|
| **作品名称** | SafeWallet — 基于 Token Core 的安全优先钱包 Demo |
| **作品类型** | Web 应用（React + Vite + tcx-wasm） |
| **作品方向** | 🔒 安全向 |
| **演示链接** | 本地部署：`cd imtoken-safe-wallet && npm install && npm run dev` |

---

## 一、功能说明

SafeWallet 是一个安全优先的钱包原型，100% 在浏览器本地运行（通过 WebAssembly）， демонстрирует Token Core 的核心能力并结合安全设计理念。

### 核心功能

1. **创建/导入 HD 钱包**
   - 使用 `tcx-wasm create_keystore` 生成 PBKDF2 600K 加密 keystore
   - 支持随机生成或导入已有助记词

2. **多链账户派生**
   - 使用 `tcx-wasm derive_accounts` 从单一助记词派生 ETH / TRX / BTC 地址
   - 一键切换链，查看对应地址

3. **消息签名**
   - 使用 `tcx-wasm sign_message` 在本地签署消息
   - 支持 ETH PersonalSign / TRON 消息 / BTC BIP-322

4. **URL 安全检测**
   - 内置钓鱼域名特征库，实时评估 URL 风险等级
   - 识别假官网、假客服等常见钓鱼模式

5. **交易风险评估**
   - 签名前自动评估交易金额风险等级
   - 大额交易预警提醒

6. **安全清单**
   - 8 项核心安全检查项，覆盖从钱包创建到日常使用
   - 可交互勾选，追踪安全加固进度

### 设计理念
- **本地优先**：所有密钥操作通过 tcx-wasm 在浏览器 WASM 中完成，零数据外传
- **安全内嵌**：安全检查不是附加功能，而是融入钱包交互的每个环节
- **教育导向**：通过实际操作 teach 用户安全意识

---

## 二、创作思路

### 灵感来源
在加密货币世界中，90% 的资产损失源于安全意识不足——假官网、钓鱼授权、助记词泄露。imToken 作为非托管钱包，安全是其核心价值。因此我选择「安全向」方向，将安全意识直接融入钱包交互。

### 技术选型
- **tcx-wasm (Token Core)**：imToken 官方的 WebAssembly 版 TokenCore，提供真正的多链钱包内核能力
- **React + Vite**：快速原型开发，AI 工具友好
- **纯前端架构**：无需后端，全部在浏览器本地运行

### AI 辅助创作
本作品全程使用 AI 编程工具（WorkBuddy CodeBuddy）生成代码。通过自然语言描述需求，AI 生成完整的 React 组件、安全评估逻辑和 tcx-wasm 集成代码。

---

## 三、使用的 Token Core 能力

| API | 用途 | 状态 |
|-----|------|------|
| `create_keystore` | 创建加密 HD 钱包 keystore（PBKDF2 600K 轮） | ✅ 已集成 |
| `derive_accounts` | 多链地址派生（ETH, TRON, BTC） | ✅ 已集成 |
| `export_mnemonic` | 从加密 keystore 导出助记词 | ✅ 已集成 |
| `sign_message` | 本地消息签名（PersonalSign, TRON, BIP-322） | ✅ 已集成 |
| `sign_tx` | 交易签名（EIP-155, EIP-1559, TRON, BTC UTXO） | 📋 已列出 |
| `cache_keystore` | 缓存 keystore 到 WASM 内存 | ✅ 已集成 |

### Token UI 使用情况
- 参考了 Token UI (consenlabs/token-ui) 的设计规范
- 钱包界面风格遵循 imToken 设计系统（蓝色主题、卡片式布局、移动优先）
- 组件结构参考了 Token UI 的 Button / Card / Toast 组件设计

---

## 四、快速体验

```bash
# 克隆项目
git clone <repo-url>
cd imtoken-safe-wallet

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器打开 http://localhost:5173
```

### 操作流程
1. 打开页面 → 等待 tcx-wasm 初始化完成
2. 输入密码 → 点击「创建新钱包」
3. 切换 ETH/TRX/BTC 标签 → 查看多链地址
4. 切换到 Security 标签 → 测试 URL 安全检测
5. 切换到 Tools 标签 → 测试消息签名

---

> **注意**：本作品为 imToken 十周年 AI 共创活动的参与作品，旨在展示 Token Core 的安全能力和教育意义。请勿用于管理真实资产。
