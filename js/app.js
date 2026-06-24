// ============================================================
// SUPABASE CONFIG
// ============================================================

const SUPABASE_URL     = 'https://ekcwmofllelccgobnnpc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kk3BNXcUy-GhJ1aetFIbXw_IsR4P0Kr';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================================
// FORMAT TIME — Sri Lanka (UTC+5:30)
// - Converts UTC timestamp from Supabase to SL local time
// - Use this for all date/time display in the UI
// ============================================================
function formatSLTime(utcString) {
    if (!utcString) return '—';
    return new Date(utcString).toLocaleString('en-LK', {
        timeZone: 'Asia/Colombo',
        day:    '2-digit',
        month:  '2-digit',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit'
    });
}

// ============================================================
// REPORTS — GLOBAL CHART INSTANCES
// Stored to destroy before redrawing on tab revisit
// ============================================================
let chartMachineInstance = null;
let chartWeeklyInstance  = null;


// ============================================================
// GLOBAL STATE
// - Tracks current user and active checklist context
// ============================================================

let currentPlanId        = null;
let currentMachineCategory = null;
let currentMachineNo     = null;
let currentUser          = null;
let checklistResults     = [];


// ============================================================
// CHECKLIST ITEMS
// - Sinhala maintenance checklist questions
// - Index used to match results on save
// ============================================================

/*const checklistItems = [
    "උෂ්ණත්ව මීටරයේ ක්‍රියාකාරීත්වය හා නිරවද්‍යතාවය",
    "කාලය සටහන් කිරීමේ මීටරයේ ක්‍රියාකාරීත්වය හා නිරවද්‍යතාවය",
    "ජල මීටරයේ ක්‍රියාකාරීත්වය හා නිරවද්‍යතාවය",
    "සයිරනය නියමිත පරිදි ක්‍රියාත්මක වේ",
    "දොර මුද්‍රාව හොඳ තත්වයේ පවතී",
    "හයිඩ්‍රොලික් තෙල් මට්ටම නිසියාකාරව පවතී",
    "යන්ත්‍රයට වාෂ්ප සපයන නළ නිසියාකාරව පවතී",
    "බෙල්ට් සහ වේන් වල තත්වය යහපත් වේ",
    "ජලය සපයන නළ වල තත්වය යහපත් වේ",
    "කුමන හෝ ලිහිසි තෙල් කාන්දුවක් නොමැත",
    "සොලනොයිඩ් වල ක්‍රියාකාරීත්වය යහපත් වේ",
    "යන්ත්‍රයේ කොටස්වල අනවශ්‍ය දෙදරීමක් නොමැත",
    "මෝටරයේ සහ ගියර් පෙට්ටියේ තත්වය යහපත් වේ",
    "පුලි වල තත්වය යහපත් වේ",
    "යන්ත්‍රයේ ඩ්‍රම් එක පළුඳු වලින් තොර වේ",
    "වායු සිලින්ඩරවල ක්‍රියාකාරීත්වය යහපත් වේ",
    "ජලය පිටකරනු ලබන වෑල්වය",
    "යන්ත්‍රයේ පිරිසිදු බව හා දුහුවිලිවලින් තොරවීම",
    "යන්ත්‍රයේ අදාල කොටස් ග්‍රීස් කිරීම",
    "යන්ත්‍රයේ අසාමාන්‍ය ශබ්ද නොමැත",
    "විදුලි පරිපථය අගුළු දා ඇත",
    "වලනය වන කොටස් ආරක්ෂිතව ආවරණය කර ඇත",
    "ආරක්ෂිත දොර අගුල නියමිත ආකාරයට ක්‍රියාත්මක වේ",
    "ආරක්ෂිත සංඥා හා උපදෙස් පුවරු ස්ථාපනය කර ඇත"
];*/

// ============================================================
// CHECKLIST TEMPLATES — LOAD
// - Fetches checklist items for a specific machine category
// - Replaces hardcoded checklistItems array
// ============================================================

async function loadChecklistTemplate(machineCategory) {

    console.log('Loading template for category:', machineCategory); // ADD

    const { data, error } = await supabaseClient
        .from('checklist_templates')
        .select('item_text')
        .eq('machine_category', machineCategory)
        .eq('is_active', true)
        .order('item_order', { ascending: true });

    if (error) {
        console.error('Checklist template load error:', error.message);
        return [];
    }

    console.log('Items found:', data.length); // ADD
    return data.map(d => d.item_text);
}


// ============================================================
// AUTH — LOGIN
// - Authenticates via Supabase email/password
// - Shows dashboard and loads Plan tab on success
// ============================================================

async function loginUser() {

    const email    = document.getElementById('loginUsernameInput').value;
    const password = document.getElementById('loginPasswordInput').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('Login error:', error);
        alert(error.message);
        return;
    }

    // Get logged-in user details
    const { data: { user } } = await supabaseClient.auth.getUser();
    const username = user.email.split('@')[0];

    document.getElementById('loggedUserName').innerText = username;
    currentUser = username;

    // Show dashboard, hide login
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');

    // Default to Plan tab on login
    document.querySelector('.dashboard__tab').click();

    // Pre-load Actual tab tasks in background
    populateActualYearFilter();
    loadTasks('weekPending', document.querySelector('.dashboard__filter-button'));
}


// ============================================================
// AUTH — LOGOUT
// - Signs out from Supabase
// - Hides dashboard, shows login screen
// ============================================================

async function logoutUser() {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error('Logout error:', error);
        alert(error.message);
        return;
    }

    // Hide dashboard, show login
    document.getElementById('dashboardScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');

    // Clear user display
    document.getElementById('loggedUserName').innerText = '';
    currentUser = null;
}


// ============================================================
// AUTH — SESSION RESTORE
// - On page load, checks for existing Supabase session
// - If session found, skips login and restores dashboard
// ============================================================

window.addEventListener('load', async () => {

    const { data } = await supabaseClient.auth.getSession();
    const session  = data.session;

    if (!session) return;

    // Restore user from session
    const username = session.user.email.split('@')[0];
    document.getElementById('loggedUserName').innerText = username;
    currentUser = username;

    // Show dashboard, hide login
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');

    // Default to Plan tab
    switchTab('plan', document.querySelector('.dashboard__tab'));

    // Pre-load tasks for Actual tab
    populateActualYearFilter();
    loadTasks('weekPending');
});


// ============================================================
// TABS — SWITCH
// - Hides all tab contents, shows selected tab
// - Triggers data load for each tab on switch
// ============================================================

function switchTab(name, btn) {

    // Deactivate all tabs
    document.querySelectorAll('.dashboard__tab')
        .forEach(t => t.classList.remove('active'));

    // Hide all tab content panels
    document.querySelectorAll('.dashboard__tab-content')
        .forEach(t => t.classList.add('hidden'));

    // Activate selected tab button
    btn.classList.add('active');

    // Show selected tab content
    document.getElementById('tab-' + name).classList.remove('hidden');

    // Load data for the selected tab
    if (name === 'plan') {
        loadMachineTypes();  // populate machine dropdowns
        loadPlanGantt();     // render gantt grid
    }

    if (name === 'Actual') {
        populateActualYearFilter();
        loadTasks(window._actualFilterType || 'weekPending');
    }

    if (name === 'dashboard') {
        loadDashboardStats(); // load summary stat cards
          loadReports();
    }

    if (name === 'review') {
        loadReviewTasks(); // load tasks awaiting admin sign-off
    }

    if (name === 'admin') {
        // nothing to auto-load — user picks a table
    }
}


// ============================================================
// DASHBOARD TAB — STATS
// - Loads all plans from Supabase
// - Calculates totals for each stat card
// - Overdue = Pending tasks past their planned_date
// ============================================================

