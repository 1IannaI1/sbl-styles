
        // ==================== GLOBALS ====================
        let RAW = [];
        let FILTERED = [];
        let charts = {};
        let activeFilters = { region: 'ALL', status: 'ALL', req: 'ALL', agent: 'ALL' };
        let activeDateFilter = { year: "ALL", startMonth: "ALL", endMonth: "ALL", day: "ALL" };
        let activeModeFilter = 'non-overlapping';
        let activeMonthRegion = 'ALL';
        const COLORS = ['#5BA7FF', '#4FD9E8', '#34D399', '#F5B94D', '#A78BFA', '#FF9F5A', '#FF6B6B', '#F472B6', '#2DD4BF',
            '#A3E635'
        ];

        const STATUS_DATE_FIELD = {
          'Pending for KYC': 'date',
          'For Credit Assessment': 'date',
          'For Completion': 'date',
          'Failed KYC': 'date',
          'Failed CREDIT': 'credit_decision',
          'For Disbursement': 'credit_decision',
          'Disbursed': 'date_disbursed'
        };
        let map = null;
        let heatLayer = null;
        let tableSortCol = -1;
        let tableSortDir = 1;
        let baoSortCol = -1;
        let baoSortDir = 1;
        let baoDataAll = [];
        const AGENT_CREDENTIALS = {
            'kale': { password: 'kale123', agentName: 'Kale Ross Festin' },
            'james': { password: 'james123', agentName: 'James Aldrin Maldicas' },
            'jaime': { password: 'jaime123', agentName: 'Jaime Roz' },
            'armin': { password: 'armin123', agentName: 'Armin Onguda' },
            'edgardo': { password: 'edgardo123', agentName: 'Edgardo Tabago' },
            'jandy': { password: 'jandy123', agentName: 'Jandy Pio' },
            'celso': { password: 'celso123', agentName: 'Celso Grimpula' },
            'dennis': { password: 'dennis123', agentName: 'Dennis Anico' },
            'richard': { password: 'richard123', agentName: 'Richard Dean Perez' },
            'anthony': { password: 'anthony123', agentName: 'Anthony Hucal' },
            'jeffrey': { password: 'jeffrey123', agentName: 'Jeffrey Mallorca' },
            'jimmar': { password: 'jimmar123', agentName: 'Jimmar Balmes' },
            'adrian': { password: 'adrian123', agentName: 'Adrian Begino' },
            'jetro': { password: 'bernardo123', agentName: 'Bernardo Lim Macabidang' },
            'foster': { password: 'foster123', agentName: 'Foster Celorico' },
            'rose': { password: 'rose123', agentName: 'Rose Ann Alejandro' },
            'irene': { password: 'irene123', agentName: 'Irene Espiritu' },
            'mark': { password: 'mark123', agentName: 'John Mark Arnesto' },
            'harold': { password: 'harold123', agentName: 'John Harold Sumapad' }
        };
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = 'Inter';
        Chart.defaults.font.size = 11;
        function pickField(row, ...aliases) {
            const keys = Object.keys(row);
            for (const alias of aliases) {
                const norm = alias.toLowerCase().replace(/\s+/g, '');
                const foundKey = keys.find(k => k.toLowerCase().replace(/\s+/g, '') === norm);
                if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== '') {
                    return row[foundKey];
                }
            }
            return '';
        }
        function updateClock() {
            const now = new Date();
            document.getElementById('live-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit',
                second: '2-digit' });
            document.getElementById('live-date').textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric',
                year: 'numeric', weekday: 'long' });
        }
        setInterval(updateClock, 1000);
        updateClock();
          document.getElementById('viewSelector').addEventListener('change', function() {
            const val = this.value;
            document.getElementById('agentPrivateView').style.display = 'none';
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('liveView').classList.remove('active-view');
            document.getElementById('heatmapView').classList.remove('active-view');
            document.getElementById('baoView').classList.remove('active-view');
            document.getElementById('pdHeatmapView').classList.remove('active-view');
            document.getElementById('pipView').classList.remove('active-view');

            if (val === 'agent') {
              document.getElementById('loginModal').style.display = 'flex';
              document.getElementById('loginError').style.display = 'none';
              document.getElementById('loginUser').value = '';
              document.getElementById('loginPass').value = '';
              document.getElementById('loginUser').focus();
            } else if (val === 'live') {
              document.getElementById('liveView').classList.add('active-view');
            } else if (val === 'heatmap') {
              document.getElementById('heatmapView').classList.add('active-view');
              initHeatmapMap();
              setTimeout(() => { if (map) map.invalidateSize(); }, 200);
              updateHeatmap();
            } else if (val === 'pip') {
              document.getElementById('pipView').classList.add('active-view');
              renderPIP();
            } else if (val === 'pdheatmap') {
              document.getElementById('pdHeatmapView').classList.add('active-view');
              initPdMap();
              setTimeout(() => { if (pdMap) pdMap.invalidateSize(); }, 200);
              renderPdMarkers();
            }
          });
        function closeLoginModal() {
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('viewSelector').value = 'live';
            document.getElementById('viewSelector').dispatchEvent(new Event('change'));
        }
        function handleAgentLogin() {
            const user = document.getElementById('loginUser').value.trim().toLowerCase();
            const pass = document.getElementById('loginPass').value.trim();
            const err = document.getElementById('loginError');
            if (AGENT_CREDENTIALS[user] && AGENT_CREDENTIALS[user].password === pass) {
                const agentName = AGENT_CREDENTIALS[user].agentName;
                err.style.display = 'none';
                document.getElementById('loginModal').style.display = 'none';
                renderAgentPrivateView(agentName);
            } else {
                err.style.display = 'block';
            }
        }
        function logoutAgent() {
            document.getElementById('viewSelector').value = 'live';
            document.getElementById('viewSelector').dispatchEvent(new Event('change'));
        }
        let currentAgent = '';
        function renderAgentPrivateView(agentName) {
            currentAgent = agentName;
            document.getElementById('liveView').classList.remove('active-view');
            document.getElementById('heatmapView').classList.remove('active-view');
            document.getElementById('baoView').classList.remove('active-view');
            document.getElementById('agentPrivateView').style.display = 'flex';
            const monthSet = new Set();
            RAW.forEach(r => {
                if (r.agent === agentName) {
                    const d = parseDate(r.date_disbursed || r.date);
                    if (d) monthSet.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
                }
            });
            const monthSelect = document.getElementById('agentMonthFilter');
            const currentVal = monthSelect.value;
            monthSelect.innerHTML = '<option value="ALL">All Months</option>';
            const sortedMonths = Array.from(monthSet).sort();
            sortedMonths.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                const parts = m.split('-');
                opt.textContent =
                    `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(parts[1])-1]} ${parts[0]}`;
                monthSelect.appendChild(opt);
            });
            monthSelect.value = currentVal;
            reRenderAgentView();
        }
        function reRenderAgentView() {
            const selectedMonth = document.getElementById('agentMonthFilter').value;
            const mainJobPct = 100;
            const agentData = RAW.filter(r => r.agent === currentAgent);
            let filteredData = agentData;
            if (selectedMonth !== 'ALL') {
                const [year, month] = selectedMonth.split('-').map(Number);
                filteredData = agentData.filter(r => {
                    const d = parseDate(r.date_disbursed || r.date);
                    return d && d.getFullYear() === year && (d.getMonth() + 1) === month;
                });
            }
            const totalApps = filteredData.length;
            const approved = filteredData.filter(r => r.approval && r.approval !== '');
            const disbursed = filteredData.filter(r => r.status === 'Disbursed');
            const totalAmount = disbursed.reduce((sum, r) => sum + (Number(r.disbursed) || 0), 0);
            const incentiveResult = calculateIncentive(disbursed, selectedMonth, mainJobPct);
            let rank = "Bronze";
            if (incentiveResult.count >= 20) rank = "Platinum";
            else if (incentiveResult.count >= 10) rank = "Gold";
            else if (incentiveResult.count >= 5) rank = "Silver";
            const content = document.getElementById('agentPrivateContent');
            content.innerHTML = `
                <div style="text-align:center; background:var(--bg-card); border:1px solid var(--glass-border); backdrop-filter: blur(20px); border-radius:var(--card-radius); padding:28px; box-shadow: var(--shadow-md);">
                  <div style="font-size:40px;">${rank}</div>
                  <div style="font-size:22px; font-weight:700; margin-top:6px;">${currentAgent}</div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">${selectedMonth === 'ALL' ? 'All Time' : document.getElementById('agentMonthFilter').selectedOptions[0].text}</div>
                </div>
                <div class="kpi-row" style="grid-template-columns: repeat(2,1fr);">
                  <div class="kpi-card blue"><div class="kpi-label">Total Apps</div><div class="kpi-value">${totalApps}</div></div>
                  <div class="kpi-card yellow"><div class="kpi-label">Approved</div><div class="kpi-value">${approved.length}</div></div>
                  <div class="kpi-card green"><div class="kpi-label">Disbursed</div><div class="kpi-value">${disbursed.length}</div></div>
                  <div class="kpi-card teal"><div class="kpi-label">Total Amount</div><div class="kpi-value small">P${totalAmount.toLocaleString()}</div></div>
                </div>
                <div style="background: rgba(255,159,90,0.06); border: 1px solid rgba(255,159,90,0.35); border-radius: var(--card-radius); text-align:center; padding: 24px; backdrop-filter: blur(20px); box-shadow: var(--shadow-md);">
                  <div style="font-size:10px; font-weight:700; text-transform:uppercase; color: var(--accent-orange); letter-spacing:0.08em;">Your Incentive Bonus</div>
                  <div style="font-size:34px; font-weight:800; margin-top:6px;">P${incentiveResult.total.toLocaleString()}</div>
                  <div style="font-size:10px; color:var(--text-muted); margin-top:6px;">Based on ${incentiveResult.count} disbursed loans</div>
                </div>
              `;
        }
        function calculateIncentive(disbursedList, selectedMonth, mainJobPct) {
            let count = disbursedList.length;
            let total = 0;
            const year = selectedMonth === 'ALL' ? new Date().getFullYear() : parseInt(selectedMonth.split('-')[0]);
            const month = selectedMonth === 'ALL' ? 0 : parseInt(selectedMonth.split('-')[1]);
            if (year === 2026 && month >= 5 && month <= 6) {
                for (let i = 0; i < count; i++) {
                    if (i < 2) total += 500;
                    else total += 600;
                }
            } else if (year === 2026 && month >= 7) {
                const scaleFactor = mainJobPct / 100;
                const tier1Max = 9 * scaleFactor;
                const tier2Min = 10 * scaleFactor;
                const tier2Max = 20 * scaleFactor;
                const tier3Min = 21 * scaleFactor;
                if (count <= tier1Max) {
                    total = 0;
                } else if (count >= tier2Min && count <= tier2Max) {
                    total = count * 500;
                } else if (count >= tier3Min) {
                    total = count * 750;
                } else {
                    total = count * 500;
                }
            } else {
                for (let i = 0; i < count; i++) {
                    if (i < 2) total += 500;
                    else total += 600;
                }
            }
            return { total: total, count: count };
        }
        function parseDate(str) {
            if (!str || typeof str !== 'string') return null;
            let parts = str.split('/');
            if (parts.length === 3) {
                let month = parseInt(parts[0]) - 1,
                    day = parseInt(parts[1]),
                    year = parseInt(parts[2]);
                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) return new Date(year, month, day);
            }
            return null;
        }
        function getEffectiveDate(record) {
            const status = record.status;
            let d = null;
            if (status === 'Disbursed') {
                d = parseDate(record.date_disbursed);
            } else if (status === 'Failed CREDIT') {
                d = parseDate(record.date_approved);
            } else if (['Pending for KYC', 'For Completion', 'Failed KYC', 'For Credit Assessment'].includes(status)) {
                d = parseDate(record.date);
            } else {
                d = parseDate(record.date);
            }
            if (!d) d = parseDate(record.date);
            return d;
        }
        function getApplicationDate(record) {
            return parseDate(record.date);
        }
        function passesDateFilter(rec, dateField = 'date') {
            const { year, startMonth, endMonth, day } = activeDateFilter;
            if (year === 'ALL' && startMonth === 'ALL' && endMonth === 'ALL' && day === 'ALL') return true;

            let d = null;
            if (dateField === 'date_approved') d = parseDate(rec.date_approved);
            else if (dateField === 'date_disbursed') d = parseDate(rec.date_disbursed);
            else d = parseDate(rec.date);

            if (!d) return false;

            if (year !== 'ALL' && d.getFullYear().toString() !== year) return false;

            const monthMap = { 'Jan':0, 'Feb':1, 'Mar':2, 'Apr':3, 'May':4, 'Jun':5, 'Jul':6, 'Aug':7, 'Sep':8, 'Oct':9, 'Nov':10, 'Dec':11 };

            if (startMonth !== 'ALL') {
                if (d.getMonth() < monthMap[startMonth]) return false;
            }
            if (endMonth !== 'ALL') {
                if (d.getMonth() > monthMap[endMonth]) return false;
            }

            if (day !== 'ALL') {
                if (startMonth !== 'ALL' && endMonth !== 'ALL' && startMonth === endMonth && year !== 'ALL') {
                    if (d.getDate() !== parseInt(day)) return false;
                }
            }
            return true;
        }
        function initHeatmapMap() {
            if (map && heatLayer) return;
            const container = document.getElementById('heatmapContainerFull');
            if (!container) return;
            if (map) { map.remove();
                map = null;
                heatLayer = null; }
            map = L.map('heatmapContainerFull').setView([12.8797, 121.774], 6.5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 20,
                minZoom: 5
            }).addTo(map);
            heatLayer = L.heatLayer([], { radius: 15, blur: 20, maxZoom: 10, minOpacity: 0.4, gradient: { 0.2: '#2c7da0',
                    0.5: '#f97316', 0.8: '#ef4444' } });
            heatLayer.addTo(map);
        }
        function updateHeatmap() {
            if (!heatLayer) return;
            const points = FILTERED.filter(r => {
                const lat = parseFloat(r.lat),
                    lng = parseFloat(r.lng);
                return !isNaN(lat) && !isNaN(lng) && lat > 4 && lat < 22 && lng > 116 && lng < 128;
            }).map(r => [parseFloat(r.lat), parseFloat(r.lng), 0.9]);
            heatLayer.setLatLngs(points);
            const badge = document.getElementById('heatmapPointsBadgeFull');
            if (badge) badge.innerText = points.length + ' points';
            if (points.length && map) {
                try { map.fitBounds(L.latLngBounds(points.map(p => [p[0], p[1]])), { padding: [30, 30] }); } catch (e) {}
            }
        }
        function loadData(forceRefresh) {
          console.log('[SBL] loadData called, force=' + forceRefresh);
          document.getElementById('loader').style.display = 'flex';
          document.querySelector('.loader-text').textContent = forceRefresh
            ? 'Refreshing from sheet...'
            : 'Loading dashboard...';

          if (typeof google === 'undefined' || !google.script || !google.script.run) {
            document.getElementById('loader').style.display = 'none';
            alert('ERROR: google.script.run not available. Deploy as Web App.');
            return;
          }
            const timeout = setTimeout(() => {
              document.getElementById('loader').style.display = 'none';
              alert('TIMEOUT - check sheet permissions or script authorization.');
            }, 60000);

  google.script.run
    .withSuccessHandler(function(jsonStr) {
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(jsonStr);

        const rawData = parsed.loanData || parsed;
        const officersData = parsed.loanOfficers || [];
        const pdData = parsed.pdAccounts || [];

        if (!Array.isArray(rawData) || rawData.length === 0) {
          document.getElementById('loader').style.display = 'none';
          alert('WARNING: Data returned is empty.');
          return;
        }

        RAW = rawData.map(r => ({
          region: String(r['Region'] || '').trim(),
          date: String(r['date_applied'] || '').trim(),
          username: String(r['username'] || '').trim(),
          agent: String(r['agent_name'] || '').trim(),
          business: String(r['business_name'] || '').trim(),
          owner: String(r['owners_name'] || '').trim(),
          req: String(r['requirement_status'] || '').trim(),
          status: String(r['application_status'] || '').trim(),
          approval: String(r['approval_amount'] || '').trim(),
          date_approved: String(r['date_approved'] || '').trim(),
          date_done_kyc: String(r['date_done_kyc'] || '').trim(),
          disbursed: String(r['disbursed_amount'] || '').trim(),
          date_disbursed: String(r['date_disbursed'] || '').trim(),
          btype: String(r['business_type'] || '').trim(),
          remarks: String(r['Remarks'] || '').trim(),
          missing: String(r['Missing'] || '').trim(),
          date_transferred_credit: String(r['date_transferred_credit'] || '').trim(),
          credit_decision: String(r['credit_decision'] || '').trim(),
          lat: parseFloat(r['Latitude']) || 0,
          lng: parseFloat(r['Longitude']) || 0,
          date_tnc_signed: String(r['date_tnc_signed'] || '').trim(),
          delinquent: String(r['delinquent days'] || '').trim(),
          bills: Number(r['No. of Bills']) || 0,
          activebills: Number(r['No. of Active Bills']) || 0,
          paidbills: Number(r['No. Paid Bills']) || 0,
          collector: Number(r['Paid via Collector']) || 0,
          selfservice: Number(r['Paid via Selfservice']) || 0,
          first_due_date: String(pickField(r, 'First Due Date', 'First due date') || '').trim(),
          days_before_due: String(pickField(r, 'Days before due', 'Days Before Due') || '').trim(),
          all_billings: String(pickField(r, 'All Billings', 'All billings') || '').trim(),
        }));

        OFFICERS = officersData;
        PD_DATA = Array.isArray(pdData) ? pdData : [];

      } catch (e) {
        document.getElementById('loader').style.display = 'none';
        alert('JSON Parse Error: ' + e.message);
        return;
      }

      document.getElementById('loader').style.display = 'none';
      document.getElementById('last-updated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
      buildAgentFilterSidebar();
      applyFilters();
      if (document.getElementById('heatmapView').classList.contains('active-view')) initHeatmapMap();
      if (document.getElementById('pdHeatmapView').classList.contains('active-view')) {
  initPdMap();
  setTimeout(() => {
    if (pdMap) { pdMap.invalidateSize(); renderPdMarkers(); }
  }, 200);
}
    })
    .withFailureHandler(function(err) {
      clearTimeout(timeout);
      document.getElementById('loader').style.display = 'none';
      alert('FAILURE: ' + JSON.stringify(err));
    })
    .getLoanData(!!forceRefresh);
}
        function filterRegion(r, el) { activeFilters.region = r;
            updateActiveClass('.region-btn', el);
            applyFilters(); }
        function filterStatus(s, el) { activeFilters.status = s;
            updateActiveClass('#status-filters .filter-item', el);
            applyFilters(); }
        function filterReq(r, el) { activeFilters.req = r;
            updateActiveClass('[data-req]', el);
            applyFilters(); }
        function filterAgent(a, el) { activeFilters.agent = a;
            updateActiveClass('#agent-filter-group .filter-item', el);
            applyFilters(); }
        function setMonthRegion(r, el) { activeMonthRegion = r;
            updateActiveClass('.rtab', el, true);
            renderMonthlyTable(FILTERED); }
        function updateActiveClass(selector, activeEl, isMonth = false) {
            document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
            activeEl.classList.add('active');
        }
        function applyFilters() {
            FILTERED = RAW.filter(r =>
                (activeFilters.region === 'ALL' || r.region === activeFilters.region) &&
                (activeFilters.status === 'ALL' || r.status === activeFilters.status) &&
                (activeFilters.req === 'ALL' || r.req === activeFilters.req) &&
                (activeFilters.agent === 'ALL' || r.agent === activeFilters.agent) &&
                passesDateFilter(r)
            );
            updateSidebarCounts();
            renderKPIs(FILTERED);
            renderPipeline(FILTERED);
            renderSLAPipeline(FILTERED);
            renderRegion(FILTERED);
            renderRequirements(FILTERED);
            renderTable(FILTERED);
            renderDelinquency(FILTERED);
            renderAgentBar(FILTERED);
            renderFunnel(FILTERED);
            renderCharts(FILTERED);
            renderMonthlyTable(FILTERED);
            renderBAO(FILTERED);
            if (heatLayer) updateHeatmap();
            document.getElementById('footer-text').innerHTML =
                `Saripay Business Loan Monitoring - ${FILTERED.length} of ${RAW.length} Records - Refreshed: ${new Date().toLocaleTimeString()}`;
        }
        function updateSidebarCounts() {
            const cnt = s => RAW.filter(r => r.status === s).length;
            document.getElementById('sb-all').innerHTML = RAW.length;
            document.getElementById('sb-pkyc').innerHTML = cnt('Pending for KYC');
            document.getElementById('sb-ca').innerHTML = cnt('For Credit Assessment');
            document.getElementById('sb-fc').innerHTML = cnt('For Completion');
            document.getElementById('sb-fkyc').innerHTML = cnt('Failed KYC');
            document.getElementById('sb-fcr').innerHTML = cnt('Failed CREDIT');
            document.getElementById('sb-fd').innerHTML = cnt('For Disbursement');
            document.getElementById('sb-dis').innerHTML = cnt('Disbursed');
            document.getElementById('rb-all').innerHTML = RAW.length;
            document.getElementById('rb-c').innerHTML = RAW.filter(r => r.req === 'Complete').length;
            document.getElementById('rb-i').innerHTML = RAW.filter(r => r.req === 'Incomplete').length;
            document.getElementById('ag-all').innerHTML = RAW.length;
        }
        function buildAgentFilterSidebar() {
            const counts = {};
            RAW.forEach(r => counts[r.agent] = (counts[r.agent] || 0) + 1);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const container = document.getElementById('agent-filter-group');
            container.innerHTML =
                `<div class="filter-item active" onclick="filterAgent('ALL',this)"><span>All Agents</span><span class="filter-badge" id="ag-all">${RAW.length}</span></div>`;
            sorted.forEach(([name, count]) => {
                const div = document.createElement('div');
                div.className = 'filter-item';
                div.onclick = function() { filterAgent(name, this); };
                div.innerHTML =
                    `<span title="${name}">${name.split(' ').slice(0,2).join(' ')}</span><span class="filter-badge">${count}</span>`;
                container.appendChild(div);
            });
        }
        function renderKPIs(data) {
            const now = new Date();
            const todayStr = now.toDateString();

            let appData = data;
            let disbData = data;

            if (activeModeFilter === 'overlapping') {
                appData = RAW.filter(r =>
                    (activeFilters.region === 'ALL' || r.region === activeFilters.region) &&
                    (activeFilters.status === 'ALL' || r.status === activeFilters.status) &&
                    (activeFilters.req === 'ALL' || r.req === activeFilters.req) &&
                    (activeFilters.agent === 'ALL' || r.agent === activeFilters.agent) &&
                    passesDateFilter(r, 'date_approved')
                );
                disbData = RAW.filter(r =>
                    (activeFilters.region === 'ALL' || r.region === activeFilters.region) &&
                    (activeFilters.status === 'ALL' || r.status === activeFilters.status) &&
                    (activeFilters.req === 'ALL' || r.req === activeFilters.req) &&
                    (activeFilters.agent === 'ALL' || r.agent === activeFilters.agent) &&
                    passesDateFilter(r, 'date_disbursed')
                );
            }

            const todayApps = data.filter(r => {
                const d = parseDate(r.date);
                return d && d.toDateString() === todayStr;
            }).length;

            const disbRows = disbData.filter(r => r.status === 'Disbursed' && r.disbursed);
            const totalDisb = disbRows.reduce((s, r) => s + Number(r.disbursed), 0);

            const appRows = appData.filter(r => r.approval);
            const totalApp = appRows.reduce((s, r) => s + Number(r.approval), 0);

            const avgDisb = disbRows.length ? totalDisb / disbRows.length : 0;
            const delinqRows = data.filter(r => r.status === 'Disbursed' && r.delinquent && r.delinquent !== '');

            document.getElementById('kpiRow').innerHTML = `
                <div class="kpi-card blue"><div class="kpi-icon blue">&#128202;</div><div class="kpi-label">Total Applications</div><div class="kpi-value">${data.length}</div><div class="kpi-sub"><span class="kpi-trend up">&#9650; ${todayApps} today</span></div></div>
                <div class="kpi-card green"><div class="kpi-icon green">&#128181;</div><div class="kpi-label">Total Disbursed</div><div class="kpi-value small">P${totalDisb.toLocaleString()}</div><div class="kpi-sub">${disbRows.length} accounts</div></div>
                <div class="kpi-card yellow"><div class="kpi-icon yellow">&#127974;</div><div class="kpi-label">Total Approved</div><div class="kpi-value small">P${totalApp.toLocaleString()}</div><div class="kpi-sub">${appRows.length} accounts</div></div>
                <div class="kpi-card teal"><div class="kpi-icon teal">&#128176;</div><div class="kpi-label">Avg Disbursed</div><div class="kpi-value small">P${Math.round(avgDisb).toLocaleString()}</div><div class="kpi-sub">per account</div></div>
                <div class="kpi-card red"><div class="kpi-icon red">&#9888;&#65039;</div><div class="kpi-label">Delinquent Accts</div><div class="kpi-value">${delinqRows.length}</div><div class="kpi-sub">${delinqRows.length ? 'Max overdue' : 'No overdue'}</div></div>
              `;
            document.getElementById('today-badge').innerHTML = `Today: ${todayApps} Applications`;
        }
        function renderPipeline(data) {
  const total = data.length || 1;

  const getRecordsForStatus = (status) => {
    if (activeModeFilter === 'non-overlapping') {
      return data.filter(r => r.status === status);
    } else {
      const dateField = STATUS_DATE_FIELD[status] || 'date';
      return RAW.filter(r =>
        (activeFilters.region === 'ALL' || r.region === activeFilters.region) &&
        (activeFilters.status === 'ALL' || r.status === activeFilters.status) &&
        (activeFilters.req === 'ALL' || r.req === activeFilters.req) &&
        (activeFilters.agent === 'ALL' || r.agent === activeFilters.agent) &&
        r.status === status &&
        passesDateFilter(r, dateField)
      );
    }
  };

  const cnt = (status) => getRecordsForStatus(status).length;

  const statuses = ['For Completion', 'Pending for KYC', 'Failed KYC', 'Failed CREDIT', 'For Credit Assessment',
    'For Disbursement', 'Disbursed'
  ];
  const colors = ['#8b5cf6', '#f59e0b', '#ef4444', '#f97316', '#3b82f6', '#06b6d4', '#10b981'];
  const labels = ['For Completion', 'Pending KYC', 'Failed KYC', 'Failed Credit', 'Credit Assess.',
    'For Disbursement', 'Disbursed'
  ];

  let html = '';
  statuses.forEach((s, i) => {
    const count = cnt(s);
    const pct = Math.round((count / total) * 100);
    if (s === 'For Disbursement') {
      const disbData = getRecordsForStatus('For Disbursement');
      const decline = disbData.filter(r => {
        const rem = (r.remarks || '').trim();
        return rem !== '' && !rem.toLowerCase().includes('signed');
      }).length;
      const tncSigned = disbData.filter(r => {
        const rem = (r.remarks || '').trim();
        const hasTncDate = r.date_tnc_signed && r.date_tnc_signed.trim() !== '';
        if (rem.toLowerCase().includes('signed')) return true;
        if (rem === '' && hasTncDate) return true;
        return false;
      }).length;
      const forSigning = disbData.filter(r => {
        const rem = (r.remarks || '').trim();
        const hasTncDate = r.date_tnc_signed && r.date_tnc_signed.trim() !== '';
        return rem === '' && !hasTncDate;
      }).length;
      const totalDisb = disbData.length;
      const realNumber = totalDisb - decline;
      const pctDecline = totalDisb ? Math.round((decline / totalDisb) * 100) : 0;
      const pctForSigning = totalDisb ? Math.round((forSigning / totalDisb) * 100) : 0;
      const pctTncSigned = totalDisb ? Math.round((tncSigned / totalDisb) * 100) : 0;

      html += `
        <div class="pipeline-card" style="border-top:3px solid ${colors[i]}">
          <div class="pipeline-dot" style="background:${colors[i]}"></div>
          <div class="pipeline-label">${labels[i]}</div>
          <div class="pipeline-count" style="color:${colors[i]}">
            ${totalDisb}
            <span class="pipeline-total-sub">(<span class="pipeline-real-highlight">${realNumber}</span> real)</span>
          </div>
          <div class="pipeline-pct">${Math.round(totalDisb/total*100)}%</div>
          <div class="pipeline-breakdown">
            <div>Decline: ${decline} (${pctDecline}%)</div>
            <div>For Signing: ${forSigning} (${pctForSigning}%)</div>
            <div>T&C Signed: ${tncSigned} (${pctTncSigned}%)</div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="pipeline-card" style="border-top:3px solid ${colors[i]}">
          <div class="pipeline-dot" style="background:${colors[i]}"></div>
          <div class="pipeline-label">${labels[i]}</div>
          <div class="pipeline-count" style="color:${colors[i]}">${count}</div>
          <div class="pipeline-pct">${pct}%</div>
        </div>
      `;
    }
  });

  document.getElementById('pipelineRow').innerHTML = html;

  document.getElementById('ds-pkyc').innerHTML = cnt('Pending for KYC');
  document.getElementById('ds-ca').innerHTML = cnt('For Credit Assessment');
  document.getElementById('ds-fkyc').innerHTML = cnt('Failed KYC');
  document.getElementById('ds-fcr').innerHTML = cnt('Failed CREDIT');
  document.getElementById('ds-dis').innerHTML = cnt('Disbursed');
  document.getElementById('ds-fd').innerHTML = cnt('For Disbursement');
}
        function renderSLAPipeline(data) {
            const totalApps = data.length;
            const approvedRecords = data.filter(r => r.approval && r.date && r.date_approved);
            let totalApprovalDays = 0;
            approvedRecords.forEach(r => {
                const applied = parseDate(r.date);
                const approved = parseDate(r.date_approved);
                if (applied && approved) {
                    const diffDays = Math.round((approved - applied) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0) totalApprovalDays += diffDays;
                }
            });
            const avgApproval = approvedRecords.length ? Math.round(totalApprovalDays / approvedRecords.length) : 0;
            const disbursedRecords = data.filter(r => r.status === 'Disbursed' && r.date_approved && r.date_disbursed);
            let totalDisbursementDays = 0;
            disbursedRecords.forEach(r => {
                const approved = parseDate(r.date_approved);
                const disbursed = parseDate(r.date_disbursed);
                if (approved && disbursed) {
                    const diffDays = Math.round((disbursed - approved) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0) totalDisbursementDays += diffDays;
                }
            });
            const avgDisbursement = disbursedRecords.length ? Math.round(totalDisbursementDays / disbursedRecords.length) : 0;
            let totalCreditAssessmentDays = 0;
            let creditAssessmentCount = 0;
            data.forEach(r => {
                const transferred = parseDate(r.date_transferred_credit);
                const decision = parseDate(r.credit_decision);
                if (transferred && decision) {
                    const diffDays = Math.round((decision - transferred) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0) {
                        totalCreditAssessmentDays += diffDays;
                        creditAssessmentCount++;
                    }
                }
            });
            const avgCreditAssessment = creditAssessmentCount ? Math.round(totalCreditAssessmentDays / creditAssessmentCount) :
                0;
            const slaCards = [
                { label: 'Total Applications', count: totalApps, pct: 'filtered count', color: '#3b82f6',
                    dotBg: '#3b82f6' },
                { label: 'Avg Approval SLA', count: avgApproval, pct: 'days (applied to approved)',
                    color: '#f59e0b', dotBg: '#f59e0b' },
                { label: 'Avg Disbursement SLA', count: avgDisbursement, pct: 'days (approved to disbursed)',
                    color: '#10b981', dotBg: '#10b981' },
                { label: 'Avg Credit Assessment SLA', count: avgCreditAssessment,
                    pct: 'days (transferred to decision)', color: '#8b5cf6', dotBg: '#8b5cf6' }
            ];
            document.getElementById('slaPipelineRow').innerHTML = slaCards.map(card => `
                    <div class="sla-pipeline-card" style="border-top:3px solid ${card.color}">
                      <div class="sla-dot" style="background:${card.dotBg}"></div>
                      <div class="sla-label">${card.label}</div>
                      <div class="sla-count" style="color:${card.color}">${card.count}</div>
                      <div class="sla-pct">${card.pct}</div>
                    </div>
                  `).join('');
        }
        function renderRegion(data) {
            const total = data.length || 1;
            const gma = data.filter(r => r.region === 'GMA');
            const sol = data.filter(r => r.region === 'SOL');
            const gmaDis = gma.filter(r => r.disbursed).reduce((s, r) => s + Number(r.disbursed), 0);
            const solDis = sol.filter(r => r.disbursed).reduce((s, r) => s + Number(r.disbursed), 0);
            let regionHTML = '';
            if (activeFilters.region === 'ALL') {
                regionHTML = `
                      <div class="region-box">
                        <div class="region-name">GMA</div>
                        <div class="region-count" style="color:#5BA7FF">${gma.length}</div>
                        <div class="region-pct">${Math.round(gma.length / total * 100)}%</div>
                        <div class="region-sub">P${gmaDis.toLocaleString()} disbursed</div>
                      </div>
                      <div class="region-box">
                        <div class="region-name">SOL</div>
                        <div class="region-count" style="color:#4FD9E8">${sol.length}</div>
                        <div class="region-pct">${Math.round(sol.length / total * 100)}%</div>
                        <div class="region-sub">P${solDis.toLocaleString()} disbursed</div>
                      </div>
                    `;
            } else if (activeFilters.region === 'GMA') {
                regionHTML = `
                      <div class="region-box" style="flex:1; max-width:100%">
                        <div class="region-name">GMA</div>
                        <div class="region-count" style="color:#5BA7FF">${gma.length}</div>
                        <div class="region-pct">${Math.round(gma.length / total * 100)}%</div>
                        <div class="region-sub">P${gmaDis.toLocaleString()} disbursed</div>
                      </div>
                    `;
            } else if (activeFilters.region === 'SOL') {
                regionHTML = `
                      <div class="region-box" style="flex:1; max-width:100%">
                        <div class="region-name">SOL</div>
                        <div class="region-count" style="color:#4FD9E8">${sol.length}</div>
                        <div class="region-pct">${Math.round(sol.length / total * 100)}%</div>
                        <div class="region-sub">P${solDis.toLocaleString()} disbursed</div>
                      </div>
                    `;
            }
            document.getElementById('regionSplitContainer').innerHTML = regionHTML;
        }
        function renderRequirements(data) {
            const total = data.length || 1;
            const comp = data.filter(r => r.req === 'Complete').length;
            const incomp = data.filter(r => r.req === 'Incomplete').length;
            document.getElementById('req-complete-label').innerHTML = `${comp} (${Math.round(comp/total*100)}%)`;
            document.getElementById('req-complete-bar').style.width = Math.round(comp / total * 100) + '%';
            document.getElementById('req-incomplete-label').innerHTML = `${incomp} (${Math.round(incomp/total*100)}%)`;
            document.getElementById('req-incomplete-bar').style.width = Math.round(incomp / total * 100) + '%';
            const disRate = data.filter(r => r.status === 'Disbursed').length / total * 100;
            const appRate = data.filter(r => r.approval).length / total * 100;
            document.getElementById('dis-rate').innerHTML = Math.round(disRate) + '%';
            document.getElementById('dis-rate-sub').innerHTML = data.filter(r => r.status === 'Disbursed').length + ' of ' +
                total;
            document.getElementById('app-rate').innerHTML = Math.round(appRate) + '%';
            document.getElementById('app-rate-sub').innerHTML = data.filter(r => r.approval).length + ' approved';
        }
        function getAgingDays(record) {
            const status = record.status;
            if (status.includes('Failed') || status === 'Disbursed') return '';
            const now = new Date();
            let dateToUse = null;
            if (['Pending for KYC', 'For Credit Assessment', 'For Completion'].includes(status)) {
                dateToUse = parseDate(record.date);
            } else if (status === 'For Disbursement') {
                dateToUse = parseDate(record.date_approved);
            } else {
                dateToUse = parseDate(record.date);
            }
            if (!dateToUse) return '';
            const diffTime = now.getTime() - dateToUse.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 ? diffDays : '';
        }
        function getAgingFromApplied(record) {
            const applied = parseDate(record.date);
            if (!applied) return '';
            const now = new Date();
            let endDate = null;
            const status = record.status;
            if (status === 'Pending for KYC' || status === 'For Credit Assessment' || status === 'For Completion' || status ===
                'Failed KYC') {
                endDate = now;
            } else if (status === 'Failed CREDIT' || status === 'For Disbursement') {
                endDate = parseDate(record.date_approved);
            } else if (status === 'Disbursed') {
                endDate = parseDate(record.date_disbursed);
            }
            if (!endDate) return '';
            const diffTime = endDate.getTime() - applied.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 ? diffDays : '';
        }
        function getRemarksOrMissing(record) {
            if (record.status === 'Failed KYC') return record.remarks || '';
            if (record.status === 'For Completion') return record.missing || '';
            return record.remarks || record.missing || '';
        }
        function renderTable(data) {
            const allRows = [...data].sort((a, b) => (getEffectiveDate(b) || 0) - (getEffectiveDate(a) || 0));
            window.allTableData = allRows;
            buildTableFromData(allRows);
        }
        function buildTableFromData(rows) {
            window.currentVisibleRows = rows;
            const tbody = document.getElementById('recentTableBody');
            tbody.innerHTML = rows.map(r => {
                const aging = getAgingDays(r);
                const agingApp = getAgingFromApplied(r);
                const remarksMissing = getRemarksOrMissing(r);
                return `<tr>
                      <td>${r.date}</td>
                      <td>${r.date_transferred_credit}</td>
                      <td>${r.credit_decision}</td>
                      <td>${r.business}</td>
                      <td>${r.username}</td>
                      <td>${r.agent.split(' ')[0]}</td>
                      <td>${r.region}</td>
                      <td>${r.btype}</td>
                      <td>${r.req==='Complete'?'&#10004;':'&#10006;'}</td>
                      <td>${r.status}</td>
                      <td>${r.approval?'P'+Number(r.approval).toLocaleString():'-'}</td>
                      <td>${remarksMissing}</td>
                      <td>${r.disbursed?'P'+Number(r.disbursed).toLocaleString():'-'}</td>
                      <td>${aging}</td>
                      <td>${agingApp}</td>
                      <td>${r.first_due_date}</td>
                      <td>${r.days_before_due}</td>
                      <td>${r.all_billings}</td>
                    </tr>`;
            }).join('');
            const badge = document.getElementById('tableCountBadge');
            if (badge) {
                const total = (window.allTableData || rows).length;
                badge.textContent = rows.length === total ? `${total} Records` : `${rows.length} of ${total} shown`;
            }
        }
        function filterTable() {
            const query = document.getElementById('tableSearch').value.trim();
            const base = window.allTableData || [];
            let filtered = base;
            if (query) {
                const terms = query.split(/\s+/).filter(t => t.length > 0);
                filtered = base.filter(r => {
                    const rowStr = Object.values(r).join(' ').toLowerCase();
                    return terms.every(term => rowStr.includes(term.toLowerCase()));
                });
            }
            buildTableFromData(filtered);
            updateSearchTags(query);
        }
        function updateSearchTags(query) {
            const container = document.getElementById('search-tags');
            if (!container) return;
            const terms = query.trim().split(/\s+/).filter(t => t.length > 0);
            if (terms.length === 0) {
                container.innerHTML = '';
                return;
            }
            container.innerHTML = terms.map(term =>
                `<span class="search-tag" onclick="removeSearchTerm('${term}')">${term} &#10005;</span>`
            ).join(' ');
        }
        function removeSearchTerm(term) {
            const input = document.getElementById('tableSearch');
            const current = input.value.trim();
            const terms = current.split(/\s+/).filter(t => t.length > 0 && t !== term);
            input.value = terms.join(' ');
            filterTable();
        }
        function sortTable(colIndex) {
            if (tableSortCol === colIndex) {
                tableSortDir *= -1;
            } else {
                tableSortCol = colIndex;
                tableSortDir = 1;
            }
            const rows = [...(window.currentVisibleRows || window.allTableData || [])];
            const keyMap = [
                'date', 'date_transferred_credit', 'credit_decision', 'business', 'username', 'agent', 'region', 'btype',
                'req', 'status', 'approval', 'remarksMissing', 'disbursed', 'aging', 'agingApp',
                'first_due_date', 'days_before_due', 'all_billings'
            ];
            const key = keyMap[colIndex];
            if (key === 'aging' || key === 'agingApp') {
                rows.sort((a, b) => {
                    const aVal = key === 'aging' ? getAgingDays(a) : getAgingFromApplied(a);
                    const bVal = key === 'aging' ? getAgingDays(b) : getAgingFromApplied(b);
                    const aNum = typeof aVal === 'number' ? aVal : 0;
                    const bNum = typeof bVal === 'number' ? bVal : 0;
                    return (aNum - bNum) * tableSortDir;
                });
            } else {
                rows.sort((a, b) => {
                    const aVal = String(a[key] || '').toLowerCase();
                    const bVal = String(b[key] || '').toLowerCase();
                    if (aVal < bVal) return -1 * tableSortDir;
                    if (aVal > bVal) return 1 * tableSortDir;
                    return 0;
                });
            }
            buildTableFromData(rows);
        }
        function downloadCSV() {
            const rows = window.currentVisibleRows || window.allTableData || [];
            if (rows.length === 0) return alert('No data to download.');
            const headers = [
                'Date', 'Date Transferred Credit', 'Credit Decision Date', 'Business Name', 'Username', 'Agent', 'Region',
                'Type', 'Req.', 'Status', 'Amount Approved', 'Remarks/Missing', 'Disbursed', 'Aging Days', 'Aging Days (App)',
                'First Due Date', 'Days before due', 'All Billings'
            ];
            const csvRows = [headers.join(',')];
            rows.forEach(r => {
                const row = [
                    r.date,
                    r.date_transferred_credit,
                    r.credit_decision,
                    `"${r.business.replace(/"/g, '""')}"`,
                    r.username,
                    r.agent,
                    r.region,
                    r.btype,
                    r.req === 'Complete' ? 'Complete' : 'Incomplete',
                    r.status,
                    r.approval || '0',
                    getRemarksOrMissing(r),
                    r.disbursed || '0',
                    getAgingDays(r),
                    getAgingFromApplied(r),
                    r.first_due_date,
                    r.days_before_due,
                    r.all_billings
                ];
                csvRows.push(row.join(','));
            });
            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `saripay_applications_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
        }
        function renderDelinquency(data) {
  const del = data.filter(r => r.status === 'Disbursed' && r.delinquent && r.delinquent !== '');

  document.getElementById('delinq-badge').innerHTML = del.length + ' Accounts';
  del.sort((a, b) => {
    const getTotalDays = record => {
      const daysStr = record.delinquent;
      const daysArray = daysStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      return daysArray.reduce((acc, d) => acc + d, 0);
    };
    return getTotalDays(a) - getTotalDays(b);
  });

  const html = del.map((r, idx) => {
    const daysStr = r.delinquent;
    const daysArray = daysStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const totalDays = daysArray.reduce((a, b) => a + b, 0);
    const activeBills = Number(r.activebills) || 0;
    return `
      <div class="delinq-row" id="delinq-${idx}">
        <div>
          <div class="delinq-biz">${r.business} (${r.agent})</div>
          <div class="delinq-agent">(no.of active bills - ${activeBills}) (${totalDays} Days)</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span>${totalDays} days</span>
          <span id="send-icon-${idx}"
                class="send-icon"
                onclick="sendAlert('${r.agent.replace(/'/g, "\\'")}', '${r.business.replace(/'/g, "\\'")}', ${totalDays}, '${r.username.replace(/'/g, "\\'")}', ${activeBills}, ${idx})"
                title="Send Telegram alert">&#9993;&#65039;</span>
        </div>
      </div>
    `;
  }).join('') || '<div>None</div>';
  document.getElementById('delinqList').innerHTML = html;

  const disb = data.filter(r => r.status === 'Disbursed');
  document.getElementById('totalBills').innerHTML = disb.reduce((s, r) => s + r.bills, 0);
  document.getElementById('totalActiveBills').innerHTML = disb.reduce((s, r) => s + r.activebills, 0);
  document.getElementById('totalPaid').innerHTML = disb.reduce((s, r) => s + r.paidbills, 0);
  document.getElementById('paidCollector').innerHTML = disb.reduce((s, r) => s + r.collector, 0);
  document.getElementById('paidSelfservice').innerHTML = disb.reduce((s, r) => s + r.selfservice, 0);
}
        function sendAlert(agentName, storeName, daysDelinquent, username, activeBills, rowIndex) {
            const icon = document.getElementById('send-icon-' + rowIndex);
            if (!icon || icon.textContent === 'Sent') return;
            icon.style.cursor = 'default';
            icon.textContent = '...';
            google.script.run
                .withSuccessHandler(function(response) {
                    icon.textContent = 'Sent';
                    icon.style.cursor = 'default';
                    icon.title = 'Alert sent to ' + agentName;
                })
                .withFailureHandler(function(err) {
                    alert('Failed to send alert: ' + err.message);
                    icon.textContent = 'SEND';
                    icon.style.cursor = 'pointer';
                })
                .sendDelinquencyAlert(agentName, storeName, daysDelinquent, username, activeBills);
        }

let fullDelinqData = [];
let fullDelinqFiltered = [];
let fullDelinqSelected = new Set();

function getRowKey(r) {
  return r.agent + '|' + r.business + '|' + r.username;
}

function getTotalDelinqDays(r) {
  const arr = String(r.delinquent || '').split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  return arr.reduce((a, b) => a + b, 0);
}

function openFullDelinq() {
  fullDelinqData = FILTERED.filter(r => r.status === 'Disbursed' && r.delinquent && r.delinquent !== '');

  fullDelinqData.sort((a, b) => getTotalDelinqDays(a) - getTotalDelinqDays(b));

  fullDelinqSelected.clear();

  document.getElementById('fdSearch').value = '';
  document.getElementById('fdMinBills').value = '';
  document.getElementById('fdMaxBills').value = '';
  document.getElementById('fdMinDays').value = '';
  document.getElementById('fdMaxDays').value = '';

  document.getElementById('fullDelinqModal').style.display = 'flex';
  applyFullDelinqFilters();
}

function closeFullDelinq() {
  document.getElementById('fullDelinqModal').style.display = 'none';
}

function applyFullDelinqFilters() {
  const search    = (document.getElementById('fdSearch').value || '').trim().toLowerCase();
  const minBills  = document.getElementById('fdMinBills').value !== '' ? Number(document.getElementById('fdMinBills').value) : null;
  const maxBills  = document.getElementById('fdMaxBills').value !== '' ? Number(document.getElementById('fdMaxBills').value) : null;
  const minDays   = document.getElementById('fdMinDays').value  !== '' ? Number(document.getElementById('fdMinDays').value)  : null;
  const maxDays   = document.getElementById('fdMaxDays').value  !== '' ? Number(document.getElementById('fdMaxDays').value)  : null;

  fullDelinqFiltered = fullDelinqData.filter(r => {
    if (search) {
      const haystack = (r.business + ' ' + r.agent + ' ' + r.username).toLowerCase();
      if (haystack.indexOf(search) === -1) return false;
    }
    const bills = Number(r.activebills) || 0;
    const days  = getTotalDelinqDays(r);
    if (minBills !== null && bills < minBills) return false;
    if (maxBills !== null && bills > maxBills) return false;
    if (minDays  !== null && days  < minDays)  return false;
    if (maxDays  !== null && days  > maxDays)  return false;
    return true;
  });

  renderFullDelinqList();
}

function clearFullDelinqFilters() {
  document.getElementById('fdSearch').value = '';
  document.getElementById('fdMinBills').value = '';
  document.getElementById('fdMaxBills').value = '';
  document.getElementById('fdMinDays').value = '';
  document.getElementById('fdMaxDays').value = '';
  applyFullDelinqFilters();
}

function clearFullDelinqSelection() {
  fullDelinqSelected.clear();
  renderFullDelinqList();
}

function renderFullDelinqList() {
  const tbody = document.getElementById('fullDelinqTableBody');
  tbody.innerHTML = '';

  if (fullDelinqFiltered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">No accounts match the current filters.</td></tr>';
  } else {
    fullDelinqFiltered.forEach(r => {
      const totalDays   = getTotalDelinqDays(r);
      const activeBills = Number(r.activebills) || 0;
      const rowId       = getRowKey(r);
      const selected    = fullDelinqSelected.has(rowId);

      const tr = document.createElement('tr');
      tr.className = selected ? 'selected-row' : '';
      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="fullDelinqCheck" data-key="${rowId}" onchange="toggleRowSelection(this)" ${selected ? 'checked' : ''}>
        </td>
        <td>${r.business}</td>
        <td>${r.agent}</td>
        <td>${r.username}</td>
        <td>${activeBills}</td>
        <td>${totalDays}</td>
        <td>
          <button class="refresh-btn" style="padding: 4px 8px; font-size: 11px;"
            onclick="sendSingleFromFull('${r.agent.replace(/'/g, "\\'")}', '${r.business.replace(/'/g, "\\'")}', ${totalDays}, '${r.username.replace(/'/g, "\\'")}', ${activeBills}, this)">Send</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  updateFullDelinqSelectAllState();
  updateFullDelinqCounts();
}

function updateFullDelinqSelectAllState() {
  const selectAll = document.getElementById('fullDelinqSelectAll');
  const visibleKeys = fullDelinqFiltered.map(getRowKey);
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every(k => fullDelinqSelected.has(k));
  const someVisibleSelected = visibleKeys.some(k => fullDelinqSelected.has(k));
  selectAll.checked = allVisibleSelected;
  selectAll.indeterminate = !allVisibleSelected && someVisibleSelected;
}

function updateFullDelinqCounts() {
  const visEl  = document.getElementById('fdVisibleCount');
  const selEl  = document.getElementById('fdSelectedCount');
  if (visEl) visEl.textContent = `(${fullDelinqFiltered.length} visible)`;
  if (selEl) selEl.textContent = `${fullDelinqSelected.size} selected`;
}

function toggleSelectAllFull() {
  const selectAll  = document.getElementById('fullDelinqSelectAll');
  const visibleKeys = fullDelinqFiltered.map(getRowKey);

  if (selectAll.checked) {
    visibleKeys.forEach(k => fullDelinqSelected.add(k));
  } else {
    visibleKeys.forEach(k => fullDelinqSelected.delete(k));
  }
  renderFullDelinqList();
}

function toggleRowSelection(checkbox) {
  const key = checkbox.dataset.key;
  if (checkbox.checked) {
    fullDelinqSelected.add(key);
    checkbox.closest('tr').classList.add('selected-row');
  } else {
    fullDelinqSelected.delete(key);
    checkbox.closest('tr').classList.remove('selected-row');
  }
  updateFullDelinqSelectAllState();
  updateFullDelinqCounts();
}

function sendSingleFromFull(agentName, storeName, daysDelinquent, username, activeBills, btn) {
  btn.disabled = true;
  btn.textContent = '...';
  google.script.run
    .withSuccessHandler(function() {
      btn.textContent = 'Done';
      btn.disabled = false;
    })
    .withFailureHandler(function(err) {
      alert('Failed to send: ' + err.message);
      btn.textContent = 'Retry';
      btn.disabled = false;
    })
    .sendDelinquencyAlert(agentName, storeName, daysDelinquent, username, activeBills);
}

function sendToSelectedDelinq() {
  if (fullDelinqSelected.size === 0) {
    alert('No accounts selected.');
    return;
  }
  if (!confirm(`Send alerts to ${fullDelinqSelected.size} selected accounts?`)) return;

  const selectedKeys = Array.from(fullDelinqSelected);
  let index = 0;
  const sendNext = () => {
    if (index >= selectedKeys.length) {
      alert('All alerts sent.');
      return;
    }
    const key = selectedKeys[index];
    const rec = fullDelinqData.find(r => getRowKey(r) === key);
    if (!rec) { index++; sendNext(); return; }

    const totalDays   = getTotalDelinqDays(rec);
    const activeBills = Number(rec.activebills) || 0;

    google.script.run
      .withSuccessHandler(function() { index++; sendNext(); })
      .withFailureHandler(function(err) {
        alert(`Failed to send to ${rec.business}: ${err.message}`);
        index++; sendNext();
      })
      .sendDelinquencyAlert(rec.agent, rec.business, totalDays, rec.username, activeBills);
  };
  sendNext();
}
        function renderAgentBar(data) {
            const counts = {};
            data.forEach(r => counts[r.agent] = (counts[r.agent] || 0) + 1);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const maxV = sorted[0]?.[1] || 1;
            document.getElementById('agentBar').innerHTML = sorted.map(([name, c], i) =>
                    `<div class="agent-row"><div class="agent-name">${name.split(' ')[0]}</div><div class="agent-track"><div class="agent-fill" style="width:${c/maxV*100}%;background:${COLORS[i%COLORS.length]}"></div></div><div>${c}</div></div>`
                    ).join('');
        }
        function renderFunnel(data) {
            const total = data.length || 1;
            const complete = data.filter(r => r.req === 'Complete').length;
            const kycPassed = data.filter(r => r.req === 'Complete' && r.status !== 'Failed KYC').length;
            const creditAssessed = data.filter(r => ['For Disbursement', 'Disbursed', 'Failed CREDIT'].includes(r.status))
                .length;
            const creditApproved = data.filter(r => r.approval).length;
            const disbursed = data.filter(r => r.status === 'Disbursed').length;
            const stages = [
                { label: 'Total Applications', count: total, prevCount: total, color: '#5BA7FF' },
                { label: 'Complete Requirements', count: complete, prevCount: total, color: '#4FD9E8' },
                { label: 'KYC Passed', count: kycPassed, prevCount: complete, color: '#A78BFA' },
                { label: 'Credit Assessed', count: creditAssessed, prevCount: kycPassed, color: '#F5B94D' },
                { label: 'Credit Approved', count: creditApproved, prevCount: creditAssessed, color: '#34D399' },
                { label: 'Disbursed', count: disbursed, prevCount: creditApproved, color: '#6EE7B7' },
            ];
            document.getElementById('funnelBar').innerHTML = stages.map(s => {
                const convPct = s.prevCount ? Math.round((s.count / s.prevCount) * 100) : 0;
                const widthPct = Math.round((s.count / total) * 100);
                return `<div style="margin-bottom:12px;">
                      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
                        <span style="color:var(--text-secondary);">${s.label}</span>
                        <span style="font-weight:700;color:${s.color};">${s.count} <span style="color:var(--text-muted);font-weight:400;">(${convPct}%)</span></span>
                      </div>
                      <div style="background:rgba(255,255,255,0.06);border-radius:6px;height:10px;overflow:hidden;">
                        <div style="width:${widthPct}%;height:100%;background:${s.color};border-radius:6px;transition:width 0.8s var(--ease-out);"></div>
                      </div>
                    </div>`;
            }).join('');
        }
        function renderMonthlyTable(data) {
            const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const src = activeMonthRegion === 'ALL' ? data : data.filter(r => r.region === activeMonthRegion);
            const monthMap = new Map();
            src.forEach(r => {
                const ed = getApplicationDate(r);
                if (!ed) return;
                const year = ed.getFullYear();
                const month = ed.getMonth() + 1;
                const key = `${year}-${month.toString().padStart(2,'0')}`;
                const label = `${MONTH_NAMES[month-1]} ${year}`;
                if (!monthMap.has(key)) monthMap.set(key, { label, total: 0, approved: 0, forDisbursement: 0,
                    disbursedCount: 0, disbursedAmt: 0, gma: 0, sol: 0 });
                const m = monthMap.get(key);
                m.total++;
                if (r.approval) m.approved++;
                if (r.status === 'For Disbursement') m.forDisbursement++;
                if (r.status === 'Disbursed') { m.disbursedCount++;
                    m.disbursedAmt += Number(r.disbursed) || 0; }
                if (r.region === 'GMA') m.gma++;
                if (r.region === 'SOL') m.sol++;
            });
            const sortedKeys = Array.from(monthMap.keys()).sort();
            const sortedMonths = sortedKeys.map(key => monthMap.get(key));
            document.getElementById('monthlyTableBody').innerHTML = sortedMonths.map(m => `
                    <tr>
                      <td>${m.label}</td>
                      <td>${m.total}</td>
                      <td style="color:var(--accent-yellow);">${m.approved}</td>
                      <td style="color:var(--accent-teal);">${m.forDisbursement}</td>
                      <td style="color:var(--accent-green);">${m.disbursedCount}</td>
                      <td style="color:var(--accent-green);">P${m.disbursedAmt.toLocaleString()}</td>
                      <td style="color:#5BA7FF;">${m.gma}</td>
                      <td style="color:#4FD9E8;">${m.sol}</td>
                    </tr>`).join('');
            if (charts.mc) charts.mc.destroy();
            const ctx = document.getElementById('chartMonthly').getContext('2d');
            charts.mc = new Chart(ctx, {
                type: 'bar',
                data: { labels: sortedMonths.map(m => m.label), datasets: [
                        { label: 'Total Applications', data: sortedMonths.map(m => m.total),
                            backgroundColor: 'rgba(91,167,255,0.7)', borderRadius: 4 },
                        { label: 'Approved', data: sortedMonths.map(m => m.approved),
                            backgroundColor: 'rgba(245,185,77,0.7)', borderRadius: 4 },
                        { label: 'Disbursed', data: sortedMonths.map(m => m.disbursedCount),
                            backgroundColor: 'rgba(52,211,153,0.9)', borderRadius: 4 },
                    ] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom',
                            labels: { font: { size: 11 } } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true } } }
            });
            setTimeout(() => { if (charts.mc) charts.mc.resize(); }, 200);
        }
        function destroyChart(id) { if (charts[id]) { charts[id].destroy();
                delete charts[id]; } }
        function renderCharts(data) {
            destroyChart('sd');
            const cnt = s => data.filter(r => r.status === s).length;
            charts.sd = new Chart(document.getElementById('chartStatusDonut').getContext('2d'), {
                type: 'doughnut',
                data: { labels: ['Pending KYC', 'Credit Assess.', 'For Completion', 'Failed KYC', 'Failed Credit',
                        'For Disbursement', 'Disbursed'
                    ],
                    datasets: [{ data: [cnt('Pending for KYC'), cnt('For Credit Assessment'), cnt('For Completion'),
                            cnt('Failed KYC'), cnt('Failed CREDIT'), cnt('For Disbursement'), cnt('Disbursed')
                        ],
                        backgroundColor: ['#F5B94D', '#5BA7FF', '#A78BFA', '#FF6B6B', '#FF9F5A', '#4FD9E8',
                            '#34D399'
                        ], borderWidth: 2, borderColor: '#0E1826', hoverOffset: 8 }] },
                options: { cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c =>
                                `${c.label}: ${c.raw} (${data.length?Math.round(c.raw/data.length*100):0}%)` } } },
                    animation: { duration: 800 } }
            });
            destroyChart('da');
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const labels = [];
            for (let d = 1; d <= daysInMonth; d++) labels.push(d);
            const statuses = ['For Completion', 'Pending for KYC', 'Failed KYC', 'Failed CREDIT',
                'For Credit Assessment', 'For Disbursement', 'Disbursed'
            ];
            const statusColors = ['#A78BFA', '#F5B94D', '#FF6B6B', '#FF9F5A', '#5BA7FF', '#4FD9E8', '#34D399'];
            const datasets = statuses.map((status, idx) => {
                const dailyCounts = {};
                data.filter(r => r.status === status).forEach(r => {
                    const ed = getApplicationDate(r);
                    if (ed && ed.getMonth() === now.getMonth() && ed.getFullYear() === now.getFullYear()) {
                        const day = ed.getDate();
                        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
                    }
                });
                const vals = labels.map(day => dailyCounts[day] || 0);
                return {
                    label: status,
                    data: vals,
                    borderColor: statusColors[idx],
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointBackgroundColor: statusColors[idx],
                    tension: 0.3,
                    fill: false
                };
            });
            document.getElementById('daily-badge').textContent = now.toLocaleString('default', { month: 'short' }) + ' ' + now
                .getFullYear();
            const ctx2 = document.getElementById('chartDailyApps').getContext('2d');
            charts.da = new Chart(ctx2, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12, padding: 8 } }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { maxTicksLimit: 10 } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            });
            destroyChart('bt');
            const btc = {};
            data.forEach(r => { const t = r.btype || 'Other';
                btc[t] = (btc[t] || 0) + 1; });
            const sortedBT = Object.entries(btc).sort((a, b) => b[1] - a[1]).slice(0, 10);
            charts.bt = new Chart(document.getElementById('chartBizType').getContext('2d'), {
                type: 'bar',
                data: { labels: sortedBT.map(([k]) => k.length > 22 ? k.slice(0, 22) + '...' : k),
                    datasets: [{ label: 'Count', data: sortedBT.map(([, v]) => v), backgroundColor: COLORS,
                        borderRadius: 4, borderSkipped: false }] },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true,
                        ticks: { precision: 0 } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } }
            });
            destroyChart('ad');
            const adc = {};
            data.filter(r => r.status === 'Disbursed' && r.disbursed).forEach(r => { adc[r.agent] = (adc[r.agent] || 0) +
                    Number(r.disbursed); });
            const sortedAD = Object.entries(adc).sort((a, b) => b[1] - a[1]);
            charts.ad = new Chart(document.getElementById('chartAgentDisbursed').getContext('2d'), {
                type: 'bar',
                data: { labels: sortedAD.map(([k]) => k.split(' ').slice(-1)[0]), datasets: [{ label: 'Disbursed (P)',
                        data: sortedAD.map(([, v]) => v), backgroundColor: sortedAD.map((_, i) => COLORS[i %
                            COLORS.length]), borderRadius: 4, borderSkipped: false }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: c => `P${c.raw.toLocaleString()}` } } },
                    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => `P${(v/1000).toFixed(0)}k` } } } }
            });
            destroyChart('amt');
            const buckets = { 'P1-25k': 0, 'P25-35k': 0, 'P35-45k': 0, 'P45-50k': 0, 'P50k+': 0 };
            data.filter(r => r.disbursed).forEach(r => {
                const v = Number(r.disbursed);
                if (v <= 25000) buckets['P1-25k']++;
                else if (v <= 35000) buckets['P25-35k']++;
                else if (v <= 45000) buckets['P35-45k']++;
                else if (v < 50000) buckets['P45-50k']++;
                else buckets['P50k+']++;
            });
            charts.amt = new Chart(document.getElementById('chartAmountDist').getContext('2d'), {
                type: 'doughnut',
                data: { labels: Object.keys(buckets), datasets: [{ data: Object.values(buckets),
                        backgroundColor: ['#5BA7FF', '#4FD9E8', '#F5B94D', '#34D399', '#A78BFA'], borderWidth: 2,
                        borderColor: '#0E1826', hoverOffset: 8 }] },
                options: { cutout: '60%', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12,
                            padding: 10 } }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} accounts` } } } }
            });
        }
        function renderBAO(data) {
            const agentsMap = {};
            data.forEach(r => {
                const agent = r.agent;
                if (!agentsMap[agent]) {
                    agentsMap[agent] = {
                        name: agent,
                        region: r.region || 'N/A',
                        total: 0,
                        approved: 0,
                        rejected: 0,
                        disbursedCount: 0,
                        approvedAmt: 0,
                        disbursedAmt: 0,
                        pd: 0,
                        bucket1: 0,
                        bucket2: 0,
                        bucket3: 0
                    };
                }
                const a = agentsMap[agent];
                a.total++;
                if (r.approval && r.approval.trim() !== '') {
                    a.approved++;
                    a.approvedAmt += Number(r.approval) || 0;
                }
                if (r.status === 'Failed KYC' || r.status === 'Failed CREDIT') a.rejected++;
                if (r.status === 'Disbursed') {
                    a.disbursedCount++;
                    a.disbursedAmt += Number(r.disbursed) || 0;
                }
                if (r.delinquent && r.delinquent.trim() !== '') {
                    const daysArr = r.delinquent.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                    const totalDays = daysArr.reduce((s, d) => s + d, 0);
                    if (totalDays > 0) {
                        a.pd++;
                        if (totalDays <= 30) a.bucket1++;
                        else if (totalDays <= 60) a.bucket2++;
                        else if (totalDays <= 90) a.bucket3++;
                    }
                }
            });
            const regionOrder = { 'SOL': 0, 'GMA': 1 };
            let rows = Object.values(agentsMap).sort((a, b) => {
                const rA = regionOrder[a.region] !== undefined ? regionOrder[a.region] : 99;
                const rB = regionOrder[b.region] !== undefined ? regionOrder[b.region] : 99;
                if (rA !== rB) return rA - rB;
                return b.total - a.total;
            });
            baoDataAll = rows;
            buildBaoTable(rows);
            document.getElementById('baoFilterLabel').textContent = `Filtered (${data.length} apps)`;
        }
        function buildBaoTable(rows) {
            const tbody = document.getElementById('baoTableBody');
            let sumTotal = 0,
                sumApproved = 0,
                sumRejected = 0,
                sumDisbursed = 0,
                sumApprovedAmt = 0,
                sumAmount = 0,
                sumPd = 0,
                sumBucket1 = 0,
                sumBucket2 = 0,
                sumBucket3 = 0;
            rows.forEach(r => {
                sumTotal += r.total;
                sumApproved += r.approved;
                sumRejected += r.rejected;
                sumDisbursed += r.disbursedCount;
                sumApprovedAmt += r.approvedAmt;
                sumAmount += r.disbursedAmt;
                sumPd += r.pd;
                sumBucket1 += r.bucket1;
                sumBucket2 += r.bucket2;
                sumBucket3 += r.bucket3;
            });
            function regionSubtotalRow(regionName, list) {
                const s = {
                    total: 0, approved: 0, rejected: 0, disbursedCount: 0, approvedAmt: 0,
                    disbursedAmt: 0, pd: 0, bucket1: 0, bucket2: 0, bucket3: 0
                };
                list.forEach(r => {
                    s.total += r.total;
                    s.approved += r.approved;
                    s.rejected += r.rejected;
                    s.disbursedCount += r.disbursedCount;
                    s.approvedAmt += r.approvedAmt;
                    s.disbursedAmt += r.disbursedAmt;
                    s.pd += r.pd;
                    s.bucket1 += r.bucket1;
                    s.bucket2 += r.bucket2;
                    s.bucket3 += r.bucket3;
                });
                return `
                    <tr class="bao-subtotal-row">
                      <td>${regionName} Subtotal</td>
                      <td>${s.total}</td>
                      <td>${s.approved}</td>
                      <td>${s.rejected}</td>
                      <td>${s.disbursedCount}</td>
                      <td>P${s.approvedAmt.toLocaleString()}</td>
                      <td>P${s.disbursedAmt.toLocaleString()}</td>
                      <td>${s.pd}</td>
                      <td>${s.bucket1}</td>
                      <td>${s.bucket2}</td>
                      <td>${s.bucket3}</td>
                    </tr>
                  `;
            }
            let html = '';
            let lastRegion = null;
            let currentGroup = [];
            rows.forEach((r, idx) => {
                if (r.region !== lastRegion) {
                    if (lastRegion !== null && currentGroup.length) {
                        html += regionSubtotalRow(lastRegion, currentGroup);
                    }
                    html += `
                        <tr class="bao-region-row">
                          <td colspan="11">${r.region || 'N/A'}</td>
                        </tr>
                      `;
                    lastRegion = r.region;
                    currentGroup = [];
                }
                currentGroup.push(r);
                html += `
                    <tr>
                      <td>${r.name}</td>
                      <td>${r.total}</td>
                      <td>${r.approved}</td>
                      <td>${r.rejected}</td>
                      <td>${r.disbursedCount}</td>
                      <td>P${r.approvedAmt.toLocaleString()}</td>
                      <td>P${r.disbursedAmt.toLocaleString()}</td>
                      <td>${r.pd}</td>
                      <td>${r.bucket1}</td>
                      <td>${r.bucket2}</td>
                      <td>${r.bucket3}</td>
                    </tr>
                  `;
                if (idx === rows.length - 1 && currentGroup.length) {
                    html += regionSubtotalRow(lastRegion, currentGroup);
                }
            });
            html += `
                    <tr style="border-top: 2px solid var(--accent-blue); background: rgba(91,167,255,0.06); font-weight: 700; color: var(--text-primary);">
                      <td>TOTAL</td>
                      <td>${sumTotal}</td>
                      <td>${sumApproved}</td>
                      <td>${sumRejected}</td>
                      <td>${sumDisbursed}</td>
                      <td>P${sumApprovedAmt.toLocaleString()}</td>
                      <td>P${sumAmount.toLocaleString()}</td>
                      <td>${sumPd}</td>
                      <td>${sumBucket1}</td>
                      <td>${sumBucket2}</td>
                      <td>${sumBucket3}</td>
                    </tr>
                  `;
            tbody.innerHTML = html;
        }
        function filterBaoTable() {
            const query = document.getElementById('baoSearch').value.toLowerCase();
            const filtered = baoDataAll.filter(r => r.name.toLowerCase().includes(query));
            buildBaoTable(filtered);
        }
        function sortBaoTable(colIndex) {
            if (baoSortCol === colIndex) {
                baoSortDir *= -1;
            } else {
                baoSortCol = colIndex;
                baoSortDir = 1;
            }
            const keys = ['name', 'total', 'approved', 'rejected', 'disbursedCount', 'approvedAmt', 'disbursedAmt', 'pd', 'bucket1',
                'bucket2', 'bucket3'
            ];
            const key = keys[colIndex];
            const regionOrder = { 'SOL': 0, 'GMA': 1 };
            const rows = [...baoDataAll];
            rows.sort((a, b) => {
                const rA = regionOrder[a.region] !== undefined ? regionOrder[a.region] : 99;
                const rB = regionOrder[b.region] !== undefined ? regionOrder[b.region] : 99;
                if (rA !== rB) return rA - rB;
                if (key === 'name') {
                    return a.name.localeCompare(b.name) * baoSortDir;
                }
                return (a[key] - b[key]) * baoSortDir;
            });
            baoDataAll = rows;
            buildBaoTable(rows);
            document.getElementById('baoSearch').value = '';
        }

