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

    alert('Login Success');

    document
        .getElementById('loginScreen')
        .classList.add('hidden');

    document
        .getElementById('dashboardScreen')
        .classList.remove('hidden');

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

}


// =====================================
// LOAD TASKS
// =====================================

async function loadTasks(filterType){

    console.log("Loading:", filterType);

    const { data, error } =
        await supabaseClient
        .from('maintenance_plan')
        .select('*')
        .order('planned_date');

    if(error){

        console.log(error);

        alert(error.message);

        return;
    }

    console.log(data);

    renderDashboardStats(data);

    const todayDate =
        new Date();

    const currentWeekEndDate =
        new Date(todayDate);

    currentWeekEndDate.setDate(
        todayDate.getDate() +
        (6 - todayDate.getDay())
    );

    let filteredTasks = [];

    // THIS WEEK PENDING
    if(filterType === 'weekPending'){

        filteredTasks =
            data.filter(task => {

                const plannedDate =
                    new Date(task.planned_date);

                return task.status === 'Pending'
                    &&
                    plannedDate <= currentWeekEndDate;
            });
    }

    // ALL PENDING
    else if(filterType === 'allPending'){

        filteredTasks =
            data.filter(task =>
                task.status === 'Pending'
            );
    }

    // ALL TASKS
    else{

        filteredTasks = data;
    }

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

    const taskListContainer =
        document.getElementById(
            'dashboardTaskList'
        );

    taskListContainer.innerHTML = '';

    taskData.forEach(taskItem => {

        const plannedDate =
            new Date(taskItem.planned_date);

        const weekStartDate =
            new Date(plannedDate);

        weekStartDate.setDate(
            plannedDate.getDate() -
            plannedDate.getDay()
        );

        const weekEndDate =
            new Date(weekStartDate);

        weekEndDate.setDate(
            weekStartDate.getDate() + 6
        );

        const weekRangeText =
            weekStartDate.toLocaleDateString()
            +
            ' - '
            +
            weekEndDate.toLocaleDateString();

        taskListContainer.innerHTML += `

        <div class="task-row">

            <!-- LEFT SIDE -->
            <div class="task-row__left">

                <div class="task-row__title">
                    ${taskItem.planid}
                </div>

                <div class="task-row__machine">
                    Machine : ${taskItem.machine_no}
                </div>

            </div>

            <!-- CENTER -->
            <div class="task-row__center">

                <div class="task-row__service">
                    ${taskItem.service_type}
                </div>

                <div class="task-row__week">
                    Week : ${taskItem.year_week}
                </div>

                <div class="task-row__range">
                    ${weekRangeText}
                </div>

            </div>

            <!-- RIGHT -->
            <div class="task-row__right">

                <span class="
                    task-row__badge
                    ${taskItem.status === 'Completed'
                        ? 'task-row__badge--completed'
                        : 'task-row__badge--pending'}
                ">

                    ${taskItem.status}

                </span>

            </div>

        </div>
        `;
    });
}