async function loadDashboardStats() {

    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('service_type, status, planned_date, repair_cost, downtime_hours, machine_category, breakdown_start');

    if (error) {
        console.error('Dashboard stats error:', error.message);
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Calculate counts
    const total      = data.length;
    const scheduled  = data.filter(r => r.service_type === 'Scheduled').length;
    const pending    = data.filter(r => r.status === 'Pending').length;
    const completed  = data.filter(r => r.status === 'Completed').length;
    const overdue    = data.filter(r =>
        r.status === 'Pending' &&
        r.planned_date &&
        r.planned_date < today
    ).length;
    const breakdowns   = data.filter(r => r.service_type === 'Breakdown').length;
    const repairCost   = data.reduce((sum, r) => sum + (r.repair_cost || 0), 0);
    const downtimeHrs  = data.reduce((sum, r) => sum + (r.downtime_hours || 0), 0);

    // Update stat cards
    document.getElementById('dashTotal').textContent     = total;
    document.getElementById('dashScheduled').textContent = scheduled;
    document.getElementById('dashPending').textContent   = pending;
    document.getElementById('dashCompleted').textContent = completed;
    document.getElementById('dashOverdue').textContent   = overdue;
    document.getElementById('dashBreakdowns').textContent    = breakdowns;
    document.getElementById('dashRepairCost').textContent    = repairCost.toFixed(2);
    document.getElementById('dashDowntimeHours').textContent = downtimeHrs.toFixed(2);

    renderDowntimeBanner(data);
}


// ============================================================
// DOWNTIME BANNER — CURRENT MONTH, BY MACHINE CATEGORY
// - Shows the month/year being summarized in the heading
// - One small banner per machine category with total downtime hrs
// ============================================================
async function renderDowntimeBanner(data) {

    const now = new Date();
    const ym  = now.toISOString().slice(0, 7); // "YYYY-MM"

    const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('downtimeMonthLabel').textContent = `— ${monthLabel}`;

    const thisMonth = data.filter(r =>
        r.service_type === 'Breakdown' &&
        (r.breakdown_start || '').slice(0, 7) === ym
    );

    // Ensure machine category list is available, even if Plan tab hasn't loaded yet
    if (!window._machineData) {
        await loadMachineTypes();
    }

    const totals = {};

    // Start every known machine category at 0 hrs
    if (window._machineData) {
        const allCategories = [...new Set(window._machineData.map(d => d.machine_category))];
        allCategories.forEach(cat => { totals[cat] = 0; });
    }

    thisMonth.forEach(r => {
        const cat = r.machine_category || 'Unknown';
        totals[cat] = (totals[cat] || 0) + (r.downtime_hours || 0);
    });

    const container = document.getElementById('downtimeBannerRow');

    if (!Object.keys(totals).length) {
        container.innerHTML = '<div class="downtime-banner"><div class="downtime-banner__label">No downtime this month</div></div>';
        return;
    }

    container.innerHTML = Object.entries(totals)
        .map(([cat, hrs]) => `
            <div class="downtime-banner">
                <div class="downtime-banner__label">${cat}</div>
                <div class="downtime-banner__number">${hrs.toFixed(2)} hrs</div>
            </div>`)
        .join('');
}

// ============================================================
// ACTUAL TAB — YEAR FILTER
// - Populates year dropdown with current year ± 2
// - Defaults to current year on first load
// ============================================================

function populateActualYearFilter() {
    const select = document.getElementById('actualYearFilter');
    if (!select) return;

    const currentYear = new Date().getFullYear();
    if (select.options.length > 0) return; // already populated

    for (let y = currentYear - 2; y <= currentYear; y++) {
        const opt = document.createElement('option');
        opt.value       = String(y);
        opt.textContent = String(y);
        if (y === currentYear) opt.selected = true;
        select.appendChild(opt);
    }
}

function onActualYearChange() {
    loadTasks(window._actualFilterType || 'weekPending');
}


// ============================================================
// ACTUAL TAB — LOAD TASKS
// - Fetches all maintenance plans from Supabase
// - Filters by selected year, then by: This Week Pending / All Pending / All Tasks
// - Uses year_week for "This Week" filter (not planned_date)
// - Updates stat cards and renders task cards
// ============================================================

async function loadTasks(filterType, clickedButton) {

    window._actualFilterType = filterType;

    // Highlight active filter button
    document.querySelectorAll('.dashboard__filter-button')
        .forEach(btn => btn.classList.remove('active'));

    if (clickedButton) clickedButton.classList.add('active');

    // Fetch all plans ordered by planned date
    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('*')
        .order('planned_date');

    if (error) {
        console.error('Load tasks error:', error);
        alert(error.message);
        return;
    }

    // Get selected year (default to current year if selector not ready)
    const yearSelect  = document.getElementById('actualYearFilter');
    const selectedYear = yearSelect ? yearSelect.value : String(new Date().getFullYear());

    // Filter all data to the selected year
    const yearData = data.filter(r =>
        (r.planned_date || r.breakdown_start || '').startsWith(selectedYear)
    );

    // Update Actual tab stat cards using year-filtered data
    renderDashboardStats(yearData);

    // Current week string e.g. "2026-24"
    const currentWeek = getWeekNumber(new Date());

    // Apply task list filter on year-filtered data
    let filteredTasks = [];

    if (filterType === 'weekPending') {
        // Show pending tasks that are this week OR overdue (past weeks)
        filteredTasks = yearData.filter(task =>
            task.status === 'Pending' &&
            task.year_week <= currentWeek
        );

    } else if (filterType === 'allPending') {
        // All pending tasks regardless of week
        filteredTasks = yearData.filter(task => task.status === 'Pending');

    } else {
        // All tasks unfiltered
        filteredTasks = yearData;
    }

    // Render filtered task cards
    renderTaskCards(filteredTasks);
}


// ============================================================
// ACTUAL TAB — RENDER STAT CARDS
// - Called after loadTasks fetches data
// - Updates Planned / Scheduled / Pending / Completed counts
// ============================================================

function renderDashboardStats(taskData) {

    const planned           = taskData.filter(t => t.service_type === 'Planned').length;
    const scheduled         = taskData.filter(t => t.service_type === 'Scheduled').length;
    const pending           = taskData.filter(t => t.status === 'Pending').length;
    const completed         = taskData.filter(t => t.status === 'Completed').length;
    const breakdowns        = taskData.filter(t => t.service_type === 'Breakdown').length;
    const pendingBreakdowns = taskData.filter(t => t.service_type === 'Breakdown' && t.status === 'Pending').length;

    document.getElementById('dashboardPlannedCount').innerText          = planned;
    document.getElementById('dashboardScheduledCount').innerText        = scheduled;
    document.getElementById('dashboardPendingCount').innerText          = pending;
    document.getElementById('dashboardCompletedCount').innerText        = completed;
    document.getElementById('dashboardBreakdownCount').innerText        = breakdowns;
    document.getElementById('dashboardPendingBreakdownCount').innerText = pendingBreakdowns;
}


// ============================================================
// ACTUAL TAB — RENDER TASK CARDS
// - Renders one card per task
// - Clicking a card opens the checklist screen
// ============================================================


function renderTaskCards(taskData) {

    window._actualFilteredTasks = taskData;

    const container   = document.getElementById('dashboardTaskList');
    container.innerHTML = '';

    const currentWeek = getWeekNumber(new Date());

    taskData.forEach(task => {

        const planId   = task.planid || task.plan_id || '';
        const machine  = task.machine_no || '';
        const category = task.machine_category || '';
        const service  = task.service_type || '';
        const week     = task.year_week || '';
        const status   = task.status || '';

        // Status badge class
        const badgeCls = status === 'Completed'
            ? 'task-row__badge--completed'
            : status === 'Submitted'
                ? 'task-row__badge--submitted'
                : 'task-row__badge--pending';

                    // Card color based on week status
            let borderColor = '#1e3a8a';        // default blue
            let bgColor     = '#ffffff';        // default white

            if (status === 'Pending' && week < currentWeek) {
                borderColor = '#dc2626';        // red — overdue
                bgColor     = '#fff5f5';        // light red background
            }
            if (status === 'Pending' && week === currentWeek) {
                borderColor = '#f59e0b';        // yellow — this week
                bgColor     = '#fffbeb';        // light yellow background
            }
        container.innerHTML += `
            <div class="task-row"
                     style="border-left-color:${borderColor}; background:${bgColor};"
                    onclick="${status === 'Pending' ? `openChecklist('${planId}', '${category}', '${machine}')` : ''}">

                <!-- LEFT: Plan ID + Machine -->
                <div class="task-row__left">
                    <div class="task-row__title">${planId}</div>
                    <div class="task-row__machine">Machine: ${machine}</div>
                    <div class="task-row__category">Category: ${category}</div>
                </div>

                <!-- CENTER: Service type + Week -->
                <div class="task-row__center">
                    <div class="task-row__service">${service}</div>
                    <div class="task-row__week">Week: ${week}</div>
                    <div class="task-row__week">Date: ${formatSLTime(task.planned_date)}</div>
                </div>

                <!-- RIGHT: Status badge -->
                <div class="task-row__right">
                    <span class="task-row__badge ${badgeCls}">${status}</span>
                </div>

            </div>
        `;
    });
}


// ============================================================
// ACTUAL TAB — DOWNLOAD PENDING TASKS AS CSV
// ============================================================
function downloadPendingTasksCSV() {

    const tasks = window._actualFilteredTasks;
    if (!tasks || !tasks.length) {
        alert('No tasks to download.');
        return;
    }

    const headers = ['Plan No', 'Machine Category', 'Machine No', 'Task Type', 'Scheduled Week', 'Planned Date', 'Status', 'Notes / Comments'];
    const rows = tasks.map(t => {
        let notesCol = 'Scheduled';
        if (t.service_type === 'Breakdown' || t.service_type === 'Planned') {
            const parts = [];
            if (t.notes)    parts.push(t.notes);
            if (t.comments) parts.push(t.comments);
            notesCol = parts.join(' | ');
        }
        return [
            t.planid           || '',
            t.machine_category || '',
            t.machine_no       || '',
            t.service_type     || '',
            t.year_week        || '',
            t.planned_date     ? t.planned_date.split('T')[0] : '',
            t.status           || '',
            notesCol
        ];
    });

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const filterLabel = (window._actualFilterType === 'weekPending' ? 'ThisWeekPending'
                       : window._actualFilterType === 'allPending'  ? 'AllPending'
                       : 'AllTasks');

    const today = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `PendingTasks_${filterLabel}_${today}.csv`);
}


// ============================================================
// CHECKLIST — OPEN
// - Hides task list, shows checklist screen
// - Stores current plan context in global variables
// - Renders all checklist question rows
// ============================================================

/*function openChecklist(planId, category, machineNo) {

    console.log('Opening checklist for:', planId);

    // Store context for save
    currentPlanId          = planId;
    currentMachineCategory = category;
    currentMachineNo       = machineNo;

    // Reset previous results
    checklistResults = [];

    // Switch screens
    document.getElementById('taskListScreen').classList.add('hidden');
    document.getElementById('checklistScreen').classList.remove('hidden');

    // Render checklist questions
    const container = document.getElementById('checklistContainer');
    container.innerHTML = '';

    checklistItems.forEach((item, index) => {
        container.innerHTML += `
            <div class="check-row">

                <!-- Question text -->
                <div class="check-text">${item}</div>

                <!-- Answer buttons + comment -->
                <div class="check-bottom">

                    <div class="check-buttons">
                        <button class="btn-yes checklist-option-btn"
                                onclick="setResult(${index}, 'YES', this)">YES</button>
                        <button class="btn-no checklist-option-btn"
                                onclick="setResult(${index}, 'NO', this)">NO</button>
                        <button class="btn-na checklist-option-btn"
                                onclick="setResult(${index}, 'N/A', this)">N/A</button>
                    </div>

                    <div class="check-comment">
                        <input type="text"
                               id="comment_${index}"
                               placeholder="Comment">
                    </div>

                </div>

            </div>
        `;
    });
}*/

// ============================================================
// CHECKLIST — OPEN
// - Scheduled task: shows full checklist items
// - Planned task: shows single note from maintenance_plan
//   with comment box and complete button
// ============================================================

function openChecklist(planId, category, machineNo) {

    console.log('Opening checklist for:', planId);

    currentPlanId          = planId;
    currentMachineCategory = category;
    currentMachineNo       = machineNo;
    checklistResults       = [];

    // Switch screens
    document.getElementById('taskListScreen').classList.add('hidden');
    document.getElementById('checklistScreen').classList.remove('hidden');

    // Find the task from already loaded data to check service_type and notes
    loadAndRenderChecklist(planId);
}


// ============================================================
// CHECKLIST — LOAD AND RENDER
// - Fetches full plan from Supabase
// - Renders scheduled checklist OR planned note view
// ============================================================

async function loadAndRenderChecklist(planId) {

    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('*')
        .eq('planid', planId)
        .single();

    if (error || !data) return;

    console.log('Plan category:', data.machine_category);
console.log('Service type:', data.service_type);

const items = await loadChecklistTemplate(data.machine_category);
console.log('Checklist items loaded:', items.length);


    const container = document.getElementById('checklistContainer');
    container.innerHTML = '';

    // Update save button label based on service type
    const saveBtn = document.getElementById('saveChecklistBtn');
    if (saveBtn) {
        saveBtn.textContent = data.service_type === 'Scheduled' ? 'Save Checklist' : 'Save Report';
    }

    if (data.service_type === 'Breakdown') {

        // Breakdown task — capture repair start/end + cost
        window._currentChecklistItems = [];

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const nowLocal = now.toISOString().slice(0, 16);

        container.innerHTML = `
            <div class="check-row">
                <div class="check-text" style="color:#dc2626; font-size:14px;">⚠ Breakdown Report</div>
                <div style="background:#fff5f5; border:1px solid #fca5a5; border-radius:8px;
                            padding:12px 14px; font-size:14px; color:#7f1d1d; margin-top:8px; line-height:1.6;">
                    Reported by: <strong>${data.planned_by || '—'}</strong><br>
                    Breakdown start: ${formatSLTime(data.breakdown_start)}<br>
                    Cause: ${data.notes || '—'}
                </div>
            </div>
            <div class="check-row" style="margin-top:12px;">
                <div class="check-text">Repair Start</div>
                <input type="datetime-local" id="bdRepairStart" class="plan__input" value="${nowLocal}">
            </div>
            <div class="check-row" style="margin-top:12px;">
                <div class="check-text">Repair End</div>
                <input type="datetime-local" id="bdRepairEnd" class="plan__input" value="${nowLocal}">
            </div>
            <div class="check-row" style="margin-top:12px;">
                <div class="check-text">Comments</div>
                <textarea id="plannedComment" class="plan__input" rows="3" placeholder="Repair notes..."></textarea>
            </div>`;

        return;
    }

    if (data.service_type === 'Scheduled') {

        // Load checklist items for this machine category from Supabase
        const items = await loadChecklistTemplate(data.machine_category);

        if (!items.length) {
            container.innerHTML = '<div style="padding:16px;color:#6b7280;">No checklist template found for this machine category.</div>';
            return;
        }

        // Store loaded items globally for saveChecklist to use
        window._currentChecklistItems = items;

        container.innerHTML = `
            <div style="background:#f0f4ff; border:1px solid #c7d7f9; border-radius:8px;
                        padding:10px 14px; font-size:13px; color:#1e3a8a; margin-bottom:10px;">
                Planned by: <strong>${data.planned_by || '—'}</strong>
            </div>`;

        items.forEach((item, index) => {
            container.innerHTML += `
                <div class="check-row">
                    <div class="check-text">${item}</div>
                    <div class="check-bottom">
                        <div class="check-buttons">
                            <button class="btn-yes checklist-option-btn"
                                    onclick="setResult(${index}, 'YES', this)">YES</button>
                            <button class="btn-no checklist-option-btn"
                                    onclick="setResult(${index}, 'NO', this)">NO</button>
                            <button class="btn-na checklist-option-btn"
                                    onclick="setResult(${index}, 'N/A', this)">N/A</button>
                        </div>
                        <div class="check-comment">
                            <input type="text" id="comment_${index}" placeholder="Comment">
                        </div>
                    </div>
                </div>`;
        });

    } else {

        // Planned task — note + comment
        window._currentChecklistItems = [];
        const noteText = data.notes || 'No notes added for this plan.';

        container.innerHTML = `
            <div class="check-row">
                <div class="check-text" style="color:#1e3a8a; font-size:14px;">📋 Plan Note</div>
                <div style="background:#f0f4ff; border:1px solid #c7d7f9; border-radius:8px;
                            padding:12px 14px; font-size:14px; color:#1e3a8a; margin-top:8px; line-height:1.6;">
                    Planned by: <strong>${data.planned_by || '—'}</strong><br><br>
                    ${noteText}
                </div>
            </div>
            <div class="check-row" style="margin-top:12px;">
                <div class="check-text">Comment</div>
                <textarea id="plannedComment" class="plan__input" rows="3" placeholder="Enter your comment..."></textarea>
            </div>`;

        window._plannedNote = noteText;
    }
}

// ============================================================
// CHECKLIST — SET RESULT
// - Called when YES / NO / N/A is tapped
// - Stores result by index, highlights active button
// ============================================================

function setResult(index, value, clickedButton) {

    // Store result
    checklistResults[index] = {
        attribute_name: window._currentChecklistItems[index],
        result_value: value
    };

    // Highlight selected button, clear others in group
    const group = clickedButton.parentElement;
    group.querySelectorAll('button')
        .forEach(btn => btn.classList.remove('active'));

    clickedButton.classList.add('active');
}