let OFFICERS = [];
let pipState = { region: 'ALL', month: '' };
let pipMatrixSort = { col: 'region', dir: 1 };
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function statusRank(tenure) {
  if (tenure === null) return 0;
  if (tenure <= 30) return 1;
  if (tenure <= 60) return 2;
  if (tenure <= 90) return 3;
  return 4;
}

function sortPipMatrix(col) {
  if (pipMatrixSort.col === col) pipMatrixSort.dir *= -1;
  else { pipMatrixSort.col = col; pipMatrixSort.dir = 1; }
  renderPIP();
}

function sortPipMatrixRows(rows) {
  const { col, dir } = pipMatrixSort;
  return rows.slice().sort((a, b) => {
    let cmp = 0;
    if (col === 'agent') cmp = a.name.localeCompare(b.name);
    else if (col === 'region') cmp = (a.region || '').localeCompare(b.region || '');
    else if (col === 'tenure') cmp = (a.tenure ?? -1) - (b.tenure ?? -1);
    else if (col === 'status') cmp = statusRank(a.tenure) - statusRank(b.tenure);
    else if (col === 'total') cmp = (a._total || 0) - (b._total || 0);
    return cmp * dir;
  });
}

function parseDateFlex(str) {
  const d1 = parseDate(str);
  if (d1) return d1;
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s*(\d{4})$/);
  if (m) {
    const idx = MONTH_ABBR.indexOf(m[1].slice(0,3));
    if (idx >= 0) return new Date(+m[3], idx, +m[2]);
  }
  const t = Date.parse(str);
  return isNaN(t) ? null : new Date(t);
}
function loadOfficers() {
  if (typeof google === 'undefined' || !google.script || !google.script.run) return;
  google.script.run
    .withSuccessHandler(function(json){
      try { const p = JSON.parse(json); if (Array.isArray(p)) OFFICERS = p; } catch(e){}
      if (document.getElementById('pipView').classList.contains('active-view')) renderPIP();
    })
    .withFailureHandler(function(){})
    .getLoanOfficers();
}
function officerFor(name){
  if(!name) return null;
  const n = String(name).trim().toLowerCase();
  let o = OFFICERS.find(x => String(x.name||'').trim().toLowerCase() === n);
  if (o) return o;
  const toks = n.split(/\s+/);
  const first = toks[0], last = toks[toks.length-1];
  return OFFICERS.find(x => {
    const ot = String(x.name||'').trim().toLowerCase().split(/\s+/);
    return ot[0] === first && ot[ot.length-1] === last;
  }) || null;
}
function tenureDays(name, asOf){
  const o = officerFor(name);
  if(!o) return null;
  const d = parseDateFlex(o.start);
  if(!d) return null;
  return Math.floor(((asOf || new Date()).getTime() - d.getTime()) / 86400000);
}
function agentRegionOf(name){
  const cnt = {};
  RAW.forEach(r => { if (r.agent === name) cnt[r.region] = (cnt[r.region]||0)+1; });
  let best = '--', bc = 0;
  Object.keys(cnt).forEach(k => { if (cnt[k] > bc) { bc = cnt[k]; best = k; } });
  return best;
}
function allAgentNames(){
  const s = new Set();
  RAW.forEach(r => { if (r.agent) s.add(r.agent); });
  OFFICERS.forEach(o => { if (o.name) s.add(o.name); });
  return Array.from(s);
}
function monthKeyOf(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
function monthLabelKey(key){ const p = key.split('-'); return MONTH_ABBR[+p[1]-1] + ' ' + p[0]; }
function buildMonthKeys(){
  const now = new Date();

  const CUTOFF_YEAR  = 2026;
  const CUTOFF_MONTH = 6;

  const isOnOrAfterCutoff = (d) => {
    if (!d) return false;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return (y > CUTOFF_YEAR) || (y === CUTOFF_YEAR && m >= CUTOFF_MONTH);
  };

  const keys = new Set();

  RAW.forEach(r => {
    const d = parseDate(r.date_disbursed);
    if (d && isOnOrAfterCutoff(d)) keys.add(monthKeyOf(d));
  });

  OFFICERS.forEach(o => {
    const d = parseDateFlex(o.start);
    if (d && isOnOrAfterCutoff(d)) keys.add(monthKeyOf(d));
  });

  keys.add(monthKeyOf(now));
  const sorted = Array.from(keys).sort();

  if (sorted.length === 0) return [monthKeyOf(now)];

  let y = +sorted[0].split('-')[0];
  let m = +sorted[0].split('-')[1];
  const out = [];

  while (y < CUTOFF_YEAR || (y === CUTOFF_YEAR && m < CUTOFF_MONTH)) {
    m++; if (m > 12) { m = 1; y++; }
  }

  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    out.push(y + '-' + String(m).padStart(2, '0'));
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}
function asOfForMonth(key){
  const p = key.split('-').map(Number);
  const now = new Date();
  if (p[0] === now.getFullYear() && p[1] === now.getMonth()+1) return now;
  return new Date(p[0], p[1], 0, 23, 59, 59);
}
function shortAgentName(n){
  const p = String(n).trim().split(/\s+/);
  return p.length > 1 ? p[0] + ' ' + p[p.length-1].charAt(0) + '.' : String(n);
}
function setPipRegion(r, el){
  pipState.region = r;
  document.querySelectorAll('#pipRegionTabs .rtab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderPIP();
}
function setPipMonth(v){ pipState.month = v; renderPIP(); }

function renderPIP(){
  if (!RAW.length) return;
  const months = buildMonthKeys();
  const curKey = monthKeyOf(new Date());
  if (!pipState.month || months.indexOf(pipState.month) === -1) pipState.month = curKey;
  const sel = document.getElementById('pipMonthFilter');
  sel.innerHTML = months.slice().reverse().map(k => `<option value="${k}">${monthLabelKey(k)}</option>`).join('');
  sel.value = pipState.month;

  const counts = {};
  RAW.forEach(r => {
    if (r.status !== 'Disbursed') return;
    const d = parseDate(r.date_disbursed);
    if (!d) return;
    const k = monthKeyOf(d);
    if (!counts[r.agent]) counts[r.agent] = {};
    counts[r.agent][k] = (counts[r.agent][k] || 0) + 1;
  });
  const getC = (a,k) => (counts[a] && counts[a][k]) || 0;

const names = OFFICERS.map(o => o.name).filter(name => {
  if (pipState.region === 'ALL') return true;
  return agentRegionOf(name) === pipState.region;
});
  const asOf = asOfForMonth(pipState.month);
  const info = names.map(a => {
    const o = officerFor(a);
    const t = tenureDays(a, asOf);
    const tenured = (t !== null && t > 90);
    const c = getC(a, pipState.month);
    return { name:a, region:agentRegionOf(a), wh:(o&&o.wh)?o.wh:'--', start:(o&&o.start)?o.start:'--',
             tenure:t, tenured:tenured, count:c, met:(tenured && c >= 10), pip:(tenured && c < 10) };
  }).sort((x,y) => (x.region === y.region ? y.count - x.count : (x.region < y.region ? -1 : 1)));

  info.forEach(i => { i._total = months.reduce((s, k) => s + getC(i.name, k), 0); });

  const tenuredList = info.filter(i => i.tenured);
  const metList = info.filter(i => i.met);
  const pipList = info.filter(i => i.pip).sort((a,b) => a.count - b.count);
  const compliance = tenuredList.length ? Math.round(metList.length / tenuredList.length * 100) : 0;

  document.getElementById('pipBadge').innerHTML = `${pipList.length} on PIP - ${monthLabelKey(pipState.month)}`;
  document.getElementById('pipChartMonthLabel').textContent = monthLabelKey(pipState.month);
  document.getElementById('pipChartRegionLabel').textContent = pipState.region === 'ALL' ? 'All Regions' : pipState.region;
  document.getElementById('pipListMonthLabel').textContent = monthLabelKey(pipState.month);
  document.getElementById('pipListCount').textContent = pipList.length + ' agent' + (pipList.length === 1 ? '' : 's');

  document.getElementById('pipKpiRow').innerHTML = `
    <div class="kpi-card teal"><div class="kpi-icon teal">&#128336;</div><div class="kpi-label">Tenured Agents (&gt;90d)</div><div class="kpi-value">${tenuredList.length}</div><div class="kpi-sub">of ${info.length} agents in view</div></div>
    <div class="kpi-card green"><div class="kpi-icon green">&#9989;</div><div class="kpi-label">Met Quota (&ge;10)</div><div class="kpi-value">${metList.length}</div><div class="kpi-sub">${monthLabelKey(pipState.month)}</div></div>
    <div class="kpi-card red"><div class="kpi-icon red">&#128680;</div><div class="kpi-label">On PIP (&lt;10)</div><div class="kpi-value">${pipList.length}</div><div class="kpi-sub">tenured but below quota</div></div>
    <div class="kpi-card yellow"><div class="kpi-icon yellow">&#128200;</div><div class="kpi-label">Compliance Rate</div><div class="kpi-value">${compliance}%</div><div class="kpi-sub">met / tenured</div></div>`;

  document.getElementById('pipList').innerHTML = pipList.length ? pipList.map(i => `
    <div class="delinq-row">
      <div>
        <div class="delinq-biz">${i.name}</div>
        <div class="delinq-agent">${i.region} - WH ${i.wh} - started ${i.start} - tenured ${i.tenure} days</div>
      </div>
      <div style="text-align:right;">
        <span style="font-size:17px;font-weight:800;color:var(--accent-red);">${i.count}/10</span>
        <div style="font-size:10px;color:var(--text-muted);">short by ${10 - i.count}</div>
      </div>
    </div>`).join('')
    : `<div style="padding:18px;text-align:center;color:var(--accent-green);font-weight:700;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.3);border-radius:12px;">All tenured agents met the &ge;10 disbursed quota for ${monthLabelKey(pipState.month)}.</div>`;

  destroyChart('pipA');
  const chartInfo = info.filter(i => i.tenured || i.count > 0);
  charts.pipA = new Chart(document.getElementById('chartPipAgents').getContext('2d'), {
    type: 'bar',
    data: {
      labels: chartInfo.map(i => shortAgentName(i.name)),
      datasets: [
        { label: 'Disbursed', data: chartInfo.map(i => i.count),
          backgroundColor: chartInfo.map(i => i.pip ? 'rgba(255,107,107,0.85)' : (i.met ? 'rgba(52,211,153,0.85)' : 'rgba(91,167,255,0.55)')),
          borderRadius: 4 },
        { type: 'line', label: 'Quota (10)', data: chartInfo.map(() => 10), borderColor: '#F5B94D', borderDash: [6,4], borderWidth: 2, pointRadius: 0, fill: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 } } },
        tooltip: { callbacks: {
          title: items => chartInfo[items[0].dataIndex].name,
          afterLabel: c => c.datasetIndex === 0 ? (chartInfo[c.dataIndex].tenured ? 'Tenured >90d' : 'Probation <=90d') : ''
        } }
      },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 60, minRotation: 45 } },
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { precision: 0 } } }
    }
  });

  destroyChart('pipT');
  const trendMet = [], trendPip = [];
  months.forEach(k => {
    const a2 = asOfForMonth(k);
    let met = 0, pip = 0;
    names.forEach(a => {
      const t = tenureDays(a, a2);
      if (t === null || t <= 90) return;
      if (getC(a, k) >= 10) met++; else pip++;
    });
    trendMet.push(met); trendPip.push(pip);
  });
  charts.pipT = new Chart(document.getElementById('chartPipTrend').getContext('2d'), {
    type: 'bar',
    data: { labels: months.map(monthLabelKey), datasets: [
      { label: 'Met >=10', data: trendMet, backgroundColor: 'rgba(52,211,153,0.8)', borderRadius: 4 },
      { label: 'On PIP <10', data: trendPip, backgroundColor: 'rgba(255,107,107,0.8)', borderRadius: 4 }
    ] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } },
      scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 60, minRotation: 45 } },
                y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { precision: 0 } } } }
  });

  document.getElementById('pipMatrixHead').innerHTML =
    '<tr>' +
    '<th style="text-align:left;position:sticky;left:0;background:#0E1826;z-index:3;cursor:pointer;" onclick="sortPipMatrix(\'agent\')">Agent</th>' +
    '<th style="cursor:pointer;" onclick="sortPipMatrix(\'region\')">Region</th>' +
    '<th>WH</th><th>Start</th>' +
    '<th style="cursor:pointer;" onclick="sortPipMatrix(\'tenure\')">Tenure (d)</th>' +
    '<th style="cursor:pointer;" onclick="sortPipMatrix(\'status\')">Status</th>' +
    months.map(k => `<th class="${k === pipState.month ? 'pip-month-cur' : ''}">${monthLabelKey(k)}</th>`).join('') +
    '<th style="cursor:pointer;" onclick="sortPipMatrix(\'total\')">Total</th></tr>';
  const rowsSorted = sortPipMatrixRows(info);
  document.getElementById('pipMatrixBody').innerHTML = rowsSorted.map(i => {
    let total = 0;
    const cells = months.map(k => {
      const c = getC(i.name, k);
      total += c;
      const t = tenureDays(i.name, asOfForMonth(k));
      const ten = (t !== null && t > 90);
      const cls = ten ? (c >= 10 ? 'pip-ok' : 'pip-miss') : 'pip-na';
      const cur = (k === pipState.month) ? ' pip-cur' : '';
      return `<td class="pip-cell ${cls}${cur}">${c}</td>`;
    }).join('');
    const getStatusLabel = (tenure) => {
  if (tenure === null) return { text: 'NO START DATE', cls: 'sp-completion' };
  if (tenure > 90) return { text: 'TENURED >90D', cls: 'sp-disbursed' };
  if (tenure > 60) return { text: 'NEW >60D', cls: 'sp-credit' };
  if (tenure > 30) return { text: 'NEW >30D', cls: 'sp-credit' };
  return { text: 'NEW <31D', cls: 'sp-credit' };
};

const statusInfo = getStatusLabel(i.tenure);
const statusPill = `<span class="status-pill ${statusInfo.cls}">${statusInfo.text}</span>`;
    return `<tr class="${i.pip ? 'pip-row-flag' : ''}">
      <td style="position:sticky;left:0;background:#0E1826;z-index:2;font-weight:700;color:${i.pip ? 'var(--accent-red)' : 'var(--text-primary)'};white-space:nowrap;">${i.name}</td>
      <td>${i.region}</td><td>${i.wh}</td><td>${i.start}</td>
      <td>${i.tenure === null ? '--' : i.tenure}</td><td>${statusPill}</td>
      ${cells}
      <td style="font-weight:800;color:var(--text-primary);">${total}</td>
    </tr>`;
  }).join('');
}

