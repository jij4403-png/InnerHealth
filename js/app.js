/* ================================================================
   InnerHealth — Complete App Logic (JavaScript)
   All state, simulation, charts, and rendering
   ================================================================ */

// ──────────────────────────────────────
// 1. Global State
// ──────────────────────────────────────
let analysisData = null;
let donutChartInst = null;
let lineChartInst  = null;

// ──────────────────────────────────────
// 2. Core Microbiome Simulation Engine
// ──────────────────────────────────────
const MICROBES = [
  { id: 'aureus',        label: 'S. aureus',         short: '황색포도상구균',  color: '#EF4444', type: 'bad',     base: 8  },
  { id: 'epidermidis',   label: 'S. epidermidis',    short: '표피포도상구균',  color: '#40916C', type: 'good',    base: 35 },
  { id: 'acnes',         label: 'C. acnes',          short: 'C. 아크네스',    color: '#F59E0B', type: 'neutral', base: 20 },
  { id: 'coryne',        label: 'Corynebacterium',   short: '코리네박테리움',  color: '#8B5CF6', type: 'neutral', base: 15 },
  { id: 'micrococcus',   label: 'Micrococcus',       short: '마이크로코쿠스', color: '#06B6D4', type: 'good',    base: 12 },
  { id: 'strepto',       label: 'Streptococcus',     short: '스트렙토코쿠스', color: '#6366F1', type: 'neutral', base: 10 },
];

function runSimulation(answers) {
  const { itch, dry, red, ooze, area } = answers;
  const totalScore = itch + dry + red + ooze + area;

  // Severity score (0–12 mapped to 0–100)
  const scoradRaw = Math.round((totalScore / 12) * 72 + 5);
  const scorad = Math.min(scoradRaw, 100);

  // Microbiome percentage calculation
  const pcts = MICROBES.map(m => {
    let pct = m.base;
    if (m.id === 'aureus') {
      pct += itch * 5.5 + red * 4.5 + ooze * 6;
    } else if (m.id === 'epidermidis') {
      pct -= (itch * 3 + red * 2.5 + dry * 2);
      pct = Math.max(pct, 4);
    } else if (m.id === 'coryne') {
      pct += area === 0 ? 4 : 0;
    } else if (m.id === 'acnes') {
      pct += area === 1 ? 3 : 0;
    }
    return Math.max(pct, 2);
  });

  // Normalize to 100%
  const sum = pcts.reduce((a, b) => a + b, 0);
  const normalized = pcts.map(p => parseFloat(((p / sum) * 100).toFixed(1)));

  // SCORAD severity label
  let severity, severityColor, severityBg;
  if (scorad < 25) {
    severity = '경증 (Mild)';
    severityColor = '#40916C';
    severityBg = '#D8F3DC';
  } else if (scorad < 50) {
    severity = '중등도 (Moderate)';
    severityColor = '#D97706';
    severityBg = '#FEF3C7';
  } else if (scorad < 75) {
    severity = '중증 (Severe)';
    severityColor = '#DC2626';
    severityBg = '#FEE2E2';
  } else {
    severity = '최중증 (Very Severe)';
    severityColor = '#7F1D1D';
    severityBg = '#FEE2E2';
  }

  // Barrier integrity
  const aurusPct = normalized[0];
  const epiderPct = normalized[1];
  const barrier = Math.max(10, Math.round(epiderPct * 1.4 - aurusPct * 0.6));

  return { scorad, severity, severityColor, severityBg, pcts: normalized, barrier, answers };
}

// ──────────────────────────────────────
// 3. Navigation / Step Logic
// ──────────────────────────────────────
function getAnswers() {
  return {
    itch: parseInt(document.querySelector('input[name="itch"]:checked')?.value ?? 1),
    dry:  parseInt(document.querySelector('input[name="dry"]:checked')?.value  ?? 1),
    red:  parseInt(document.querySelector('input[name="red"]:checked')?.value  ?? 1),
    ooze: parseInt(document.querySelector('input[name="ooze"]:checked')?.value ?? 0),
    area: parseInt(document.getElementById('area-select')?.value ?? 0),
  };
}

function goToStep(num) {
  document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
  document.getElementById('page' + num).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update step bar
  document.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 === num) el.classList.add('active');
    else if (i + 1 < num) el.classList.add('done');
  });
}

function goToStep2() {
  analysisData = runSimulation(getAnswers());
  renderStep2(analysisData);
  goToStep(2);
}

function goToStep3() {
  if (!analysisData) { goToStep2(); return; }
  renderStep3(analysisData);
  goToStep(3);
}

function resetAll() {
  analysisData = null;
  if (donutChartInst) { donutChartInst.destroy(); donutChartInst = null; }
  if (lineChartInst)  { lineChartInst.destroy();  lineChartInst  = null; }
  goToStep(1);
}

