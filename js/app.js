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

function loginUser(){

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

    }
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

        <div class="task-card">

            <div class="task-card__top">

                <div>

                    <h3 class="task-card__title">
                        ${taskItem.planid}
                    </h3>

                    <p class="task-card__machine">
                        Machine :
                        ${taskItem.machine_no}
                    </p>

                </div>

                <span class="
                    task-card__badge
                    ${taskItem.status === 'Completed'
                        ? 'task-card__badge--completed'
                        : 'task-card__badge--pending'}
                ">

                    ${taskItem.status}

                </span>

            </div>

            <div class="task-card__details">

                <div class="task-card__detail-box">

                    <label>Service</label>

                    <p>
                        ${taskItem.service_type}
                    </p>

                </div>

                <div class="task-card__detail-box">

                    <label>Week</label>

                    <p>
                        ${taskItem.year_week}
                    </p>

                </div>

                <div class="task-card__detail-box">

                    <label>Week Range</label>

                    <p>
                        ${weekRangeText}
                    </p>

                </div>

            </div>

        </div>
        `;
    });
}