let PD_DATA = [];
let pdMap = null;
let pdMarkers = [];

function pickPd(row, ...aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const norm = alias.toLowerCase().replace(/\s+/g, '').replace(/[?]/g, '');
    const found = keys.find(k =>
      k.toLowerCase().replace(/\s+/g, '').replace(/[?]/g, '') === norm
    );
    if (found !== undefined) {
      const v = row[found];
      if (v !== undefined && v !== null && v !== '') return v;
    }
  }
  return '';
}

function pdSeverityOf(r) {
  return String(pickPd(r, 'Severe Account?', 'Severe Account', 'severe_account') || '').trim();
}

function initPdMap() {
  if (pdMap) return;
  const container = document.getElementById('pdHeatmapContainer');
  if (!container) return;
  pdMap = L.map('pdHeatmapContainer', {
    zoomControl: true,
    attributionControl: true
  }).setView([12.8797, 121.774], 6.5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
    minZoom: 5
  }).addTo(pdMap);
}

function getPdIcon(severity) {
  const s = String(severity || '').toLowerCase();

  if (s.includes('severe')) {
    return L.divIcon({
      className: 'pd-icon-severe',
      html: '<div style="width:18px;height:18px;background:#FF2D2D;border:2px solid #FFAFAF;'
          + 'border-radius:3px;box-shadow:0 0 12px #FF2D2D, 0 0 22px rgba(255,45,45,0.55);"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -12]
    });
  }

  if (s.includes('moderate')) {
    return L.divIcon({
      className: 'pd-icon-moderate',
      html: '<div style="width:16px;height:16px;background:#FF6B6B;border:2px solid #FFC7C7;'
          + 'border-radius:50%;box-shadow:0 0 10px rgba(255,107,107,0.75);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
    });
  }

  if (s.includes('good')) {
    return L.divIcon({
      className: 'pd-icon-good',
      html: '<div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;'
          + 'color:#34D399;font-size:22px;line-height:1;font-weight:900;'
          + 'text-shadow:0 0 8px rgba(52,211,153,0.85), 0 0 14px rgba(52,211,153,0.55);">&#9733;</div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -12]
    });
  }

  return L.divIcon({
    className: 'pd-icon-default',
    html: '<div style="width:14px;height:14px;background:#8296AC;border-radius:50%;'
        + 'box-shadow:0 0 6px rgba(130,150,172,0.6);"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9]
  });
}

