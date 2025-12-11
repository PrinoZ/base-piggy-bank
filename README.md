Base Piggy Bank
Base Piggy Bank 是一个在 Base 链上进行 USDC → cbBTC 定投（DCA）的迷你应用，非托管、简单易用，支持 Farcaster Frame / Base Mini App 体验。
功能亮点
一键连接钱包（RainbowKit + wagmi），自动读取 USDC 余额
配置定投金额、频率、期限，创建/取消计划
计划执行记录与交易历史查看
排行榜与地址缩写显示
分享按钮：可将结果分享并带上站点链接，社交平台会抓取 OG 预览图
兼容 EIP-1271（智能钱包）签名校验
快速开始
打开应用：<https://base-piggy-bank.vercel.app>
连接钱包（建议 Base 主网），确保钱包里有 USDC
配置定投金额、频率、期限后点击「Start DCA」
在「Assets」标签查看或取消计划；「Rank」标签查看排行榜
支持的网络
Base 主网（链 ID 8453）。如未在 Base，会提示并可一键切换。
安全与签名
所有创建/取消操作需要签名；签名内含 nonce 和 5 分钟过期时间，后端做防重放校验。
后端使用 Supabase 记录计划与执行日志；Service Role 仅在服务端使用，前端不会暴露。
Frame / Mini App
Frame post_url：/api/frame（提供 Launch 按钮）
预览图：/og-image.png
Mini App 清单：/miniapp.json，签名文件：/miniapp.sig（需保持与清单一致的域名与路径）
运行与部署（开发者参考）
环境变量：
NEXT_PUBLIC_APP_URL=https://base-piggy-bank.vercel.app
NEXT_PUBLIC_WC_PROJECT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
安装依赖：npm install
本地运行：npm run dev
生产部署：Vercel / 其他支持 Next.js 的平台
资源文件
应用图标：/icon-192.png、/icon-512.png
预览图：/og-image.png
PWA manifest：/manifest.json
常见问题
没有看到预览卡片？请确保分享的域名可被抓取且 OG/Frame meta 已对齐生产域。
智能钱包无法签名？后端已使用 viem.verifyMessage 支持 EIP-1271，仍失败请检查钱包是否在 Base 主网。
重放攻击防护？签名包含 nonce + 过期时间，后端存储 nonce 以防复用。