// ============================================================
// CHECKLIST — BACK
// - Returns to task list without saving
// ============================================================

function backToTasks() {
    document.getElementById('checklistScreen').classList.add('hidden');
    document.getElementById('taskListScreen').classList.remove('hidden');
}


// ============================================================
// CHECKLIST — SAVE
// - Inserts all checklist rows into maintenance_actual table
// - Updates maintenance_plan status to Completed
// - Returns to task list and refreshes data
// ============================================================

/*async function saveChecklist() {

    console.log('Saving checklist for plan:', currentPlanId);

    try {

        // Build rows for each checklist item
        const rowsToInsert = checklistItems.map((item, i) => ({
            plan_id:          currentPlanId,
            machine_category: currentMachineCategory,
            machine_no:       currentMachineNo,
            technician:       currentUser,
            attribute_name:   item,
            result_value:     checklistResults[i]?.result_value || 'N/A',
            comments:         document.getElementById(`comment_${i}`)?.value || '',
            status:           'Completed',
            is_synced:        false
        }));

        // Insert checklist rows into maintenance_actual
        const { error: insertError } = await supabaseClient
            .from('maintenance_actual')
            .insert(rowsToInsert);

        if (insertError) {
            console.error('Checklist insert error:', insertError);
            alert(insertError.message);
            return;
        }

        // Update plan status to Completed in maintenance_plan
        const { error: updateError } = await supabaseClient
            .from('maintenance_plan')
            .update({ status: 'Completed' })
            .eq('planid', currentPlanId);

        if (updateError) {
            console.error('Plan update error:', updateError);
            alert(updateError.message);
            return;
        }

        alert('Checklist saved successfully!');

        // Return to task list and refresh
        backToTasks();
        refreshAll();

    } catch (err) {
        console.error('Unexpected error:', err);
        alert(err.message);
    }
}*/

async function saveChecklist() {

    console.log('Submitting checklist for plan:', currentPlanId);

    try {

        let rowsToInsert = [];

        // Fetch plan to check service_type
        const { data: plan } = await supabaseClient
            .from('maintenance_plan')
            .select('service_type, notes, breakdown_start')
            .eq('planid', currentPlanId)
            .single();

        if (plan.service_type === 'Breakdown') {

            const repairStartVal = document.getElementById('bdRepairStart')?.value;
            const repairEndVal   = document.getElementById('bdRepairEnd')?.value;
            const comment        = document.getElementById('plannedComment')?.value || '';

            if (!repairStartVal || !repairEndVal) {
                alert('Please enter repair start and end times.');
                return;
            }

            const repairStart = new Date(repairStartVal);
            const repairEnd   = new Date(repairEndVal);

            if (repairEnd < repairStart) {
                alert('Repair end time cannot be before repair start time.');
                return;
            }

            // Downtime = from breakdown start to repair end
            const breakdownStart = plan.breakdown_start ? new Date(plan.breakdown_start) : repairStart;
            const downtimeHours  = Math.round(((repairEnd - breakdownStart) / 3600000) * 100) / 100;
            const repairHours    = Math.round(((repairEnd - repairStart) / 3600000) * 100) / 100;

            rowsToInsert = [{
                plan_id:          currentPlanId,
                machine_category: currentMachineCategory,
                machine_no:       currentMachineNo,
                technician:       currentUser,
                attribute_name:   'Breakdown Repair',
                result_value:     'Submitted',
                comments:         comment,
                status:           'Submitted',
                is_synced:        false
            }];

            const { error: insertError } = await supabaseClient
                .from('maintenance_actual')
                .insert(rowsToInsert);

            if (insertError) {
                console.error('Insert error:', insertError);
                alert(insertError.message);
                return;
            }

            // NOTE: repair_cost is intentionally NOT set here — cost is
            // entered later by the maintenance admin in the Review tab.
            const { error: updateError } = await supabaseClient
                .from('maintenance_plan')
                .update({
                    status:         'Submitted',
                    completed_by:   currentUser,
                    comments:       comment,
                    repair_start:   repairStart.toISOString(),
                    repair_end:     repairEnd.toISOString(),
                    downtime_hours: downtimeHours,
                    repair_hours:   repairHours,
                    completed_date: new Date().toISOString()
                })
                .eq('planid', currentPlanId);

            if (updateError) {
                console.error('Plan update error:', updateError);
                alert(updateError.message);
                return;
            }

            alert('Breakdown repair submitted for admin review!');
            backToTasks();
            refreshAll();
            return;
        }

        if (plan.service_type === 'Scheduled') {

            // Full checklist rows
            rowsToInsert = window._currentChecklistItems.map((item, i) => ({
                plan_id:          currentPlanId,
                machine_category: currentMachineCategory,
                machine_no:       currentMachineNo,
                technician:       currentUser,
                attribute_name:   item,
                result_value:     checklistResults[i]?.result_value || 'N/A',
                comments:         document.getElementById(`comment_${i}`)?.value || '',
                status:           'Submitted',
                is_synced:        false
            }));

        } else {

            // Single row for planned task
            const comment = document.getElementById('plannedComment')?.value || '';

            rowsToInsert = [{
                plan_id:          currentPlanId,
                machine_category: currentMachineCategory,
                machine_no:       currentMachineNo,
                technician:       currentUser,
                attribute_name:   plan.notes || 'Plan Note',
                result_value:     'Submitted',
                comments:         comment,
                status:           'Submitted',
                is_synced:        false
            }];
        }

        // Insert into maintenance_actual
        const { error: insertError } = await supabaseClient
            .from('maintenance_actual')
            .insert(rowsToInsert);

        if (insertError) {
            console.error('Insert error:', insertError);
            alert(insertError.message);
            return;
        }

        // Update plan status, completed_by, comments, completed_date
        // Status goes to 'Submitted' here — admin sign-off (Review tab)
        // moves it to 'Completed'.
        const { error: updateError } = await supabaseClient
            .from('maintenance_plan')
            .update({
                status:         'Submitted',
                completed_by:   currentUser,
                comments:       plan.service_type === 'Scheduled'
                                    ? ''
                                    : document.getElementById('plannedComment')?.value || '',
                completed_date: new Date().toISOString()
            })
            .eq('planid', currentPlanId);

        if (updateError) {
            console.error('Plan update error:', updateError);
            alert(updateError.message);
            return;
        }

        alert('Submitted for admin review!');
        backToTasks();
        refreshAll();

    } catch (err) {
        console.error('Unexpected error:', err);
        alert(err.message);
    }
}


// ============================================================
// REVIEW TAB — LOAD TASKS
// - Fetches all Submitted tasks (awaiting admin sign-off)
// - Updates stat cards and renders review cards
// ============================================================

async function loadReviewTasks() {

    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('*')
        .eq('status', 'Submitted')
        .order('completed_date', { ascending: false });

    if (error) {
        console.error('Load review tasks error:', error);
        alert(error.message);
        return;
    }

    document.getElementById('reviewPendingCount').textContent = data.length;

    // Count how many were signed off today (for the stat card)
    const today = new Date().toISOString().split('T')[0];
    const { data: signedToday } = await supabaseClient
        .from('maintenance_plan')
        .select('planid')
        .eq('status', 'Completed')
        .gte('review_date', today + 'T00:00:00');

    document.getElementById('reviewSignedTodayCount').textContent = signedToday ? signedToday.length : 0;

    renderReviewCards(data);
}


// ============================================================
// REVIEW TAB — RENDER CARDS
// - One card per Submitted task
// - Clicking a card opens the review detail screen
// ============================================================

function renderReviewCards(taskData) {

    const container = document.getElementById('reviewTaskList');
    container.innerHTML = '';

    if (!taskData.length) {
        container.innerHTML = '<div style="padding:16px; color:#6b7280; font-size:13px;">✅ Nothing awaiting review.</div>';
        return;
    }

    taskData.forEach(task => {

        const planId   = task.planid;
        const machine   = task.machine_no || '';
        const category  = task.machine_category || '';
        const service   = task.service_type || '';

        container.innerHTML += `
            <div class="task-row"
                 style="border-left-color:#6366f1; background:#eef2ff;"
                 onclick="openReview('${planId}')">

                <div class="task-row__left">
                    <div class="task-row__title">${planId}</div>
                    <div class="task-row__machine">Machine: ${machine}</div>
                    <div class="task-row__category">Category: ${category}</div>
                </div>

                <div class="task-row__center">
                    <div class="task-row__service">${service}</div>
                    <div class="task-row__week">Submitted by: ${task.completed_by || '—'}</div>
                    <div class="task-row__week">Submitted: ${formatSLTime(task.completed_date)}</div>
                </div>

                <div class="task-row__right">
                    <span class="task-row__badge task-row__badge--submitted">Awaiting Review</span>
                </div>

            </div>
        `;
    });
}


// ============================================================
// REVIEW TAB — OPEN REVIEW DETAIL
// - Fetches plan + the technician's maintenance_actual rows
// - Renders read-only summary, plus cost field (Breakdown only)
//   and an admin remarks box
// ============================================================

async function openReview(planId) {

    window._reviewingPlanId = planId;

    const { data: plan, error: planError } = await supabaseClient
        .from('maintenance_plan')
        .select('*')
        .eq('planid', planId)
        .single();

    if (planError || !plan) {
        alert('Could not load plan: ' + (planError?.message || 'not found'));
        return;
    }

    const { data: actualRows } = await supabaseClient
        .from('maintenance_actual')
        .select('*')
        .eq('plan_id', planId);

    window._reviewingPlan = plan;

    document.getElementById('reviewListScreen').classList.add('hidden');
    document.getElementById('reviewDetailScreen').classList.remove('hidden');

    const container = document.getElementById('reviewContainer');
    let html = `
        <div class="check-row">
            <div class="check-text" style="color:#3730a3; font-size:14px;">
                ${plan.planid} — ${plan.machine_no} (${plan.machine_category})
            </div>
            <div style="background:#eef2ff; border:1px solid #c4b5fd; border-radius:8px;
                        padding:12px 14px; font-size:13px; color:#3730a3; margin-top:8px; line-height:1.6;">
                Type: ${plan.service_type}<br>
                Submitted by: ${plan.completed_by || '—'}<br>
                Submitted: ${formatSLTime(plan.completed_date)}
            </div>
        </div>`;

    if (plan.service_type === 'Breakdown') {
        html += `
            <div class="check-row" style="margin-top:12px;">
                <div class="check-text" style="color:#dc2626;">⚠ Breakdown Details</div>
                <div style="background:#fff5f5; border:1px solid #fca5a5; border-radius:8px;
                            padding:12px 14px; font-size:13px; color:#7f1d1d; margin-top:8px; line-height:1.6;">
                    Cause: ${plan.notes || '—'}<br>
                    Breakdown start: ${formatSLTime(plan.breakdown_start)}<br>
                    Repair start: ${formatSLTime(plan.repair_start)}<br>
                    Repair end: ${formatSLTime(plan.repair_end)}<br>
                    Downtime: ${plan.downtime_hours ?? '—'} hrs<br>
                    Repair time: ${plan.repair_hours ?? '—'} hrs<br>
                    Technician comments: ${plan.comments || '—'}
                </div>
            </div>
            <div class="check-row" style="margin-top:12px;">
                <div class="check-text">Repair Cost</div>
                <input type="number" id="reviewRepairCost" class="plan__input"
                       placeholder="0.00" step="0.01" min="0"
                       value="${plan.repair_cost ?? ''}">
            </div>`;
    } else {
        // Scheduled / Planned — show technician's checklist / note responses
        html += `
            <div class="check-row" style="margin-top:12px;">
                <div class="check-text">Technician Submission</div>
                <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;
                            padding:12px 14px; font-size:13px; color:#374151; margin-top:8px;">`;

        if (actualRows && actualRows.length) {
            actualRows.forEach(row => {
                html += `
                    <div style="padding:6px 0; border-bottom:1px solid #e5e7eb;">
                        <strong>${row.attribute_name}</strong> — ${row.result_value}
                        ${row.comments ? `<br><span style="color:#6b7280;">Comment: ${row.comments}</span>` : ''}
                    </div>`;
            });
        } else {
            html += '<div style="color:#6b7280;">No checklist data found.</div>';
        }

        html += `</div></div>`;

        html += `
            <div class="check-row" style="margin-top:12px;">
                <div class="check-text">Maintenance Cost</div>
                <input type="number" id="reviewRepairCost" class="plan__input"
                       placeholder="0.00" step="0.01" min="0"
                       value="${plan.repair_cost ?? ''}">
            </div>`;
    }

    html += `
        <div class="check-row" style="margin-top:12px;">
            <div class="check-text">Admin Remarks</div>
            <textarea id="reviewRemarks" class="plan__input" rows="3" placeholder="Optional remarks...">${plan.admin_remarks || ''}</textarea>
        </div>`;

    container.innerHTML = html;
}


