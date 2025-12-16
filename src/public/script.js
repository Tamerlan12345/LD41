document.addEventListener('DOMContentLoaded', () => {
    // --- Элементы ---
    const loginForm = document.getElementById('login-form');
    const authScreen = document.getElementById('auth-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');

    // Элементы добавления
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskTitleInput = document.getElementById('task-title');
    const taskDeadlineInput = document.getElementById('task-deadline');
    const chkUrgent = document.getElementById('chk-urgent');
    const chkImportant = document.getElementById('chk-important');

    let currentUser = null;

    // Toggle Button Visuals
    function updateToggleVisuals() {
        document.getElementById('toggle-urgent').classList.toggle('active', chkUrgent.checked);
        document.getElementById('toggle-important').classList.toggle('active', chkImportant.checked);
    }
    chkUrgent.addEventListener('change', updateToggleVisuals);
    chkImportant.addEventListener('change', updateToggleVisuals);

    // --- Toast уведомления ---
    function showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // --- Авторизация ---
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                currentUser = data;
                localStorage.setItem('user', JSON.stringify(currentUser));
                showDashboard();
            } else {
                showToast(data.error);
            }
        } catch (err) { showToast('Ошибка соединения'); }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        location.reload();
    });

    function showDashboard() {
        authScreen.style.display = 'none';
        dashboardScreen.classList.remove('hidden');
        userDisplay.textContent = currentUser.username;
        loadTasks();
    }

    // --- Логика Задач ---
    addTaskBtn.addEventListener('click', async () => {
        const title = taskTitleInput.value;
        const deadline = taskDeadlineInput.value;
        const isUrgent = chkUrgent.checked;
        const isImportant = chkImportant.checked;

        if (!title || !deadline) {
            showToast('Введите название и дату');
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
                    is_urgent: isUrgent,
                    is_important: isImportant
                })
            });

            if (res.ok) {
                taskTitleInput.value = '';
                // Сброс чекбоксов
                chkUrgent.checked = false;
                chkImportant.checked = false;
                updateToggleVisuals(); // Update visuals after reset
                loadTasks();
                showToast('Задача добавлена');
            }
        } catch (err) { console.error(err); }
    });

    async function loadTasks() {
        // Очистка
        document.querySelectorAll('.task-list').forEach(el => el.innerHTML = '');

        const res = await fetch(`/api/tasks?user_id=${currentUser.id}`);
        const tasks = await res.json();

        tasks.forEach(task => {
            // Определение квадранта на клиенте для распределения
            let qId = 'q4'; // Default
            if (task.is_important && task.is_urgent) qId = 'q1';
            else if (task.is_important && !task.is_urgent) qId = 'q2';
            else if (!task.is_important && task.is_urgent) qId = 'q3';

            const container = document.querySelector(`#${qId} .task-list`);
            container.appendChild(createTaskElement(task));
        });
    }

    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item';

        const dateStr = new Date(task.deadline).toLocaleString('ru-RU', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        div.innerHTML = `
            <div class="task-top">
                <span class="task-title">${task.title}</span>
            </div>
            <div class="task-date">
                <span class="material-icons-round">schedule</span> ${dateStr}
            </div>
            <div class="task-actions">
                <button class="icon-btn done" title="Выполнено" onclick="completeTask(${task.id})">
                    <span class="material-icons-round">check_circle</span>
                </button>
                <button class="icon-btn delete" title="Удалить" onclick="deleteTask(${task.id})">
                    <span class="material-icons-round">delete</span>
                </button>
            </div>
        `;
        return div;
    }

    // Глобальные функции для кнопок в HTML string
    window.deleteTask = async (id) => {
        if(!confirm('Удалить задачу?')) return;
        try {
            await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            loadTasks();
        } catch(e) { showToast('Ошибка удаления'); }
    };

    window.completeTask = async (id) => {
        try {
            await fetch(`/api/tasks/${id}/complete`, { method: 'PATCH' });
            showToast('Задача выполнена!');
            loadTasks();
        } catch(e) { showToast('Ошибка'); }
    };
});
