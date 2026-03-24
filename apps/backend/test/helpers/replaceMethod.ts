const restorers: Array<() => void> = [];

export function replaceMethod(target: object, key: string, value: unknown) {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restorers.push(() => {
    Reflect.set(target, key, original);
  });
}

export function restoreMethods() {
  while (restorers.length > 0) {
    restorers.pop()?.();
  }
}