// ============================================================
// REVIEW TAB — BACK TO LIST
// ============================================================

function backToReviewList() {
    document.getElementById('reviewDetailScreen').classList.add('hidden');
    document.getElementById('reviewListScreen').classList.remove('hidden');
}


// ============================================================
// REVIEW TAB — SIGN OFF
// - Admin signs off: status -> Completed
// - For Breakdown tasks, saves the repair cost entered here
// - Stamps reviewed_by + review_date
// ============================================================

async function signOffTask() {

    const planId = window._reviewingPlanId;
    const plan   = window._reviewingPlan;

    if (!planId || !plan) return;

    const remarks = document.getElementById('reviewRemarks')?.value || '';

    const updatePayload = {
        status:        'Completed',
        reviewed_by:   currentUser,
        review_date:   new Date().toISOString(),
        admin_remarks: remarks
    };

    if (plan.service_type === 'Breakdown') {
        const costVal = document.getElementById('reviewRepairCost')?.value;
        if (costVal === '' || costVal === null || costVal === undefined) {
            alert('Please enter a repair cost before signing off.');
            return;
        }
        updatePayload.repair_cost = parseFloat(costVal) || 0;
    }

    const { error } = await supabaseClient
        .from('maintenance_plan')
        .update(updatePayload)
        .eq('planid', planId);

    if (error) {
        console.error('Sign-off error:', error);
        alert(error.message);
        return;
    }

    alert('Signed off — task marked Completed.');
    backToReviewList();
    loadReviewTasks();
    refreshAll();
}




// ============================================================
// PLAN TAB — LOAD MACHINE TYPES
// - Fetches all machines from machinetypes table
// - Populates Machine Type dropdown with unique categories
// - Machine ID dropdown populated on category selection
// ============================================================

