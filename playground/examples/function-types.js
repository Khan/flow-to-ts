// @flow
type BinaryOp = (number, number) => number;
type UnaryOp = (a: number) => number;

function add(left: number, right: number, round?: boolean) {
  const sum = left + right;
  return round ? Math.round(sum) : sum;
}

const sum = (...terms: number[]): number => terms.reduce((a, x) => a + x, 0);
