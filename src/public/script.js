let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', addTask);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = usernameInput.value;
    const password = passwordInput.value;
    const errorMsg = document.getElementById('auth-error');

    // Reset error
    if (errorMsg) errorMsg.textContent = '';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            currentUser = await res.json();

            // Switch screens
            document.getElementById('auth-screen').style.display = 'none';
            const dashboard = document.getElementById('dashboard-screen');
            dashboard.classList.remove('hidden');
            dashboard.style.display = 'block';

            // Update header
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) userDisplay.textContent = `Hello, ${currentUser.username}`;

            loadTasks();
        } else {
            const data = await res.json().catch(() => ({}));
            if (errorMsg) errorMsg.textContent = data.error || 'Invalid credentials';
        }
    } catch (err) {
        console.error(err);
        if (errorMsg) errorMsg.textContent = 'Login failed. Please try again.';
    }
}

function logout() {
    currentUser = null;

    // Switch screens
    const dashboard = document.getElementById('dashboard-screen');
    dashboard.style.display = 'none';
    dashboard.classList.add('hidden');

    document.getElementById('auth-screen').style.display = 'flex';

    // Clear inputs
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    // Clear tasks
    document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');
}

async function addTask() {
    if (!currentUser) return;

    const titleInput = document.getElementById('task-title');
    const deadlineInput = document.getElementById('task-deadline');
    const quadrantSelect = document.getElementById('task-quadrant');

    const title = titleInput.value;
    const deadline = deadlineInput.value;
    const quadrantId = parseInt(quadrantSelect.value);

    if (!title || !deadline) {
        alert('Please fill in title and deadline');
        return;
    }

    try {
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
            titleInput.value = '';
            // Optional: clear deadline or keep it for next task
            loadTasks();
        } else {
            alert('Failed to add task');
        }
    } catch (err) {
        console.error(err);
        alert('Error adding task');
    }
}

async function loadTasks() {
    if (!currentUser) return;

    try {
        const res = await fetch(`/api/tasks?user_id=${currentUser.id}`);
        if (!res.ok) return;

        const tasks = await res.json();
        renderTasks(tasks);
    } catch (err) {
        console.error(err);
    }
}

function renderTasks(tasks) {
    const lists = {
        1: document.querySelector('#q1 .task-list'),
        2: document.querySelector('#q2 .task-list'),
        3: document.querySelector('#q3 .task-list'),
        4: document.querySelector('#q4 .task-list')
    };

    // Clear lists
    Object.values(lists).forEach(list => {
        if (list) list.innerHTML = '';
    });

    tasks.forEach(task => {
        let quadrant = task.quadrant_id;
        if (!quadrant) {
             quadrant = getQuadrant(task);
        }

        const list = lists[quadrant];
        if (list) {
            const item = document.createElement('div');
            item.className = 'task-item';

            const deadlineDate = new Date(task.deadline);
            const now = new Date();
            const diffTime = deadlineDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let deadlineText = deadlineDate.toLocaleDateString();

            // Replicate "Urgent in X days" logic for Q2
            if (quadrant === 2) {
                 const daysUntilUrgent = diffDays - 15 > 0 ? diffDays - 15 : 0;
                 deadlineText += ` (Urgent in ${daysUntilUrgent} days)`;
            }

            item.innerHTML = `
                <span>${task.title}</span>
                <span class="task-date">${deadlineText}</span>
            `;

            // Add border color style dynamically if needed, but CSS handles it via parent ID + .task-item
            list.appendChild(item);
        }
    });
}

function getQuadrant(task) {
    if (task.is_important && task.is_urgent) return 1;
    if (task.is_important && !task.is_urgent) return 2;
    if (!task.is_important && task.is_urgent) return 3;
    return 4;
}
