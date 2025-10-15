import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 5178;
app.use(express.json());

// 簡易 CORS（只供本地測試使用）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 將常見代號做映射到 Yahoo Finance 的 symbol
function mapSymbol(input) {
  const s = String(input).trim().toUpperCase();
  const map = new Map([
    ['0050', '0050.TW'],
    ['0056', '0056.TW'],
    ['QQQ', 'QQQ'],
    ['VT', 'VT'],
  ]);
  return map.get(s) || s;
}

// 取得近 N 年的收盤價序列（每月或每天），再估計年化報酬率 CAGR
// 使用 Yahoo Finance chart API（公開可用，無需金鑰）：
// https://query1.finance.yahoo.com/v8/finance/chart/VT?period1=...&period2=...&interval=1mo
async function fetchCAGR(symbol, years = 10) {
  const nowSec = Math.floor(Date.now() / 1000);
  const period2 = nowSec;
  const period1 = nowSec - Math.floor(years * 365.25 * 24 * 3600);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1mo`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`Yahoo API 錯誤 ${r.status}`);
  const data = await r.json();
  const result = data?.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const valid = closes.filter(v => typeof v === 'number' && isFinite(v));
  if (valid.length < 2) throw new Error('資料不足');
  const start = valid[0];
  const end = valid[valid.length - 1];
  const totalYears = (result.timestamp?.length || valid.length) / 12; // 約略以月資料
  const cagr = Math.pow(end / start, 1 / totalYears) - 1;
  return cagr; // 小數
}

app.get('/cagr', async (req, res) => {
  try {
    const { symbols, years } = req.query; // symbols=0050,VT
    if (!symbols) return res.status(400).json({ error: '缺少 symbols 參數' });
    const ys = Math.max(1, Math.min(30, parseInt(years || '10', 10)));
    const list = symbols.split(',').map(s => mapSymbol(s));
    const out = {};
    for (const sym of list) {
      try {
        const c = await fetchCAGR(sym, ys);
        out[sym] = c;
      } catch (e) {
        out[sym] = null;
      }
    }
    res.json({ years: ys, cagr: out });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`retire-planner-server running at http://localhost:${PORT}`));
