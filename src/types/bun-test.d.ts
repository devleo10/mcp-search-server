declare module 'bun:test' {
  export function test(name: string, fn: (t?: any) => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export const expect: any;
}

export {};
