// Whether the month calendar lists the day's tasks next to its events.
// A per-phone switch on the Ustawienia page, off by default.

const KEY = 'bujo:monthTasks'

export function monthTasksOn(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setMonthTasks(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // Blocked storage: the switch lasts until the app closes.
  }
}
