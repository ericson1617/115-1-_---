# 尺規作圖工作坊：公開回饋評論服務

這個資料夾提供 Cloudflare Workers + D1 伺服器，以便多人跨裝置查看並發布評論，管理者登入後回覆。網站前端已放在 `ruler-compass-workshop.html`。

**注意：GitHub Pages 只能提供靜態網頁，不能自行安全地儲存跨裝置留言、驗證管理密碼。此服務尚需完成部署，才會正式開放留言。**

## 啟用方式

1. 先建立 Cloudflare 帳號，安裝 Node.js。進入本資料夾：`cd feedback-api`。
2. `npx wrangler login`。
3. `npx wrangler d1 create ruler-workshop-feedback`，把顯示的 `database_id` 貼到 `wrangler.toml` 的 `database_id` 欄位。
4. `npx wrangler d1 migrations apply DB --remote`：建立留言、回覆、流量限制的資料表。
5. `npx wrangler secret put ADMIN_PASSWORD`：在終端機輸入你指定的管理密碼（不要放入 GitHub、HTML、JavaScript 或設定檔）。
6. `npx wrangler secret put SESSION_SECRET`：輸入自行產生的高熵隨機字串（建議至少 32 個隨機位元組），用來簽署四小時有效的管理者工作階段。
7. `npx wrangler deploy`：取得 `https://...workers.dev` 網址。
8. 在專案根目錄的 `feedback-config.js`，把 `window.workshopFeedbackApi = ""` 改成剛取得的 Worker 網址，提交至 GitHub。等 GitHub Pages 更新後，即可跨裝置留言。

## 設計與安全

- 訪客輸入姓名（可用暱稱）與評論，伺服器產生公開發布時間；任何人可閱讀。
- 只能透過成功驗證伺服器端 **ADMIN_PASSWORD** 的管理者工作階段發表「站長回覆」。不可把密碼或雜湊寫在公開的前端檔案。
- 管理者工作階段僅儲存短效簽署 token 於瀏覽器的 sessionStorage；登出立即清除瀏覽器中 token。token 在四小時後過期。
- 對訪客發文和登入設有基本流量限制，暫存資訊採雜湊化處理。此限制無法替代完整的垃圾留言過濾與內容審核。
- 所有公開文字由前端以 textContent 呈現，避免直接解譯 HTML。
- 不儲存真實 IP；Cloudflare 平台本身可能另有服務紀錄。請參照網站隱私權政策補充說明。
- **管理密碼不曾也不應提交至 GitHub。** 不建議長期使用容易猜測的純數字密碼，日後可透過 Wrangler secrets 隨時更換。

官方說明：https://developers.cloudflare.com/d1/get-started/ 及 https://developers.cloudflare.com/d1/wrangler-commands/
