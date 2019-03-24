const t = require("@babel/types");

const transform = {
  Program(path) {
    const {body} = path.node;
    for (const stmt of body) {
      if (stmt.leadingComments) {
        stmt.leadingComments = stmt.leadingComments.filter(
          comment => comment.value.trim() !== "@flow");
      }
    }
  },
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
  NullLiteralTypeAnnotation(path) {
    path.replaceWith(t.tsNullKeyword());
  },

  // All non-leaf nodes must be processed on exit()
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
        constraint: undefined, // TODO
        default: undefined, // TODO
        name,
      };
      // TODO: patch @babel/types - tsTypeParameter omits name
      // const typeParameter = t.tsTypeParameter(constraint, _default, name));
      path.replaceWith(typeParameter);
    }
  },
  GenericTypeAnnotation: {
    exit(path) {
      const {id, typeParameters} = path.node;

      const specialTypes = {
        "$ReadOnly": "Readonly",
        "$ReadOnlyArray": "ReadonlyArray",
      };

      const typeName = id;
      if (typeName.name in specialTypes) {
        typeName.name = specialTypes[typeName.name];
      }

      path.replaceWith(
        t.tsTypeReference(typeName, typeParameters));
    }
  },
  ObjectTypeProperty: {
    exit(path) {
      const {key, value, optional, variance, kind, method} = path.node; // TODO: static, kind
      const typeAnnotation = t.tsTypeAnnotation(value);
      const initializer = null;  // TODO: figure out when this used
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
          initializer,
          computed,
          optional,
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
      const declare = undefined; // TODO: figure out what it's used for

      path.replaceWith(
        t.tsTypeAliasDeclaration(id, typeParameters, right, declare));
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
  }
};

module.exports = transform;
