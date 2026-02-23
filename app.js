import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ---------- Supabase ---------- */
const supabaseUrl = "https://bbvdctpmyhsydnpseuvz.supabase.co";
const supabaseKey = "sb_publishable_l_f9mvxnd2UO2W39UuxrpQ_fQrdOIrT";
const supabase = createClient(supabaseUrl, supabaseKey);

/* ---------- DOM References (Declared only) ---------- */
let form;
let input;
let list;
let emptyState;
let metricActive;
let metricCompleted;

const DEVICE_ID_KEY = 'habit-tracker-device-id';
let stateHabits = [];

/* ---------- Helpers ---------- */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function normalizeHabit(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    name: row.name,
    completedToday: row.completed_today ?? false,
    lastCompletedDate: row.last_completed_date ?? null,
    streak: row.streak ?? 0,
  };
}

function habitToRow(habit) {
  return {
    id: habit.id,
    device_id: habit.deviceId,
    name: habit.name,
    completed_today: habit.completedToday,
    last_completed_date: habit.lastCompletedDate,
    streak: habit.streak,
  };
}

/* ---------- Supabase Storage ---------- */
async function fetchHabits() {
  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map(normalizeHabit);
}

/* ---------- Rendering ---------- */
function renderHabits(habits) {
  stateHabits = habits;
  const hasHabits = habits.length > 0;

  emptyState.classList.toggle('hidden', hasHabits);

  const activeCount = habits.filter(h => !h.completedToday).length;
  const completedCount = habits.filter(h => h.completedToday).length;

  metricActive.textContent = String(activeCount);
  metricCompleted.textContent = String(completedCount);

  if (!hasHabits) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = habits.map(habit => `
    <li class="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80">
      <div>
        <p class="text-sm font-medium dark:text-slate-50">${habit.name}</p>
        <p class="text-xs text-amber-500">🔥 ${habit.streak} day streak</p>
      </div>
      <div class="flex gap-2">
        <button class="complete-btn rounded-full px-3 py-1 text-xs font-semibold border ${habit.completedToday ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white'}">
          ${habit.completedToday ? 'Done' : 'Mark'}
        </button>
        <button class="delete-btn text-rose-500 font-bold px-2">×</button>
      </div>
    </li>
  `).join('');

  list.querySelectorAll('.complete-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => toggleComplete(stateHabits[i].id));
  });

  list.querySelectorAll('.delete-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => deleteHabit(stateHabits[i].id));
  });
}

/* ---------- Actions ---------- */
async function addHabit(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const newHabit = {
    id: crypto.randomUUID(),
    deviceId: getDeviceId(),
    name: trimmed,
    completedToday: false,
    lastCompletedDate: null,
    streak: 0,
  };

  const { error } = await supabase.from('habits').insert(habitToRow(newHabit));
  if (error) console.error(error);

  stateHabits.push(newHabit);
  renderHabits(stateHabits);
  input.value = '';
}

async function toggleComplete(id) {
  const habit = stateHabits.find(h => h.id === id);
  if (!habit) return;

  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  if (!habit.completedToday) {
    habit.streak = habit.lastCompletedDate === yesterday ? habit.streak + 1 : 1;
    habit.completedToday = true;
    habit.lastCompletedDate = today;
  } else {
    habit.completedToday = false;
  }

  await supabase.from('habits')
    .update({
      completed_today: habit.completedToday,
      last_completed_date: habit.lastCompletedDate,
      streak: habit.streak
    })
    .eq('id', habit.id);

  renderHabits([...stateHabits]);
}

async function deleteHabit(id) {
  await supabase.from('habits').delete().eq('id', id);
  stateHabits = stateHabits.filter(h => h.id !== id);
  renderHabits(stateHabits);
}

/* ---------- Theme ---------- */
function initializeTheme() {
  const toggle = document.getElementById('theme-toggle');
  const thumb = document.getElementById('theme-thumb');
  const key = 'habit-tracker-theme';

  const saved = localStorage.getItem(key);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const startDark = saved ? saved === 'dark' : prefersDark;
  setDark(startDark);

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const next = !isDark;
    setDark(next);
    localStorage.setItem(key, next ? 'dark' : 'light');
  });

  function setDark(enable) {
    document.documentElement.classList.toggle('dark', enable);
    if (thumb) {
      thumb.classList.toggle('translate-x-5', enable);
      thumb.textContent = enable ? '☾' : '☀';
    }
  }
}

/* ---------- Initialize ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  form = document.getElementById('add-form');
  input = document.getElementById('habit-input');
  list = document.getElementById('habit-list');
  emptyState = document.getElementById('empty-state');
  metricActive = document.getElementById('metric-active');
  metricCompleted = document.getElementById('metric-completed');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addHabit(input.value);
  });

  const habits = await fetchHabits();
  renderHabits(habits);
  initializeTheme();
});