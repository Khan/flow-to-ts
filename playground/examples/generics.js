// @flow
type BinaryOp = <T>(a: T, b: T) => T;

type Item<T> = {
  foo: T,
  bar: T
};

function identity<T: string>(val: T): T {
  let str: string = val; // Works!
  // $ExpectError
  let bar: "bar" = val; // Error!
  return val;
}