async function loadMachineTypes() {

    const { data, error } = await supabaseClient
        .from('machinetypes')
        .select('machineid, machine_name, machine_category');

    if (error) {
        console.error('Load machine types error:', error.message);
        return;
    }

    const typeSelect = document.getElementById('planMachineType');
    const idSelect   = document.getElementById('planMachineId');

    // Populate unique categories
    const categories = [...new Set(data.map(d => d.machine_category))];
    typeSelect.innerHTML = '<option value="">Select Machine Type</option>';
    categories.forEach(cat => {
        typeSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    // Cache full machine data for filtering on category change
    window._machineData = data;

    // Reset machine ID dropdown
    idSelect.innerHTML = '<option value="">Select Machine ID</option>';
}


// ============================================================
// PLAN TAB — MACHINE TYPE CHANGE
// - Filters Machine ID dropdown based on selected category
// - Stores machine name as data attribute for later use
// ============================================================

function onMachineTypeChange() {

    const selected = document.getElementById('planMachineType').value;
    const idSelect = document.getElementById('planMachineId');

    idSelect.innerHTML = '<option value="">Select Machine ID</option>';

    if (!selected) return;

    // Filter machines by selected category
    const filtered = window._machineData.filter(d => d.machine_category === selected);
    filtered.forEach(m => {
        idSelect.innerHTML += `
            <option value="${m.machineid}" data-name="${m.machine_name}">
                ${m.machineid} — ${m.machine_name}
            </option>`;
    });
}


// ============================================================
// BREAKDOWN — OPEN MODAL
// - Populates machine type dropdown (reuses cached machine data)
// - Defaults breakdown start to now
// ============================================================

function openBreakdownModal() {

    const typeSelect = document.getElementById('bdMachineType');
    typeSelect.innerHTML = '<option value="">Select Machine Type</option>';

    if (window._machineData) {
        const categories = [...new Set(window._machineData.map(d => d.machine_category))];
        categories.forEach(cat => {
            typeSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    document.getElementById('bdMachineId').innerHTML = '<option value="">Select Machine ID</option>';
    document.getElementById('bdCause').value = '';
    document.getElementById('bdReportedBy').value = document.getElementById('loggedUserName').textContent.trim();
    document.getElementById('breakdownMessage').classList.add('hidden');

    // Default breakdown start to right now (local time, for datetime-local input)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('bdBreakdownStart').value = now.toISOString().slice(0, 16);

    document.getElementById('breakdownModal').classList.remove('hidden');
}


// ============================================================
// BREAKDOWN — CLOSE MODAL
// ============================================================

function closeBreakdownModal() {
    document.getElementById('breakdownModal').classList.add('hidden');
}


// ============================================================
// BREAKDOWN — MACHINE TYPE CHANGE
// - Filters Machine ID dropdown based on selected category
// ============================================================

function onBreakdownMachineTypeChange() {

    const selected = document.getElementById('bdMachineType').value;
    const idSelect = document.getElementById('bdMachineId');

    idSelect.innerHTML = '<option value="">Select Machine ID</option>';

    if (!selected || !window._machineData) return;

    const filtered = window._machineData.filter(d => d.machine_category === selected);
    filtered.forEach(m => {
        idSelect.innerHTML += `
            <option value="${m.machineid}" data-name="${m.machine_name}">
                ${m.machineid} — ${m.machine_name}
            </option>`;
    });
}


// ============================================================
// BREAKDOWN — SAVE REPORT
// - Inserts a Pending maintenance_plan row with service_type 'Breakdown'
// - This task is completed later via the breakdown completion form
//   (opened from the task list, same as Scheduled/Planned tasks)
// ============================================================

async function saveBreakdownReport() {

    const machineType     = document.getElementById('bdMachineType').value.trim();
    const machineId       = document.getElementById('bdMachineId').value.trim();
    const breakdownStart  = document.getElementById('bdBreakdownStart').value;
    const cause           = document.getElementById('bdCause').value.trim();

    if (!machineType || !machineId || !breakdownStart) {
        showBreakdownMessage('Please fill in machine type, machine ID, and breakdown start time.', 'error');
        return;
    }

    const planId    = await getNextPlanId();
    const createdBy = document.getElementById('loggedUserName').textContent.trim();
    const now       = new Date().toISOString();

    const row = {
        planid:             planId,
        machine_category:   machineType,
        machine_no:         machineId,
        service_type:       'Breakdown',
        schedule_frequency: 0,
        year_week:          getWeekNumber(new Date(breakdownStart)),
        planned_date:       breakdownStart,
        breakdown_start:    new Date(breakdownStart).toISOString(),
        notes:              cause,
        planned_by:         createdBy,
        created_date:       now,
        status:             'Pending',
        is_synced:          false
    };

    const { error } = await supabaseClient
        .from('maintenance_plan')
        .insert([row]);

    if (error) {
        showBreakdownMessage('Error saving: ' + error.message, 'error');
        return;
    }

    showBreakdownMessage('Breakdown reported successfully!', 'success');

    setTimeout(() => {
        closeBreakdownModal();
        refreshAll();
    }, 1000);
}


// ============================================================
// BREAKDOWN — SHOW MESSAGE
// ============================================================

function showBreakdownMessage(msg, type) {
    const el = document.getElementById('breakdownMessage');
    el.textContent = msg;
    el.className   = 'plan__message ' + type;
    el.classList.remove('hidden');
}


// ============================================================
// PLAN TAB — GET NEXT PLAN ID
// - Fetches the last planid from Supabase
// - Increments and returns next ID in PLNNO-XXXX format
// ============================================================

async function getNextPlanId() {

    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('planid')
        .order('planid', { ascending: false })
        .limit(1);

    if (error || !data.length) return 'PLNNO-0001';

    const last = data[0].planid;
    const num  = parseInt(last.split('-')[1]) + 1;
    return 'PLNNO-' + String(num).padStart(4, '0');
}


// ============================================================
// PLAN TAB — GET WEEK NUMBER
// - Returns ISO-style year-week string e.g. "2026-21"
// - Used for year_week column in maintenance_plan
// ============================================================

function getWeekNumber(date) {

    const d           = new Date(date);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const week        = Math.ceil(
        ((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    return d.getFullYear() + '-' + String(week).padStart(2, '0');
}


// ============================================================
// PLAN TAB — GENERATE SCHEDULE DATES
// - Reads start date, end date, and frequency from form
// - Returns array of Date objects spaced by frequency months
// ============================================================

function generateScheduleDates() {

    const start = new Date(document.getElementById('planStartDate').value);
    const end   = new Date(document.getElementById('planEndDate').value);
    const freq  = parseInt(document.getElementById('planFrequency').value);

    const dates  = [];
    let current  = new Date(start);

    // Add dates at frequency intervals until end date
    while (current <= end) {
        dates.push(new Date(current));
        current.setMonth(current.getMonth() + freq);
    }

    return dates;
}


// ============================================================
// PLAN TAB — PREVIEW AND CONFIRM
// - Validates form inputs
// - Checks Supabase for conflicts (same machine OR same weeks)
// - Shows preview table of new plan rows
// - Shows conflict warning or clean confirm box
// ============================================================

async function previewAndConfirm() {

    const machineType = document.getElementById('planMachineType').value.trim();
    const idSelect    = document.getElementById('planMachineId');
    const machineId   = idSelect.value.trim();
    const status      = document.getElementById('planStatus').value;
    const startDate   = document.getElementById('planStartDate').value;
    const endDate     = document.getElementById('planEndDate').value;

    // Validate all fields filled
    if (!machineType || !machineId || !startDate || !endDate) {
        showPlanMessage('Please fill in all fields before previewing.', 'error');
        return;
    }

    const dates = generateScheduleDates();
    const weeks = dates.map(d => getWeekNumber(d));

    // Check for conflicts: same machine OR overlapping weeks
    const { data: conflicts, error } = await supabaseClient
        .from('maintenance_plan')
        .select('planid, machine_no, machine_category, year_week, planned_date, service_type, status')
        .or(`machine_no.eq.${machineId},year_week.in.(${weeks.join(',')})`);

    if (error) {
        showPlanMessage('Error checking conflicts: ' + error.message, 'error');
        return;
    }

    // Build preview table with real plan IDs
    const firstId = await getNextPlanId();
    let num = parseInt(firstId.split('-')[1]);

    let previewHtml = `
        <table>
            <thead>
                <tr>
                    <th>Plan ID</th>
                    <th>Machine Type</th>
                    <th>Machine ID</th>
                    <th>Status</th>
                    <th>Scheduled Date</th>
                    <th>Week No.</th>
                </tr>
            </thead>
            <tbody>`;

    dates.forEach(date => {
        const planId    = 'PLNNO-' + String(num++).padStart(4, '0');
        const scheduled = date.toISOString().split('T')[0];
        const week      = getWeekNumber(date);
        previewHtml += `
                <tr>
                    <td>${planId}</td>
                    <td>${machineType}</td>
                    <td>${machineId}</td>
                    <td>${status}</td>
                    <td>${scheduled}</td>
                    <td>${week}</td>
                </tr>`;
    });

    previewHtml += '</tbody></table>';

    // Show preview table
    const preview = document.getElementById('planPreview');
    preview.innerHTML = previewHtml;
    preview.classList.remove('hidden');

    // Show confirm or conflict box
    const confirmBox = document.getElementById('planConfirmBox');

    if (conflicts && conflicts.length > 0) {

        // Build conflict table rows with reason labels
        let conflictRows = '';
        conflicts.forEach(row => {
            const isSameMachine = row.machine_no === machineId;
            const isSameWeek    = weeks.includes(row.year_week);

            let reason = '';
            if (isSameMachine && isSameWeek) reason = '⚠️ Same machine + same week';
            else if (isSameMachine)          reason = '🔁 Same machine, different week';
            else if (isSameWeek)             reason = '📅 Different machine, same week';

            conflictRows += `
                <tr>
                    <td>${row.planid}</td>
                    <td>${row.machine_no}</td>
                    <td>${row.machine_category}</td>
                    <td>${row.year_week}</td>
                    <td>${row.planned_date || '—'}</td>
                    <td>${row.service_type}</td>
                    <td>${row.status}</td>
                    <td>${reason}</td>
                </tr>`;
        });

        confirmBox.innerHTML = `
            <div class="plan-confirm__warning">

                <div class="plan-confirm__warning-title">
                    ⚠️ Existing plans found — please review before saving
                </div>

                <table class="plan-confirm__table">
                    <thead>
                        <tr>
                            <th>Plan ID</th>
                            <th>Machine</th>
                            <th>Category</th>
                            <th>Week</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>${conflictRows}</tbody>
                </table>

                <div class="plan-confirm__question">
                    Do you still want to save this plan?
                </div>

                <div class="plan-confirm__btns">
                    <button class="plan__btn-primary" onclick="saveSchedule()">Yes, Save Anyway</button>
                    <button class="plan__btn-ghost"   onclick="cancelConfirm()">Cancel</button>
                </div>

            </div>`;

    } else {

        // No conflicts — clean confirm
        confirmBox.innerHTML = `
            <div class="plan-confirm__clean">
                <div class="plan-confirm__clean-title">✅ No conflicts found. Ready to save.</div>
                <div class="plan-confirm__btns">
                    <button class="plan__btn-primary" onclick="saveSchedule()">Yes, Save</button>
                    <button class="plan__btn-ghost"   onclick="cancelConfirm()">Cancel</button>
                </div>
            </div>`;
    }

    confirmBox.classList.remove('hidden');
}


// ============================================================
// PLAN TAB — CANCEL CONFIRM
// - Hides confirm box and preview table
// - Resets all form fields to default
// ============================================================

function cancelConfirm() {

    // Hide confirm and preview
    document.getElementById('planConfirmBox').classList.add('hidden');
    document.getElementById('planPreview').classList.add('hidden');
    document.getElementById('planPreview').innerHTML = '';

    // Reset all form fields
    document.getElementById('planMachineType').value = '';
    document.getElementById('planMachineId').innerHTML = '<option value="">Select Machine ID</option>';
    document.getElementById('planStartDate').value    = '';
    document.getElementById('planEndDate').value      = '';
    document.getElementById('planFrequency').selectedIndex = 0;
    document.getElementById('planStatus').selectedIndex    = 0;
    document.getElementById('planNotes').value        = '';
}


// ============================================================
// PLAN TAB — SAVE SCHEDULE
// - Generates all schedule rows from form inputs
// - Inserts rows into maintenance_plan table in Supabase
// - Resets form and refreshes gantt grid on success
// ============================================================

async function saveSchedule() {

    const machineType = document.getElementById('planMachineType').value.trim();
    const machineId   = document.getElementById('planMachineId').value.trim();
    const status      = document.getElementById('planStatus').value;
    const freq        = parseInt(document.getElementById('planFrequency').value);
    const notes       = document.getElementById('planNotes').value.trim();
    const startDate   = document.getElementById('planStartDate').value;
    const endDate     = document.getElementById('planEndDate').value;

    // Guard — shouldn't happen if preview was used but just in case
    if (!machineType || !machineId || !startDate || !endDate) {
        showPlanMessage('Please fill in all fields before saving.', 'error');
        return;
    }

    const dates     = generateScheduleDates();
    const createdBy = document.getElementById('loggedUserName').textContent.trim();
    const now       = new Date().toISOString();

    // Get starting plan ID number
    const firstId = await getNextPlanId();
    let num = parseInt(firstId.split('-')[1]);

    // Build one row per scheduled date
    const rows = dates.map(date => ({
        planid:             'PLNNO-' + String(num++).padStart(4, '0'),
        machine_category:   machineType,
        machine_no:         machineId,
        service_type:       status,
        schedule_frequency: freq,
        year_week:          getWeekNumber(date),
        planned_date:       date.toISOString().split('T')[0],
        notes:              notes,
        planned_by:         createdBy,
        created_date:       now,
        status:             'Pending',
        is_synced:          false
    }));

    // Insert all rows into Supabase
    const { error } = await supabaseClient
        .from('maintenance_plan')
        .insert(rows);

    if (error) {
        showPlanMessage('Error saving: ' + error.message, 'error');
        return;
    }

    // Success — show message and reset form
    showPlanMessage(rows.length + ' schedule(s) saved successfully!', 'success');

    // Hide confirm and preview
    document.getElementById('planConfirmBox').classList.add('hidden');
    document.getElementById('planPreview').classList.add('hidden');
    document.getElementById('planPreview').innerHTML = '';

    // Reset all form fields
    document.getElementById('planMachineType').value = '';
    document.getElementById('planMachineId').innerHTML = '<option value="">Select Machine ID</option>';
    document.getElementById('planStartDate').value    = '';
    document.getElementById('planEndDate').value      = '';
    document.getElementById('planFrequency').selectedIndex = 0;
    document.getElementById('planStatus').selectedIndex    = 0;
    document.getElementById('planNotes').value        = '';

    // Refresh gantt grid and dashboard stats
    refreshAll();
}

// ============================================================
// REFRESH ALL — updates gantt, dashboard stats, and task cards
// Call this after any save/edit operation
// ============================================================
function refreshAll() {
    loadPlanGantt();
    loadDashboardStats();
    loadTasks('weekPending');
}

// ============================================================
// PLAN TAB — SHOW MESSAGE
// - Displays success or error message below the form
// - Auto-hides after 4 seconds
// ============================================================

function showPlanMessage(msg, type) {

    const el = document.getElementById('planMessage');
    el.textContent  = msg;
    el.className    = 'plan__message ' + type;
    el.classList.remove('hidden');

    setTimeout(() => el.classList.add('hidden'), 4000);
}

// ============================================================
// EDIT PLAN — OPEN MODAL
// - Called when a gantt cell is clicked
// - Blocked if plan is Completed or Submitted (awaiting review)
// ============================================================
function openEditModal(plan) {

    if (plan.status === 'Completed' || plan.status === 'Submitted') return;

    window._editingPlanId = plan.planid;

    // Populate week dropdown, pre-select current plan's week
    populateWeekDropdown(plan.year_week || getWeekNumber(new Date()));

    // Today's date as default
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('editPlanId').textContent    = 'Plan ID: ' + plan.planid + ' — ' + plan.machine_no;
    document.getElementById('editPlannedDate').value  = today;
    document.getElementById('editServiceType').value     = plan.service_type  || 'Scheduled';
    document.getElementById('editPlannedBy').value       = plan.planned_by    ||  currentUser || '';
    document.getElementById('editNotes').value           = plan.notes         || '';
    document.getElementById('editPlanMessage').classList.add('hidden');

    document.getElementById('editPlanModal').classList.remove('hidden');
}


// ============================================================
// EDIT PLAN — CLOSE MODAL
// ============================================================
function closeEditModal() {
    document.getElementById('editPlanModal').classList.add('hidden');
    window._editingPlanId = null;
}

// ============================================================
// EDIT PLAN — SAVE
// - Updates editable fields in Supabase
// - Recalculates year_week from new planned date
// ============================================================
async function saveEditPlan() {

    const planId      = window._editingPlanId;  // ADD THIS LINE
    const plannedDate = document.getElementById('editPlannedDate').value;
    const serviceType = document.getElementById('editServiceType').value;
    const plannedBy   = document.getElementById('editPlannedBy').value.trim();
    const notes       = document.getElementById('editNotes').value.trim();
    const yearWeek    = document.getElementById('editPlanWeek').value.trim();

    if (!plannedDate || !yearWeek) {
        showEditMessage('Please fill planned date and plan week.', 'error');
        return;
    }

    const { error } = await supabaseClient
        .from('maintenance_plan')
        .update({
            planned_date:  plannedDate,
            service_type:  serviceType,
            planned_by:    plannedBy,
            notes:         notes,
            year_week:     yearWeek
        })
        .eq('planid', planId);

    if (error) {
        showEditMessage('Error saving: ' + error.message, 'error');
        return;
    }

    showEditMessage('Saved successfully!', 'success');

    setTimeout(() => {
        closeEditModal();
        refreshAll();
    }, 1000);
}


// ============================================================
// EDIT PLAN — SHOW MESSAGE
// ============================================================
function showEditMessage(msg, type) {
    const el = document.getElementById('editPlanMessage');
    el.textContent = msg;
    el.className   = 'plan__message ' + type;
    el.classList.remove('hidden');
}

// ============================================================
// year and week dropdown for edit model
// 
// 
// ============================================================

function populateWeekDropdown(selectedWeek) {

    
    const year        = new Date().getFullYear();
    const select      = document.getElementById('editPlanWeek');

    // Start from current week so user can reschedule to any remaining week
    const currentWeekNum = parseInt(getWeekNumber(new Date()).split('-')[1]);

    select.innerHTML = '';

    for (let i = currentWeekNum; i <= 52; i++) {
        const week  = String(i).padStart(2, '0');
        const value = year + '-' + week;
        const opt   = document.createElement('option');
        opt.value       = value;
        opt.textContent = value;
        if (value === selectedWeek) opt.selected = true;
        select.appendChild(opt);
    }
}

// ============================================================
// GANTT CELL CLICK
// - Fetches full plan from Supabase
// - Opens edit modal if not completed
// ============================================================
async function handleCellClick(planId) {

    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('*')
        .eq('planid', planId)
        .single();

    if (error || !data) {
        console.error('Could not load plan:', error?.message);
        return;
    }

    if (data.status === 'Completed') {
        alert('Completed plans cannot be edited.');
        return;
    }

    if (data.status === 'Submitted') {
        alert('This task is awaiting admin review and cannot be edited.');
        return;
    }

    openEditModal(data);
}

// ============================================================
// GANTT GRID — LOAD
// - Fetches all maintenance plans ordered by machine
// - Passes data to renderPlanGantt
// ============================================================

async function loadPlanGantt() {

    // Don't load if plan tab is not visible
    const planTab = document.getElementById('tab-plan');
    if (!planTab || planTab.classList.contains('hidden')) return;

    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('*')
        .order('machine_no', { ascending: true });

    if (error) {
        console.error('Gantt load error:', error.message);
        return;
    }

    renderPlanGantt(data);
}


// ============================================================
// GANTT GRID — RENDER
// - Builds week columns for full year (weeks 01-52)
// - Groups rows by machine_category + machine_no + frequency
// - Color codes cells: scheduled / planned / completed / delayed / future
// - Scrolls horizontally to current week on render
// ============================================================

function renderPlanGantt(data) {

    const year        = new Date().getFullYear();
    const today       = new Date();
    const currentWeek = getWeekNumber(today);

    // Build 52 week strings for current year e.g. ["2026-01" ... "2026-52"]
    const weeks = Array.from({ length: 52 }, (_, i) => {
        const w = String(i + 1).padStart(2, '0');
        return year + '-' + w;
    });

    // --------------------------------------------------------
    // GROUP DATA
    // One row per unique category + machine + frequency combo
    // --------------------------------------------------------
    const groups = {};
    data.forEach(row => {
        const key = `${row.machine_category}||${row.machine_no}||${row.schedule_frequency}`;
        if (!groups[key]) {
            groups[key] = {
                category: row.machine_category,
                machine:  row.machine_no,
                freq:     row.schedule_frequency,
                plans:    []
            };
        }
        groups[key].plans.push(row);
    });

    // --------------------------------------------------------
    // COLUMN WIDTHS
    // Detect mobile vs desktop and set frozen column widths
    // These values must match the CSS left offsets in nth-child rules
    // Frozen cols total: desktop=295px, mobile=185px
    // --------------------------------------------------------
    const isMobile = window.innerWidth <= 768;

    const col1 = isMobile ? 70  : 130;   // Category
    const col2 = isMobile ? 55  : 80;    // Machine
    const col3 = isMobile ? 35  : 50;    // Freq
    const col4 = isMobile ? 25  : 45;    // N (count)
    const colW = isMobile ? 30  : 36;    // Each week column

    // Calculate left offsets for frozen columns
    const left1 = 0;
    const left2 = col1;
    const left3 = col1 + col2;
    const left4 = col1 + col2 + col3;

    // --------------------------------------------------------
    // COLGROUP
    // Defines fixed pixel widths for every column in the table
    // table-layout:fixed + colgroup = columns never shrink
    // --------------------------------------------------------
    let colgroupHtml = `<colgroup>
        <col style="width:${col1}px; min-width:${col1}px;">
        <col style="width:${col2}px; min-width:${col2}px;">
        <col style="width:${col3}px; min-width:${col3}px;">
        <col style="width:${col4}px; min-width:${col4}px;">`;

    weeks.forEach(() => {
        colgroupHtml += `<col style="width:${colW}px; min-width:${colW}px;">`;
    });

    colgroupHtml += '</colgroup>';

    // --------------------------------------------------------
    // HEADER ROW
    // 4 frozen sticky headers + 52 week headers
    // Current week gets blue underline highlight
    // --------------------------------------------------------
    let headHtml = `<tr>
        <th class="col-sticky" style="left:${left1}px;">Category</th>
        <th class="col-sticky" style="left:${left2}px;">Machine</th>
        <th class="col-sticky" style="left:${left3}px;">Freq</th>
        <th class="col-sticky" style="left:${left4}px;">N</th>`;

    weeks.forEach(w => {
        const wNum      = w.split('-')[1];
        const isCurrent = w === currentWeek;
        headHtml += `<th style="${isCurrent
            ? 'border-bottom:2px solid #60a5fa; background:#254d7a;'
            : ''}">${wNum}W</th>`;
    });

    headHtml += '</tr>';

    // --------------------------------------------------------
    // BODY ROWS
    // One row per group — cells colored by status and week position
    // --------------------------------------------------------
    let bodyHtml = '';

    Object.values(groups).forEach(group => {

        const freqLabel = group.freq ? group.freq + 'M' : '—';
        const count     = group.plans.length;

        // Map year_week -> plan object for fast cell lookup
        const weekMap = {};
        group.plans.forEach(p => {
            if (p.year_week) weekMap[p.year_week] = p;
        });

        // Frozen cells
        bodyHtml += `<tr>
            <td class="col-sticky" style="left:${left1}px;">${group.category}</td>
            <td class="col-sticky" style="left:${left2}px;">${group.machine}</td>
            <td class="col-sticky" style="left:${left3}px;">${freqLabel}</td>
            <td class="col-sticky" style="left:${left4}px;">${count}</td>`;

        // Week cells
        weeks.forEach(w => {
            const plan = weekMap[w];
            if (plan) {
                const label = getCellLabel(plan, w, currentWeek);
                const cls   = getCellClass(plan, w, currentWeek);
                const tip   = encodeTooltip(plan);

                // Detect mobile
                const isMobile = window.innerWidth <= 768;
                    // Cell html — different behavior for mobile vs desktop
                    if (isMobile) {
                        // Mobile: single tap = tooltip, double tap = edit
                        bodyHtml += `<td><span class="plan-grid__cell ${cls}"
                            ontouchstart="handleCellTouch('${plan.planid}', event, '${tip}')"
                            style="cursor:${(plan.status !== 'Completed' && plan.status !== 'Submitted') ? 'pointer' : 'default'};"
                            >${label}</span></td>`;
                    } else {
                        // Desktop: hover = tooltip, click = edit
                        bodyHtml += `<td><span class="plan-grid__cell ${cls}"
                            onmouseenter="showTooltip(event,'${tip}')"
                            onmouseleave="hideTooltip()"
                            onclick="handleCellClick('${plan.planid}')"
                            style="cursor:${(plan.status !== 'Completed' && plan.status !== 'Submitted') ? 'pointer' : 'default'};"
                            >${label}</span></td>`;
                    }

            } 
            else {
                bodyHtml += '<td></td>';
            }
        });

        bodyHtml += '</tr>';
    });
// ============================================================
// MOBILE CELL TOUCH
// Single tap — show tooltip
// Double tap — open edit modal
// ============================================================
let _lastTap     = 0;
let _lastTapId   = null;

function handleCellTouch(planId, event, encoded) {

    event.preventDefault();
    const now = Date.now();

    if (_lastTapId === planId && now - _lastTap < 350) {
        // Double tap — open edit
        hideTooltip();
        handleCellClick(planId);
        _lastTap   = 0;
        _lastTapId = null;
    } else {
        // Single tap — show tooltip
        _lastTap   = now;
        _lastTapId = planId;
        showTooltip(event.touches[0], encoded);

        // Auto hide tooltip after 2 seconds
        setTimeout(() => hideTooltip(), 2000);
    }
}
    // --------------------------------------------------------
    // INJECT INTO DOM
    // colgroup injected first directly on table element
    // then thead and tbody populated separately
    // --------------------------------------------------------
   const table = document.getElementById('planGanttTable');
const thead = document.getElementById('planGanttHead');
const tbody = document.getElementById('planGanttBody');

// Guard — if table elements not in DOM yet, stop
if (!table || !thead || !tbody) {
    console.warn('Gantt table elements not found in DOM');
    return;
}

// Remove existing colgroup if present from previous render
const existingColgroup = table.querySelector('colgroup');
if (existingColgroup) existingColgroup.remove();

// Insert colgroup as first child without touching thead/tbody
table.insertAdjacentHTML('afterbegin', colgroupHtml);

// Populate header and body
thead.innerHTML = headHtml;
tbody.innerHTML = bodyHtml;

// Scroll to current week
scrollToCurrentWeek(currentWeek, weeks);
}


// ============================================================
// GANTT GRID — CELL LABEL
// - Returns display text for a gantt cell
// - S = Scheduled, P = Planned, -C = Completed
// ============================================================

function getCellLabel(plan, week, currentWeek) {
    let base = 'P';
    if (plan.service_type === 'Scheduled') base = 'S';
    if (plan.service_type === 'Breakdown')  base = 'B';
    if (plan.status === 'Completed') return base + '-C';
    if (plan.status === 'Submitted') return base + '-R'; // awaiting review
    return base;
}


// ============================================================
// GANTT GRID — CELL CLASS
// - Returns CSS class for color coding
// - completed → green, delayed → red, future → blue, current → green/red
// ============================================================

function getCellClass(plan, week, currentWeek) {

    const isCompleted = plan.status === 'Completed';
    const isSubmitted = plan.status === 'Submitted';
    const isPast      = week < currentWeek;
    const isFuture    = week > currentWeek;

    if (plan.service_type === 'Breakdown') {
        if (isCompleted) return 'b-c';
        if (isSubmitted) return 'b-r';
        return 'breakdown';
    }

    if (isCompleted) return plan.service_type === 'Scheduled' ? 's-c' : 'p-c';
    if (isSubmitted) return 'awaiting-review';
    if (isPast)      return 'delayed';
    if (isFuture)    return 'future';
    return plan.service_type === 'Scheduled' ? 'scheduled' : 'planned';
}


// ============================================================
// GANTT GRID — ENCODE TOOLTIP
// - Builds pipe-separated string of plan details
// - Encoded for safe use in HTML attribute
// ============================================================

function encodeTooltip(plan) {
    const isBreakdown = plan.service_type === 'Breakdown';

    const lines = [
        'ID: '                                      + plan.planid,
        'Machine: '                                 + plan.machine_no,
        'Type: '                                    + plan.service_type,
        (isBreakdown ? 'Date: ' : 'Scheduled: ')   + (plan.planned_date || '—'),
        'Week: '                                    + (plan.year_week    || '—'),
        'Status: '                                  + (plan.status       || '—'),
        (isBreakdown ? 'Reported by: ' : 'Planned by: ') + (plan.planned_by || '—'),
        'Notes: '                                   + (plan.notes        || '—'),
        'Completed by: '                            + (plan.completed_by || '—'),
        'Completed: '    + formatSLTime(plan.completed_date),
        'Modified: '     + formatSLTime(plan.last_modified),
        'Created: '      + formatSLTime(plan.created_date),
    ];

    if (plan.service_type === 'Breakdown') {
        lines.push('Breakdown start: ' + formatSLTime(plan.breakdown_start));
        lines.push('Repair start: '    + formatSLTime(plan.repair_start));
        lines.push('Repair end: '      + formatSLTime(plan.repair_end));
        lines.push('Downtime (hrs): '  + (plan.downtime_hours ?? '—'));
        lines.push('Repair (hrs): '    + (plan.repair_hours   ?? '—'));
        lines.push('Repair cost: '     + (plan.repair_cost    ?? '—'));
    }

    if (plan.status === 'Submitted' || plan.status === 'Completed') {
        lines.push('Reviewed by: '  + (plan.reviewed_by    || '—'));
        lines.push('Review date: '  + formatSLTime(plan.review_date));
        lines.push('Admin remarks: ' + (plan.admin_remarks || '—'));
    }

    return encodeURIComponent(lines.join('|'));
}


// ============================================================
// GANTT GRID — SHOW TOOLTIP
// - Positions tooltip above the hovered cell
// - Flips below if too close to top of viewport
// - Prevents going off right edge of screen
// ============================================================

function showTooltip(event, encoded) {

    const tip   = document.getElementById('planTooltip');
    const lines = decodeURIComponent(encoded).split('|');
    tip.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
    tip.classList.remove('hidden');

    const rect     = event.target.getBoundingClientRect();
    const tipWidth = 240;

    let left = rect.left + rect.width / 2;
    let top  = rect.top - 10;

    // Flip below if too close to top
    if (top < 150) {
        top = rect.bottom + 10;
        tip.style.transform = 'translateX(-50%)';
    } else {
        tip.style.transform = 'translateX(-50%) translateY(-100%)';
    }

    // Prevent going off right edge
    if (left + tipWidth / 2 > window.innerWidth) {
        left = window.innerWidth - tipWidth / 2 - 10;
    }

    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
}


// ============================================================
// GANTT GRID — HIDE TOOLTIP
// ============================================================

function hideTooltip() {
    document.getElementById('planTooltip').classList.add('hidden');
}


// ============================================================
// GANTT GRID — SCROLL TO CURRENT WEEK
// - Calculates pixel offset of current week column
// - Scrolls gantt container to bring it into view
// ============================================================

function scrollToCurrentWeek(currentWeek, weeks) {

    const idx = weeks.indexOf(currentWeek);
    if (idx === -1) return;

    const scroll = document.querySelector('.plan-grid__scroll');

    // ~40px per week column, offset left by 100px for context
    scroll.scrollLeft = Math.max(0, (idx * 40) - 100);
}


// ============================================================
// REPORTS — LOAD ALL
// Called when Dashboard tab is opened
// Fetches data once and renders all 3 reports
// ============================================================
async function loadReports() {

    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('*');

    if (error) {
        console.error('Reports load error:', error.message);
        return;
    }

    renderReport1(data);  // Completion rate by machine
    renderReport2(data);  // Weekly schedule status
    renderReport3(data);  // Overdue tasks table
    renderReport4(data);  // Breakdown summary table

    window._allPlanData = data;       // cached for Report 5 filtering
    populateMachineHistoryFilter(data);
    renderReport5();                  // empty until a machine is picked
}


// ============================================================
// REPORT 5 — MACHINE HISTORY — POPULATE MACHINE DROPDOWN
// ============================================================
function populateMachineHistoryFilter(data) {

    const select = document.getElementById('mhMachineFilter');
    const current = select.value;

    const machines = [...new Set(data.map(r => r.machine_no))].sort();

    select.innerHTML = '<option value="">Select Machine...</option>';
    machines.forEach(m => {
        select.innerHTML += `<option value="${m}">${m}</option>`;
    });

    select.value = current;
}


// ============================================================
// REPORT 5 — MACHINE HISTORY
// Filters: Machine (required) + Date range + Service type
// Shows ALL statuses — Pending / Submitted / Completed
// ============================================================
function renderReport5() {

    const container = document.getElementById('reportMachineHistoryTable');
    const machine    = document.getElementById('mhMachineFilter').value;
    const fromDate   = document.getElementById('mhFromDate').value;
    const toDate     = document.getElementById('mhToDate').value;
    const serviceType = document.getElementById('mhServiceTypeFilter').value;

    if (!machine) {
        container.innerHTML = '<div style="padding:16px; color:#6b7280; font-size:13px;">Select a machine to view its history.</div>';
        window._report5Data = [];
        return;
    }

    let rows = (window._allPlanData || []).filter(r => r.machine_no === machine);

    if (serviceType) rows = rows.filter(r => r.service_type === serviceType);

    if (fromDate) rows = rows.filter(r => (r.planned_date || '') >= fromDate);
    if (toDate)   rows = rows.filter(r => (r.planned_date || '') <= toDate);

    rows.sort((a, b) => (b.planned_date || '').localeCompare(a.planned_date || ''));

    if (!rows.length) {
        container.innerHTML = '<div style="padding:16px; color:#6b7280; font-size:13px;">No records found for the selected filters.</div>';
        window._report5Data = [];
        return;
    }

    let html = `
        <table class="reports__table">
            <thead>
                <tr>
                    <th>Plan ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Planned Date</th>
                    <th>Breakdown Start</th>
                    <th>Repair Start</th>
                    <th>Repair End</th>
                    <th>Downtime (hrs)</th>
                    <th>Repair (hrs)</th>
                    <th>Repair Cost</th>
                    <th>Completed Date</th>
                    <th>Reviewed By</th>
                </tr>
            </thead>
            <tbody>`;

    rows.forEach(row => {
        html += `
            <tr>
                <td>${row.planid}</td>
                <td>${row.service_type}</td>
                <td>${row.status}</td>
                <td>${row.planned_date || '—'}</td>
                <td>${formatSLTime(row.breakdown_start)}</td>
                <td>${formatSLTime(row.repair_start)}</td>
                <td>${formatSLTime(row.repair_end)}</td>
                <td>${row.downtime_hours ?? '—'}</td>
                <td>${row.repair_hours ?? '—'}</td>
                <td>${row.repair_cost ?? '—'}</td>
                <td>${formatSLTime(row.completed_date)}</td>
                <td>${row.reviewed_by || '—'}</td>
            </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = `<div class="reports__table-wrap">${html}</div>`;

    window._report5Data = rows;
}


// ============================================================
// CSV DOWNLOAD — REPORT 5 (Machine History)
// ============================================================
function downloadReport5CSV() {

    const d = window._report5Data;
    if (!d || !d.length) return;

    let csv = 'Plan ID,Type,Status,Planned Date,Breakdown Start,Repair Start,Repair End,Downtime Hours,Repair Hours,Repair Cost,Completed Date,Reviewed By\n';
    d.forEach(row => {
        csv += `${row.planid},${row.service_type},${row.status},${row.planned_date || ''},${row.breakdown_start || ''},${row.repair_start || ''},${row.repair_end || ''},${row.downtime_hours ?? ''},${row.repair_hours ?? ''},${row.repair_cost ?? ''},${row.completed_date || ''},${row.reviewed_by || ''}\n`;
    });

    downloadCSV(csv, 'machine_history.csv');
}


// ============================================================
// REPORT 1 — COMPLETION RATE BY MACHINE
// Bar chart: each machine, grouped completed vs pending
// ============================================================
function renderReport1(data) {

    // Group by machine_no
    const machines = {};
    data.forEach(row => {
        if (!machines[row.machine_no]) {
            machines[row.machine_no] = { completed: 0, pending: 0 };
        }
        if (row.status === 'Completed') machines[row.machine_no].completed++;
        else                            machines[row.machine_no].pending++;
    });

    const labels    = Object.keys(machines).sort();
    const completed = labels.map(m => machines[m].completed);
    const pending   = labels.map(m => machines[m].pending);

    // Destroy previous chart instance if exists
    if (chartMachineInstance) chartMachineInstance.destroy();

    const ctx = document.getElementById('chartMachine').getContext('2d');

    chartMachineInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label:           'Completed',
                    data:            completed,
                    backgroundColor: '#86efac',
                    borderColor:     '#16a34a',
                    borderWidth:     1,
                    borderRadius:    4
                },
                {
                    label:           'Pending',
                    data:            pending,
                    backgroundColor: '#fca5a5',
                    borderColor:     '#dc2626',
                    borderWidth:     1,
                    borderRadius:    4
                }
            ]
        },
        options: {
            responsive:          true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: { stacked: false },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });

    // Store data for CSV download
    window._report1Data = { labels, completed, pending };
}


// ============================================================
// REPORT 2 — WEEKLY SCHEDULE STATUS
// Bar chart: each week, grouped completed vs pending
// Only shows weeks that have data
// ============================================================
function renderReport2(data) {

    // Group by year_week
    const weeks = {};
    data.forEach(row => {
        if (!row.year_week) return;
        if (!weeks[row.year_week]) {
            weeks[row.year_week] = { completed: 0, pending: 0 };
        }
        if (row.status === 'Completed') weeks[row.year_week].completed++;
        else                            weeks[row.year_week].pending++;
    });

    const labels    = Object.keys(weeks).sort();
    const completed = labels.map(w => weeks[w].completed);
    const pending   = labels.map(w => weeks[w].pending);

    // Destroy previous chart instance if exists
    if (chartWeeklyInstance) chartWeeklyInstance.destroy();

    const ctx = document.getElementById('chartWeekly').getContext('2d');

    chartWeeklyInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label:           'Completed',
                    data:            completed,
                    backgroundColor: '#93c5fd',
                    borderColor:     '#1e3a8a',
                    borderWidth:     1,
                    borderRadius:    4
                },
                {
                    label:           'Pending',
                    data:            pending,
                    backgroundColor: '#fcd34d',
                    borderColor:     '#d97706',
                    borderWidth:     1,
                    borderRadius:    4
                }
            ]
        },
        options: {
            responsive:          true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: { stacked: false },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });

    // Store data for CSV download
    window._report2Data = { labels, completed, pending };
}


// ============================================================
// REPORT 3 — OVERDUE TASKS SUMMARY
// Table: all pending tasks past current week
// ============================================================
function renderReport3(data) {

    const currentWeek = getWeekNumber(new Date());

    const overdue = data.filter(row =>
        row.status === 'Pending' &&
        row.year_week < currentWeek
    );

    const container = document.getElementById('reportOverdueTable');

    if (!overdue.length) {
        container.innerHTML = '<div style="padding:16px; color:#16a34a; font-size:13px;">✅ No overdue tasks.</div>';
        window._report3Data = [];
        return;
    }

    let html = `
        <table class="reports__table">
            <thead>
                <tr>
                    <th>Plan ID</th>
                    <th>Machine</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Week</th>
                    <th>Planned Date</th>
                    <th>Planned By</th>
                    <th>Weeks Overdue</th>
                </tr>
            </thead>
            <tbody>`;

    overdue.forEach(row => {
        const weeksOverdue = parseInt(currentWeek.split('-')[1]) - parseInt(row.year_week.split('-')[1]);
        html += `
            <tr>
                <td>${row.planid}</td>
                <td>${row.machine_no}</td>
                <td>${row.machine_category}</td>
                <td>${row.service_type}</td>
                <td>${row.year_week}</td>
                <td>${row.planned_date || '—'}</td>
                <td>${row.planned_by  || '—'}</td>
                <td><span class="reports__overdue-badge">${weeksOverdue}W overdue</span></td>
            </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = `
    <div class="reports__table-wrap">
        ${html}
    </div>`;

    // Store data for CSV download
    window._report3Data = overdue;
}


// ============================================================
// CSV DOWNLOAD — REPORT 1
// Completion rate by machine
// ============================================================
function downloadReport1CSV() {

    const d = window._report1Data;
    if (!d) return;

    let csv = 'Machine,Completed,Pending,Total\n';
    d.labels.forEach((label, i) => {
        const total = d.completed[i] + d.pending[i];
        csv += `${label},${d.completed[i]},${d.pending[i]},${total}\n`;
    });

    downloadCSV(csv, 'completion_rate_by_machine.csv');
}


// ============================================================
// CSV DOWNLOAD — REPORT 2
// Weekly schedule status
// ============================================================
function downloadReport2CSV() {

    const d = window._report2Data;
    if (!d) return;

    let csv = 'Week,Completed,Pending,Total\n';
    d.labels.forEach((label, i) => {
        const total = d.completed[i] + d.pending[i];
        csv += `${label},${d.completed[i]},${d.pending[i]},${total}\n`;
    });

    downloadCSV(csv, 'weekly_schedule_status.csv');
}


// ============================================================
// CSV DOWNLOAD — REPORT 3
// Overdue tasks
// ============================================================
function downloadReport3CSV() {

    const d = window._report3Data;
    if (!d || !d.length) return;

    const currentWeek = getWeekNumber(new Date());

    let csv = 'Plan ID,Machine,Category,Type,Week,Planned Date,Planned By,Weeks Overdue\n';
    d.forEach(row => {
        const weeksOverdue = parseInt(currentWeek.split('-')[1]) - parseInt(row.year_week.split('-')[1]);
        csv += `${row.planid},${row.machine_no},${row.machine_category},${row.service_type},${row.year_week},${row.planned_date || ''},${row.planned_by || ''},${weeksOverdue}\n`;
    });

    downloadCSV(csv, 'overdue_tasks.csv');
}


// ============================================================
// REPORT 4 — BREAKDOWN SUMMARY
// Table: all breakdown tasks with downtime, repair time, cost
// ============================================================
function renderReport4(data) {

    const breakdowns = data.filter(row => row.service_type === 'Breakdown');

    const container = document.getElementById('reportBreakdownTable');

    if (!breakdowns.length) {
        container.innerHTML = '<div style="padding:16px; color:#6b7280; font-size:13px;">No breakdowns recorded.</div>';
        window._report4Data = [];
        return;
    }

    let html = `
        <table class="reports__table">
            <thead>
                <tr>
                    <th>Plan ID</th>
                    <th>Machine</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Breakdown Start</th>
                    <th>Repair Start</th>
                    <th>Repair End</th>
                    <th>Downtime (hrs)</th>
                    <th>Repair (hrs)</th>
                    <th>Repair Cost</th>
                </tr>
            </thead>
            <tbody>`;

    breakdowns.forEach(row => {
        html += `
            <tr>
                <td>${row.planid}</td>
                <td>${row.machine_no}</td>
                <td>${row.machine_category}</td>
                <td>${row.status}</td>
                <td>${formatSLTime(row.breakdown_start)}</td>
                <td>${formatSLTime(row.repair_start)}</td>
                <td>${formatSLTime(row.repair_end)}</td>
                <td>${row.downtime_hours ?? '—'}</td>
                <td>${row.repair_hours ?? '—'}</td>
                <td>${row.repair_cost ?? '—'}</td>
            </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = `
    <div class="reports__table-wrap">
        ${html}
    </div>`;

    // Store data for CSV download
    window._report4Data = breakdowns;
}


// ============================================================
// CSV DOWNLOAD — HELPER
// Creates and triggers a CSV file download
// ============================================================
function downloadCSV(csvContent, filename) {

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


// ============================================================
// CSV DOWNLOAD — REPORT 4
// Breakdown summary
// ============================================================
function downloadReport4CSV() {

    const d = window._report4Data;
    if (!d || !d.length) return;

    let csv = 'Plan ID,Machine,Category,Status,Breakdown Start,Repair Start,Repair End,Downtime Hours,Repair Hours,Repair Cost\n';
    d.forEach(row => {
        csv += `${row.planid},${row.machine_no},${row.machine_category},${row.status},${row.breakdown_start || ''},${row.repair_start || ''},${row.repair_end || ''},${row.downtime_hours ?? ''},${row.repair_hours ?? ''},${row.repair_cost ?? ''}\n`;
    });

    downloadCSV(csv, 'breakdown_summary.csv');
}


// ============================================================
// ADMIN TAB — TABLE CONFIG
// ============================================================

const ADMIN_TABLE_CONFIG = {
    maintenance_plan:    { pk: 'planid',    label: 'Maintenance Plan' },
    maintenance_actual:  { pk: 'id',        label: 'Maintenance Actual' },
    machinetypes:        { pk: 'machineid', label: 'Machine Types' },
    machine_categories:  { pk: 'id',        label: 'Machine Categories' },
    checklist_templates: { pk: 'id',        label: 'Checklist Templates' }
};


// ============================================================
// ADMIN TAB — EXPORT ALL DATA
// Downloads all 5 tables as a single JSON backup file
// ============================================================

async function exportAllData() {
    showAdminBackupMessage('Exporting…', 'info');

    const backup = { exported_at: new Date().toISOString(), tables: {} };

    for (const tableName of Object.keys(ADMIN_TABLE_CONFIG)) {
        const { data, error } = await supabaseClient.from(tableName).select('*');
        if (error) {
            showAdminBackupMessage('Export failed on ' + tableName + ': ' + error.message, 'error');
            return;
        }
        backup.tables[tableName] = data || [];
    }

    const json = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = 'dwpms_backup_' + date + '.json';
    link.click();
    URL.revokeObjectURL(url);

    showAdminBackupMessage('Exported all tables successfully.', 'success');
}


// ============================================================
// ADMIN TAB — IMPORT DATA
// Reads a JSON backup file and upserts all records
// ============================================================

async function importData(input) {
    const file = input.files[0];
    if (!file) return;

    showAdminBackupMessage('Importing…', 'info');

    try {
        const text   = await file.text();
        const backup = JSON.parse(text);

        if (!backup.tables) {
            showAdminBackupMessage('Invalid backup file — missing "tables" key.', 'error');
            return;
        }

        let totalRows = 0;

        for (const [tableName, rows] of Object.entries(backup.tables)) {
            const cfg = ADMIN_TABLE_CONFIG[tableName];
            if (!cfg || !rows.length) continue;

            const { error } = await supabaseClient
                .from(tableName)
                .upsert(rows, { onConflict: cfg.pk });

            if (error) {
                showAdminBackupMessage('Import failed on ' + tableName + ': ' + error.message, 'error');
                return;
            }
            totalRows += rows.length;
        }

        showAdminBackupMessage('Imported ' + totalRows + ' records successfully.', 'success');
        input.value = '';

    } catch (e) {
        showAdminBackupMessage('Import error: ' + e.message, 'error');
    }
}


// ============================================================
// ADMIN TAB — BACKUP MESSAGE
// ============================================================

function showAdminBackupMessage(msg, type) {
    const el = document.getElementById('adminBackupMessage');
    el.textContent = msg;
    el.className   = 'plan__message ' + type;
    el.classList.remove('hidden');
    if (type === 'success') setTimeout(() => el.classList.add('hidden'), 4000);
}


const ADMIN_PAGE_SIZE = 10;

// ============================================================
// ADMIN TAB — LOAD TABLE
// Fetches up to 500 rows, most recent first, then renders
// ============================================================

async function loadAdminTable(tableName, btn) {
    document.querySelectorAll('.admin__table-tab')
        .forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    window._adminCurrentTable = tableName;
    window._adminPage         = 0;
    window._adminSearch       = '';

    const container = document.getElementById('adminTableContainer');
    container.innerHTML = '<div style="padding:16px; color:#6b7280; font-size:13px;">Loading…</div>';

    const cfg = ADMIN_TABLE_CONFIG[tableName];

    const { data, error } = await supabaseClient
        .from(tableName)
        .select('*')
        .order(cfg.pk, { ascending: false })
        .limit(500);

    if (error) {
        container.innerHTML = '<div style="padding:16px; color:#dc2626;">Error: ' + error.message + '</div>';
        return;
    }

    window._adminTableData = data;
    renderAdminTable(tableName);
}


// ============================================================
// ADMIN TAB — RENDER TABLE (paginated + searchable)
// ============================================================

function renderAdminTable(tableName) {
    const container  = document.getElementById('adminTableContainer');
    const allData    = window._adminTableData || [];
    const search     = (window._adminSearch  || '').toLowerCase().trim();
    const page       = window._adminPage     || 0;

    // Apply search filter across all column values
    const filtered = search
        ? allData.filter(row =>
            Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search)))
        : allData;

    const total      = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    const safePage   = Math.min(page, totalPages - 1);
    const start      = safePage * ADMIN_PAGE_SIZE;
    const pageData   = filtered.slice(start, start + ADMIN_PAGE_SIZE);
    const cols       = allData.length ? Object.keys(allData[0]) : [];

    // Toolbar: search + add button + delete all button
    let html = `
        <div class="admin__toolbar">
            <input type="text" id="adminSearch" class="admin__search-input"
                   placeholder="Search all columns…" value="${(window._adminSearch || '').replace(/"/g, '&quot;')}"
                   oninput="onAdminSearch()">
            <button class="plan__btn-primary" style="padding:7px 14px; font-size:13px;"
                    onclick="openAdminAdd('${tableName}')">+ Add New</button>
            <button class="admin__btn-delete-all"
                    onclick="deleteAllAdminRows('${tableName}')">&#128465; Delete All</button>
        </div>
        <div style="font-size:12px; color:#6b7280; margin-bottom:8px;">
            ${total} record${total !== 1 ? 's' : ''}${search ? ' matching "' + search + '"' : ''}
            &nbsp;·&nbsp; showing ${start + 1}–${Math.min(start + ADMIN_PAGE_SIZE, total)} of ${total}
        </div>`;

    if (!pageData.length) {
        html += '<div style="padding:12px; color:#6b7280; font-size:13px;">No records found.</div>';
    } else {
        html += `<div class="admin__table-wrap"><table class="admin__table"><thead><tr>`;
        cols.forEach(c => { html += `<th>${c}</th>`; });
        html += `<th>Actions</th></tr></thead><tbody>`;

        pageData.forEach(row => {
            const rowJson = encodeURIComponent(JSON.stringify(row));
            html += '<tr>';
            cols.forEach(c => {
                const val     = row[c];
                const raw     = val === null || val === undefined ? '' : String(val);
                const display = typeof val === 'boolean' ? (val ? '✓' : '✗')
                              : raw.length > 40 ? raw.slice(0, 40) + '…'
                              : raw || '—';
                html += `<td title="${raw.replace(/"/g, '&quot;')}">${display}</td>`;
            });
            html += `<td style="white-space:nowrap;">
                <button class="admin__btn-edit"
                        onclick="openAdminEdit('${tableName}', '${rowJson}')">Edit</button>
                <button class="admin__btn-delete"
                        onclick="deleteAdminRow('${tableName}', '${rowJson}')">Delete</button>
            </td></tr>`;
        });

        html += '</tbody></table></div>';
    }

    // Pagination bar
    html += `
        <div class="admin__pagination">
            <button class="admin__page-btn" onclick="goAdminPage(-1)"
                    ${safePage === 0 ? 'disabled' : ''}>← Prev</button>
            <span class="admin__page-info">Page ${safePage + 1} of ${totalPages}</span>
            <button class="admin__page-btn" onclick="goAdminPage(1)"
                    ${safePage >= totalPages - 1 ? 'disabled' : ''}>Next →</button>
        </div>`;

    container.innerHTML = html;

    // Re-focus search box so typing continues uninterrupted
    const searchEl = document.getElementById('adminSearch');
    if (searchEl && search) {
        searchEl.focus();
        searchEl.setSelectionRange(searchEl.value.length, searchEl.value.length);
    }
}


// ============================================================
// ADMIN TAB — SEARCH
// ============================================================

function onAdminSearch() {
    window._adminSearch = document.getElementById('adminSearch').value;
    window._adminPage   = 0;
    renderAdminTable(window._adminCurrentTable);
}


// ============================================================
// ADMIN TAB — PAGINATION
// ============================================================

function goAdminPage(dir) {
    const allData    = window._adminTableData || [];
    const search     = (window._adminSearch  || '').toLowerCase().trim();
    const filtered   = search
        ? allData.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search)))
        : allData;
    const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));

    window._adminPage = Math.max(0, Math.min((window._adminPage || 0) + dir, totalPages - 1));
    renderAdminTable(window._adminCurrentTable);
}


