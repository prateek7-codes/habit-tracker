import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = "https://bbvdctpmyhsydnpseuvz.supabase.co";
const supabaseKey = "sb_publishable_l_f9mvxnd2UO2W39UuxrpQ_fQrdOIrT";

const supabase = createClient(supabaseUrl, supabaseKey);
const form = document.getElementById('add-form');
const input = document.getElementById('habit-input');
const list = document.getElementById('habit-list');
const emptyState = document.getElementById('empty-state');
const metricActive = document.getElementById('metric-active');
const metricCompleted = document.getElementById('metric-completed');

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
    completedToday:
      row.completed_today ?? row.completedToday ?? row.completed ?? false,
    lastCompletedDate: row.last_completed_date ?? row.lastCompletedDate ?? null,
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

/* ---------- Remote Storage (Supabase) ---------- */
async function fetchHabits() {
  if (!supabase) return [];

  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching habits from Supabase', error);
    return [];
  }

  return data.map(normalizeHabit);
}

async function upsertHabits(habits) {
  if (!supabase || !habits.length) return;
  const rows = habits.map(habitToRow);
  const { error } = await supabase.from('habits').upsert(rows);
  if (error) {
    console.error('Error upserting habits', error);
  }
}

/* ---------- Rendering ---------- */
function renderHabits(habits) {
  stateHabits = habits;
  const hasHabits = habits.length > 0;

  if (emptyState) {
    emptyState.classList.toggle('hidden', hasHabits);
  }

  if (metricActive && metricCompleted) {
    const activeCount = habits.filter((h) => !h.completedToday).length;
    const completedCount = habits.filter((h) => h.completedToday).length;
    metricActive.textContent = String(activeCount);
    metricCompleted.textContent = String(completedCount);
  }

  if (!hasHabits) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = habits
    .map((habit) => {
      const completedClasses = habit.completedToday
        ? ' completed bg-emerald-50/70 border-emerald-200/80 dark:bg-emerald-900/40 dark:border-emerald-600/70'
        : '';

      const buttonCompletedClasses = habit.completedToday
        ? ' border-emerald-500/80 text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-emerald-50 dark:border-emerald-400/80 dark:text-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-400 dark:hover:text-emerald-950'
        : ' border-sky-500/80 text-sky-600 bg-sky-50 hover:bg-sky-500 hover:text-sky-50 dark:border-sky-400/80 dark:text-sky-200 dark:bg-sky-900/60 dark:hover:bg-sky-400 dark:hover:text-slate-950';

      return `
        <li class="habit-item group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/70 dark:bg-slate-900/80${completedClasses}" data-id="${habit.id}">
          <div class="flex min-w-0 flex-col gap-1">
            <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-50">${escapeHtml(habit.name)}</p>
            <p class="text-xs font-medium text-amber-500">🔥 ${habit.streak} day streak</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button type="button" class="btn btn-complete inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide shadow-sm ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400${buttonCompletedClasses}">
              ${habit.completedToday ? 'Done' : 'Mark'}
            </button>
            <button type="button" class="btn btn-delete inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:text-slate-500 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 dark:focus-visible:ring-offset-slate-950" aria-label="Delete habit">
              ×
            </button>
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
async function toggleComplete(id) {
  const habit = stateHabits.find((h) => h.id === id);
  if (!habit) return;

  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  if (!habit.completedToday) {
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

  if (supabase) {
    const { error } = await supabase
      .from('habits')
      .update({
        completed_today: habit.completedToday,
        last_completed_date: habit.lastCompletedDate,
        streak: habit.streak,
      })
      .eq('id', habit.id);

    if (error) {
      console.error('Error updating habit', error);
    }
  }

  renderHabits([...stateHabits]);
}

async function deleteHabit(id) {
  if (supabase) {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) {
      console.error('Error deleting habit', error);
    }
  }

  stateHabits = stateHabits.filter((h) => h.id !== id);
  renderHabits(stateHabits);
}

async function addHabit(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const deviceId = getDeviceId();

  const newHabit = {
    id: crypto.randomUUID(),
    deviceId,
    name: trimmed,
    completedToday: false,
    lastCompletedDate: null,
    streak: 0,
  };

  if (supabase) {
    const { error } = await supabase
      .from('habits')
      .insert(habitToRow(newHabit));

    if (error) {
      console.error('Error inserting habit', error);
    }
  }

  stateHabits = [...stateHabits, newHabit];
  renderHabits(stateHabits);

  input.value = '';
  input.focus();
}

/* ---------- Daily Reset On Load ---------- */
async function initializeApp() {
  let habits = await fetchHabits();
  const today = getTodayDate();

  const toReset = [];

  habits.forEach((habit) => {
    if (habit.lastCompletedDate !== today && habit.completedToday) {
      habit.completedToday = false;
      toReset.push(habit);
    }
  });

  if (toReset.length) {
    await upsertHabits(toReset);
  }

  renderHabits(habits);
}

/* ---------- Events ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await addHabit(input.value);
});

function initializeTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const thumb = document.getElementById('theme-thumb');
  const THEME_KEY = 'habit-tracker-theme';

  if (!themeToggle) return;

  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === 'dark') {
    setDark(true);
  } else if (savedTheme === 'light') {
    setDark(false);
  } else {
    // fallback to system preference
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(prefersDark);
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(!isDark);
    localStorage.setItem(THEME_KEY, !isDark ? 'dark' : 'light');
  });
}

function setDark(enable) {
  const root = document.documentElement;
  const thumb = document.getElementById('theme-thumb');

  if (enable) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (thumb) {
    thumb.classList.toggle('translate-x-5', enable);
    thumb.textContent = enable ? '☾' : '☀';
  }
}
/* ---------- Start ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initializeTheme();
});