function pdSeverityClass(sev) {
  const s = String(sev || '').toLowerCase();
  if (s.includes('severe'))   return 'pd-popup-severe';
  if (s.includes('moderate')) return 'pd-popup-moderate';
  if (s.includes('good'))     return 'pd-popup-good';
  return '';
}

function renderPdMarkers() {
  if (!pdMap) return;

  pdMarkers.forEach(m => pdMap.removeLayer(m));
  pdMarkers = [];

  const sevFilter    = document.getElementById('pdSeverityFilter').value;
  const regionFilter = document.getElementById('pdRegionFilter').value;

  const filtered = PD_DATA.filter(r => {
    const sev = pdSeverityOf(r);
    const reg = String(pickPd(r, 'Region') || '').trim();

    if (sevFilter !== 'ALL') {
      if (!sev.toLowerCase().includes(sevFilter.toLowerCase())) return false;
    }
    if (regionFilter !== 'ALL' && reg !== regionFilter) return false;
    return true;
  });

  const bounds = [];

  filtered.forEach(r => {
    const lat = parseFloat(pickPd(r, 'Latitude', 'lat'));
    const lng = parseFloat(pickPd(r, 'Longitude', 'lng', 'Long'));
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

    const severity  = pdSeverityOf(r);
    const sevClass  = pdSeverityClass(severity);

    const disbursedRaw = pickPd(r, 'disbursed_amount', 'Disbursed Amount');
    const disbursedNum = Number(disbursedRaw) || 0;

    const popupHtml = `
      <div class="pd-popup-title">${pickPd(r, 'business_name', 'Business Name') || '-'}</div>
      <table class="pd-popup-table">
        <tr><td class="k">Region</td><td class="v">${pickPd(r, 'Region') || '-'}</td></tr>
        <tr><td class="k">Username</td><td class="v">${pickPd(r, 'username', 'Username') || '-'}</td></tr>
        <tr><td class="k">Agent</td><td class="v">${pickPd(r, 'agent_name', 'Agent Name') || '-'}</td></tr>
        <tr><td class="k">Business Name</td><td class="v">${pickPd(r, 'business_name', 'Business Name') || '-'}</td></tr>
        <tr><td class="k">Owner's Name</td><td class="v">${pickPd(r, "owners_name", "Owner's Name", "Owner Name") || '-'}</td></tr>
        <tr><td class="k">Disbursed Amount</td><td class="v">P${disbursedNum.toLocaleString()}</td></tr>
        <tr><td class="k">Date Disbursed</td><td class="v">${pickPd(r, 'date_disbursed', 'Date Disbursed') || '-'}</td></tr>
        <tr><td class="k">Business Type</td><td class="v">${pickPd(r, 'business_type', 'Business Type') || '-'}</td></tr>
        <tr><td class="k">Delinquent Days</td><td class="v">${pickPd(r, 'delinquent days', 'Delinquent Days') || '-'}</td></tr>
        <tr><td class="k">All Billings</td><td class="v">${pickPd(r, 'All Billings', 'all_billings') || '-'}</td></tr>
        <tr><td class="k">Severe Account?</td><td class="v ${sevClass}">${severity || '-'}</td></tr>
      </table>
    `;

    const marker = L.marker([lat, lng], { icon: getPdIcon(severity) })
      .bindPopup(popupHtml, { maxWidth: 340, minWidth: 260 });

    marker.addTo(pdMap);
    pdMarkers.push(marker);
    bounds.push([lat, lng]);
  });

  const badge = document.getElementById('pdPointsBadge');
  if (badge) badge.textContent = filtered.length + ' account' + (filtered.length === 1 ? '' : 's');
    refreshPdSummaries();   // ← ADD THIS LINE HERE      

  if (bounds.length && pdMap) {
    try {
      pdMap.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 12 });
    } catch (e) { }
  }
}

