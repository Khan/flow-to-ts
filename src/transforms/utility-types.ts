import * as t from "../../babel-types/lib/index.js";

// TODO: figure out how to template these inline definitions
const utilityTypes = {
  $Keys: (T) => {
    // $Keys<T> -> keyof T
    // TODO: patch @babel/types - tsTypeOperator should accept two arguments
    // return t.tsTypeOperator(typeAnnotation, "keyof");
    return {
      type: "TSTypeOperator",
      typeAnnotation: T,
      operator: "keyof",
    };
  },
  $Values: (T) => {
    // $Keys<T> -> T[keyof T]
    return t.tsIndexedAccessType(
      T,
      {
        type: "TSTypeOperator",
        typeAnnotation: T,
        operator: "keyof",
      }
      // TODO: patch @babel/types - tsTypeOperator should accept two arguments
      //t.tsTypeOperator(typeAnnotation, "keyof"),
    );
  },
  $ReadOnly: (T) => {
    // $ReadOnly<T> -> Readonly<T>
    const typeName = t.identifier("Readonly");
    const typeParameters = t.tsTypeParameterInstantiation([T]);
    return t.tsTypeReference(typeName, typeParameters);
  },
  $Shape: (T) => {
    // $Shape<T> -> Partial<T>
    const typeName = t.identifier("Partial");
    const typeParameters = t.tsTypeParameterInstantiation([T]);
    return t.tsTypeReference(typeName, typeParameters);
  },
  $NonMaybeType: (T) => {
    // $NonMaybeType<T> -> NonNullable<T>
    const typeName = t.identifier("NonNullable");
    const typeParameters = t.tsTypeParameterInstantiation([T]);
    return t.tsTypeReference(typeName, typeParameters);
  },
  $Exact: (T) => {
    // $Exact<T> -> T
    return T;
  },
  $PropertyType: (T, name) => {
    // $PropertyType<T, "name"> -> T["name"]
    return t.tsIndexedAccessType(T, name);
  },
  $FlowFixMe: () => {
    return t.tsAnyKeyword();
  },
  Class: null, // TODO

  // These are too complicated to inline so we'll leave them as imports
  $Diff: null,
  $ElementType: null,
  $Call: null,

  // The behavior of $Rest only differs when exact object types are involved.
  // And since TypeScript doesn't have exact object types using $Diff is okay.
  $Rest: "$Diff",
};

export const GenericTypeAnnotation = {
  exit(path, state) {
    const { id: typeName, typeParameters } = path.node;

    if (typeName.name in utilityTypes) {
      const value = utilityTypes[typeName.name];

      if (
        (typeof value === "function" && state.options.inlineUtilityTypes) ||
        // $Exact and $FlowFixMe don't exist in utility-types so we always inline them.
        typeName.name === "$Exact" ||
        typeName.name === "$FlowFixMe"
      ) {
        return typeParameters ? value(...typeParameters.params) : value();
      }

      if (typeof value === "string") {
        state.usedUtilityTypes.add(value);
        return t.tsTypeReference(t.identifier(value), typeParameters);
      }

      state.usedUtilityTypes.add(typeName.name);
    }
  },
};
