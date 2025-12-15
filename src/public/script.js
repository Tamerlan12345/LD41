let currentUser = null;

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (res.ok) {
        currentUser = await res.json();
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        loadTasks();
    } else {
        alert('Login failed');
    }
}

async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (res.ok) {
        alert('Registered successfully! Now login.');
    } else {
        const data = await res.json();
        alert('Registration failed: ' + data.error);
    }
}

function logout() {
    currentUser = null;
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
}

async function addTask(quadrantId) {
    if (!currentUser) return;

    const title = document.getElementById('new-task-title').value;
    const deadline = document.getElementById('new-task-deadline').value;

    if (!title || !deadline) {
        alert('Please fill in title and deadline');
        return;
    }

    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: currentUser.id,
            title,
            deadline,
            selected_quadrant: quadrantId
        })
    });

    if (res.ok) {
        document.getElementById('new-task-title').value = '';
        loadTasks();
    } else {
        alert('Failed to add task');
    }
}

async function loadTasks() {
    if (!currentUser) return;

    const res = await fetch(`/api/tasks?user_id=${currentUser.id}`);
    if (!res.ok) return;

    const tasks = await res.json();
    renderTasks(tasks);
}

function renderTasks(tasks) {
    const lists = {
        1: document.getElementById('list-q1'),
        2: document.getElementById('list-q2'),
        3: document.getElementById('list-q3'),
        4: document.getElementById('list-q4')
    };

    // Clear lists
    for (let i = 1; i <= 4; i++) lists[i].innerHTML = '';

    tasks.forEach(task => {
        const quadrant = getQuadrant(task);
        const card = document.createElement('div');
        card.className = 'task-card';

        const deadlineDate = new Date(task.deadline);
        const now = new Date();
        const diffTime = deadlineDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let deadlineText = deadlineDate.toLocaleDateString();
        if (quadrant === 2) {
             deadlineText += ` (Urgent in ${diffDays - 15 > 0 ? diffDays - 15 : 0} days)`;
        }

        card.innerHTML = `
            <strong>${task.title}</strong>
            <div class="task-meta">Deadline: ${deadlineText}</div>
        `;

        if (lists[quadrant]) {
            lists[quadrant].appendChild(card);
        }
    });
}

function getQuadrant(task) {
    if (task.is_important && task.is_urgent) return 1;
    if (task.is_important && !task.is_urgent) return 2;
    if (!task.is_important && task.is_urgent) return 3;
    return 4;
}
