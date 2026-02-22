const STORAGE_KEY = 'habit-tracker-habits';

const form = document.getElementById('add-form');
const input = document.getElementById('habit-input');
const list = document.getElementById('habit-list');

/* ---------- Helpers ---------- */
function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/* ---------- Storage ---------- */
function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const habits = raw ? JSON.parse(raw) : [];

    // Normalize old habits
    return habits.map(habit => ({
      ...habit,
      completedToday: habit.completedToday ?? habit.completed ?? false,
      lastCompletedDate: habit.lastCompletedDate ?? null,
      streak: habit.streak ?? 0
    }));

  } catch {
    return [];
  }
}

function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

/* ---------- Rendering ---------- */
function renderHabits(habits) {
  list.innerHTML = habits
    .map((habit) => {
      const completedClass = habit.completedToday ? ' completed' : '';

      return `
        <li class="habit-item${completedClass}" data-id="${habit.id}">
          <div class="habit-info">
            <span class="habit-name">${escapeHtml(habit.name)}</span>
            <span class="habit-streak">🔥 ${habit.streak}</span>
          </div>
          <div class="habit-actions">
            <button type="button" class="btn btn-complete">
              ${habit.completedToday ? 'Done' : 'Mark Complete'}
            </button>
            <button type="button" class="btn btn-delete">×</button>
          </div>
        </li>
      `;
    })
    .join('');

  list.querySelectorAll('.habit-item').forEach((el) => {
    const id = el.dataset.id;
    el.querySelector('.btn-complete').addEventListener('click', () => toggleComplete(id));
    el.querySelector('.btn-delete').addEventListener('click', () => deleteHabit(id));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ---------- Actions ---------- */
function toggleComplete(id) {
  const habits = loadHabits();
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;

  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  if (!habit.completedToday) {
    // Increase streak only if completed yesterday
    if (habit.lastCompletedDate === yesterday) {
      habit.streak += 1;
    } else {
      habit.streak = 1;
    }

    habit.completedToday = true;
    habit.lastCompletedDate = today;

  } else {
    habit.completedToday = false;
  }

  saveHabits(habits);
  renderHabits(habits);
}

function deleteHabit(id) {
  const habits = loadHabits().filter((h) => h.id !== id);
  saveHabits(habits);
  renderHabits(habits);
}

function addHabit(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const habits = loadHabits();

  habits.push({
    id: crypto.randomUUID(),
    name: trimmed,
    completedToday: false,
    lastCompletedDate: null,
    streak: 0
  });

  saveHabits(habits);
  renderHabits(habits);

  input.value = '';
  input.focus();
}

/* ---------- Daily Reset On Load ---------- */
function initializeApp() {
  const habits = loadHabits();
  const today = getTodayDate();

  habits.forEach(habit => {
    if (habit.lastCompletedDate !== today) {
      habit.completedToday = false;
    }
  });

  saveHabits(habits);
  renderHabits(habits);
}

/* ---------- Events ---------- */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  addHabit(input.value);
});

function initializeTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  const THEME_KEY = "habit-tracker-theme";

  if (!themeToggle) return;

  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

    themeToggle.textContent = isDark ? "☀️" : "🌙";
  });
}
/* ---------- Start ---------- */
initializeApp();
initializeTheme();