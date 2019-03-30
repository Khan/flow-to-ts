const path = require("path");
const t = require("@babel/types");

const computeNewlines = require("./compute-newlines.js");

const locToString = (loc) => 
  `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;

// TODO: figure out how to template these inline definitions
const utilityTypes = {
  "$Keys": (typeAnnotation) => {
    // TODO: patch @babel/types - tsTypeOperator should accept two arguments
    // return t.tsTypeOperator(typeAnnotation, "keyof");
    return {
      type: "TSTypeOperator",
      typeAnnotation,
      operator: "keyof",
    };
  },
  "$Values": (typeAnnotation) => {
    return t.tsIndexedAccessType(
      typeAnnotation, 
      {
        type: "TSTypeOperator",
        typeAnnotation,
        operator: "keyof",
      },
      // TODO: patch @babel/types - tsTypeOperator should accept two arguments
      //t.tsTypeOperator(typeAnnotation, "keyof"),
    );
  },
  "$ReadOnly": (typeAnnotation) => {
    const typeName = t.identifier("Readonly");
    const typeParameters = 
      t.tsTypeParameterInstantiation([typeAnnotation])
    return t.tsTypeReference(typeName, typeParameters);
  },
  "$Shape": (typeAnnotation) => {
    const typeName = t.identifier("Partial");
    const typeParameters = 
      t.tsTypeParameterInstantiation([typeAnnotation])
    return t.tsTypeReference(typeName, typeParameters);
  },
  "$NonMaybeType": (typeAnnotation) => {
    const typeName = t.identifier("NonNullable");
    const typeParameters = 
      t.tsTypeParameterInstantiation([typeAnnotation])
    return t.tsTypeReference(typeName, typeParameters);
  },
  "Class": null, // TODO

  // These are two complicate to inline so we'll leave them as imports
  "$Diff": null,
  "$PropertyType": null,
  "$ElementType": null,
  "$Call": null,
};

const transform = {
  Program: {
    enter(path, state) {
      const {body} = path.node;

      for (const stmt of body) {
        if (stmt.leadingComments) {
          stmt.leadingComments = stmt.leadingComments.filter(
            comment => {
              const value = comment.value.trim();
              return value !== "@flow" && !value.startsWith("$FlowFixMe");
            }
          );
        }
        if (stmt.trailingComments) {
          stmt.trailingComments = stmt.trailingComments.filter(
            comment => {
              const value = comment.value.trim();
              return value !== "@flow" && !value.startsWith("$FlowFixMe");
            }
          );
        }
      }

      if (body.length > 0) {
        path.node.newlines = computeNewlines(path.node);

        // Attach the number of trailing spaces to the state so that convert.js
        // can add those back since babel-generator/lib/buffer.js removes them.
        // TODO: compute this properly
        state.trailingLines = 0;
      }
    },
    exit(path, state) {
      const {body} = path.node;
      if (state.usedUtilityTypes.size > 0) {
        const specifiers = [...state.usedUtilityTypes].map(name => {
          const imported = t.identifier(name);
          const local = t.identifier(name);
          return t.importSpecifier(local, imported);
        }); 
        const source = t.stringLiteral("utility-types");
        const importDeclaration = t.importDeclaration(specifiers, source);
        path.node.body = [importDeclaration, ...path.node.body];
        path.node.newlines = [
          [], // place the new import at the start of the file
          [undefined, ...path.node.newlines[0]], 
          ...path.node.newlines.slice(1),
        ];
      }
    },
  },
  BlockStatement: {
    // TODO: deal with empty functions
    enter(path, state) {
      const {body} = path.node;

      if (body.length > 0) {
        path.node.newlines = computeNewlines(path.node);
      }
    },
  },

  // Basic Types
  StringTypeAnnotation(path) {
    path.replaceWith(t.tsStringKeyword());
  },
  BooleanTypeAnnotation(path) {
    path.replaceWith(t.tsBooleanKeyword());
  },
  NumberTypeAnnotation(path) {
    path.replaceWith(t.tsNumberKeyword());
  },
  AnyTypeAnnotation(path) {
    path.replaceWith(t.tsAnyKeyword());
  },
  VoidTypeAnnotation(path) {
    path.replaceWith(t.tsVoidKeyword());
  },
  MixedTypeAnnotation(path) {
    path.replaceWith(t.tsUnknownKeyword());
  },
  EmptyTypeAnnotation(path) {
    path.replaceWith(t.tsNeverKeyword());
  },
  ExistsTypeAnnotation(path) {
    console.warn("downgrading * to any");
    path.replaceWith(t.tsAnyKeyword());
  },

  // Literals
  StringLiteralTypeAnnotation(path) {
    path.replaceWith(
      t.tsLiteralType(t.stringLiteral(path.node.value))
    );
  },
  BooleanLiteralTypeAnnotation(path) {
    path.replaceWith(
      t.tsLiteralType(t.booleanLiteral(path.node.value))
    );
  },
  NumberLiteralTypeAnnotation(path) {
    path.replaceWith(
      t.tsLiteralType(t.numericLiteral(path.node.value))
    );
  },
  NullLiteralTypeAnnotation(path) {
    path.replaceWith(t.tsNullKeyword());
  },

  // It's okay to process these non-leaf nodes on enter()
  // since we're modifying them in a way doesn't affect
  // the processing of other nodes.
  FunctionDeclaration(path) {
    if (path.node.predicate) {
      console.warn(`removing %checks at ${locToString(path.node.predicate.loc)}`);
      delete path.node.predicate;
    }
  },
  FunctionExpression(path) {
    if (path.node.predicate) {
      console.warn(`removing %checks at ${locToString(path.node.predicate.loc)}`);
      delete path.node.predicate;
    }
  },
  ArrowFunctionExpression(path) {
    if (path.node.predicate) {
      console.warn(`removing %checks at ${locToString(path.node.predicate.loc)}`);
      delete path.node.predicate;
    }
  },

  // All other non-leaf nodes must be processed on exit()
  TypeAnnotation: {
    exit(path) {
      const {typeAnnotation} = path.node;
      path.replaceWith(
        t.tsTypeAnnotation(typeAnnotation),
      );
    }
  },
  NullableTypeAnnotation: {
    exit(path) {
      const {typeAnnotation} = path.node;
      path.replaceWith(
        t.tsUnionType([
          // conditionally unwrap TSTypeAnnotation nodes
          t.isTSTypeAnnotation(typeAnnotation)
            ? typeAnnotation.typeAnnotation
            : typeAnnotation,
          t.tsNullKeyword(),
        ]),
      );
    }
  },
  ArrayTypeAnnotation: {
    exit(path) {
      const { elementType } = path.node;
      path.replaceWith(
        t.tsArrayType(elementType));
    }
  },
  TupleTypeAnnotation: {
    exit(path) {
      const {types} = path.node;
      const elementTypes = types;
      path.replaceWith(
        t.tsTupleType(elementTypes));
    }
  },
  FunctionTypeAnnotation: {
    exit(path) {
      const {typeParameters, params, rest, returnType} = path.node;
      const parameters = params.map((param, index) => {
        if (param.name === "") {
          return {
            ...param,
            name: `arg${index}`,
          };
        } else {
          return param;
        }
      })
      if (rest) {
        const restElement = {
          type: "RestElement",
          argument: rest,
          decorators: [], // flow doesn't support decorators
          typeAnnotation: rest.typeAnnotation,
        };
        // TODO: patch @babel/types - t.restElement omits typeAnnotation
        // const restElement = t.restElement(rest, [], rest.typeAnnotation);
        parameters.push(restElement);
        delete rest.typeAnnotation;
      }
      const typeAnnotation = t.tsTypeAnnotation(returnType);
      path.replaceWith(
        t.tsFunctionType(typeParameters, parameters, typeAnnotation));
    }
  },
  FunctionTypeParam: {
    exit(path) {
      const {name, optional, typeAnnotation} = path.node;
      const decorators = [];  // flow doesn't support decorators
      const identifier = {
        type: "Identifier",
        name: name ? name.name : "",
        optional,
        typeAnnotation: t.tsTypeAnnotation(typeAnnotation),
      };
      // TODO: patch @babel/types - t.identifier omits typeAnnotation
      // const identifier = t.identifier(name.name, decorators, optional, t.tsTypeAnnotation(typeAnnotation));
      path.replaceWith(identifier);
    }
  },
  TypeParameterInstantiation: {
    exit(path) {
      const {params} = path.node;
      path.replaceWith(
        t.tsTypeParameterInstantiation(params));
    }
  },
  TypeParameterDeclaration: {
    exit(path) {
      const {params} = path.node;
      path.replaceWith(
        t.tsTypeParameterDeclaration(params));
    }
  },
  TypeParameter: {
    exit(path) {
      const {name, variance, bound} = path.node;
      if (variance) {
        console.warn("TypeScript doesn't support variance on type parameters");
      }
      const typeParameter = {
        type: "TSTypeParameter",
        constraint: bound && bound.typeAnnotation,
        default: path.node.default,
        name,
      };
      // TODO: patch @babel/types - tsTypeParameter omits name
      // const typeParameter = t.tsTypeParameter(constraint, _default, name));
      path.replaceWith(typeParameter);
    }
  },
  GenericTypeAnnotation: {
    exit(path, state) {
      const {id, typeParameters} = path.node;

      const typeName = id;
      // utility-types doesn't have a definition for $ReadOnlyArray
      // TODO: add one
      if (typeName.name === "$ReadOnlyArray") {
        typeName.name = "ReadonlyArray";
      }

      if (typeName.name in utilityTypes) {
        if (state.options.inlineUtilityTypes && typeof utilityTypes[typeName.name] === "function") {
          const inline = utilityTypes[typeName.name];
          path.replaceWith(inline(...typeParameters.params));
          return;
        } else {
          state.usedUtilityTypes.add(typeName.name);
        }
      }

      path.replaceWith(
        t.tsTypeReference(typeName, typeParameters));
    }
  },
  ObjectTypeProperty: {
    exit(path) {
      const {key, value, optional, variance, kind, method} = path.node; // TODO: static, kind
      const typeAnnotation = t.tsTypeAnnotation(value);
      const initializer = undefined;  // TODO: figure out when this used
      const computed = false;  // TODO: maybe set this to true for indexers
      const readonly = variance && variance.kind === "plus";

      if (variance && variance.kind === "minus") {
        // TODO: include file and location of infraction
        console.warn("typescript doesn't support writeonly properties");
      }
      if (kind !== "init") {
        console.warn("we don't handle get() or set() yet, :P");
      }

      if (method) {
        // TODO: assert value is a FunctionTypeAnnotation
        const methodSignature = {
          type: "TSMethodSignature",
          key,
          typeParameters: value.typeParameters,
          parameters: value.parameters,
          typeAnnotation: value.typeAnnotation,
          computed,
          optional,
        };
        // TODO: patch @babel/types - tsMethodSignature ignores two out of the six params
        // const methodSignature = t.tsMethodSignature(key, value.typeParameters, value.parameters, value.typeAnnotation, computed, optional);
        path.replaceWith(methodSignature);
      } else {
        const propertySignature = {
          type: "TSPropertySignature",
          key,
          typeAnnotation,
          // initializer,
          computed,
          // optional,
          readonly,
        }
        // TODO: patch @babel/types - tsPropertySignature ignores typeAnnotation, optional, and readonly
        // const = propertySignature = t.tsPropertySignature(key, typeAnnotation, initializer, computed, optional, readonly),
        path.replaceWith(propertySignature);
      }
    }
  },
  ObjectTypeIndexer: {
    exit(path) {
      const {id, key, value, variance} = path.node;

      const readonly = variance && variance.kind === "plus";
      if (variance && variance.kind === "minus") {
        // TODO: include file and location of infraction
        console.warn("typescript doesn't support writeonly properties");
      }

      const identifier = {
        type: "Identifier",
        name: id.name,
        typeAnnotation: t.tsTypeAnnotation(key),
      };
      // TODO: patch @babel/types - t.identifier omits typeAnnotation
      // const identifier = t.identifier(name.name, decorators, optional, t.tsTypeAnnotation(typeAnnotation));

      const indexSignature = {
        type: "TSIndexSignature",
        parameters: [identifier], // TODO: figure when multiple parameters are used
        typeAnnotation: t.tsTypeAnnotation(value),
        readonly,
      }
      // TODO: patch @babel/types - t.tsIndexSignature omits readonly
      // const indexSignature = t.tsIndexSignature([identifier], t.tsTypeAnnotation(value), readonly);
      path.replaceWith(indexSignature);
    }
  },
  ObjectTypeAnnotation: {
    exit(path) {
      const {exact, properties, indexers} = path.node; // TODO: callProperties, inexact

      if (exact) {
        console.warn("downgrading exact object type");
      }

      // TODO: create multiple sets of elements so that we can convert
      // {x: number, ...T, y: number} to {x: number} & T & {y: number}
      const elements = [];
      const spreads = [];

      for (const prop of properties) {
        if (t.isObjectTypeSpreadProperty(prop)) {
          const {argument} = prop;
          spreads.push(argument);
        } else {
          elements.push(prop);
        }
      }

      // TODO: maintain the position of indexers
      elements.push(...indexers);

      if (spreads.length > 0 && elements.length > 0) {
        path.replaceWith(
          t.tsIntersectionType([...spreads, t.tsTypeLiteral(elements)]));
      } else if (spreads.length > 0) {
        path.replaceWith(
          t.tsIntersectionType(spreads));
      } else {
        path.replaceWith(
          t.tsTypeLiteral(elements));
      }
    }
  },
  TypeAlias: {
    exit(path) {
      const {id, typeParameters, right} = path.node;

      path.replaceWith(
        t.tsTypeAliasDeclaration(id, typeParameters, right));
    }
  },
  IntersectionTypeAnnotation: {
    exit(path) {
      const {types} = path.node;
      path.replaceWith(
        t.tsIntersectionType(types));
    }
  },
  UnionTypeAnnotation: {
    exit(path) {
      const {types} = path.node;
      path.replaceWith(
        t.tsUnionType(types));
    }
  },
  TypeofTypeAnnotation: {
    exit(path) {
      const {argument} = path.node;
      // argument has already been converted from GenericTypeAnnotation to
      // TSTypeReference.
      const exprName = argument.typeName;
      path.replaceWith(t.tsTypeQuery(exprName));
    }
  },
  TypeCastExpression: {
    exit(path, state) {
      const {expression, typeAnnotation} = path.node;
      // TODO: figure out how to get this working with prettier and make it configurable
      // const typeCastExpression = {
      //   type: "TSTypeCastExpression",
      //   expression,
      //   typeAnnotation,
      // };
      // TODO: add tsTypeCastExpression to @babel/types
      // const typeCastExpression = t.tsTypeCastExpression(expression, typeAnnotation);
      const tsAsExpression = t.tsAsExpression(expression, typeAnnotation.typeAnnotation);
      path.replaceWith(tsAsExpression);
    }
  },
  InterfaceDeclaration: {
    exit(path) {
      const {id, typeParameters} = path.node; // TODO: implements, mixins
      const body = t.tsInterfaceBody(path.node.body.members);
      const _extends = path.node.extends.length > 0 
        ? path.node.extends 
        : undefined;
      path.replaceWith(
        t.tsInterfaceDeclaration(id, typeParameters, _extends, body));
    }
  },
  InterfaceExtends: {
    exit(path) {
      const {id, typeParameters} = path.node;
      path.replaceWith(t.tsExpressionWithTypeArguments(id, typeParameters));
    }
  },
  ClassImplements: {
    exit(path) {
      const {id, typeParameters} = path.node;
      path.replaceWith(t.tsExpressionWithTypeArguments(id, typeParameters));
    }
  },
  ImportDeclaration: {
    exit(path) {
      path.node.importKind = "value";
      // TODO: make this configurable so we can output .ts[x]?
      const src = path.node.source.value.startsWith("./")
        ? path.node.source.value.replace(/\.js[x]?$/, "")
        : path.node.source.value;
      path.node.source = t.stringLiteral(src)
    }
  },
  ImportSpecifier: {
    exit(path) {
      path.node.importKind = "value";
    }
  },
};

module.exports = transform;