function resetPdFilters() {
  document.getElementById('pdSeverityFilter').value = 'ALL';
  document.getElementById('pdRegionFilter').value   = 'ALL';
  renderPdMarkers();
}
document.getElementById('pdSeverityFilter').addEventListener('change', renderPdMarkers);
document.getElementById('pdRegionFilter').addEventListener('change', renderPdMarkers);

        document.getElementById('modeFilter').addEventListener('change', () => {
            activeModeFilter = document.getElementById('modeFilter').value;
            applyFilters();
        });
        document.getElementById('yearFilter').addEventListener('change', () => {
            activeDateFilter.year = document.getElementById('yearFilter').value;
            applyFilters();
        });
        document.getElementById('startMonthFilter').addEventListener('change', () => {
            activeDateFilter.startMonth = document.getElementById('startMonthFilter').value;
            applyFilters();
        });
        document.getElementById('endMonthFilter').addEventListener('change', () => {
            activeDateFilter.endMonth = document.getElementById('endMonthFilter').value;
            applyFilters();
        });
        document.getElementById('dayFilter').addEventListener('change', () => {
            activeDateFilter.day = document.getElementById('dayFilter').value;
            applyFilters();
        });
        const menuToggle = document.getElementById('menuToggle');
        const sidebarEl = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        function openSidebar() {
            sidebarEl.classList.remove('hidden-mobile');
            sidebarOverlay.classList.add('show');
        }
        function closeSidebar() {
            sidebarEl.classList.add('hidden-mobile');
            sidebarOverlay.classList.remove('show');
        }
        menuToggle.addEventListener('click', () => {
            if (sidebarEl.classList.contains('hidden-mobile')) openSidebar();
            else closeSidebar();
        });
        sidebarOverlay.addEventListener('click', closeSidebar);
        document.querySelectorAll('.sidebar .filter-item, .sidebar .region-btn, .sidebar .date-select').forEach(el => {
            el.addEventListener('click', () => {
                if (window.innerWidth <= 768) closeSidebar();
            });
        });
        if (window.innerWidth > 768) {
            sidebarEl.addEventListener('mouseenter', () => sidebarEl.classList.add('sidebar-pinned'));
            sidebarEl.addEventListener('mouseleave', () => sidebarEl.classList.remove('sidebar-pinned'));
        }
        document.addEventListener('DOMContentLoaded', () => {
          console.log('[SBL] DOMContentLoaded fired');
            loadData();
            setTimeout(() => {
                const dropdown = document.getElementById('viewSelector');
                dropdown.value = 'live';
                dropdown.dispatchEvent(new Event('change'));
            }, 100);
        });
