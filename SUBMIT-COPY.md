# SafeWallet 提交材料 — 直接复制版

## 基本信息

作品名称：SafeWallet
作品类型：Web 应用
演示链接：https://jvbaoge1.github.io/safe-wallet/
代码仓库：https://github.com/jvbaoge1/safe-wallet

---

## 作品简介

SafeWallet 是一个安全优先的多链钱包 Demo，100% 在浏览器本地运行，使用 imToken Token Core (tcx-wasm) 进行密钥管理。采用暗黑金库主题设计，集成 URL 钓鱼扫描、交易风险评估和安全清单，将安全意识融入钱包交互的每个环节。

---

## 功能说明

1. 创建 HD 钱包 — 使用 tcx-wasm create_keystore，PBKDF2 600K 加密
2. 多链地址派生 — 单助记词派生 ETH / TRX / BTC（通过 derive_accounts）
3. 消息签名 — 支持 PersonalSign / TRON 消息签名（通过 sign_message）
4. URL 安全扫描 — 内置钓鱼域名特征库，实时评估风险等级
5. 交易风险评估 — 签名前自动评估，大额交易拦截预警
6. 安全清单 — 8项核心安全检查项，可交互勾选
7. 转账 UI — 含 Gas 费展示、风险拦截、活动日志
8. 助记词备份 — 安全导出和展示

---

## 创作思路

灵感来源：加密世界中90%的资产损失源于安全意识不足——假官网、钓鱼授权、助记词泄露。imToken 作为非托管钱包，安全是其核心价值。因此选择「安全向」方向，将安全能力直接融入钱包产品交互。

技术方案：使用 tcx-wasm (Token Core) 提供 WebAssembly 本地密码学运算，React + Vite 构建纯前端应用，无需后端，所有密钥操作在浏览器中完成，零数据外传。

设计风格：采用暗黑金库主题，金色渐变标题配合毛玻璃卡片效果，营造专业安全感。每个操作都记录在活动日志中，形成完整的钱包使用审计链。

AI 辅助创作：全程使用 AI 编程工具生成代码，通过自然语言描述需求完成开发。

---

## 使用的 Token Core 能力

| API | 用途 | 状态 |
|-----|------|------|
| create_keystore | 创建加密 HD 钱包（PBKDF2 600K轮） | ✅ 已集成 |
| derive_accounts | 多链地址派生（ETH, TRON, BTC） | ✅ 已集成 |
| export_mnemonic | 从加密 keystore 导出助记词 | ✅ 已集成 |
| sign_message | 本地消息签名（PersonalSign, TRON） | ✅ 已集成 |
| cache_keystore | 缓存 keystore 到 WASM 内存 | ✅ 已集成 |
| clear_cached_keystore | 清除缓存的 keystore | ✅ 已集成 |

---

## 推特发帖文案

【imToken 十周年 AI 共创作品】SafeWallet — 基于 Token Core 的安全优先多链钱包

✅ tcx-wasm 本地创建 HD 钱包（PBKDF2 600K 加密）
✅ 单助记词派生 ETH / TRX / BTC 多链地址
✅ 本地消息签名（PersonalSign / TRON）
✅ URL 安全扫描 + 交易风险评估
✅ 8项安全交互清单 + 活动日志
✅ 100% 浏览器本地运行，零数据外传

在线体验：https://jvbaoge1.github.io/safe-wallet/
代码开源：https://github.com/jvbaoge1/safe-wallet

@imTokenCN #imToken10周年 #AI共创 #tcxWasm
