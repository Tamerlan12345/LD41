document.addEventListener('DOMContentLoaded', () => {
    // Елементы DOM
    const loginForm = document.getElementById('login-form');
    const authScreen = document.getElementById('auth-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskTitleInput = document.getElementById('task-title');
    const taskDeadlineInput = document.getElementById('task-deadline');
    const taskQuadrantSelect = document.getElementById('task-quadrant');

    // Состояние
    let currentUser = null;

    // --- СИСТЕМА УВЕДОМЛЕНИЙ (Toast) ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = type === 'success' ? '✅' : '❌';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

        container.appendChild(toast);

        // Удалить через 3 секунды
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- АВТОРИЗАЦИЯ ---
    // Проверка сохраненной сессии
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('login-btn');

        // UX: Состояние загрузки
        const originalBtnText = btn.innerText;
        btn.innerText = 'Вход...';
        btn.disabled = true;

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
                showToast(`Добро пожаловать, ${currentUser.username}!`);
                showDashboard();
            } else {
                showToast(data.error || 'Ошибка входа', 'error');
            }
        } catch (err) {
            showToast('Ошибка сети. Попробуйте позже.', 'error');
        } finally {
            btn.innerText = originalBtnText;
            btn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        currentUser = null;
        authScreen.style.display = 'flex';
        dashboardScreen.classList.add('hidden');
        showToast('Вы вышли из системы');
    });

    function showDashboard() {
        authScreen.style.display = 'none';
        dashboardScreen.classList.remove('hidden');
        userDisplay.textContent = currentUser.username;
        loadTasks();
    }

    // --- ЗАДАЧИ ---
    addTaskBtn.addEventListener('click', async () => {
        const title = taskTitleInput.value;
        const deadline = taskDeadlineInput.value;
        const quadrant = taskQuadrantSelect.value;

        if (!title || !deadline || !quadrant) {
            showToast('Пожалуйста, заполните все поля', 'error');
            return;
        }

        const btn = addTaskBtn;
        btn.innerText = 'Сохранение...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    title,
                    deadline,
                    selected_quadrant: quadrant
                })
            });

            if (res.ok) {
                showToast('Задача успешно добавлена!');
                // UX: Очистка полей
                taskTitleInput.value = '';
                taskDeadlineInput.value = '';
                taskQuadrantSelect.value = '';
                loadTasks();
            } else {
                showToast('Ошибка при сохранении задачи', 'error');
            }
        } catch (err) {
            showToast('Ошибка сети', 'error');
        } finally {
            btn.innerText = 'Добавить задачу';
            btn.disabled = false;
        }
    });

    async function loadTasks() {
        if (!currentUser) return;

        // Очистка списков
        ['q1', 'q2', 'q3', 'q4'].forEach(id => {
            document.querySelector(`#${id} .task-list`).innerHTML = '';
        });

        try {
            const res = await fetch(`/api/tasks?user_id=${currentUser.id}`);
            const tasks = await res.json();

            tasks.forEach(task => {
                const quadrantId = `q${task.quadrant_id}`;
                const container = document.querySelector(`#${quadrantId} .task-list`);

                if (container) {
                    const el = createTaskElement(task);
                    container.appendChild(el);
                }
            });
        } catch (err) {
            console.error(err);
            showToast('Не удалось загрузить задачи', 'error');
        }
    }

    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item';

        // Форматирование даты на русский
        const dateObj = new Date(task.deadline);
        const dateStr = dateObj.toLocaleString('ru-RU', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        // UX: Проверка срочности (если осталось меньше 24 часов)
        const now = new Date();
        const diffHours = (dateObj - now) / (1000 * 60 * 60);

        // Добавляем пульсацию, если срочно и задача в 1 или 3 квадранте
        if (diffHours < 24 && diffHours > -5 && (task.quadrant_id === 1 || task.quadrant_id === 3)) {
            div.classList.add('urgent-pulse');
        }

        div.innerHTML = `
            <span class="task-title">${task.title}</span>
            <span class="task-date">⏰ ${dateStr}</span>
        `;
        return div;
    }
});