// ============================================================
// ADMIN TAB — OPEN ADD (blank record)
// ============================================================

async function openAdminAdd(tableName) {
    const cfg = ADMIN_TABLE_CONFIG[tableName];

    // Get column names from one existing row (or empty if table is empty)
    const { data } = await supabaseClient.from(tableName).select('*').limit(1);
    const emptyRow = {};
    if (data && data.length) {
        Object.keys(data[0]).forEach(k => { emptyRow[k] = ''; });
    }

    // Pre-fill planid for maintenance_plan
    if (tableName === 'maintenance_plan') {
        emptyRow.planid = await getNextPlanId();
    }

    window._adminEditRow   = emptyRow;
    window._adminEditTable = tableName;
    window._adminIsAdd     = true;

    document.getElementById('adminEditTitle').textContent = 'Add New — ' + cfg.label;
    renderAdminEditFields(emptyRow, cfg.pk, true);
    document.getElementById('adminEditMessage').classList.add('hidden');
    document.getElementById('adminEditModal').classList.remove('hidden');
}


// ============================================================
// ADMIN TAB — OPEN EDIT
// ============================================================

function openAdminEdit(tableName, rowJson) {
    const cfg = ADMIN_TABLE_CONFIG[tableName];
    const row = JSON.parse(decodeURIComponent(rowJson));

    window._adminEditRow   = row;
    window._adminEditTable = tableName;
    window._adminIsAdd     = false;

    document.getElementById('adminEditTitle').textContent = 'Edit — ' + cfg.label;
    renderAdminEditFields(row, cfg.pk, false);
    document.getElementById('adminEditMessage').classList.add('hidden');
    document.getElementById('adminEditModal').classList.remove('hidden');
}


