// Простой справочник праздников РФ по году (без переносов выходных)
// Включает: 1-8 января, 23 февраля, 8 марта, 1 мая, 9 мая, 12 июня, 4 ноября

export function getRussianHolidaysIsoSet(year: number): Set<string> {
  const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10)
  const set = new Set<string>()
  // Новогодние каникулы 1-8 января
  for (let d = 1; d <= 8; d++) set.add(iso(year, 1, d))
  // 23 февраля
  set.add(iso(year, 2, 23))
  // 8 марта
  set.add(iso(year, 3, 8))
  // 1 мая
  set.add(iso(year, 5, 1))
  // 9 мая
  set.add(iso(year, 5, 9))
  // 12 июня
  set.add(iso(year, 6, 12))
  // 4 ноября
  set.add(iso(year, 11, 4))
  return set
}


