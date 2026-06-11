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

    if (name === 'dashboard') {
        loadDashboardStats(); // load summary stat cards
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
        .select('service_type, status, planned_date');

    if (error) {
        console.error('Dashboard stats error:', error.message);
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Calculate counts
    const total     = data.length;
    const scheduled = data.filter(r => r.service_type === 'Scheduled').length;
    const pending   = data.filter(r => r.status === 'Pending').length;
    const completed = data.filter(r => r.status === 'Completed').length;
    const overdue   = data.filter(r =>
        r.status === 'Pending' &&
        r.planned_date &&
        r.planned_date < today
    ).length;

    // Update stat cards
    document.getElementById('dashTotal').textContent     = total;
    document.getElementById('dashScheduled').textContent = scheduled;
    document.getElementById('dashPending').textContent   = pending;
    document.getElementById('dashCompleted').textContent = completed;
    document.getElementById('dashOverdue').textContent   = overdue;
}

// ============================================================
// ACTUAL TAB — LOAD TASKS
// - Fetches all maintenance plans from Supabase
// - Filters by: This Week Pending / All Pending / All Tasks
// - Uses year_week for "This Week" filter (not planned_date)
// - Updates stat cards and renders task cards
// ============================================================

async function loadTasks(filterType, clickedButton) {


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

    // Update Actual tab stat cards
    renderDashboardStats(data);

        // Current week string e.g. "2026-24"
        const currentWeek = getWeekNumber(new Date());

    // Apply filter
    let filteredTasks = [];

   if (filterType === 'weekPending') {
    // Show pending tasks that are this week OR overdue (past weeks)
    filteredTasks = data.filter(task =>
        task.status === 'Pending' &&
        task.year_week <= currentWeek
    );

    } else if (filterType === 'allPending') {
        // All pending tasks regardless of week
        filteredTasks = data.filter(task => task.status === 'Pending');

    } else {
        // All tasks unfiltered
        filteredTasks = data;
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

    const planned   = taskData.filter(t => t.service_type === 'Planned').length;
    const scheduled = taskData.filter(t => t.service_type === 'Scheduled').length;
    const pending   = taskData.filter(t => t.status === 'Pending').length;
    const completed = taskData.filter(t => t.status === 'Completed').length;

    document.getElementById('dashboardPlannedCount').innerText   = planned;
    document.getElementById('dashboardScheduledCount').innerText = scheduled;
    document.getElementById('dashboardPendingCount').innerText   = pending;
    document.getElementById('dashboardCompletedCount').innerText = completed;
}


// ============================================================
// ACTUAL TAB — RENDER TASK CARDS
// - Renders one card per task
// - Clicking a card opens the checklist screen
// ============================================================


function renderTaskCards(taskData) {

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
                    onclick="openChecklist('${planId}', '${category}', '${machine}')">

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

    if (data.service_type === 'Scheduled') {

        // Load checklist items for this machine category from Supabase
        const items = await loadChecklistTemplate(data.machine_category);

        if (!items.length) {
            container.innerHTML = '<div style="padding:16px;color:#6b7280;">No checklist template found for this machine category.</div>';
            return;
        }

        // Store loaded items globally for saveChecklist to use
        window._currentChecklistItems = items;

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
        attribute_name: checklistItems[index],
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

    console.log('Saving checklist for plan:', currentPlanId);

    try {

        let rowsToInsert = [];

        // Fetch plan to check service_type
        const { data: plan } = await supabaseClient
            .from('maintenance_plan')
            .select('service_type, notes')
            .eq('planid', currentPlanId)
            .single();

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
                status:           'Completed',
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
                result_value:     'Completed',
                comments:         comment,
                status:           'Completed',
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
    const { error: updateError } = await supabaseClient
    .from('maintenance_plan')
    .update({
        status:         'Completed',
        completed_by:   currentUser,
        comments:       plan.service_type === 'Scheduled'
                            ? '' 
                            : document.getElementById('plannedComment')?.value || '',
        completed_date: new Date().toISOString()
    })
    .eq('planid', currentPlanId);

        alert('Saved successfully!');
        backToTasks();
        refreshAll();

    } catch (err) {
        console.error('Unexpected error:', err);
        alert(err.message);
    }
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
        is_synced:          false,
        last_modified:      now
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
// - Blocked if plan is Completed
// ============================================================
function openEditModal(plan) {

    if (plan.status === 'Completed') return;

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
            year_week:     yearWeek,
            last_modified: new Date().toISOString()
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

        const freqLabel = group.freq + 'M';
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
                bodyHtml += `<td><span class="plan-grid__cell ${cls}"
                            onmouseenter="showTooltip(event,'${tip}')"
                            onmouseleave="hideTooltip()"
                            onclick="handleCellClick('${plan.planid}')"
                            style="cursor:${plan.status !== 'Completed' ? 'pointer' : 'default'};"
                            >${label}</span></td>`;
            } else {
                bodyHtml += '<td></td>';
            }
        });

        bodyHtml += '</tr>';
    });

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
    const base        = plan.service_type === 'Scheduled' ? 'S' : 'P';
    const isCompleted = plan.status === 'Completed';
    return isCompleted ? base + '-C' : base;
}


// ============================================================
// GANTT GRID — CELL CLASS
// - Returns CSS class for color coding
// - completed → green, delayed → red, future → blue, current → green/red
// ============================================================

function getCellClass(plan, week, currentWeek) {

    const isCompleted = plan.status === 'Completed';
    const isPast      = week < currentWeek;
    const isFuture    = week > currentWeek;

    if (isCompleted) return plan.service_type === 'Scheduled' ? 's-c' : 'p-c';
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
    const lines = [
        'ID: '           + plan.planid,
        'Machine: '      + plan.machine_no,
        'Type: '         + plan.service_type,
        'Scheduled: '    + (plan.planned_date  || '—'),
        'Week: '         + (plan.year_week     || '—'),
        'Status: '       + (plan.status        || '—'),
        'Planned by: '   + (plan.planned_by    || '—'),
        'Notes: '        + (plan.notes         || '—'),
        'Completed: '    + formatSLTime(plan.completed_date),
        'Modified: '     + formatSLTime(plan.last_modified),
        'Created: '      + formatSLTime(plan.created_date),
    ].join('|');
    return encodeURIComponent(lines);
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