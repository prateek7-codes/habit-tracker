const STORAGE_KEY = 'habit-tracker-habits';

const form = document.getElementById('add-form');
const input = document.getElementById('habit-input');
const list = document.getElementById('habit-list');

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function renderHabits(habits) {
  list.innerHTML = habits
    .map((habit, index) => {
      const completed = habit.completed ? ' completed' : '';
      return `
        <li class="habit-item${completed}" data-id="${habit.id}">
          <span class="habit-name">${escapeHtml(habit.name)}</span>
          <button type="button" class="btn btn-complete" aria-label="Mark ${habit.completed ? 'incomplete' : 'complete'}">
            ${habit.completed ? 'Done' : 'Mark Complete'}
          </button>
        </li>
      `;
    })
    .join('');

  list.querySelectorAll('.habit-item').forEach((el) => {
    const id = el.dataset.id;
    el.querySelector('.btn-complete').addEventListener('click', () => toggleComplete(id));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleComplete(id) {
  const habits = loadHabits();
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;
  habit.completed = !habit.completed;
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
    completed: false,
  });
  saveHabits(habits);
  renderHabits(habits);
  input.value = '';
  input.focus();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  addHabit(input.value);
});

renderHabits(loadHabits());