function togglePdFullscreen() {
  var wrap = document.querySelector('#pdHeatmapView .heatmap-full');
  if (!wrap) return;
  wrap.classList.toggle('pd-fullscreen-active');
  setTimeout(function() { if (pdMap) pdMap.invalidateSize(); }, 250);
}
// ============================================================
// PD LOCATION NORMALIZATION + SUMMARY
// ============================================================

const BRGY_SYNONYMS = {
  'commonewalth': 'commonwealth',
  'pasong putik proper': 'pasong putik',
  'pasonh putik': 'pasong putik',
  'batasaan': 'batasan hills',
  'batasaan hills': 'batasan hills',
  'holly spirit': 'holy spirit',
  'loma degato': 'loma de gato',
  'lomq degato': 'loma de gato',
  'lomq degato marilao': 'loma de gato',
  'san roaue': 'san roque',
  'calcanto': 'calicanto',
  'gaya -gaya': 'gaya gaya',
  'bagong buha2': 'bagong buhay 2',
  'bagong buhay i': 'bagong buhay 1',
  'poblacion 7 taal': 'poblacion 7',
  'brgy 176': 'barangay 176',
  'brgy 177': 'barangay 177',
  'brgy 178': 'barangay 178',
  'brgy 179': 'barangay 179',
  'brgy 185': 'barangay 185',
  'brgy 3': 'barangay 3',
  'brgy 5': 'barangay 5',
  'brgy 22': 'barangay 22',
  'brgy 167': 'barangay 167',
  'brgy 168': 'barangay 168',
  'brgy 22 batangas': 'barangay 22',
  'brgy395': 'barangay 395',
  'brgy 395': 'barangay 395',
  'brgy 848': 'barangay 848',
  'brgy 641': 'barangay 641',
  'brgy 306': 'barangay 306',
  'brgy151': 'barangay 151',
  '176 db': 'barangay 176',
  '176 d': 'barangay 176',
  '167 liano': 'barangay 167',
  '168 deparo': 'barangay 168',
  '157 east bagong barrio': 'barangay 157',
  'san isidro cuenca': 'san isidro',
  'muzon east': 'muzon east',
  'bubuyan': 'bubuyan',
  'cuta': 'cuta',
  'gaya-gaya': 'gaya gaya',
  'tungkong mangga': 'tungkong mangga',
};

