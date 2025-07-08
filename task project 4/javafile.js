const title     = document.getElementById('title'),
      taskTime  = document.getElementById('task-time'),
      category  = document.getElementById('category'),
      addBtn    = document.getElementById('add'),
      clearBtn  = document.getElementById('clear'),
      list      = document.getElementById('list'),
      total     = document.getElementById('total'),
      done      = document.getElementById('done'),
      percent   = document.getElementById('percent'),
      progressBar = document.getElementById('progress-bar'),
      dayPicker = document.getElementById('day-picker'),
      newCategory = document.getElementById('new-category'),
      addCategoryBtn = document.getElementById('add-category'),
      reminderSound = document.getElementById('reminder-sound');

// Persistent storage keys
const TASKS_KEY = 'todo_tasks_by_day_v2';
const CATS_KEY = 'todo_categories_v2';

// Load or initialize tasks and categories
let tasksByDay = JSON.parse(localStorage.getItem(TASKS_KEY) || '{}');
let customCategories = JSON.parse(localStorage.getItem(CATS_KEY) || '["Work","Home","Personal"]');

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasksByDay));
}
function saveCategories() {
  localStorage.setItem(CATS_KEY, JSON.stringify(customCategories));
}

function getSelectedDay() {
  return dayPicker.value || new Date().toISOString().slice(0, 10);
}
function getTasks() {
  const day = getSelectedDay();
  if (!tasksByDay[day]) tasksByDay[day] = [];
  return tasksByDay[day];
}

function updateCategoryOptions() {
  category.innerHTML = '<option value="" disabled selected>Choose Category</option>';
  customCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    category.appendChild(opt);
  });
}

function updateStats() {
  const tasks = getTasks();
  const totalCount = tasks.length;
  const doneCount = tasks.filter(t => t.done).length;
  total.textContent = totalCount;
  done.textContent = doneCount;
  const percentValue = totalCount ? Math.round(doneCount / totalCount * 100) : 0;
  percent.textContent = percentValue + '%';
  progressBar.style.width = percentValue + '%';
}

function render() {
  updateCategoryOptions();
  const tasks = getTasks();
  list.innerHTML = '';
  tasks.forEach((task, idx) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' completed' : '');

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';

    // Checkbox for completion
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!task.done;
    checkbox.style.marginRight = '0.7rem';
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      saveTasks();
      render();
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    if (task.done) titleSpan.style.textDecoration = 'line-through';
    titleSpan.style.cursor = 'pointer';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'task-date';
    timeSpan.textContent = task.time;

    const catSpan = document.createElement('span');
    catSpan.className = 'task-category';
    catSpan.textContent = task.category;

    left.appendChild(checkbox);
    left.appendChild(titleSpan);
    left.appendChild(timeSpan);
    left.appendChild(catSpan);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove task';
    removeBtn.addEventListener('click', () => {
      tasks.splice(idx, 1);
      saveTasks();
      render();
    });

    actions.appendChild(removeBtn);

    li.appendChild(left);
    li.appendChild(actions);
    list.appendChild(li);
  });
  updateStats();
}

addBtn.addEventListener('click', () => {
  if (!title.value || !taskTime.value || !category.value) {
    alert('Please fill out all fields.');
    return;
  }
  const tasks = getTasks();
  tasks.push({ title: title.value, time: taskTime.value, category: category.value, done: false, reminded: false });
  saveTasks();
  title.value = taskTime.value = '';
  category.selectedIndex = 0;
  render();
});

clearBtn.addEventListener('click', () => {
  const day = getSelectedDay();
  if (getTasks().length && confirm('Clear all tasks for this day?')) {
    tasksByDay[day] = [];
    saveTasks();
    render();
  }
});

[title, taskTime, category].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); })
);

dayPicker.addEventListener('change', render);

// Set default day to today
if (!dayPicker.value) {
  dayPicker.value = new Date().toISOString().slice(0, 10);
}

// Add custom category
addCategoryBtn.addEventListener('click', () => {
  const val = newCategory.value.trim();
  if (val && !customCategories.includes(val)) {
    customCategories.push(val);
    saveCategories();
    updateCategoryOptions();
    newCategory.value = '';
  }
});

// Notification and reminder logic
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
requestNotificationPermission();

function showReminder(task) {
  // Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Task Reminder', {
      body: `${task.title} (${task.time}) - ${task.category}`,
      icon: 'https://img.icons8.com/color/96/000000/todo-list--v2.png'
    });
  } else {
    alert(`Reminder: ${task.title} (${task.time}) - ${task.category}`);
  }
  // Play sound
  if (reminderSound) {
    reminderSound.currentTime = 0;
    reminderSound.play();
  }
}

function checkReminders() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tasks = tasksByDay[today] || [];
  tasks.forEach(task => {
    if (task.done || task.reminded) return;
    if (!task.time) return;
    // Reminder 5 minutes before
    const [hh, mm] = task.time.split(':');
    const taskDate = new Date(today + 'T' + hh + ':' + mm + ':00');
    const diff = (taskDate - now) / 60000; // in minutes
    if (diff <= 5 && diff > 4) { // between 5 and 4 minutes before
      showReminder(task);
      task.reminded = true;
      saveTasks();
    }
  });
}
setInterval(checkReminders, 60000); // check every minute

render();