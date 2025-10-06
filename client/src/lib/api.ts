export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'https://piligrim.5-star-roi.ru')
}