const CITY_SYNONYMS = {
  'ssn jose': 'san jose del monte',
  'san jose delmonte': 'san jose del monte',
  'san jose del monte bulacan': 'san jose del monte',
  'sjdm bulacan': 'san jose del monte',
  'city of san jose delmonte': 'san jose del monte',
  'quezon': 'quezon city',
  'sta rosa': 'santa rosa',
  'santa rosa city': 'santa rosa',
  'sta rosa city': 'santa rosa',
  'binan city': 'binan',
  'biñan city': 'binan',
  'montalban': 'rodriguez',
  'montalban rizal': 'rodriguez',
  'rodriguez rizal': 'rodriguez',
  'marilao bulacan': 'marilao',
  'marilao': 'marilao',
  'carmona cavite': 'carmona',
  'carmona city': 'carmona',
  'santa rosa laguna': 'santa rosa',
  'los banos laguna': 'los banos',
  'losbanos laguna': 'los banos',
  'dasmarinas cavite': 'dasmarinas',
  'dasmarin̈as': 'dasmarinas',
  'dasmarinas': 'dasmarinas',
  'las pinas city': 'las pinas',
  'laspiñas city': 'las pinas',
  'laspiñas': 'las pinas',
  'san pedro city': 'san pedro',
  'bacoor city': 'bacoor',
  'imus cavite': 'imus',
  'bacoor cavite': 'bacoor',
  'general mariano alvarez': 'general mariano alvarez',
  'gen mariano alvarez': 'general mariano alvarez',
  'santa maria bulacan': 'santa maria',
  'sta maria bulacan': 'santa maria',
  'sta maria': 'santa maria',
  'trece martires city': 'trece martires',
  'trece martires cavite': 'trece martires',
  'san jose del monte': 'san jose del monte',
  'city of san jose del monte': 'san jose del monte',
  'biñan': 'binan',
  'batangas city': 'batangas city',
  'san pablo': 'san pablo',
  'santo tomas': 'santo tomas',
  'san pascual': 'san pascual',
  'alaminos': 'alaminos',
  'tanauan city': 'tanauan',
  'norzagaray': 'norzagaray',
  'silang cavite': 'silang',
  'silang': 'silang',
  'antipolo rizal': 'antipolo',
  'antipolo': 'antipolo',
  'malvar': 'malvar',
  'cabuyao city': 'cabuyao',
  'cabuyao': 'cabuyao',
  'san mateo rizal': 'san mateo',
  'san mateo': 'san mateo',
  'marikina city': 'marikina',
  'marikina': 'marikina',
  'taguig': 'taguig',
  'muntinlupa city': 'muntinlupa',
  'muntinlupa': 'muntinlupa',
  'parañaque': 'paranaque',
  'paranaque': 'paranaque',
  'valenzuela city': 'valenzuela',
  'valenzuela': 'valenzuela',
  'manila': 'manila',
  'pasay city': 'pasay',
  'pasay': 'pasay',
  'pasig city': 'pasig',
  'pasig': 'pasig',
  'mandaluyong': 'mandaluyong',
  'makati city': 'makati',
  'makati': 'makati',
  'caloocan city': 'caloocan',
  'caloocan north': 'caloocan',
  'caloocan': 'caloocan',
  'malabon city': 'malabon',
  'malabon': 'malabon',
  'navotas': 'navotas',
  'pateros': 'pateros',
  'san juan': 'san juan',
  'sta mesa': 'santa mesa',
  'santa mesa': 'santa mesa',
  'sampaloc': 'sampaloc',
  'quiapo': 'quiapo',
  'tondo': 'tondo',
  'recto': 'sampaloc',
  'cainta rizal': 'cainta',
  'angono rizal': 'angono',
  'binangonan': 'binangonan',
  'tanza cavite': 'tanza',
  'tanza': 'tanza',
  'kawit': 'kawit',
  'naic cavite': 'naic',
  'naic': 'naic',
  'rosario': 'rosario',
  'amadeo cavite': 'amadeo',
  'amadeo': 'amadeo',
  'alfonso': 'alfonso',
  'mendez': 'mendez',
  'indang': 'indang',
  'noveleta': 'noveleta',
  'tagaytay city': 'tagaytay',
  'porac': 'porac',
  'arayat': 'arayat',
  'angat': 'angat',
  'pandi': 'pandi',
  'calauan': 'calauan',
  'lipa': 'lipa',
  'cuenca': 'cuenca',
  'taal batangas': 'taal',
  'taal': 'taal',
  'san rafael': 'san rafael',
  'mindanao': 'zamboanga del sur',
  'zamboanga del sur': 'zamboanga del sur',
};

