/*
退休計畫試算器
- 解析資產配置字串，例如："0050:50% + VT:30% + 現金:20%"
- 接受目標金額、每月投入、起始資金
- 支援一次性資金事件（第N年:金額）
- 以年為單位進行複利試算，月投入以年中平均投入近似（即將月投入*12後，先加入資產再計算年度報酬）
- 可選擇統一  // 從配置與資產報酬率對應，取得每資產的年化報酬率（小數）
  function getPerAssetRates(allocation, defaultRatePct, perAssetRateMap) {
    const rates = new Map();
    // 保守型資產的預設報酬率（%）
    const conservativeDefaults = new Map([
      ['現金', 1.0],
      ['cash', 1.0],
      ['債券', 2.5],
      ['債卷', 2.5],
      ['債眷', 2.5],
      ['bond', 2.5],
    ]);
    
    for (const it of allocation) {
      let r;
      if (perAssetRateMap.has(it.name)) {
        // 使用者自訂的資產假設
        r = perAssetRateMap.get(it.name);
      } else {
        // 檢查是否為保守型資產
        const lowerName = it.name.toLowerCase();
        if (conservativeDefaults.has(it.name) || conservativeDefaults.has(lowerName)) {
          r = (conservativeDefaults.get(it.name) || conservativeDefaults.get(lowerName)) / 100;
        } else {
          // 使用統一預設報酬率
          r = defaultRatePct / 100;
        }
      }
      rates.set(it.name, r);
    }
    return rates;
  }自訂報酬率
- 簡化：不考慮稅費與通膨（可作為未來擴充）
*/

