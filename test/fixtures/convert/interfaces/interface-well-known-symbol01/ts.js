interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}