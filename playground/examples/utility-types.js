// @flow
type NumDict = { [key: string]: number };

let keys: $Keys<NumDict>;
let values: $Values<NumDict>;

const numDict: NumDict = {
  x: 5,
  y: 10
};

let prop: $ElementType<NumDict, "x">;

type Point = [number, number];
let x: $ElementType<Point, 0>;