(function () {
  const form = document.getElementById('planner-form');
  const resultSec = document.getElementById('result');
  const backtestSec = document.getElementById('backtest');
  const rowsEl = document.getElementById('yearlyRows');
  const backRowsEl = document.getElementById('backYearlyRows');
  const summaryEl = document.getElementById('summary');
  const backSummaryEl = document.getElementById('backSummary');
  const resetBtn = document.getElementById('resetBtn');

  // 預設資產名稱標準化對照（同義詞整合）
  const aliasMap = new Map([
    ['債券', '債券'], ['債卷', '債券'], ['債眷', '債券'], ['bond', '債券'],
    ['現金', '現金'], ['cash', '現金'],
    ['vt', 'VT'], ['qqq', 'QQQ'], ['0050', '0050'], ['0056', '0056']
  ]);

  // 依配置自動抓 CAGR 並填入資產假設
  document.getElementById('fetchCagrBtn')?.addEventListener('click', async () => {
    try {
      const allocationStr = document.getElementById('allocation').value;
      const years = Math.max(1, Math.min(30, parseInt(document.getElementById('fetchYears').value || '10', 10)));
      const allocation = parseAllocation(allocationStr);
      const symbols = allocation.map(it => it.name).join(',');
      const base = document.getElementById('backendUrl')?.value || 'http://localhost:5178';
      const url = `${base.replace(/\/$/, '')}/cagr?symbols=${encodeURIComponent(symbols)}&years=${years}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('取得 CAGR 失敗，請確認本機服務是否已啟動');
      const data = await resp.json();
      const cagr = data.cagr || {};
      
      // 保守型資產的預設值（當無法從 API 取得時）
      const conservativeDefaults = new Map([
        ['現金', 1.0],
        ['cash', 1.0],
        ['債券', 2.5],
        ['債卷', 2.5],
        ['債眷', 2.5],
        ['bond', 2.5],
      ]);
      
      // 轉回使用者的資產名稱與百分比文字
      const parts = allocation.map(it => {
        const sym = it.name;
        // server 端有可能映射 0050 -> 0050.TW，因此嘗試兩種key
        const keys = [sym, sym + '.TW'];
        let r = null;
        for (const k of keys) { if (cagr[k] != null) { r = cagr[k]; break; } }
        
        // 若 API 無法取得，檢查是否為保守型資產並使用預設值
        if (r == null) {
          const lowerSym = sym.toLowerCase();
          if (conservativeDefaults.has(sym) || conservativeDefaults.has(lowerSym)) {
            r = (conservativeDefaults.get(sym) || conservativeDefaults.get(lowerSym)) / 100;
          } else {
            return `${sym}:`; // 其他資產留空
          }
        }
        
        return `${sym}:${(r * 100).toFixed(2)}`;
      });
      const input = document.getElementById('assetAssumptions');
      input.value = parts.join(', ');
      alert(`已帶入 ${years} 年 CAGR 至資產假設\n保守型資產（現金/債券）已自動設定預設值`);
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  // 測試後端連線
  document.getElementById('pingBackendBtn')?.addEventListener('click', async () => {
    const statusEl = document.getElementById('backendStatus');
    try {
      const base = document.getElementById('backendUrl')?.value || 'http://localhost:5178';
      const url = `${base.replace(/\/$/, '')}/health`;
      statusEl.textContent = '測試中…';
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      statusEl.textContent = j?.ok ? `連線正常（${j.time}）` : '連線異常';
    } catch (err) {
      statusEl.textContent = `無法連線：${err.message || err}`;
    }
  });

  function normalizeAssetName(name) {
    const key = String(name).trim().toLowerCase();
    return aliasMap.get(key) || String(name).trim();
  }

  // 解析像 "0050:50% + VT:30% + 現金:20%" 的配置
  function parseAllocation(input) {
    if (!input) throw new Error('請輸入資產配置');
    // 分隔符：+ , 全形＋，逗號
    const parts = String(input)
      .replace(/＋/g, '+')
      .split(/[+,，]/)
      .map(s => s.trim())
      .filter(Boolean);

    const items = [];
    for (const p of parts) {
      // 允許格式：名稱:數字% 或 名稱:數字
      const m = p.match(/^([^:：]+)[:：]\s*(\d+(?:\.\d+)?)%?$/);
      if (!m) throw new Error(`配置格式錯誤：「${p}」`);
      const name = normalizeAssetName(m[1]);
      const percent = parseFloat(m[2]);
      if (!isFinite(percent) || percent < 0) throw new Error(`百分比錯誤：「${p}」`);
      items.push({ name, weight: percent });
    }

    const total = items.reduce((s, it) => s + it.weight, 0);
    if (Math.abs(total - 100) > 1e-6) {
      throw new Error(`配置加總需為100%，目前為 ${total}%`);
    }
    return items;
  }

  // 解析「0050:7, VT:6」類的年化報酬率對應表
  function parseAssumptions(input) {
    const map = new Map();
    if (!input) return map;
    const parts = String(input).split(/[;,，]/).map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      const m = p.match(/^([^:：]+)[:：]\s*(\d+(?:\.\d+)?)$/);
      if (!m) throw new Error(`資產假設格式錯誤：「${p}」，例：0050:7, VT:6`);
      const name = normalizeAssetName(m[1]);
      const rate = parseFloat(m[2]);
      if (!isFinite(rate)) throw new Error(`資產假設數值錯誤：「${p}」`);
      map.set(name, rate / 100);
    }
    return map;
  }

  // 解析一次性資金事件："5:300000; 10:500000"
  function parseLumpsum(input) {
    const map = new Map();
    if (!input) return map;
    const parts = String(input).split(/[;；]/).map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      const m = p.match(/^(\d+)\s*[:：]\s*(-?\d+(?:\.\d+)?)$/);
      if (!m) throw new Error(`一次性資金格式錯誤：「${p}」，例：5:300000; 10:500000`);
      const year = parseInt(m[1], 10);
      const amt = parseFloat(m[2]);
      if (!(year >= 1)) throw new Error(`一次性資金年份需 >=1：「${p}」`);
      if (!isFinite(amt)) throw new Error(`一次性資金數值錯誤：「${p}」`);
      map.set(year, (map.get(year) || 0) + amt);
    }
    return map;
  }

  // 解析逐年歷史報酬序列：每行格式 like "0050: 8, -12, 15, 5"，百分比
  // options: { oldToNew: true } 表示第一個數字是最舊年份
  function parseHistorySeries(text, { oldToNew = true } = {}) {
    const lines = String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    const series = new Map();
    for (const line of lines) {
      const m = line.match(/^([^:：]+)[:：]\s*(.+)$/);
      if (!m) throw new Error(`歷史序列格式錯誤：「${line}」`);
      const name = normalizeAssetName(m[1]);
      const arr = m[2].split(/[;,，]/).map(s => s.trim()).filter(Boolean).map(v => parseFloat(v));
      if (arr.some(x => !isFinite(x))) throw new Error(`歷史序列數值錯誤：「${line}」`);
      const pctToDecimal = arr.map(x => x / 100);
      series.set(name, oldToNew ? pctToDecimal : pctToDecimal.reverse());
    }
    return series;
  }

  // 從配置與資產報酬率對應，取得每資產的年化報酬率（小數）
  function getPerAssetRates(allocation, defaultRatePct, perAssetRateMap) {
    const rates = new Map();
    for (const it of allocation) {
      const r = perAssetRateMap.has(it.name) ? perAssetRateMap.get(it.name) : (defaultRatePct / 100);
      rates.set(it.name, r);
    }
    return rates;
  }

  // 以「分資產」逐年試算，並於每年年末再平衡回目標權重。
  // 投入（每月與一次性）視為年中投入，給半年的報酬。
  function simulate({ target, monthly, initial, allocation, perAssetRates, lumpsumMap, maxYears = 120 }) {
    const rows = [];

    // 初始化各資產持有（起始資金按權重分配）
    let holdings = new Map();
    for (const it of allocation) {
      holdings.set(it.name, initial * (it.weight / 100));
    }

    function totalHoldings() {
      let s = 0; for (const v of holdings.values()) s += v; return s;
    }

    for (let year = 1; year <= maxYears; year++) {
      const start = totalHoldings();
      const contrib = monthly * 12;
      const extra = lumpsumMap.get(year) || 0;

      // 期初本金：全年報酬
      for (const it of allocation) {
        const name = it.name;
        const r = perAssetRates.get(name) || 0;
        const principal = holdings.get(name) || 0;
        holdings.set(name, principal * (1 + r));
      }

      // 年中投入：先依權重分配到各資產，再給半年的報酬
      const newCash = contrib + extra;
      for (const it of allocation) {
        const name = it.name;
        const r = perAssetRates.get(name) || 0;
        const add = newCash * (it.weight / 100);
        const afterHalfYear = add * (1 + r * 0.5);
        holdings.set(name, (holdings.get(name) || 0) + afterHalfYear);
      }

      // 年末再平衡到目標配置（無成本假設）
      const endBeforeRebalance = totalHoldings();
      for (const it of allocation) {
        holdings.set(it.name, endBeforeRebalance * (it.weight / 100));
      }
      const end = totalHoldings(); // == endBeforeRebalance
      const profit = end - start - contrib - extra;

      // 保存每年期末依資產分布
      const assetsSnapshot = {};
      for (const it of allocation) {
        assetsSnapshot[it.name] = holdings.get(it.name) || 0;
      }

      rows.push({ year, start, contrib, extra, profit, end, assets: assetsSnapshot });
      if (end >= target) break;
    }

    return { rows, reached: (rows.length && rows[rows.length - 1].end >= target) };
  }

  function currency(n) {
    return n.toLocaleString('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 });
  }

  let totalChart, stackedChart, backTotalChart, backStackedChart;

  function renderCharts(rows, allocation) {
    const labels = rows.map(r => `第${r.year}年`);
    const totals = rows.map(r => Math.round(r.end));

    // 線圖：總資產曲線
    const totalCtx = document.getElementById('totalChart');
    if (totalChart) totalChart.destroy();
    totalChart = new Chart(totalCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '期末總資產',
          data: totals,
          borderColor: '#4b7bec',
          backgroundColor: 'rgba(75, 123, 236, 0.2)',
          tension: 0.2,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#e7ebf3' } } },
        scales: {
          x: { ticks: { color: '#c9d1e1' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#c9d1e1', callback: (v)=>v.toLocaleString('zh-TW') }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });

    // 堆疊圖：年度資產分布（期末）
    const colors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#ffeaa7', '#d63031', '#00cec9'];
    const byAsset = allocation.map((it, idx) => ({
      label: it.name,
      backgroundColor: colors[idx % colors.length],
      data: rows.map(r => Math.round(r.assets[it.name] || 0))
    }));

    const stackedCtx = document.getElementById('stackedChart');
    if (stackedChart) stackedChart.destroy();
    stackedChart = new Chart(stackedCtx, {
      type: 'bar',
      data: { labels, datasets: byAsset },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#e7ebf3' } } },
        scales: {
          x: { stacked: true, ticks: { color: '#c9d1e1' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { stacked: true, ticks: { color: '#c9d1e1', callback: (v)=>v.toLocaleString('zh-TW') }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });
  }

  function renderAssetTable(rows, allocation) {
    const headerRow = document.getElementById('assetHeaderRow');
    const bodyRows = document.getElementById('assetBodyRows');
    // 重建表頭
    headerRow.innerHTML = '<th>年份</th>' + allocation.map(it => `<th>${it.name}</th>`).join('');
    // 內容
    bodyRows.innerHTML = '';
    for (const r of rows) {
      const tds = allocation.map(it => `<td>${currency(r.assets[it.name] || 0)}</td>`).join('');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>第${r.year}年</td>${tds}`;
      bodyRows.appendChild(tr);
    }
  }

  function render(rows, target, allocation) {
    rowsEl.innerHTML = '';
    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.year}</td>
        <td>${currency(r.start)}</td>
        <td>${currency(r.contrib)}</td>
        <td>${currency(r.extra)}</td>
        <td>${currency(r.profit)}</td>
        <td>${currency(r.end)}</td>
      `;
      rowsEl.appendChild(tr);
    }
    const last = rows[rows.length - 1];
    const hit = last.end >= target;
    summaryEl.innerHTML = `
      <p>是否達標：<b style="color:${hit ? '#67e480' : '#ff6b6b'}">${hit ? '是' : '否'}</b></p>
      <p>花費時間：${rows.length} 年</p>
      <p>期末資產：${currency(last.end)}（目標：${currency(target)}）</p>
    `;
    resultSec.classList.remove('hidden');

    renderCharts(rows, allocation);
    renderAssetTable(rows, allocation);
  }

  function renderBacktest(rows, allocation, yearLabels) {
    // 表格
    backRowsEl.innerHTML = '';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const yearLabel = yearLabels[i] || `第${i + 1}年`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${yearLabel}</td>
        <td>${currency(r.start)}</td>
        <td>${currency(r.contrib)}</td>
        <td>${currency(r.extra)}</td>
        <td>${currency(r.profit)}</td>
        <td>${currency(r.end)}</td>
      `;
      backRowsEl.appendChild(tr);
    }
    const last = rows[rows.length - 1];
    backSummaryEl.innerHTML = `
      <p>回測期間總年數：${rows.length} 年</p>
      <p>回測期末資產：${currency(last.end)}</p>
    `;
    backtestSec.classList.remove('hidden');

    // 圖表
    const labels = yearLabels;
    const totals = rows.map(r => Math.round(r.end));
    const totalCtx = document.getElementById('backTotalChart');
    if (backTotalChart) backTotalChart.destroy();
    backTotalChart = new Chart(totalCtx, {
      type: 'line',
      data: { labels, datasets: [{ label: '期末總資產（回測）', data: totals, borderColor: '#67e480', backgroundColor: 'rgba(103, 228, 128, 0.2)', tension: 0.2, fill: true }] },
      options: { responsive: true, plugins: { legend: { labels: { color: '#e7ebf3' } } }, scales: { x: { ticks: { color: '#c9d1e1' }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { ticks: { color: '#c9d1e1', callback: v=>v.toLocaleString('zh-TW') }, grid: { color: 'rgba(255,255,255,0.06)' } } } }
    });

    const colors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#ffeaa7', '#d63031', '#00cec9'];
    const byAsset = allocation.map((it, idx) => ({ label: it.name, backgroundColor: colors[idx % colors.length], data: rows.map(r => Math.round(r.assets[it.name] || 0)) }));
    const stackedCtx = document.getElementById('backStackedChart');
    if (backStackedChart) backStackedChart.destroy();
    backStackedChart = new Chart(stackedCtx, {
      type: 'bar',
      data: { labels, datasets: byAsset },
      options: { responsive: true, plugins: { legend: { labels: { color: '#e7ebf3' } } }, scales: { x: { stacked: true, ticks: { color: '#c9d1e1' }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { stacked: true, ticks: { color: '#c9d1e1', callback: v=>v.toLocaleString('zh-TW') }, grid: { color: 'rgba(255,255,255,0.06)' } } } }
    });

    // 資產分布表
    const headerRow = document.getElementById('backAssetHeaderRow');
    const bodyRows = document.getElementById('backAssetBodyRows');
    headerRow.innerHTML = '<th>年份</th>' + allocation.map(it => `<th>${it.name}</th>`).join('');
    bodyRows.innerHTML = '';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowLabel = yearLabels[i] || `第${i + 1}年`;
      const tds = allocation.map(it => `<td>${currency(r.assets[it.name] || 0)}</td>`).join('');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${rowLabel}</td>${tds}`;
      bodyRows.appendChild(tr);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const allocationStr = document.getElementById('allocation').value;
      const target = parseFloat(document.getElementById('target').value);
      const monthly = parseFloat(document.getElementById('monthly').value);
      const initial = parseFloat(document.getElementById('initial').value || '0');
      const growth = parseFloat(document.getElementById('growth').value || '0');
      const lumpsumStr = document.getElementById('lumpsum').value;
      const assumptionsStr = document.getElementById('assetAssumptions').value;
      const historyText = document.getElementById('historySeries').value;
      const historyOldToNew = document.getElementById('historyOldToNew').checked;
      const historyEndYearInput = document.getElementById('historyEndYear').value;

      if (!(target > 0)) throw new Error('目標金額需 > 0');
      if (!(monthly >= 0)) throw new Error('每月投入需 >= 0');
      if (!(initial >= 0)) throw new Error('第一筆投入需 >= 0');

      const allocation = parseAllocation(allocationStr);
      const perAssetRateMap = parseAssumptions(assumptionsStr);
      const perAssetRates = getPerAssetRates(allocation, growth, perAssetRateMap);
      const lumpsumMap = parseLumpsum(lumpsumStr);

      const { rows } = simulate({ target, monthly, initial, allocation, perAssetRates, lumpsumMap });
      render(rows, target, allocation);

      // 回推計算（根據試算實得年數 X 與基準年份）
      const baseYearInput = document.getElementById('baseYear');
      const baseYear = parseInt(baseYearInput.value || new Date().getFullYear(), 10);
      const X = rows.length;
      const backcastStart = baseYear - X;
      // 假設與前述相同的報酬率/每月投入/一次性資金節點（偏理想化）
      // 目標：估計若從 backcastStart 年開始，到 baseYear 的期末資產
      // 這裡直接沿用 rows 最後的 end 作為估計值（等價於同樣策略與假設下的結果）：
      const estAtBaseYear = rows[rows.length - 1].end;
      const backcastMsg = document.createElement('p');
      backcastMsg.innerHTML = `若自 <b>${backcastStart}</b> 年開始以此配置投資，至 <b>${baseYear}</b> 年期末，估計資產約為 <b>${currency(estAtBaseYear)}</b>。`;
      summaryEl.appendChild(backcastMsg);

      // 歷史回測：若使用者提供逐年序列，就依序列長度做回測
      backtestSec.classList.add('hidden');
      backRowsEl.innerHTML = '';
      backSummaryEl.innerHTML = '';
      if (historyText && historyText.trim().length > 0) {
        const series = parseHistorySeries(historyText, { oldToNew: historyOldToNew });
        // 以歷史序列的年數為回測長度（取最短序列長度）
        const lengths = allocation.map(it => (series.get(it.name) || []).length);
        const L = Math.min(...lengths.filter(x => x > 0));
        if (!isFinite(L) || L <= 0) throw new Error('歷史回測資料不足：請至少為一項資產提供序列。');

        // 每資產逐年報酬率序列（小數），若沒提供，使用固定假設（每年相同）
        const perYearRates = [];
        for (let i = 0; i < L; i++) {
          const mapYear = new Map();
          for (const it of allocation) {
            const seq = series.get(it.name);
            if (seq && seq.length >= L) {
              mapYear.set(it.name, seq[i]);
            } else {
              // 若缺序列則使用固定假設
              mapYear.set(it.name, perAssetRates.get(it.name) || 0);
            }
          }
          perYearRates.push(mapYear);
        }

        // 回測模擬：沿用同一筆起始資金/每月投入/一次性資金，依 perYearRates 前進
        const backRows = [];
        let holdings = new Map();
        for (const it of allocation) holdings.set(it.name, initial * (it.weight / 100));
        const lumps = lumpsumMap; // 使用同樣事件（可改為回測專屬事件）
        function sumHoldings() { let s = 0; for (const v of holdings.values()) s += v; return s; }

        const endYearVal = parseInt(historyEndYearInput || new Date().getFullYear(), 10);
        const startYearLabel = endYearVal - L + 1;
        const yearLabels = Array.from({ length: L }, (_, k) => `${startYearLabel + k}`);

        for (let idx = 0; idx < L; idx++) {
          const start = sumHoldings();
          const contrib = monthly * 12;
          const extra = lumps.get(idx + 1) || 0; // 事件用第1年、2年…對應回測序列位置
          const rMap = perYearRates[idx];

          // 期初本金：全年報酬（用該年的每資產報酬率）
          for (const it of allocation) {
            const name = it.name;
            const r = rMap.get(name) || 0;
            const principal = holdings.get(name) || 0;
            holdings.set(name, principal * (1 + r));
          }

          // 年中投入：按配置分配並給半年的報酬（半年的利率用當年 rMap）
          const newCash = contrib + extra;
          for (const it of allocation) {
            const name = it.name;
            const r = rMap.get(name) || 0;
            const add = newCash * (it.weight / 100);
            const afterHalf = add * (1 + r * 0.5);
            holdings.set(name, (holdings.get(name) || 0) + afterHalf);
          }

          // 年末再平衡
          const endBeforeReb = sumHoldings();
          for (const it of allocation) holdings.set(it.name, endBeforeReb * (it.weight / 100));
          const end = sumHoldings();
          const profit = end - start - contrib - extra;
          const assetsSnapshot = {};
          for (const it of allocation) assetsSnapshot[it.name] = holdings.get(it.name) || 0;
          backRows.push({ year: idx + 1, start, contrib, extra, profit, end, assets: assetsSnapshot });
        }

        renderBacktest(backRows, allocation, yearLabels);
      }
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    rowsEl.innerHTML = '';
    summaryEl.innerHTML = '';
    resultSec.classList.add('hidden');
    backRowsEl.innerHTML = '';
    backSummaryEl.innerHTML = '';
    backtestSec.classList.add('hidden');
  });
})();
