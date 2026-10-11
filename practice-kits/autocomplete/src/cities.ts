export type City = { id: number; name: string; country: string }

const NAMES: [string, string][] = [
  ['Bengaluru', 'India'], ['Berlin', 'Germany'], ['Bern', 'Switzerland'], ['Bergen', 'Norway'], ['Belgrade', 'Serbia'],
  ['Belfast', 'UK'], ['Barcelona', 'Spain'], ['Bangkok', 'Thailand'], ['Boston', 'USA'], ['Brisbane', 'Australia'],
  ['Mumbai', 'India'], ['Munich', 'Germany'], ['Madrid', 'Spain'], ['Manila', 'Philippines'], ['Melbourne', 'Australia'],
  ['Milan', 'Italy'], ['Montreal', 'Canada'], ['Moscow', 'Russia'], ['Delhi', 'India'], ['Dublin', 'Ireland'],
  ['Dubai', 'UAE'], ['Denver', 'USA'], ['Hyderabad', 'India'], ['Helsinki', 'Finland'], ['Hamburg', 'Germany'],
  ['Pune', 'India'], ['Paris', 'France'], ['Prague', 'Czechia'], ['Porto', 'Portugal'], ['Perth', 'Australia'],
  ['Chennai', 'India'], ['Chicago', 'USA'], ['Cape Town', 'South Africa'], ['Copenhagen', 'Denmark'], ['Cairo', 'Egypt'],
  ['Seattle', 'USA'], ['Seoul', 'South Korea'], ['Singapore', 'Singapore'], ['Stockholm', 'Sweden'], ['Sydney', 'Australia'],
]

export const CITIES: City[] = NAMES.map(([name, country], i) => ({ id: i + 1, name, country }))
