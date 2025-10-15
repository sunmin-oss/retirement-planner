# 退休計畫試算器 - Docker 部署指南

使用 Docker Compose 一鍵啟動前端與後端服務。

## 📋 前置需求

1. 安裝 Docker Desktop
   - Windows: https://www.docker.com/products/docker-desktop
   - 安裝後啟動 Docker Desktop

2. 確認 Docker 已正確安裝
   ```powershell
   docker --version
   docker-compose --version
   ```

## 🚀 啟動服務

### 一鍵啟動（推薦）
```powershell
# 在專案根目錄執行
docker-compose up -d
```

服務會在背景啟動：
- 前端：http://localhost:8080
- 後端 API：http://localhost:5178

### 查看日誌
```powershell
# 查看所有服務日誌
docker-compose logs -f

# 只查看後端
docker-compose logs -f backend

# 只查看前端
docker-compose logs -f frontend
```

### 停止服務
```powershell
docker-compose down
```

### 重新建置
```powershell
# 當程式碼有更新時
docker-compose up -d --build
```

## 📝 服務說明

### Backend（後端）
- 容器名稱：retire-planner-backend
- 埠號：5178
- 功能：提供 CAGR 查詢 API

### Frontend（前端）
- 容器名稱：retire-planner-frontend
- 埠號：8080
- 使用 Nginx 提供靜態網頁

## 🔧 自訂設定

### 修改埠號
編輯 `docker-compose.yml`：
```yaml
services:
  frontend:
    ports:
      - "你想要的埠號:80"
  backend:
    ports:
      - "你想要的埠號:5178"
```

### 環境變數
在 `docker-compose.yml` 的 `environment` 區段新增：
```yaml
environment:
  - PORT=5178
  - NODE_ENV=production
  - 你的變數=值
```

## 🌐 區域網路分享

啟動後，同網路的其他人可以透過你的 IP 存取：

1. 查詢你的 IP
   ```powershell
   ipconfig
   ```

2. 分享網址
   ```
   http://你的IP:8080
   ```

## ✅ 健康檢查

```powershell
# 前端健康檢查
curl http://localhost:8080/health

# 後端健康檢查
curl http://localhost:5178/health
```

## 🐛 疑難排解

### 埠號已被占用
```powershell
# Windows 查詢埠號使用情況
netstat -ano | findstr :8080
netstat -ano | findstr :5178
```

修改 `docker-compose.yml` 使用其他埠號。

### 服務無法啟動
```powershell
# 查看詳細錯誤訊息
docker-compose logs

# 重新建置
docker-compose down
docker-compose up -d --build
```

### 清除所有容器與映像
```powershell
docker-compose down --rmi all --volumes
```

## 📦 匯出映像（分享給他人）

```powershell
# 建置映像
docker-compose build

# 儲存為檔案
docker save retire-planner-backend -o backend.tar
docker save nginx:alpine -o frontend.tar

# 對方載入映像
docker load -i backend.tar
docker load -i frontend.tar

# 啟動
docker-compose up -d
```

## 🎯 生產環境建議

1. 使用環境變數管理敏感資訊
2. 設定 HTTPS（使用 Let's Encrypt）
3. 加入反向代理（Nginx / Traefik）
4. 設定自動重啟策略
5. 監控與日誌收集

需要完整的生產部署方案，請告訴我！
