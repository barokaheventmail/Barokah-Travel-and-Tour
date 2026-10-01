export const PARTICIPANTS_CHANGED_EVENT = 'barokah:participants-changed'
export const PARTICIPANT_ADDED_EVENT = 'barokah:participant-added'

export function notifyParticipantsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PARTICIPANTS_CHANGED_EVENT))
}

export function notifyParticipantAdded() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PARTICIPANT_ADDED_EVENT))
}