// ──────────────────────────────────────
// 4. Render Step 2 — Analysis
// ──────────────────────────────────────
function renderStep2(data) {
  const { scorad, severity, severityColor, severityBg, pcts, barrier } = data;

  // Metric cards
  const mr = document.getElementById('metricsRow');
  mr.innerHTML = `
    <div class="metric-card" style="border-top-color:${severityColor};">
      <div class="metric-label">SCORAD 지수</div>
      <div class="metric-value" style="color:${severityColor};">${scorad}</div>
      <div class="metric-sub" style="color:${severityColor}; background:${severityBg}; padding:3px 8px; border-radius:6px; display:inline-block;">${severity}</div>
    </div>
    <div class="metric-card" style="border-top-color:#40916C;">
      <div class="metric-label">피부 장벽 무결성</div>
      <div class="metric-value" style="color:${barrier < 40 ? '#DC2626' : barrier < 60 ? '#D97706' : '#40916C'};">${barrier}%</div>
      <div class="metric-sub" style="color:#64748B;">${barrier < 40 ? '⚠️ 손상됨' : barrier < 60 ? '📊 약화됨' : '✅ 양호'}</div>
    </div>
  `;

  // Donut Chart
  if (donutChartInst) donutChartInst.destroy();
  const ctx = document.getElementById('donutChart').getContext('2d');
  donutChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: MICROBES.map(m => m.short),
      datasets: [{
        data: pcts,
        backgroundColor: MICROBES.map(m => m.color),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
          },
        },
      },
      cutout: '65%',
      animation: { animateScale: true, animateRotate: true },
    },
  });

  // Readout card
  const rc = document.getElementById('readoutCard');
  const badMicrobe = MICROBES[0];
  const goodMicrobe = MICROBES[1];
  const badPct  = pcts[0];
  const goodPct = pcts[1];
  const caution = badPct > 20 ? '⚠️ 황색포도상구균 과증식 감지 — 즉각적인 마이크로바이옴 균형 복원이 필요합니다.' : '✅ 유해균 수치는 허용 범위 내에 있습니다.';

  rc.innerHTML = `
    <div class="readout-title">🔬 가상 생검 판독 리포트</div>
    ${MICROBES.map((m, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${m.color};margin-right:5px;"></span>${m.short}</span>
        <span style="font-weight:700;color:${m.color};">${pcts[i]}%</span>
      </div>
    `).join('')}
    <div style="margin-top:10px;padding:8px;background:#FFF7ED;border-radius:8px;font-size:0.75rem;color:#92400E;font-weight:600;">
      ${caution}
    </div>
  `;
}

// ──────────────────────────────────────
// 5. Render Step 3 — Care Plan
// ──────────────────────────────────────
const PRODUCTS = [
  {
    icon: '💧', badge: '🏅 1순위 — 긴급 보습', name: 'Physiogel AI Cream',
    desc: '세라마이드 강화 · 피부과학 기반',
    body: '염증성 피부 장벽 재건에 특화된 세라마이드 집중 보습제. 황색포도상구균의 침투를 물리적으로 차단합니다.',
    price: '26,000원', coupon: '10% 쿠폰', tag: 'bestmall',
  },
  {
    icon: '🧴', badge: '🥈 2순위 — 유익균 증식', name: 'La Roche-Posay Lipikar',
    desc: '프리바이오틱스 · 보호막 강화',
    body: '표피포도상구균(유익균)의 증식을 촉진하는 프리바이오틱 성분이 포함된 프리미엄 바디 로션.',
    price: '48,000원', coupon: '적립금 3%', tag: 'oliveyoung',
  },
  {
    icon: '🌊', badge: '🥉 3순위 — pH 복원', name: '아벤느 테르말 크림',
    desc: '열천수 성분 · 산성 보호막 복원',
    body: '약산성 pH 5.5를 복원해 유익균 서식에 최적인 표피 환경을 되돌리는 프랑스 열천수 기반 크림.',
    price: '38,000원', coupon: '회원 할인 15%', tag: 'avene',
  },
  {
    icon: '🫧', badge: '🛁 세안 & 클렌징', name: 'Dove 뉴트리엄모이스처',
    desc: '약산성 pH 5.5 바디워시',
    body: '피지를 보존하는 1/4 모이스처 배합으로 세정 후에도 유익균 기반의 약산성 피부 방어막이 유지됩니다.',
    price: '8,900원', coupon: '2+1 이벤트', tag: 'coupang',
  },
];

function renderStep3(data) {
  const { scorad, severity, severityColor, pcts } = data;

  // Products
  const pg = document.getElementById('productGrid');
  pg.innerHTML = PRODUCTS.map(p => `
    <div class="product-card">
      <div class="prod-head">
        <div class="prod-icon">${p.icon}</div>
        <div>
          <div class="prod-badge" style="color:${severityColor};">${p.badge}</div>
          <div class="prod-name">${p.name}</div>
          <div class="prod-desc">${p.desc}</div>
        </div>
      </div>
      <div class="prod-body">${p.body}</div>
      <div class="prod-footer">
        <span style="font-weight:700;color:#1B4332;">${p.price}</span>
        <span class="coupon-badge">${p.coupon}</span>
      </div>
    </div>
  `).join('');

  // 4-week line chart
  if (lineChartInst) lineChartInst.destroy();
  const aurusPct  = pcts[0];
  const epiderPct = pcts[1];

  const weeks = ['시작 전', '1주 후', '2주 후', '3주 후', '4주 후'];
  const aureusData    = [aurusPct,  aurusPct * 0.78, aurusPct * 0.55, aurusPct * 0.33, aurusPct * 0.18].map(v => parseFloat(v.toFixed(1)));
  const epidermisData = [epiderPct, epiderPct * 1.10, epiderPct * 1.22, epiderPct * 1.32, epiderPct * 1.40].map(v => parseFloat(v.toFixed(1)));
  const otherData     = weeks.map((_, i) => {
    const rest = 100 - aureusData[i] - epidermisData[i];
    return parseFloat(rest.toFixed(1));
  });

  const ctx2 = document.getElementById('lineChart').getContext('2d');
  lineChartInst = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: weeks,
      datasets: [
        {
          label: '황색포도상구균 (유해균)',
          data: aureusData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true,
          tension: 0.42,
          pointBackgroundColor: '#EF4444',
          pointRadius: 5,
          borderWidth: 2.5,
        },
        {
          label: '표피포도상구균 (유익균)',
          data: epidermisData,
          borderColor: '#40916C',
          backgroundColor: 'rgba(64,145,108,0.08)',
          fill: true,
          tension: 0.42,
          pointBackgroundColor: '#40916C',
          pointRadius: 5,
          borderWidth: 2.5,
        },
        {
          label: '기타 상재균',
          data: otherData,
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99,102,241,0.05)',
          fill: true,
          tension: 0.42,
          pointBackgroundColor: '#6366F1',
          pointRadius: 5,
          borderWidth: 2,
          borderDash: [5, 4],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, font: { size: 11 }, padding: 14 },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 80,
          title: { display: true, text: '비율 (%)', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.04)' },
        },
        x: { grid: { display: false } },
      },
      animation: { duration: 800 },
    },
  });

  // Clinic guide
  const cg = document.getElementById('clinicGuide');
  const isHighScorad = scorad >= 50;
  cg.innerHTML = isHighScorad ? `
    <div class="danger-box">
      <h4>⚠️ SCORAD ${scorad}점 — 즉각적인 피부과 전문의 방문 강력 권고</h4>
      <ul class="guide-list" style="color:#DC2626;">
        <li>유해균인 황색포도상구균 항생제(무피로신 연고 등)을 처방받으세요.</li>
        <li>2차 피부 감염 예방을 위해 딱지와 진물 환부는 반드시 병원 처치를 받으세요.</li>
        <li>스테로이드 단기 처방은 염증을 빠르게 억제하나 장기 사용은 피하세요.</li>
        <li>생물학적 제제(dupilumab, 두피루맙) 적응증 여부를 전문의와 상담하세요.</li>
      </ul>
    </div>
  ` : `
    <ul class="guide-list">
      <li>피부과 방문 주기는 <strong>2~4주에 1회</strong>를 권장합니다. 악화 시 즉시 방문하세요.</li>
      <li>비스테로이드 국소제인 <strong>타크로리무스 연고(프로토픽)</strong>는 얼굴 및 피부 접힘 부위에 효과적입니다.</li>
      <li>히스타민 수치를 낮추기 위해 저알레르기 식이요법과 먼지 진드기 차단이 도움됩니다.</li>
      <li>알레르기 패치 테스트 및 RAST(특이 IgE) 혈액 검사를 통해 개인 알레르겐을 파악하세요.</li>
    </ul>
  `;
}

// ──────────────────────────────────────
// 6. Tab Toggle
// ──────────────────────────────────────
function switchTab(btn, tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => { t.style.display = 'none'; t.classList.remove('active'); });
  btn.classList.add('active');
  const tab = document.getElementById(tabId);
  if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
}

// ──────────────────────────────────────
// 7. Radio card visual sync
// ──────────────────────────────────────
document.addEventListener('change', (e) => {
  if (e.target.type === 'radio') {
    const group = e.target.name;
    document.querySelectorAll(`input[name="${group}"]`).forEach(r => {
      const card = r.closest('.radio-card');
      if (card) {
        card.style.borderColor = r.checked ? 'var(--primary-light)' : '';
        card.style.background  = r.checked ? '#F0FDF4' : '';
      }
    });
  }
});
