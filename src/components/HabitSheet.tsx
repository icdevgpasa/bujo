import { useState } from 'preact/hooks'
import { deleteHabit, renameHabit, type Habit } from '../db'
import { Sheet } from './Sheet'

export function HabitSheet({ habit, days, onClose }: { habit: Habit; days: number; onClose: () => void }) {
  const [name, setName] = useState(habit.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Sheet onClose={onClose} label={`Nawyk: ${habit.name}`}>
      <p class="sheet-title">
        <span class="muted">Nawyk</span>
        <br />
        {habit.name}
      </p>
      <p class="muted small">
        W tym miesiącu: {habit.done.length} z {days} dni
      </p>
      <form
        class="edit"
        onSubmit={async (e) => {
          e.preventDefault()
          if (name.trim()) await renameHabit(habit.id, name.trim())
          onClose()
        }}
      >
        <input class="habit-name" value={name} onInput={(e) => setName(e.currentTarget.value)} aria-label="Nazwa nawyku" maxLength={24} />
        <div class="row">
          <button type="submit" class="primary">Zapisz nazwę</button>
        </div>
      </form>
      <div class="actions">
        <button
          type="button"
          class={confirmDelete ? 'danger' : ''}
          onClick={async () => {
            if (!confirmDelete) return setConfirmDelete(true)
            await deleteHabit(habit.id)
            onClose()
          }}
        >
          {confirmDelete ? 'Na pewno usunąć z tego miesiąca?' : 'Usuń nawyk z tego miesiąca'}
        </button>
        <button type="button" onClick={onClose}>Zamknij</button>
      </div>
    </Sheet>
  )
}
