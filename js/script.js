/* =========================================================================
   DAYLIGHT — Soft Pastel Productivity Life Dashboard
   Application Logic
   ========================================================================= */

(function () {
    'use strict';

    /* -----------------------------------------------------------------------
       Local Storage Keys
       ----------------------------------------------------------------------- */
    var STORAGE_KEYS = {
        TASKS: 'daylight_tasks',
        LINKS: 'daylight_links',
        USERNAME: 'daylight_username',
        THEME: 'daylight_theme',
        DURATION: 'daylight_duration',
        SORT: 'daylight_sort'
    };

    /* -----------------------------------------------------------------------
       State
       ----------------------------------------------------------------------- */
    var state = {
        tasks: [],
        links: [],
        username: '',
        theme: 'light',
        duration: 25,       // minutes
        sortMode: 'default',
        // Timer state
        timerRunning: false,
        timerPaused: false,
        timerInterval: null,
        timerEnd: 0,        // timestamp (ms) when timer should complete
        timerRemaining: 0,   // seconds remaining (used for pause / reset)
        timerTotal: 0        // total seconds for current session (for progress)
    };

    /* -----------------------------------------------------------------------
       Utilities
       ----------------------------------------------------------------------- */

    /** Safely read and JSON-parse a value from Local Storage. */
    function loadJSON(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (raw === null) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Daylight: failed to parse "' + key + '", using fallback.', e);
            return fallback;
        }
    }

    /** Safely write a JSON-serialisable value to Local Storage. */
    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Daylight: failed to save "' + key + '".', e);
            showToast('Could not save data. Storage may be full.', 'error');
        }
    }

    /** Read a simple string value from Local Storage. */
    function loadString(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw === null ? fallback : raw;
        } catch (e) {
            return fallback;
        }
    }

    /** Write a simple string value to Local Storage. */
    function saveString(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Daylight: failed to save "' + key + '".', e);
        }
    }

    /** Escape HTML to prevent injection when building strings. */
    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /** Pad a number to two digits. */
    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    /** Generate a unique-ish ID. */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    /** Validate a URL (http/https). */
    function isValidURL(url) {
        try {
            var parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    /* -----------------------------------------------------------------------
       Toast Notifications
       ----------------------------------------------------------------------- */
    var toastContainer = document.getElementById('toastContainer');

    function showToast(message, type) {
        type = type || 'info';
        var toast = document.createElement('div');
        toast.className = 'toast toast--' + type;

        var iconHTML = '';
        if (type === 'success') {
            iconHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        } else if (type === 'error') {
            iconHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        } else {
            iconHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
        }

        toast.innerHTML =
            '<span class="toast__icon">' + iconHTML + '</span>' +
            '<span>' + escapeHTML(message) + '</span>';

        toastContainer.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('removing');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3200);
    }

    /* -----------------------------------------------------------------------
       Navigation
       ----------------------------------------------------------------------- */
    var navItems = document.querySelectorAll('.nav-item');
    var sections = document.querySelectorAll('.section');
    var navToggle = document.getElementById('navToggle');
    var sidebar = document.getElementById('sidebar');
    var sidebarOverlay = document.getElementById('sidebarOverlay');

    function switchSection(sectionId) {
        // Update nav active state
        navItems.forEach(function (item) {
            item.classList.toggle('active', item.dataset.section === sectionId);
            if (item.dataset.section === sectionId) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });

        // Show section
        sections.forEach(function (sec) {
            sec.classList.toggle('active', sec.id === sectionId);
        });

        // Close mobile sidebar
        closeSidebar();

        // Scroll to top of main content
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Refresh relevant displays when entering a section
        if (sectionId === 'settings') {
            syncSettingsUI();
        }
        if (sectionId === 'dashboard') {
            renderDashboardWidgets();
        }
    }

    navItems.forEach(function (item) {
        item.addEventListener('click', function () {
            switchSection(item.dataset.section);
        });
    });

    // Widgets / buttons that navigate to a section
    document.querySelectorAll('[data-nav]').forEach(function (el) {
        el.addEventListener('click', function () {
            switchSection(el.dataset.nav);
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchSection(el.dataset.nav);
            }
        });
    });

    // Settings shortcut in header
    var settingsShortcut = document.getElementById('settingsShortcut');
    if (settingsShortcut) {
        settingsShortcut.addEventListener('click', function () {
            switchSection('settings');
        });
    }

    // Mobile sidebar toggle
    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        navToggle.classList.add('active');
        navToggle.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
    }

    navToggle.addEventListener('click', function () {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarOverlay.addEventListener('click', closeSidebar);

    /* -----------------------------------------------------------------------
       Clock & Greeting
       ----------------------------------------------------------------------- */
    var clockTime = document.getElementById('clockTime');
    var clockDate = document.getElementById('clockDate');
    var headerDate = document.getElementById('headerDate');
    var headerGreeting = document.getElementById('headerGreeting');
    var greetingText = document.getElementById('greetingText');
    var greetingName = document.getElementById('greetingName');
    var greetingMessage = document.getElementById('greetingMessage');

    var motivationalMessages = {
        'morning': 'A fresh start awaits. Make it count.',
        'afternoon': 'Keep the momentum going.',
        'evening': 'Time to wind down and reflect.',
        'night': 'Rest well — tomorrow is a new page.'
    };

    function getGreeting(date) {
        var h = date.getHours();
        if (h >= 5 && h < 12) return 'Good Morning';
        if (h >= 12 && h < 18) return 'Good Afternoon';
        if (h >= 18 && h < 22) return 'Good Evening';
        return 'Good Night';
    }

    function getGreetingKey(date) {
        var h = date.getHours();
        if (h >= 5 && h < 12) return 'morning';
        if (h >= 12 && h < 18) return 'afternoon';
        if (h >= 18 && h < 22) return 'evening';
        return 'night';
    }

    function formatDate(date, includeYear) {
        var options = { weekday: 'long', month: 'long', day: 'numeric' };
        if (includeYear) options.year = 'numeric';
        return date.toLocaleDateString(undefined, options);
    }

    function updateClock() {
        var now = new Date();
        var timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
        var dateStr = formatDate(now);
        var greeting = getGreeting(now);
        var greetingKey = getGreetingKey(now);

        if (clockTime) clockTime.textContent = timeStr;
        if (clockDate) clockDate.textContent = dateStr;
        if (headerDate) headerDate.textContent = dateStr;
        if (headerGreeting) headerGreeting.textContent = greeting + (state.username ? ', ' + state.username : '');
        if (greetingText) greetingText.textContent = greeting;

        // Name line
        if (greetingName) {
            greetingName.textContent = state.username ? state.username : 'Welcome back';
        }

        // Motivational message
        if (greetingMessage) {
            greetingMessage.textContent = motivationalMessages[greetingKey] || 'A little progress, every day.';
        }
    }

    /* -----------------------------------------------------------------------
       Username / Profile
       ----------------------------------------------------------------------- */
    var usernameInput = document.getElementById('usernameInput');
    var saveUsernameBtn = document.getElementById('saveUsernameBtn');
    var sidebarAvatar = document.getElementById('sidebarAvatar');
    var sidebarProfileName = document.getElementById('sidebarProfileName');
    var headerAvatar = document.getElementById('headerAvatar');

    function getInitial(name) {
        if (!name) return 'U';
        var trimmed = name.trim();
        if (!trimmed) return 'U';
        return trimmed.charAt(0).toUpperCase();
    }

    function updateProfileUI() {
        var display = state.username || 'User';
        var initial = getInitial(state.username);

        if (sidebarAvatar) sidebarAvatar.textContent = initial;
        if (sidebarProfileName) sidebarProfileName.textContent = display;
        if (headerAvatar) headerAvatar.textContent = initial;
    }

    function saveUsername() {
        var name = (usernameInput ? usernameInput.value : '').trim();
        if (!name) {
            showToast('Please enter a name.', 'error');
            return;
        }
        state.username = name;
        saveString(STORAGE_KEYS.USERNAME, name);
        updateProfileUI();
        updateClock();
        showToast('Name saved. Hi, ' + name + '!', 'success');
    }

    if (saveUsernameBtn) saveUsernameBtn.addEventListener('click', saveUsername);
    if (usernameInput) {
        usernameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') saveUsername();
        });
    }

    /* -----------------------------------------------------------------------
       Theme Toggle
       ----------------------------------------------------------------------- */
    var themeToggle = document.getElementById('themeToggle');
    var themeOptions = document.querySelectorAll('.theme-option');

    function applyTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        saveString(STORAGE_KEYS.THEME, theme);

        // Update theme option buttons
        themeOptions.forEach(function (opt) {
            opt.classList.toggle('active', opt.dataset.themeChoice === theme);
        });
    }

    function toggleTheme() {
        applyTheme(state.theme === 'light' ? 'dark' : 'light');
        showToast(state.theme === 'dark' ? 'Dark mode on' : 'Light mode on', 'info');
    }

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    themeOptions.forEach(function (opt) {
        opt.addEventListener('click', function () {
            applyTheme(opt.dataset.themeChoice);
        });
    });

    /* -----------------------------------------------------------------------
       Tasks
       ----------------------------------------------------------------------- */
    var taskInput = document.getElementById('taskInput');
    var addTaskBtn = document.getElementById('addTaskBtn');
    var taskList = document.getElementById('taskList');
    var taskEmptyState = document.getElementById('taskEmptyState');
    var sortSelect = document.getElementById('sortSelect');

    var statTotal = document.getElementById('statTotal');
    var statCompleted = document.getElementById('statCompleted');
    var statRemaining = document.getElementById('statRemaining');
    var taskProgressBar = document.getElementById('taskProgressBar');
    var taskProgressText = document.getElementById('taskProgressText');

    var widgetTaskRemaining = document.getElementById('widgetTaskRemaining');
    var widgetTaskProgress = document.getElementById('widgetTaskProgress');
    var widgetTaskProgressText = document.getElementById('widgetTaskProgressText');
    var widgetLinkCount = document.getElementById('widgetLinkCount');
    var quickAccessGrid = document.getElementById('quickAccessGrid');
    var quickAccessEmpty = document.getElementById('quickAccessEmpty');
    var miniTaskList = document.getElementById('miniTaskList');

    /** Normalise a task name for duplicate comparison. */
    function normaliseTaskName(name) {
        return name.trim().toLowerCase();
    }

    /** Check if a task name already exists (case-insensitive, trimmed). */
    function isDuplicateTask(name, excludeId) {
        var normalised = normaliseTaskName(name);
        return state.tasks.some(function (t) {
            return t.id !== excludeId && normaliseTaskName(t.text) === normalised;
        });
    }

    /** Add a new task. */
    function addTask() {
        var text = (taskInput ? taskInput.value : '').trim();
        if (!text) {
            showToast('Task cannot be empty.', 'error');
            return;
        }
        if (isDuplicateTask(text)) {
            showToast('That task already exists.', 'error');
            return;
        }

        var task = {
            id: generateId(),
            text: text,
            completed: false,
            createdAt: Date.now()
        };

        state.tasks.push(task);
        saveJSON(STORAGE_KEYS.TASKS, state.tasks);
        if (taskInput) taskInput.value = '';
        renderTasks();
        renderDashboardWidgets();
        showToast('Task added.', 'success');
    }

    /** Toggle completion. */
    function toggleTask(id) {
        var task = state.tasks.find(function (t) { return t.id === id; });
        if (!task) return;
        task.completed = !task.completed;
        if (task.completed) task.completedAt = Date.now();
        else delete task.completedAt;
        saveJSON(STORAGE_KEYS.TASKS, state.tasks);
        renderTasks();
        renderDashboardWidgets();
    }

    /** Delete a task with confirmation. */
    function deleteTask(id) {
        var task = state.tasks.find(function (t) { return t.id === id; });
        if (!task) return;
        if (!confirm('Delete this task?\n\n"' + task.text + '"')) return;
        state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
        saveJSON(STORAGE_KEYS.TASKS, state.tasks);
        renderTasks();
        renderDashboardWidgets();
        showToast('Task deleted.', 'info');
    }

    /** Start inline editing of a task. */
    function startEditTask(id) {
        var li = taskList.querySelector('[data-id="' + id + '"]');
        if (!li) return;
        var task = state.tasks.find(function (t) { return t.id === id; });
        if (!task) return;

        var textEl = li.querySelector('.task-text');
        if (!textEl) return;

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-edit-input';
        input.value = task.text;
        input.maxLength = 200;

        textEl.replaceWith(input);
        input.focus();
        input.select();

        function commitEdit() {
            var newText = input.value.trim();
            if (!newText) {
                // Cancel — restore original
                restoreText();
                showToast('Task cannot be empty.', 'error');
                return;
            }
            if (normaliseTaskName(newText) !== normaliseTaskName(task.text) && isDuplicateTask(newText, id)) {
                restoreText();
                showToast('That task already exists.', 'error');
                return;
            }
            task.text = newText;
            saveJSON(STORAGE_KEYS.TASKS, state.tasks);
            renderTasks();
            renderDashboardWidgets();
            showToast('Task updated.', 'success');
        }

        function restoreText() {
            var span = document.createElement('span');
            span.className = 'task-text';
            if (task.completed) span.classList.add('done');
            span.textContent = task.text;
            span.addEventListener('dblclick', function () { startEditTask(id); });
            if (input.parentNode) input.replaceWith(span);
        }

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                restoreText();
            }
        });

        input.addEventListener('blur', function () {
            // Small delay so click events on buttons register first
            setTimeout(commitEdit, 150);
        });
    }

    /** Sort tasks based on current sort mode. Returns a new array. */
    function getSortedTasks() {
        var sorted = state.tasks.slice();

        switch (state.sortMode) {
            case 'az':
                sorted.sort(function (a, b) {
                    return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
                });
                break;
            case 'za':
                sorted.sort(function (a, b) {
                    return b.text.toLowerCase().localeCompare(a.text.toLowerCase());
                });
                break;
            case 'pending':
                sorted.sort(function (a, b) {
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    return a.createdAt - b.createdAt;
                });
                break;
            case 'completed':
                sorted.sort(function (a, b) {
                    if (a.completed !== b.completed) return a.completed ? -1 : 1;
                    return a.createdAt - b.createdAt;
                });
                break;
            default:
                // Default: by creation order
                sorted.sort(function (a, b) { return a.createdAt - b.createdAt; });
                break;
        }

        return sorted;
    }

    /** Render the task list and stats. */
    function renderTasks() {
        if (!taskList) return;

        var sorted = getSortedTasks();
        var total = state.tasks.length;
        var completed = state.tasks.filter(function (t) { return t.completed; }).length;
        var remaining = total - completed;
        var pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Stats
        if (statTotal) statTotal.textContent = total;
        if (statCompleted) statCompleted.textContent = completed;
        if (statRemaining) statRemaining.textContent = remaining;
        if (taskProgressBar) taskProgressBar.style.width = pct + '%';
        if (taskProgressText) taskProgressText.textContent = pct + '%';

        // Empty state
        if (taskEmptyState) taskEmptyState.classList.toggle('visible', total === 0);
        if (taskList) taskList.style.display = total === 0 ? 'none' : 'flex';

        // Build list
        taskList.innerHTML = '';

        sorted.forEach(function (task) {
            var li = document.createElement('li');
            li.className = 'task-item' + (task.completed ? ' completed' : '');
            li.dataset.id = task.id;

            var checkEl = document.createElement('div');
            checkEl.className = 'task-check';
            checkEl.setAttribute('role', 'checkbox');
            checkEl.setAttribute('aria-checked', task.completed ? 'true' : 'false');
            checkEl.setAttribute('tabindex', '0');
            checkEl.addEventListener('click', function () { toggleTask(task.id); });
            checkEl.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTask(task.id);
                }
            });

            var textEl = document.createElement('span');
            textEl.className = 'task-text' + (task.completed ? ' done' : '');
            textEl.textContent = task.text;
            textEl.title = 'Double-click to edit';
            textEl.addEventListener('dblclick', function () { startEditTask(task.id); });

            var actionsEl = document.createElement('div');
            actionsEl.className = 'task-actions';

            // Edit button
            var editBtn = document.createElement('button');
            editBtn.className = 'task-action-btn';
            editBtn.setAttribute('aria-label', 'Edit task');
            editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                startEditTask(task.id);
            });
            actionsEl.appendChild(editBtn);

            // Delete button
            var delBtn = document.createElement('button');
            delBtn.className = 'task-action-btn task-action-btn--delete';
            delBtn.setAttribute('aria-label', 'Delete task');
            delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
            delBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                deleteTask(task.id);
            });
            actionsEl.appendChild(delBtn);

            li.appendChild(checkEl);
            li.appendChild(textEl);
            li.appendChild(actionsEl);

            taskList.appendChild(li);
        });
    }

    if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);
    if (taskInput) {
        taskInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') addTask();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            state.sortMode = sortSelect.value;
            saveString(STORAGE_KEYS.SORT, state.sortMode);
            renderTasks();
        });
    }

    /* -----------------------------------------------------------------------
       Dashboard Widgets
       ----------------------------------------------------------------------- */
    function renderDashboardWidgets() {
        var total = state.tasks.length;
        var completed = state.tasks.filter(function (t) { return t.completed; }).length;
        var remaining = total - completed;
        var pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (widgetTaskRemaining) widgetTaskRemaining.textContent = remaining;
        if (widgetTaskProgress) widgetTaskProgress.style.width = pct + '%';
        if (widgetTaskProgressText) widgetTaskProgressText.textContent = completed + ' / ' + total + ' done';

        // Quick links count widget
        if (widgetLinkCount) widgetLinkCount.textContent = state.links.length;

        // Mini task list (show up to 5)
        if (miniTaskList) {
            if (total === 0) {
                miniTaskList.innerHTML = '<p class="empty-mini">No tasks yet. Add one to get started.</p>';
            } else {
                var sorted = getSortedTasks().slice(0, 5);
                miniTaskList.innerHTML = '';
                sorted.forEach(function (task) {
                    var item = document.createElement('div');
                    item.className = 'mini-task';

                    var check = document.createElement('span');
                    check.className = 'mini-task__check' + (task.completed ? ' done' : '');

                    var text = document.createElement('span');
                    text.className = 'mini-task__text' + (task.completed ? ' done' : '');
                    text.textContent = task.text;

                    item.appendChild(check);
                    item.appendChild(text);
                    miniTaskList.appendChild(item);
                });
            }
        }

        // Timer widget
        updateTimerWidget();

        // Quick access shortcuts
        renderQuickAccess();
    }

    /** Render the quick access shortcut cards on the dashboard. */
    function renderQuickAccess() {
        if (!quickAccessGrid) return;
        quickAccessGrid.innerHTML = '';

        var total = state.links.length;

        // Toggle empty state visibility
        if (quickAccessEmpty) quickAccessEmpty.classList.toggle('visible', total === 0);
        quickAccessGrid.style.display = total === 0 ? 'none' : 'grid';

        state.links.forEach(function (link) {
            var card = document.createElement('a');
            card.className = 'quick-access-card';
            card.href = link.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';

            var icon = document.createElement('div');
            icon.className = 'quick-access-card__icon';
            icon.textContent = link.name.charAt(0).toUpperCase();

            var info = document.createElement('div');
            info.className = 'quick-access-card__info';

            var nameEl = document.createElement('span');
            nameEl.className = 'quick-access-card__name';
            nameEl.textContent = link.name;

            var urlEl = document.createElement('span');
            urlEl.className = 'quick-access-card__domain';
            try {
                urlEl.textContent = new URL(link.url).hostname;
            } catch (e) {
                urlEl.textContent = link.url;
            }

            info.appendChild(nameEl);
            info.appendChild(urlEl);
            card.appendChild(icon);
            card.appendChild(info);
            quickAccessGrid.appendChild(card);
        });
    }

    /* -----------------------------------------------------------------------
       Focus Timer (Pomodoro)
       -----------------------------------------------------------------------
       Uses wall-clock timestamps to avoid drift. The interval only updates
       the display; the remaining time is always derived from Date.now().
       ----------------------------------------------------------------------- */
    var timerDisplay = document.getElementById('timerDisplay');
    var timerStatus = document.getElementById('timerStatus');
    var timerRingProgress = document.getElementById('timerRingProgress');
    var timerStartBtn = document.getElementById('timerStartBtn');
    var timerPauseBtn = document.getElementById('timerPauseBtn');
    var timerResetBtn = document.getElementById('timerResetBtn');
    var durationInput = document.getElementById('durationInput');
    var applyDurationBtn = document.getElementById('applyDurationBtn');
    var settingsDurationInput = document.getElementById('settingsDurationInput');
    var saveDurationBtn = document.getElementById('saveDurationBtn');
    var widgetTimerDisplay = document.getElementById('widgetTimerDisplay');
    var widgetTimerStatus = document.getElementById('widgetTimerStatus');

    // SVG circle circumference: r = 108 → 2 * π * 108 ≈ 678.58
    var RING_CIRCUMFERENCE = 2 * Math.PI * 108;

    function secondsToDisplay(seconds) {
        seconds = Math.max(0, Math.floor(seconds));
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return pad(m) + ':' + pad(s);
    }

    /** Set the ring progress (0–100%). */
    function setRingProgress(pct) {
        if (!timerRingProgress) return;
        var offset = RING_CIRCUMFERENCE * (1 - pct / 100);
        timerRingProgress.style.strokeDashoffset = offset;
    }

    /** Compute remaining seconds from state. */
    function getRemainingSeconds() {
        if (state.timerRunning && !state.timerPaused) {
            return Math.max(0, Math.round((state.timerEnd - Date.now()) / 1000));
        }
        return state.timerRemaining;
    }

    /** Update the timer display + ring. */
    function updateTimerDisplay() {
        var remaining = getRemainingSeconds();
        var display = secondsToDisplay(remaining);

        if (timerDisplay) timerDisplay.textContent = display;
        if (widgetTimerDisplay) widgetTimerDisplay.textContent = display;

        // Ring progress
        var total = state.timerTotal > 0 ? state.timerTotal : (state.duration * 60);
        var pct = total > 0 ? (1 - remaining / total) * 100 : 0;
        setRingProgress(pct);

        // Check for completion
        if (state.timerRunning && !state.timerPaused && remaining <= 0) {
            onTimerComplete();
        }
    }

    function updateTimerWidget() {
        if (!widgetTimerDisplay || !widgetTimerStatus) return;
        var remaining = getRemainingSeconds();
        widgetTimerDisplay.textContent = secondsToDisplay(remaining);

        if (state.timerRunning && !state.timerPaused) {
            widgetTimerStatus.textContent = 'Focusing…';
        } else if (state.timerPaused) {
            widgetTimerStatus.textContent = 'Paused';
        } else {
            widgetTimerStatus.textContent = 'Ready to focus';
        }
    }

    function setTimerStatusUI(status) {
        if (timerStatus) timerStatus.textContent = status;
        updateTimerWidget();
    }

    function startTimer() {
        // Prevent multiple simultaneous intervals
        if (state.timerRunning && !state.timerPaused) return;

        if (!state.timerPaused) {
            // Fresh start — set total and remaining
            state.timerTotal = state.duration * 60;
            state.timerRemaining = state.timerTotal;
        }

        // Calculate end timestamp from remaining seconds
        state.timerEnd = Date.now() + state.timerRemaining * 1000;
        state.timerRunning = true;
        state.timerPaused = false;

        // Clear any existing interval (safety)
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
        }

        // Use a display interval — the actual time is derived from timestamps
        state.timerInterval = setInterval(updateTimerDisplay, 250);

        updateTimerDisplay();
        setTimerStatusUI('Focusing…');

        if (timerStartBtn) {
            timerStartBtn.textContent = 'Resume';
            timerStartBtn.disabled = true;
        }
        if (timerPauseBtn) timerPauseBtn.disabled = false;
    }

    function pauseTimer() {
        if (!state.timerRunning || state.timerPaused) return;

        // Capture remaining from wall clock before pausing
        state.timerRemaining = getRemainingSeconds();
        state.timerPaused = true;

        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }

        setTimerStatusUI('Paused');

        if (timerStartBtn) {
            timerStartBtn.textContent = 'Resume';
            timerStartBtn.disabled = false;
        }
    }

    function resetTimer() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        state.timerRunning = false;
        state.timerPaused = false;
        state.timerRemaining = state.duration * 60;
        state.timerTotal = state.duration * 60;
        state.timerEnd = 0;

        if (timerDisplay) timerDisplay.textContent = secondsToDisplay(state.timerRemaining);
        if (widgetTimerDisplay) widgetTimerDisplay.textContent = secondsToDisplay(state.timerRemaining);
        setRingProgress(0);
        setTimerStatusUI('Ready to start');

        if (timerStartBtn) {
            timerStartBtn.textContent = 'Start';
            timerStartBtn.disabled = false;
        }
        if (timerPauseBtn) timerPauseBtn.disabled = true;
    }

    function onTimerComplete() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        state.timerRunning = false;
        state.timerPaused = false;
        state.timerRemaining = 0;

        if (timerDisplay) timerDisplay.textContent = '00:00';
        if (widgetTimerDisplay) widgetTimerDisplay.textContent = '00:00';
        setRingProgress(100);
        setTimerStatusUI('Session complete!');

        if (timerStartBtn) {
            timerStartBtn.textContent = 'Start';
            timerStartBtn.disabled = false;
        }
        if (timerPauseBtn) timerPauseBtn.disabled = true;

        showToast('Focus session complete. Take a break!', 'success');

        // Browser notification (if permitted)
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('Daylight — Focus Complete', {
                    body: 'Your ' + state.duration + '-minute session is done. Nice work!'
                });
            } catch (e) { /* ignore */ }
        }

        // Reset to full duration for next session
        state.timerRemaining = state.duration * 60;
        state.timerTotal = state.duration * 60;

        // After a brief moment, reset the ring for a fresh session
        setTimeout(function () {
            if (!state.timerRunning) {
                setRingProgress(0);
                setTimerStatusUI('Ready to start');
                if (timerDisplay) timerDisplay.textContent = secondsToDisplay(state.timerRemaining);
                if (widgetTimerDisplay) widgetTimerDisplay.textContent = secondsToDisplay(state.timerRemaining);
            }
        }, 2000);
    }

    function applyDuration(minutes, fromSettings) {
        minutes = parseInt(minutes, 10);
        if (isNaN(minutes) || minutes < 1 || minutes > 120) {
            showToast('Duration must be between 1 and 120 minutes.', 'error');
            return false;
        }
        state.duration = minutes;
        saveString(STORAGE_KEYS.DURATION, String(minutes));

        // Sync both inputs
        if (durationInput) durationInput.value = minutes;
        if (settingsDurationInput) settingsDurationInput.value = minutes;

        // Reset timer to new duration (if not running)
        if (!state.timerRunning) {
            resetTimer();
        } else {
            showToast('Duration saved. It will apply on next reset.', 'info');
            return true;
        }

        showToast('Duration set to ' + minutes + ' minutes.', 'success');
        return true;
    }

    if (timerStartBtn) timerStartBtn.addEventListener('click', startTimer);
    if (timerPauseBtn) timerPauseBtn.addEventListener('click', pauseTimer);
    if (timerResetBtn) timerResetBtn.addEventListener('click', resetTimer);

    if (applyDurationBtn) {
        applyDurationBtn.addEventListener('click', function () {
            applyDuration(durationInput.value);
        });
    }
    if (durationInput) {
        durationInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') applyDuration(durationInput.value);
        });
    }

    if (saveDurationBtn) {
        saveDurationBtn.addEventListener('click', function () {
            applyDuration(settingsDurationInput.value, true);
        });
    }
    if (settingsDurationInput) {
        settingsDurationInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') applyDuration(settingsDurationInput.value, true);
        });
    }

    /* -----------------------------------------------------------------------
       Quick Links
       ----------------------------------------------------------------------- */
    var linkNameInput = document.getElementById('linkNameInput');
    var linkUrlInput = document.getElementById('linkUrlInput');
    var addLinkBtn = document.getElementById('addLinkBtn');
    var linksGrid = document.getElementById('linksGrid');
    var linkEmptyState = document.getElementById('linkEmptyState');
    var linkCountLabel = document.getElementById('linkCountLabel');

    function getFaviconURL(url) {
        try {
            var parsed = new URL(url);
            return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(parsed.hostname) + '&sz=64';
        } catch (e) {
            return '';
        }
    }

    function addLink() {
        var name = (linkNameInput ? linkNameInput.value : '').trim();
        var url = (linkUrlInput ? linkUrlInput.value : '').trim();

        if (!name) {
            showToast('Please enter a website name.', 'error');
            return;
        }
        if (!url) {
            showToast('Please enter a website URL.', 'error');
            return;
        }

        // Prepend https:// if user omitted protocol
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        if (!isValidURL(url)) {
            showToast('Please enter a valid URL (http or https).', 'error');
            return;
        }

        var link = {
            id: generateId(),
            name: name,
            url: url
        };

        state.links.push(link);
        saveJSON(STORAGE_KEYS.LINKS, state.links);
        if (linkNameInput) linkNameInput.value = '';
        if (linkUrlInput) linkUrlInput.value = '';
        renderLinks();
        renderDashboardWidgets();
        showToast('Link added.', 'success');
    }

    function deleteLink(id) {
        var link = state.links.find(function (l) { return l.id === id; });
        if (!link) return;
        if (!confirm('Delete this link?\n\n"' + link.name + '"')) return;
        state.links = state.links.filter(function (l) { return l.id !== id; });
        saveJSON(STORAGE_KEYS.LINKS, state.links);
        renderLinks();
        renderDashboardWidgets();
        showToast('Link deleted.', 'info');
    }

    function renderLinks() {
        if (!linksGrid) return;
        linksGrid.innerHTML = '';

        var total = state.links.length;
        if (linkEmptyState) linkEmptyState.classList.toggle('visible', total === 0);
        if (linksGrid) linksGrid.style.display = total === 0 ? 'none' : 'grid';
        if (linkCountLabel) linkCountLabel.textContent = total + (total === 1 ? ' saved' : ' saved');

        state.links.forEach(function (link) {
            var card = document.createElement('a');
            card.className = 'link-card';
            card.href = link.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';

            var icon = document.createElement('div');
            icon.className = 'link-card__icon';
            icon.textContent = link.name.charAt(0).toUpperCase();

            var info = document.createElement('div');
            info.className = 'link-card__info';

            var nameEl = document.createElement('span');
            nameEl.className = 'link-card__name';
            nameEl.textContent = link.name;

            var urlEl = document.createElement('span');
            urlEl.className = 'link-card__url';
            try {
                urlEl.textContent = new URL(link.url).hostname;
            } catch (e) {
                urlEl.textContent = link.url;
            }

            info.appendChild(nameEl);
            info.appendChild(urlEl);

            // Delete button
            var delBtn = document.createElement('button');
            delBtn.className = 'link-delete';
            delBtn.setAttribute('aria-label', 'Delete link');
            delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            delBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                deleteLink(link.id);
            });

            card.appendChild(icon);
            card.appendChild(info);
            card.appendChild(delBtn);
            linksGrid.appendChild(card);
        });
    }

    if (addLinkBtn) addLinkBtn.addEventListener('click', addLink);
    if (linkUrlInput) {
        linkUrlInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') addLink();
        });
    }
    if (linkNameInput) {
        linkNameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') addLink();
        });
    }

    /* -----------------------------------------------------------------------
       Settings — Clear Data
       ----------------------------------------------------------------------- */
    var clearDataBtn = document.getElementById('clearDataBtn');

    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function () {
            if (!confirm('This will permanently delete ALL saved data (tasks, links, name, theme, duration). Continue?')) {
                return;
            }
            // Clear app-specific keys
            Object.values(STORAGE_KEYS).forEach(function (key) {
                try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
            });

            // Reset state
            state.tasks = [];
            state.links = [];
            state.username = '';
            state.duration = 25;
            state.sortMode = 'default';

            // Reset timer
            resetTimer();

            // Re-apply defaults
            applyTheme('light');
            if (sortSelect) sortSelect.value = 'default';
            if (usernameInput) usernameInput.value = '';
            if (durationInput) durationInput.value = '25';
            if (settingsDurationInput) settingsDurationInput.value = '25';

            renderTasks();
            renderLinks();
            renderDashboardWidgets();
            updateProfileUI();
            updateClock();

            showToast('All data cleared.', 'info');
        });
    }

    /** Sync the settings panel inputs with current state. */
    function syncSettingsUI() {
        if (usernameInput) usernameInput.value = state.username;
        if (settingsDurationInput) settingsDurationInput.value = state.duration;
        themeOptions.forEach(function (opt) {
            opt.classList.toggle('active', opt.dataset.themeChoice === state.theme);
        });
    }

    /* -----------------------------------------------------------------------
       Initialisation
       ----------------------------------------------------------------------- */
    function init() {
        // Load persisted data with safe fallbacks
        state.tasks = loadJSON(STORAGE_KEYS.TASKS, []);
        state.links = loadJSON(STORAGE_KEYS.LINKS, []);
        state.username = loadString(STORAGE_KEYS.USERNAME, '');
        state.theme = loadString(STORAGE_KEYS.THEME, 'light');
        state.duration = parseInt(loadString(STORAGE_KEYS.DURATION, '25'), 10);
        state.sortMode = loadString(STORAGE_KEYS.SORT, 'default');

        // Validate duration range
        if (isNaN(state.duration) || state.duration < 1 || state.duration > 120) {
            state.duration = 25;
        }

        // Ensure tasks have required fields
        state.tasks = state.tasks.filter(function (t) {
            return t && typeof t.text === 'string' && typeof t.id !== 'undefined';
        }).map(function (t) {
            return {
                id: t.id || generateId(),
                text: t.text,
                completed: !!t.completed,
                createdAt: t.createdAt || Date.now()
            };
        });

        // Ensure links have required fields
        state.links = state.links.filter(function (l) {
            return l && typeof l.name === 'string' && typeof l.url === 'string';
        }).map(function (l) {
            return {
                id: l.id || generateId(),
                name: l.name,
                url: l.url
            };
        });

        // Apply theme
        applyTheme(state.theme);

        // Set sort dropdown
        if (sortSelect) sortSelect.value = state.sortMode;

        // Set duration inputs
        if (durationInput) durationInput.value = state.duration;
        if (settingsDurationInput) settingsDurationInput.value = state.duration;

        // Set username input
        if (usernameInput) usernameInput.value = state.username;

        // Initialize timer display
        state.timerTotal = state.duration * 60;
        state.timerRemaining = state.duration * 60;
        resetTimer();

        // Render everything
        updateProfileUI();
        updateClock();
        renderTasks();
        renderLinks();
        renderDashboardWidgets();

        // Start clock interval (updates every second)
        setInterval(updateClock, 1000);

        // Request notification permission (non-intrusive)
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't prompt immediately — user can grant later via browser.
            // We'll only attempt when the timer completes.
        }

        // Handle browser resize: close sidebar on desktop width
        function handleResize() {
            if (window.innerWidth > 768) {
                closeSidebar();
            }
        }
        window.addEventListener('resize', handleResize);
    }

    // Run init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
