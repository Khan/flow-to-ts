// @flow
type Foo<T> = {
  a(): string,
  ...T,
  x?: number,
  +y?: string,
  [num: number]: T
};

type Bar = {
  +[key: boolean]: string
};

type Baz<T> = {
  -[id: string]: ?T
};
