// @flow
type NumDict = { [key: string]: number };

let keys: $Keys<NumDict>;
let values: $Keys<NumDict>;

const numDict: NumDict = {
  x: 5,
  y: 10
};

let prop: $ElementType<NumDict, "x">;

let Point = [number, number];
let x: $ElementType<Point, 0>;
