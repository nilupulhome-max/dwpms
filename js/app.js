// SUPABASE CONFIG

const SUPABASE_URL =
'https://ekcwmofllelccgobnnpc.supabase.co';

const SUPABASE_ANON_KEY =
'sb_publishable_kk3BNXcUy-GhJ1aetFIbXw_IsR4P0Kr';

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// =============================
// GLOBAL VARIABLES
// =============================

let currentPlanId;
let currentMachineCategory;
let currentMachineNo;
let currentUser;

let checklistResults = [];

// =====================================
// USERS
// =====================================

const appUsers = {

    Nilupul : '123456',
    Vimukthi : '456789'

};

// =====================================
// LOGIN
// =====================================

 
async function loginUser(){

    const emailValue =
        document.getElementById(
            'loginUsernameInput'
        ).value;

    const passwordValue =
        document.getElementById(
            'loginPasswordInput'
        ).value;

    console.log(emailValue);

    const {
        data,
        error
    } =
    await supabaseClient.auth.signInWithPassword({

        email: emailValue,
        password: passwordValue

    });

    if(error){

        console.log(error);

        alert(error.message);

        return;

    }

   // alert('Login Success');

    document
        .getElementById('loginScreen')
        .classList.add('hidden');

    document
        .getElementById('dashboardScreen')
        .classList.remove('hidden');



 loadTasks(
    'weekPending',
    document.querySelector(
        '.dashboard__filter-button'
    )
);

// GET LOGGED USER EMAIL

const {
    data: { user }
} =
await supabaseClient.auth.getUser();

// SHOW USER NAME

const username =
    user.email.split('@')[0];

document.getElementById(
    'loggedUserName'
).innerText = username;
currentUser = username;

}

// =====================================
// LOG OUT
// =====================================
async function logoutUser(){

    const { error } =
        await supabaseClient.auth.signOut();

    if(error){
        console.log(error);
        alert(error.message);
        return;
    }

    // hide dashboard
    document.getElementById('dashboardScreen')
        .classList.add('hidden');

    // show login
    document.getElementById('loginScreen')
        .classList.remove('hidden');

    // clear UI user text
    document.getElementById('loggedUserName').innerText = '';
}

window.addEventListener('load', async () => {

    const { data } =
        await supabaseClient.auth.getSession();

    const session = data.session;

    if(session){

        const user = session.user;

        const username =
            user.email.split('@')[0];

        document.getElementById('loggedUserName')
            .innerText = username;

        currentUser = username;

        document.getElementById('loginScreen')
            .classList.add('hidden');

        document.getElementById('dashboardScreen')
            .classList.remove('hidden');

                       // make sure Plan tab is active on login
    switchTab('plan', document.querySelector('.dashboard__tab'));

        loadTasks('weekPending');
    }
});

// =====================================
// Tabs
// =====================================
function switchTab(name, btn) {
  document.querySelectorAll('.dashboard__tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dashboard__tab-content').forEach(t => t.classList.add('hidden'));
  btn.classList.add('active');
  document.getElementById('tab-' + name).classList.remove('hidden');

   // load dropdowns when plan tab opens
    if (name === 'plan') loadMachineTypes();
    if (name === 'plan') loadPlanGantt();  // add this line
    if (name === 'dashboard') loadDashboardStats();

}

