const restorers: Array<() => void> = [];

const originals: Array<{ obj: any; method: string; original: any }> = [];

export function replaceMethod<T extends object>(
    obj: T,
    method: keyof T,
    replacement: (...args: any[]) => any,
) {
  originals.push({ obj, method: method as string, original: obj[method] });
  (obj as any)[method] = replacement;
}

export function restoreMethods() {
  for (const { obj, method, original } of originals) {
    obj[method] = original;
  }
  originals.length = 0;
}