export type Employee = {
  id: number
  name: string
  team: 'Platform' | 'Growth' | 'Payments' | 'Design'
  salary: number
  startDate: string // YYYY-MM-DD
}

const FIRST = ['Asha', 'Ben', 'Chen', 'Divya', 'Eli', 'Farah', 'Gopal', 'Hana', 'Ivan', 'Jaya', 'Kofi', 'Lena', 'Mo']
const LAST = ['Rao', 'Smith', 'Li', 'Iyer', 'Cohen', 'Khan', 'Nair', 'Sato', 'Petrov', 'Das', 'Mensah']
const TEAMS: Employee['team'][] = ['Platform', 'Growth', 'Payments', 'Design']

// 103 deterministic rows — note the count is not a multiple of the page size.
export const EMPLOYEES: Employee[] = Array.from({ length: 103 }, (_, i) => ({
  id: i + 1,
  name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
  team: TEAMS[(i * 3) % TEAMS.length],
  // Salaries span 5 and 6 digits on purpose (e.g. 95000 and 120000).
  salary: 60000 + ((i * 7919) % 90) * 1000,
  startDate: `20${String(15 + (i % 10)).padStart(2, '0')}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
}))