function normalizeBrgyName(s) {
  if (!s) return '';
  let b = String(s).toLowerCase();
  b = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  b = b.replace(/[^a-z0-9\s]/g, ' ');
  b = b.replace(/\s+/g, ' ').trim();
  b = b.replace(/^(brgy|barangay|bgy)\s+/, 'barangay ');
  b = b.replace(/^pob\s*(\d+)/, 'poblacion $1');
  b = b.replace(/^poblacion\s*(\d+)/, 'poblacion $1');
  b = b.replace(/\bsto\b/g, 'santo');
  b = b.replace(/\bsta\b/g, 'santa');
  return BRGY_SYNONYMS[b] || b;
}

function normalizeCityName(s) {
  if (!s) return '';
  let c = String(s).toLowerCase();
  c = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  c = c.replace(/[^a-z0-9\s]/g, ' ');
  c = c.replace(/\s+/g, ' ').trim();
  c = c.replace(/^city of\s+/, '');
  c = c.replace(/\s+city$/, '');
  c = c.replace(/\bsto\b/g, 'santo');
  c = c.replace(/\bsta\b/g, 'santa');
  c = c.replace(/\bgen\b/g, 'general');
  c = c.replace(/sanjose/g, 'san jose');
  c = c.replace(/\s+/g, ' ').trim();
  return CITY_SYNONYMS[c] || c;
}

let PD_SUMMARY = { byLocation: [], byBao: [] };

function buildPdSummaries() {
  if (!Array.isArray(PD_DATA) || PD_DATA.length === 0) {
    PD_SUMMARY = { byLocation: [], byBao: [] };
    return;
  }

  // Phase 1: normalize
  const rows = PD_DATA.map(r => {
    const b = normalizeBrgyName(pickPd(r, 'Barangay', 'brgy', 'barangay') || '');
    const c = normalizeCityName(pickPd(r, 'City', 'Municipality', 'city') || '');
    const sev = pdSeverityOf(r);
    const agent = String(pickPd(r, 'agent_name', 'Agent Name') || '').trim();
    const region = String(pickPd(r, 'Region') || '').trim();
    return { brgy: b, city: c, sev: sev.toLowerCase(), agent, region };
  }).filter(r => r.brgy && r.city);

  // Phase 2: for each brgy, which cities does it appear in?
  const brgyCities = {};
  rows.forEach(r => {
    if (!brgyCities[r.brgy]) brgyCities[r.brgy] = new Set();
    brgyCities[r.brgy].add(r.city);
  });

  // Phase 3: if a brgy appears in only one city, force that city (Option B safety)
  rows.forEach(r => {
    const set = brgyCities[r.brgy];
    if (set && set.size === 1) r.city = Array.from(set)[0];
  });

  // Aggregate by location
  const locMap = {};
  rows.forEach(r => {
    const key = r.city + '|' + r.brgy;
    if (!locMap[key]) locMap[key] = { city: r.city, brgy: r.brgy, severe: 0, moderate: 0, good: 0, total: 0 };
    const o = locMap[key];
    o.total++;
    if (r.sev.includes('severe'))   o.severe++;
    else if (r.sev.includes('moderate')) o.moderate++;
    else if (r.sev.includes('good'))     o.good++;
  });
  const byLocation = Object.values(locMap).sort((a, b) => b.severe - a.severe || b.total - a.total);

  // Aggregate by agent
  const baoMap = {};
  rows.forEach(r => {
    if (!r.agent) return;
    if (!baoMap[r.agent]) baoMap[r.agent] = { agent: r.agent, region: r.region, severe: 0, moderate: 0, good: 0, total: 0 };
    const o = baoMap[r.agent];
    o.total++;
    if (r.sev.includes('severe'))   o.severe++;
    else if (r.sev.includes('moderate')) o.moderate++;
    else if (r.sev.includes('good'))     o.good++;
  });
  const byBao = Object.values(baoMap).sort((a, b) => b.severe - a.severe || b.total - a.total);

  PD_SUMMARY = { byLocation, byBao };
}

function renderPdLocationTable() {
  const tbody = document.getElementById('pdLocationTableBody');
  if (!tbody) return;
  const q = (document.getElementById('pdLocationSearch') || {}).value || '';
  const query = q.trim().toLowerCase();
  const rows = PD_SUMMARY.byLocation.filter(r => !query || (r.city + ' ' + r.brgy).includes(query));
  tbody.innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${r.city}</td>
      <td>${r.brgy}</td>
      <td style="color:#FF3B3B;font-weight:700;">${r.severe || ''}</td>
      <td style="color:#FF9F5A;font-weight:700;">${r.moderate || ''}</td>
      <td style="color:#34D399;font-weight:700;">${r.good || ''}</td>
      <td style="font-weight:700;">${r.total}</td>
    </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:18px;color:var(--text-muted);">No locations match.</td></tr>';
  const badge = document.getElementById('pdLocationCount');
  if (badge) badge.textContent = rows.length + ' location' + (rows.length === 1 ? '' : 's');
}

function renderPdBaoTable() {
  const tbody = document.getElementById('pdBaoTableBody');
  if (!tbody) return;
  const rows = PD_SUMMARY.byBao;
  tbody.innerHTML = rows.length ? rows.map(r => {
    const pct = r.total ? Math.round(r.severe / r.total * 100) : 0;
    const color = pct >= 60 ? '#FF3B3B' : pct >= 30 ? '#FF9F5A' : '#34D399';
    return `
    <tr>
      <td>${r.agent}</td>
      <td>${r.region}</td>
      <td style="color:#FF3B3B;font-weight:700;">${r.severe || ''}</td>
      <td style="color:#FF9F5A;font-weight:700;">${r.moderate || ''}</td>
      <td style="color:#34D399;font-weight:700;">${r.good || ''}</td>
      <td style="font-weight:700;">${r.total}</td>
      <td style="color:${color};font-weight:700;">${pct}%</td>
    </tr>`;
  }).join('')
    : '<tr><td colspan="7" style="text-align:center;padding:18px;color:var(--text-muted);">No agents.</td></tr>';
  const badge = document.getElementById('pdBaoCount');
  if (badge) badge.textContent = rows.length + ' agents';
}

function refreshPdSummaries() {
  buildPdSummaries();
  renderPdLocationTable();
  renderPdBaoTable();
}
