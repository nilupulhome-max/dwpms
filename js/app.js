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

 /*function loginUser(){

   const usernameValue =
        document.getElementById(
            'loginUsernameInput'
        ).value;

    const passwordValue =
        document.getElementById(
            'loginPasswordInput'
        ).value;

    if(appUsers[usernameValue] === passwordValue){

        document
            .getElementById('loginScreen')
            .classList.add('hidden');

        document
            .getElementById('dashboardScreen')
            .classList.remove('hidden');

        loadTasks('weekPending');
    }
    else{

        alert('Invalid Username');

    
}}*/
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

