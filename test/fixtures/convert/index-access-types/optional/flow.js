type A = { a: ?{ b: "foo" } };
let a: A["a"]?.["b"];
