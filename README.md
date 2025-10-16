# 退休計畫試算器

一個功能完整的退休計畫試算工具，支援多資產配置、歷史回測與未來預測。

## ✨ 主要功能

- 🎯 **多資產配置**：支援 0050、VT、QQQ、0056、債券、現金等
- 📊 **視覺化圖表**：總資產曲線、資產分布堆疊圖
- 🔍 **自動查詢歷史報酬率**：透過 Yahoo Finance API 自動取得近 N 年 CAGR
- 📈 **歷史回測**：使用真實逐年報酬序列進行回測
- 🎲 **未來預測**：基於固定年化假設進行長期試算
- 💰 **彈性投入**：支援每月定期定額 + 指定年份一次性資金
- ⚖️ **自動再平衡**：每年年末自動調整回目標配置比例

## 🚀 快速開始

### 線上使用

正式網站：
[https://retirement-planner-gamma.vercel.app](https://retirement-planner-gamma.vercel.app)

### 本機執行

```bash
# 1. 安裝依賴
cd retire-planner-server
npm install

# 2. 啟動後端
npm start

# 3. 開啟前端
# 雙擊 retire-planner/index.html
# 或使用 http-server
```

## 📖 使用說明

1. **基本試算**
   - 填寫資產配置（如：0050:50% + VT:30% + 現金:20%）
   - 輸入目標金額、每月投入、起始資金
   - 點擊「開始試算」

2. **自動查詢報酬率**
   - 展開「資產假設」
   - 點擊「依歷史近N年的CAGR自動帶入」
   - 系統自動查詢並填入各資產的歷史年化報酬率

3. **歷史回測**
   - 展開「歷史回測」
   - 輸入逐年報酬序列
   - 對照未來預測與過去表現

## 🛠️ 技術架構

- **前端**：原生 HTML/CSS/JavaScript + Chart.js
- **後端**：Node.js + Express
- **API**：Yahoo Finance Chart API
- **部署**：Vercel (前端) + Render (後端)

## 📦 專案結構

```
退休計畫/
├── retire-planner/          # 前端靜態檔案
│   ├── index.html           # 主頁面
│   ├── main.js              # 核心邏輯
│   ├── styles.css           # 樣式
│   ├── robots.txt           # SEO
│   └── sitemap.xml          # 網站地圖
├── retire-planner-server/   # 後端 API
│   ├── src/
│   │   └── server.js        # Express 服務
│   ├── package.json
│   └── Dockerfile
└── 雲端部署指南.md           # 完整部署說明
```

## 🌟 特色功能

### 智慧預設報酬率
- 現金自動設為 1%
- 債券自動設為 2.5%
- 其他資產可自訂或使用統一假設

### 年中投入近似
- 期初本金享全年報酬
- 每月投入與一次性資金視為年中投入，享半年報酬
- 更貼近真實投資情境

### 分資產成長模型
- 每個資產獨立追蹤
- 支援不同資產不同報酬率
- 年末自動再平衡

## 📄 授權

MIT License

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

## 📞 聯絡

有任何問題或建議，歡迎聯繫。

---

⭐ 如果這個工具對你有幫助，請給個星星！
