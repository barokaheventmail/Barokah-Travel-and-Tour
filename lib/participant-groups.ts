export type GroupMember = {
  id: string
  name: string
  busName: string
  order: number
  room: string
  roomType: string
  vw: string
}

export type RoomGroup = {
  key: string
  room: string
  roomType: string | null
  members: GroupMember[]
}

export type VwGroup = {
  key: string
  vw: string
  members: GroupMember[]
}

type ParticipantRow = {
  id: string
  busId: string
  order: number
  name: string
  room: string | null
  roomType: string | null
  vw: string | null
}

type BusRow = { id: string; name: string; order: number }

type RawMember = GroupMember & { busOrder: number }

export const UNASSIGNED_ROOM = 'Tanpa Kamar'
export const UNASSIGNED_VW = 'Tanpa VW'

function busMaps(buses: BusRow[]) {
  return {
    order: new Map(buses.map((b, i) => [b.id, i])),
    name: new Map(buses.map((b) => [b.id, b.name])),
  }
}

function memberOf(p: ParticipantRow, busOrder: Map<string, number>, busName: Map<string, string>): RawMember {
  return {
    id: p.id,
    name: p.name,
    busName: busName.get(p.busId) ?? '',
    busOrder: busOrder.get(p.busId) ?? Number.MAX_SAFE_INTEGER,
    order: p.order,
    room: (p.room ?? '').trim(),
    roomType: (p.roomType ?? '').trim(),
    vw: (p.vw ?? '').trim(),
  }
}

function stripInternal(member: RawMember): GroupMember {
  return {
    id: member.id,
    name: member.name,
    busName: member.busName,
    order: member.order,
    room: member.room,
    roomType: member.roomType,
    vw: member.vw,
  }
}

function sortByBusThenOrder(members: RawMember[]) {
  members.sort((a, b) => a.busOrder - b.busOrder || a.order - b.order)
}

export function groupByRoom(participants: ParticipantRow[], buses: BusRow[]): RoomGroup[] {
  const { order: busOrder, name: busName } = busMaps(buses)
  const groups = new Map<string, { room: string; roomTypes: Set<string>; members: RawMember[] }>()

  for (const p of participants) {
    const room = (p.room ?? '').trim()
    const key = room || UNASSIGNED_ROOM
    let group = groups.get(key)
    if (!group) {
      group = { room: key, roomTypes: new Set<string>(), members: [] }
      groups.set(key, group)
    }
    const type = room ? (p.roomType ?? '').trim() : ''
    if (type) group.roomTypes.add(type)
    group.members.push(memberOf(p, busOrder, busName))
  }

  return [...groups.values()]
    .map((group) => {
      sortByBusThenOrder(group.members)
      return {
        key: group.room,
        room: group.room,
        roomType: group.roomTypes.size > 0 ? [...group.roomTypes].join(' / ') : null,
        members: group.members.map(stripInternal),
      }
    })
    .sort((a, b) => {
      if (a.room === UNASSIGNED_ROOM) return 1
      if (b.room === UNASSIGNED_ROOM) return -1
      return a.room.localeCompare(b.room, undefined, { numeric: true })
    })
}

export function groupByVw(participants: ParticipantRow[], buses: BusRow[]): VwGroup[] {
  const { order: busOrder, name: busName } = busMaps(buses)
  const groups = new Map<string, { vw: string; members: RawMember[] }>()

  for (const p of participants) {
    const vw = (p.vw ?? '').trim()
    const key = vw || UNASSIGNED_VW
    let group = groups.get(key)
    if (!group) {
      group = { vw: key, members: [] }
      groups.set(key, group)
    }
    group.members.push(memberOf(p, busOrder, busName))
  }

  return [...groups.values()]
    .map((group) => {
      sortByBusThenOrder(group.members)
      return {
        key: group.vw,
        vw: group.vw,
        members: group.members.map(stripInternal),
      }
    })
    .sort((a, b) => {
      if (a.vw === UNASSIGNED_VW) return 1
      if (b.vw === UNASSIGNED_VW) return -1
      return a.vw.localeCompare(b.vw, undefined, { numeric: true })
    })
}