async function loadDashboardStats() {
    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('service_type, status, planned_date');

    if (error) {
        console.error('Dashboard stats error:', error.message);
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    const total     = data.length;
    const scheduled = data.filter(r => r.service_type === 'Scheduled').length;
    const pending   = data.filter(r => r.status === 'Pending').length;
    const completed = data.filter(r => r.status === 'Completed').length;
    const overdue   = data.filter(r => r.status === 'Pending' && r.planned_date && r.planned_date < today).length;

    document.getElementById('dashTotal').textContent     = total;
    document.getElementById('dashScheduled').textContent = scheduled;
    document.getElementById('dashPending').textContent   = pending;
    document.getElementById('dashCompleted').textContent = completed;
    document.getElementById('dashOverdue').textContent   = overdue;
}
const machineType = document.getElementById('planMachineType').value.trim();
const machineIdSelect = document.getElementById('planMachineId');
const machineId = machineIdSelect.value.trim();
const machineName = machineIdSelect.options[machineIdSelect.selectedIndex]?.getAttribute('data-name') || '';


// =====================================
// LOAD MACHINETYPES
//
async function loadMachineTypes() {
    const { data, error } = await supabaseClient
        .from('machinetypes')
        .select('machineid, machine_name, machine_category');

    if (error) {
        console.error('Error loading machine types:', error.message);
        return;
    }

    const machineTypeSelect = document.getElementById('planMachineType');
    const machineIdSelect = document.getElementById('planMachineId');

    // populate machine type (category) dropdown — unique values
    const categories = [...new Set(data.map(d => d.machine_category))];
    machineTypeSelect.innerHTML = '<option value="">Select Machine Type</option>';
    categories.forEach(cat => {
        machineTypeSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    // store full data for filtering
    window._machineData = data;

    // reset machine id
    machineIdSelect.innerHTML = '<option value="">Select Machine ID</option>';
}

function onMachineTypeChange() {
    const selected = document.getElementById('planMachineType').value;
    const machineIdSelect = document.getElementById('planMachineId');

    machineIdSelect.innerHTML = '<option value="">Select Machine ID</option>';

    if (!selected) return;

    const filtered = window._machineData.filter(d => d.machine_category === selected);
    filtered.forEach(m => {
        machineIdSelect.innerHTML += `<option value="${m.machineid}" data-name="${m.machine_name}">${m.machineid} — ${m.machine_name}</option>`;
    });
}




// =====================================
// LOAD TASKS
// =====================================

async function loadTasks(
    filterType,
    clickedButton
){

    console.log("Loading:", filterType);

    // =====================================
    // ACTIVE FILTER BUTTON
    // =====================================

    document
        .querySelectorAll(
            '.dashboard__filter-button'
        )
        .forEach(btn =>
            btn.classList.remove('active')
        );

    if(clickedButton){

        clickedButton.classList.add('active');

    }

    // =====================================
    // LOAD DATA FROM SUPABASE
    // =====================================

    const {
        data,
        error
    } =
    await supabaseClient
        .from('maintenance_plan')
        .select('*')
        .order('planned_date');

    // =====================================
    // ERROR CHECK
    // =====================================

    if(error){

        console.log(error);

        alert(error.message);

        return;
    }

    console.log(data);

    // =====================================
    // RENDER DASHBOARD STATS
    // =====================================

    renderDashboardStats(data);

    // =====================================
    // DATE CALCULATIONS
    // =====================================

    const todayDate =
        new Date();

    const currentWeekEndDate =
        new Date(todayDate);

    currentWeekEndDate.setDate(
        todayDate.getDate() +
        (6 - todayDate.getDay())
    );

    // =====================================
    // FILTER TASKS
    // =====================================

    let filteredTasks = [];

    // THIS WEEK PENDING

    if(filterType === 'weekPending'){

        filteredTasks =
            data.filter(task => {

                const plannedDate =
                    new Date(task.planned_date);

                return (
                    task.status === 'Pending'
                    &&
                    plannedDate <=
                    currentWeekEndDate
                );

            });

    }

    // ALL PENDING

    else if(
        filterType === 'allPending'
    ){

        filteredTasks =
            data.filter(task =>
                task.status === 'Pending'
            );

    }

    // ALL TASKS

    else{

        filteredTasks = data;

    }

    // =====================================
    // RENDER TASK CARDS
    // =====================================

    renderTaskCards(filteredTasks);

}

// =====================================
// DASHBOARD STATS
// =====================================

function renderDashboardStats(taskData){

    const totalPlannedCount =
        taskData.filter(
            task =>
            task.service_type === 'Planned'
        ).length;

    const totalScheduledCount =
        taskData.filter(
            task =>
            task.service_type === 'Scheduled'
        ).length;

    const totalPendingCount =
        taskData.filter(
            task =>
            task.status === 'Pending'
        ).length;

    const totalCompletedCount =
        taskData.filter(
            task =>
            task.status === 'Completed'
        ).length;

    document.getElementById(
        'dashboardPlannedCount'
    ).innerText = totalPlannedCount;

    document.getElementById(
        'dashboardScheduledCount'
    ).innerText = totalScheduledCount;

    document.getElementById(
        'dashboardPendingCount'
    ).innerText = totalPendingCount;

    document.getElementById(
        'dashboardCompletedCount'
    ).innerText = totalCompletedCount;

    
}

// =====================================
// RENDER TASKS
// =====================================

function renderTaskCards(taskData){

    const container =
        document.getElementById('dashboardTaskList');

    container.innerHTML = '';

    taskData.forEach(taskItem => {

        container.innerHTML += `

        <div class="task-row"
            onclick="openChecklist(
                '${taskItem.planid || taskItem.plan_id}',
                '${taskItem.machine_category || ''}',
                '${taskItem.machine_no || ''}'
            )">

            <!-- LEFT -->
            <div class="task-row__left">

                <div class="task-row__title">
                    ${taskItem.planid || taskItem.plan_id}
                </div>

                <div class="task-row__machine">
                    Machine : ${taskItem.machine_no}
                </div>

                 <div class="task-row__machine">
                    Machine : ${taskItem.machine_category}
                </div>

            </div>

            <!-- CENTER -->
            <div class="task-row__center">

                <div class="task-row__service">
                    ${taskItem.service_type || ''}
                </div>

                <div class="task-row__week">
                    Week : ${taskItem.year_week || ''}
                </div>

            </div>

            <!-- RIGHT -->
            <div class="task-row__right">

                <span class="task-row__badge
                    ${taskItem.status === 'Completed'
                        ? 'task-row__badge--completed'
                        : 'task-row__badge--pending'}">

                    ${taskItem.status}

                </span>

            </div>

        </div>

        `;
    });
}

// =====================================
// CHECEK LIST
// =====================================
const checklistItems = [

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

];

function openChecklist(planId, category, machineNo){

    console.log("Opening checklist:", planId);

    currentPlanId = planId;
    currentMachineCategory = category;
    currentMachineNo = machineNo;

    // HIDE TASK LIST
    document
        .getElementById('taskListScreen')
        .classList.add('hidden');

    // SHOW CHECKLIST SCREEN
    document
        .getElementById('checklistScreen')
        .classList.remove('hidden');

    // =====================================
    // RENDER CHECKLIST UI (MISSING PART)
    // =====================================

    const container =
        document.getElementById('checklistContainer');

    container.innerHTML = '';

    checklistItems.forEach((item, index) => {

        container.innerHTML += `
        
        <div class="check-row">

            <!-- QUESTION -->
    <div class="check-text">
        ${item}
    </div>

    <!-- BOTTOM ROW -->
    <div class="check-bottom">

        <!-- BUTTONS -->
        <div class="check-buttons">

            <button class="btn-yes"
                onclick="setResult(${index}, 'YES', this)">
                YES
            </button>

            <button class="btn-no"
                onclick="setResult(${index}, 'NO', this)">
                NO
            </button>

            <button class="btn-na"
                onclick="setResult(${index}, 'N/A', this)">
                N/A
            </button>

        </div>

        <!-- COMMENT -->
        <div class="check-comment">

            <input type="text"
                id="comment_${index}"
                placeholder="Comment">

        </div>

    </div>
        `;

    });
}
function setResult(index, value, clickedButton){

    checklistResults[index] = {
        attribute_name: checklistItems[index],
        result_value: value
    };

    const parent =
        clickedButton.parentElement;

    parent.querySelectorAll('button')
        .forEach(btn =>
            btn.classList.remove('active')
        );

    clickedButton.classList.add('active');
}

function backToTasks(){

    document
        .getElementById('checklistScreen')
        .classList.add('hidden');

    document
        .getElementById('taskListScreen')
        .classList.remove('hidden');

}

function selectChecklistResult(
    index,
    value,
    clickedButton
){

    // REMOVE ACTIVE
    document
        .querySelectorAll(
            `.group_${index}`
        )
        .forEach(btn =>
            btn.classList.remove('active')
        );

    // FORCE MOBILE REPAINT
    void clickedButton.offsetWidth;

    // ADD ACTIVE
    clickedButton.classList.add('active');

    // SAVE RESULT
    checklistResults[index] = {

        result_value: value

    };

}
async function saveChecklist(){

    console.log("Saving checklist...");

    try {

        // =========================
        // PREPARE ALL ROWS
        // =========================

        let rowsToInsert = [];

        for(let i = 0; i < checklistItems.length; i++){

            const comment =
                document.getElementById(
                    `comment_${i}`
                )?.value || '';

            const result =
                checklistResults[i]?.result_value || 'N/A';

            rowsToInsert.push({

                plan_id: currentPlanId,

                machine_category: currentMachineCategory,

                machine_no: currentMachineNo,

                technician: currentUser,

                attribute_name: checklistItems[i],

                result_value: result,

                comments: comment,

                status: 'Completed',

                is_synced: false

            });

        }

        // =========================
        // INSERT ALL AT ONCE
        // =========================

        const {
            error: insertError
        } =
        await supabaseClient
            .from('maintenance_actual')
            .insert(rowsToInsert);

        // =========================
        // INSERT FAILED
        // =========================

        if(insertError){

            console.log(insertError);

            alert(insertError.message);

            return;
        }

        // =========================
        // UPDATE PLAN STATUS
        // =========================

        const {
            error: updateError
        } =
        await supabaseClient
            .from('maintenance_plan')
            .update({
                status: 'Completed'
            })
            .eq('planid', currentPlanId);

        // =========================
        // UPDATE FAILED
        // =========================

        if(updateError){

            console.log(updateError);

            alert(updateError.message);

            return;
        }

        // =========================
        // SUCCESS
        // =========================

        alert("Checklist Saved Successfully!");

        document
            .getElementById('checklistScreen')
            .classList.add('hidden');

        document
            .getElementById('taskListScreen')
            .classList.remove('hidden');

        loadTasks('weekPending');

    }
    catch(err){

        console.log(err);

        alert(err.message);

    }

}


// TAB PLAN 

function getWeekNumber(date) {
    const d = new Date(date);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return d.getFullYear() + '-' + String(week).padStart(2, '0');
}

function generateScheduleDates() {
    const start = new Date(document.getElementById('planStartDate').value);
    const end = new Date(document.getElementById('planEndDate').value);
    const freq = parseInt(document.getElementById('planFrequency').value);

    const dates = [];
    let current = new Date(start);

    while (current <= end) {
        dates.push(new Date(current));
        current.setMonth(current.getMonth() + freq);
    }

    return dates;
}

async function previewSchedule() {
    const machineType = document.getElementById('planMachineType').value.trim();
    const machineIdSelect = document.getElementById('planMachineId');
    const machineId = machineIdSelect.value.trim();
    const status = document.getElementById('planStatus').value;

    if (!machineType || !machineId || !document.getElementById('planStartDate').value || !document.getElementById('planEndDate').value) {
        showPlanMessage('Please fill in all fields before previewing.', 'error');
        return;
    }

    const dates = generateScheduleDates();

    // get next real plan id
    const firstId = await getNextPlanId();
    let num = parseInt(firstId.split('-')[1]);

    const preview = document.getElementById('planPreview');

    let html = `<table>
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
        const planId = 'PLNNO-' + String(num++).padStart(4, '0');
        const scheduled = date.toISOString().split('T')[0];
        const week = getWeekNumber(date);
        html += `<tr>
            <td>${planId}</td>
            <td>${machineType}</td>
            <td>${machineId}</td>
            <td>${status}</td>
            <td>${scheduled}</td>
            <td>${week}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    preview.innerHTML = html;
    preview.classList.remove('hidden');
}
async function getNextPlanId() {
    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('planid')
        .order('planid', { ascending: false })
        .limit(1);

    if (error || !data.length) return 'PLNNO-0001';

    const last = data[0].planid;
    const num = parseInt(last.split('-')[1]) + 1;
    return 'PLNNO-' + String(num).padStart(4, '0');
}
async function previewAndConfirm() {
    const machineType = document.getElementById('planMachineType').value.trim();
    const machineIdSelect = document.getElementById('planMachineId');
    const machineId = machineIdSelect.value.trim();
    const status = document.getElementById('planStatus').value;

    if (!machineType || !machineId || !document.getElementById('planStartDate').value || !document.getElementById('planEndDate').value) {
        showPlanMessage('Please fill in all fields before previewing.', 'error');
        return;
    }

    const dates = generateScheduleDates();
    const weeks = dates.map(d => getWeekNumber(d));

    // check supabase for conflicts
    // check conflicts — same machine OR same weeks
const { data, error } = await supabaseClient
    .from('maintenance_plan')
    .select('planid, machine_no, machine_category, year_week, planned_date, service_type, status')
    .or(`machine_no.eq.${machineId},year_week.in.(${weeks.join(',')})`);

    if (error) {
        showPlanMessage('Error checking conflicts: ' + error.message, 'error');
        return;
    }

    // show preview table
    const firstId = await getNextPlanId();
    let num = parseInt(firstId.split('-')[1]);

    let previewHtml = `<table>
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
        const planId = 'PLNNO-' + String(num++).padStart(4, '0');
        const scheduled = date.toISOString().split('T')[0];
        const week = getWeekNumber(date);
        previewHtml += `<tr>
            <td>${planId}</td>
            <td>${machineType}</td>
            <td>${machineId}</td>
            <td>${status}</td>
            <td>${scheduled}</td>
            <td>${week}</td>
        </tr>`;
    });

    previewHtml += '</tbody></table>';

    const preview = document.getElementById('planPreview');
    preview.innerHTML = previewHtml;
    preview.classList.remove('hidden');

    // build conflict warning
    const confirmBox = document.getElementById('planConfirmBox');

    if (data && data.length > 0) {
        let conflictHtml = `
            <div class="plan-confirm__warning">
                <div class="plan-confirm__warning-title">
                    ⚠️ Existing plans found for these weeks
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
                    <tbody>`;

                    data.forEach(row => {
                        const isSameMachine = row.machine_no === machineId;
                        const isSameWeek = weeks.includes(row.year_week);

                        let reason = '';
                        if (isSameMachine && isSameWeek) reason = '⚠️ Same machine + same week';
                        else if (isSameMachine)          reason = '🔁 Same machine, different week';
                        else if (isSameWeek)             reason = '📅 Different machine, same week';

                        conflictHtml += `<tr>
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

        conflictHtml += `</tbody></table>
                <div class="plan-confirm__question">
                    Do you still want to add the new plan?
                </div>
                <div class="plan-confirm__btns">
                    <button class="plan__btn-primary" onclick="saveSchedule()">Yes, Save Anyway</button>
                    <button class="plan__btn-ghost" onclick="cancelConfirm()">Cancel</button>
                </div>
            </div>`;

        confirmBox.innerHTML = conflictHtml;
        confirmBox.classList.remove('hidden');

    } else {
        // no conflicts — show clean confirm
        confirmBox.innerHTML = `
            <div class="plan-confirm__clean">
                <div class="plan-confirm__clean-title">✅ No conflicts found for these weeks.</div>
                <div class="plan-confirm__question">Ready to save?</div>
                <div class="plan-confirm__btns">
                    <button class="plan__btn-primary" onclick="saveSchedule()">Yes, Save</button>
                    <button class="plan__btn-ghost" onclick="cancelConfirm()">Cancel</button>
                </div>
            </div>`;
        confirmBox.classList.remove('hidden');
    }
}

function cancelConfirm() {
    document.getElementById('planConfirmBox').classList.add('hidden');
    document.getElementById('planPreview').classList.add('hidden');
    document.getElementById('planPreview').innerHTML = '';
    document.getElementById('planMachineType').value = '';
    document.getElementById('planMachineId').innerHTML = '<option value="">Select Machine ID</option>';
    document.getElementById('planStartDate').value = '';
    document.getElementById('planEndDate').value = '';
    document.getElementById('planFrequency').selectedIndex = 0;
    document.getElementById('planStatus').selectedIndex = 0;
}

async function saveSchedule() {
    const machineType = document.getElementById('planMachineType').value.trim();
    const machineId = document.getElementById('planMachineId').value.trim();
    const status = document.getElementById('planStatus').value;
    const freq = parseInt(document.getElementById('planFrequency').value);

    if (!machineType || !machineId || !document.getElementById('planStartDate').value || !document.getElementById('planEndDate').value) {
        showPlanMessage('Please fill in all fields before saving.', 'error');
        return;
    }

    const dates = generateScheduleDates();
    const createdBy = document.getElementById('loggedUserName').textContent.trim();
    const now = new Date().toISOString();

    let nextId = await getNextPlanId();
    let num = parseInt(nextId.split('-')[1]);

    const rows = dates.map(date => {
        const planId = 'PLNNO-' + String(num++).padStart(4, '0');
        return {
        planid: planId,
        machine_category: machineType,
        machine_no: machineId,
        service_type: status,
        schedule_frequency: freq,
        year_week: getWeekNumber(date),
        planned_date: date.toISOString().split('T')[0],
        planned_by: createdBy,
        created_date: now,
        status: 'Pending',
        is_synced: false,
        last_modified: now
        };
    });

    const { error } = await supabaseClient
        .from('maintenance_plan')
        .insert(rows);

    if (error) {
        showPlanMessage('Error saving: ' + error.message, 'error');
    } else {
        showPlanMessage(rows.length + ' schedule(s) saved successfully!', 'success');
        // reset all
    document.getElementById('planConfirmBox').classList.add('hidden');
    document.getElementById('planPreview').classList.add('hidden');
    document.getElementById('planPreview').innerHTML = '';
    document.getElementById('planMachineType').value = '';
    document.getElementById('planMachineId').innerHTML = '<option value="">Select Machine ID</option>';
    document.getElementById('planStartDate').value = '';
    document.getElementById('planEndDate').value = '';
    document.getElementById('planFrequency').selectedIndex = 0;
    document.getElementById('planStatus').selectedIndex = 0;

    loadPlanGantt();
    }
}

function showPlanMessage(msg, type) {
    const el = document.getElementById('planMessage');
    el.textContent = msg;
    el.className = 'plan__message ' + type;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}


    // Maintanance Plan grid
async function loadPlanGantt() {
    const { data, error } = await supabaseClient
        .from('maintenance_plan')
        .select('*')
       // .eq('is_synced', true)
        .order('machine_no', { ascending: true });

    if (error) {
        console.error('Gantt load error:', error.message);
        return;
    }

    renderPlanGantt(data);
}

function renderPlanGantt(data) {
    const year = new Date().getFullYear();
    const today = new Date();
    const currentWeek = getWeekNumber(today);

    // build week columns 1 - 52
    const weeks = Array.from({ length: 52 }, (_, i) => {
        const w = String(i + 1).padStart(2, '0');
        return year + '-' + w;
    });

    // group rows by machine_category + machine_no + schedule_frequency
    const groups = {};
    data.forEach(row => {
        const key = row.machine_category + '||' + row.machine_no + '||' + row.schedule_frequency;
        if (!groups[key]) groups[key] = { category: row.machine_category, machine: row.machine_no, freq: row.schedule_frequency, plans: [] };
        groups[key].plans.push(row);
    });

    // HEADER
    const thead = document.getElementById('planGanttHead');
    let headHtml = `<tr>
        <th class="col-sticky" style="left:0">Machine Category</th>
        <th class="col-sticky" style="left:140px">Machine</th>
        <th class="col-sticky" style="left:220px">Freq</th>
        <th class="col-sticky" style="left:270px">N</th>`;

    weeks.forEach(w => {
        const wNum = w.split('-')[1];
        const isCurrent = w === currentWeek;
        headHtml += `<th style="${isCurrent ? 'border-bottom:2px solid #60a5fa;background:#254d7a' : ''}">${wNum}W</th>`;
    });

    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // BODY
    const tbody = document.getElementById('planGanttBody');
    let bodyHtml = '';

    Object.values(groups).forEach(group => {
        const freqLabel = group.freq + 'M';
        const count = group.plans.length;

        // map year_week -> plan
        const weekMap = {};
        group.plans.forEach(p => {
            if (p.year_week) weekMap[p.year_week] = p;
        });

        bodyHtml += `<tr>
            <td class="col-sticky" style="left:0">${group.category}</td>
            <td class="col-sticky" style="left:140px">${group.machine}</td>
            <td class="col-sticky" style="left:220px">${freqLabel}</td>
            <td class="col-sticky" style="left:270px">${count}</td>`;

        weeks.forEach(w => {
            const plan = weekMap[w];
            if (plan) {
                const label = getCellLabel(plan, w, currentWeek);
                const cls = getCellClass(plan, w, currentWeek);
                const tip = encodeTooltip(plan);
                bodyHtml += `<td><span class="plan-grid__cell ${cls}" 
                    onmouseenter="showTooltip(event, '${tip}')" 
                    onmouseleave="hideTooltip()">${label}</span></td>`;
            } else {
                bodyHtml += '<td></td>';
            }
        });

        bodyHtml += '</tr>';
    });

    tbody.innerHTML = bodyHtml;

    // scroll to current week
    scrollToCurrentWeek(currentWeek, weeks);
}

function getCellLabel(plan, week, currentWeek) {
    const isCompleted = plan.status === 'Completed';
    const isPast = week < currentWeek;
    const base = plan.service_type === 'Scheduled' ? 'S' : 'P';
    if (isCompleted) return base + '-C';
    return base;
}

function getCellClass(plan, week, currentWeek) {
    const isCompleted = plan.status === 'Completed';
    const isPast = week < currentWeek;
    const isFuture = week > currentWeek;

    if (isCompleted) return plan.service_type === 'Scheduled' ? 's-c' : 'p-c';
    if (isPast) return 'delayed';
    if (isFuture) return 'future';
    return plan.service_type === 'Scheduled' ? 'scheduled' : 'planned';
}

function encodeTooltip(plan) {
    const lines = [
        'ID: ' + plan.planid,
        'Machine: ' + plan.machine_no,
        'Type: ' + plan.service_type,
        'Scheduled: ' + (plan.planned_date || '—'),
        'Status: ' + (plan.status || '—'),
        'Planned by: ' + (plan.planned_by || '—'),
        'Completed by: ' + (plan.completed_by || '—'),
        'Completed: ' + (plan.completed_date || '—'),
    ].join('|');
    return encodeURIComponent(lines);
}

function showTooltip(event, encoded) {
    const tip = document.getElementById('planTooltip');
    const lines = decodeURIComponent(encoded).split('|');
    tip.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
    tip.classList.remove('hidden');

    const rect = event.target.getBoundingClientRect();

    // position above the cell, centered
    let left = rect.left + rect.width / 2;
    let top = rect.top - 10;

    // if too close to top, show below instead
    if (top < 150) {
        top = rect.bottom + 10;
        tip.style.transform = 'translateX(-50%)';
    } else {
        tip.style.transform = 'translateX(-50%) translateY(-100%)';
    }

    // prevent going off right edge
    const tipWidth = 240;
    if (left + tipWidth / 2 > window.innerWidth) {
        left = window.innerWidth - tipWidth / 2 - 10;
    }

    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
}

function hideTooltip() {
    document.getElementById('planTooltip').classList.add('hidden');
}

function scrollToCurrentWeek(currentWeek, weeks) {
    const idx = weeks.indexOf(currentWeek);
    if (idx === -1) return;
    const scroll = document.querySelector('.plan-grid__scroll');
    // each week col is approx 40px, sticky cols take ~300px
    scroll.scrollLeft = Math.max(0, (idx * 40) - 100);
}