// ============================================================
// ADMIN TAB — RENDER EDIT FIELDS
// Generates appropriate input types based on field name / value
// ============================================================

function renderAdminEditFields(row, pkCol, isAdd) {
    const container = document.getElementById('adminEditFields');
    let html = '';

    Object.entries(row).forEach(([key, val]) => {
        const isPk   = key === pkCol;
        const strVal = val === null || val === undefined ? '' : String(val);

        if (isPk && !isAdd) {
            // PK on edit — read-only
            html += `<div class="plan__field" style="margin-bottom:8px;">
                <label class="plan__label">${key} (ID — read only)</label>
                <input type="text" class="plan__input" value="${strVal}"
                       readonly style="background:#f3f4f6; cursor:default;">
            </div>`;
            return;
        }

        if (typeof val === 'boolean' || strVal === 'true' || strVal === 'false') {
            const checked = (val === true || strVal === 'true') ? 'checked' : '';
            html += `<div class="plan__field" style="margin-bottom:8px; display:flex; align-items:center; gap:10px;">
                <label class="plan__label" style="margin-bottom:0;">${key}</label>
                <input type="checkbox" id="adminField_${key}" ${checked}
                       style="width:20px; height:20px; cursor:pointer;">
            </div>`;

        } else if (/notes|comments|cause|remark|description|item_text/i.test(key)) {
            html += `<div class="plan__field" style="margin-bottom:8px;">
                <label class="plan__label">${key}</label>
                <textarea id="adminField_${key}" class="plan__input"
                          rows="2">${strVal}</textarea>
            </div>`;

        } else {
            const escaped = strVal.replace(/"/g, '&quot;');
            html += `<div class="plan__field" style="margin-bottom:8px;">
                <label class="plan__label">${key}</label>
                <input type="text" id="adminField_${key}" class="plan__input" value="${escaped}">
            </div>`;
        }
    });

    container.innerHTML = html;
}


// ============================================================
// ADMIN TAB — CLOSE EDIT MODAL
// ============================================================

function closeAdminEdit() {
    document.getElementById('adminEditModal').classList.add('hidden');
    window._adminEditRow   = null;
    window._adminEditTable = null;
}


// ============================================================
// ADMIN TAB — SAVE EDIT / ADD
// ============================================================

async function saveAdminEdit() {
    const tableName = window._adminEditTable;
    const row       = window._adminEditRow;
    const isAdd     = window._adminIsAdd;
    const cfg       = ADMIN_TABLE_CONFIG[tableName];

    if (!tableName || !row) return;

    // Collect field values from form
    const updated = {};
    Object.keys(row).forEach(key => {
        const el = document.getElementById('adminField_' + key);
        if (!el) {
            updated[key] = row[key]; // PK (read-only on edit)
            return;
        }
        if (el.type === 'checkbox') {
            updated[key] = el.checked;
        } else {
            const v = el.value.trim();
            updated[key] = v === '' ? null : v;
        }
    });

    let dbError;

    if (isAdd) {
        // Remove PK if empty so DB auto-assigns it (for serial IDs)
        if (!updated[cfg.pk]) delete updated[cfg.pk];
        ({ error: dbError } = await supabaseClient.from(tableName).insert([updated]));
    } else {
        ({ error: dbError } = await supabaseClient
            .from(tableName)
            .update(updated)
            .eq(cfg.pk, row[cfg.pk]));
    }

    if (dbError) {
        const el = document.getElementById('adminEditMessage');
        el.textContent = 'Error: ' + dbError.message;
        el.className   = 'plan__message error';
        el.classList.remove('hidden');
        return;
    }

    closeAdminEdit();
    loadAdminTable(tableName, null);

    // Refresh machine cache if machine-related tables changed
    if (tableName === 'machinetypes' || tableName === 'machine_categories') {
        loadMachineTypes();
    }
}


// ============================================================
// ADMIN TAB — DELETE ROW
// ============================================================

async function deleteAdminRow(tableName, rowJson) {
    const row   = JSON.parse(decodeURIComponent(rowJson));
    const cfg   = ADMIN_TABLE_CONFIG[tableName];
    const pkVal = row[cfg.pk];

    if (!confirm('Delete record "' + pkVal + '" from ' + cfg.label + '?\nThis cannot be undone.')) return;

    const { error } = await supabaseClient
        .from(tableName)
        .delete()
        .eq(cfg.pk, pkVal);

    if (error) {
        alert('Delete failed: ' + error.message);
        return;
    }

    loadAdminTable(tableName, null);
}


// ============================================================
// ADMIN TAB — DELETE ALL ROWS IN TABLE
// ============================================================

async function deleteAllAdminRows(tableName) {
    const cfg   = ADMIN_TABLE_CONFIG[tableName];
    const total = (window._adminTableData || []).length;

    if (total === 0) {
        alert('Table is already empty.');
        return;
    }

    const confirmed = confirm(
        `DELETE ALL ${total} record(s) from "${cfg.label}"?\n\n` +
        `This will permanently erase every row in this table.\n` +
        `Type OK to confirm — this cannot be undone.`
    );
    if (!confirmed) return;

    // Delete every row by filtering where PK is not null (matches all rows)
    const { error } = await supabaseClient
        .from(tableName)
        .delete()
        .not(cfg.pk, 'is', null);

    if (error) {
        alert('Delete all failed: ' + error.message);
        return;
    }

    loadAdminTable(tableName, null);
}