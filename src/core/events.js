export function createEvents() {
  const map = new Map();
  return {
    on(name, fn) { (map.get(name) || map.set(name, []).get(name)).push(fn); },
    emit(name, data) { for (const fn of map.get(name) || []) fn(data); },
  };
}
