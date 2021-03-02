const path = require("path");
const t = require("../babel-types/lib/index.js");

const locToString = (loc) =>
  `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;

const stripSuffixFromImportSource = (path) => {
  // TODO: make this configurable so we can output .ts[x]?
  const src = /\.\.?\//.test(path.node.source.value)
    ? path.node.source.value.replace(/\.js[x]?$/, "")
    : path.node.source.value;
  path.node.source = t.stringLiteral(src);
};

const transformFunction = (path) => {
  if (path.node.predicate) {
    console.warn(`removing %checks at ${locToString(path.node.predicate.loc)}`);
    delete path.node.predicate;
  }
  for (const param of path.node.params) {
    if (t.isAssignmentPattern(param)) {
      param.left.optional = false;
    }
  }
};

const trackComments = (path, state) => {
  if (path.node.leadingComments) {
    for (const comment of path.node.leadingComments) {
      const { start, end } = comment;
      const key = `${start}:${end}`;

      if (state.commentsToNodesMap.has(key)) {
        state.commentsToNodesMap.get(key).leading = path.node;
      } else {
        state.commentsToNodesMap.set(key, { leading: path.node });
      }
    }
  }
  if (path.node.trailingComments) {
    for (const comment of path.node.trailingComments) {
      const { start, end } = comment;
      const key = `${start}:${end}`;

      if (state.commentsToNodesMap.has(key)) {
        state.commentsToNodesMap.get(key).trailing = path.node;
      } else {
        state.commentsToNodesMap.set(key, { trailing: path.node });
      }
    }
  }
};

// TODO: figure out how to template these inline definitions
const utilityTypes = {
  $Keys: (typeAnnotation) => {
    // TODO: patch @babel/types - tsTypeOperator should accept two arguments
    // return t.tsTypeOperator(typeAnnotation, "keyof");
    return {
      type: "TSTypeOperator",
      typeAnnotation,
      operator: "keyof",
    };
  },
  $Values: (typeAnnotation) => {
    return t.tsIndexedAccessType(
      typeAnnotation,
      {
        type: "TSTypeOperator",
        typeAnnotation,
        operator: "keyof",
      }
      // TODO: patch @babel/types - tsTypeOperator should accept two arguments
      //t.tsTypeOperator(typeAnnotation, "keyof"),
    );
  },
  $ReadOnly: (typeAnnotation) => {
    const typeName = t.identifier("Readonly");
    const typeParameters = t.tsTypeParameterInstantiation([typeAnnotation]);
    return t.tsTypeReference(typeName, typeParameters);
  },
  $Shape: (typeAnnotation) => {
    const typeName = t.identifier("Partial");
    const typeParameters = t.tsTypeParameterInstantiation([typeAnnotation]);
    return t.tsTypeReference(typeName, typeParameters);
  },
  $NonMaybeType: (typeAnnotation) => {
    const typeName = t.identifier("NonNullable");
    const typeParameters = t.tsTypeParameterInstantiation([typeAnnotation]);
    return t.tsTypeReference(typeName, typeParameters);
  },
  $Exact: (typeAnnotation) => {
    return typeAnnotation;
  },
  Class: null, // TODO

  // These are too complicated to inline so we'll leave them as imports
  $Diff: null,
  // The behavior of $Rest only differs when exact object types are involved.
  // And since TypeScript doesn't have exact object types using $Diff is okay.
  $Rest: "$Diff",
  $PropertyType: null,
  $ElementType: null,
  $Call: null,
};

// Mapping between React types for Flow and those for TypeScript.
const UnqualifiedReactTypeNameMap = {
  SyntheticEvent: "SyntheticEvent",
  SyntheticAnimationEvent: "AnimationEvent",
  SyntheticClipboardEvent: "ClipboardEvent",
  SyntheticCompositionEvent: "CompositionEvent",
  SyntheticInputEvent: "SyntheticEvent",
  SyntheticUIEvent: "UIEvent",
  SyntheticFocusEvent: "FocusEvent",
  SyntheticKeyboardEvent: "KeyboardEvent",
  SyntheticMouseEvent: "MouseEvent",
  SyntheticDragEvent: "DragEvent",
  SyntheticWheelEvent: "WheelEvent",
  SyntheticPointerEvent: "PointerEvent",
  SyntheticTouchEvent: "TouchEvent",
  SyntheticTransitionEvent: "TransitionEvent",
};

// Only types with different names are included.
const QualifiedReactTypeNameMap = {
  Node: "ReactNode",
  Text: "ReactText",
  Child: "ReactChild",
  Children: "ReactChildren",
  Element: "ReactElement",
  Fragment: "ReactFragment",
  Portal: "ReactPortal",
  NodeArray: "ReactNodeArray",

  // TODO: private types, e.g. React$ElementType, React$Node, etc.

  // TODO: handle ComponentType, ElementConfig, ElementProps, etc.
};

const transform = {
  Program: {
    enter(path, state) {
      const { body } = path.node;

      for (let i = 0; i < body.length; i++) {
        const stmt = body[i];

        // filter out flow specific comments
        if (stmt.leadingComments) {
          stmt.leadingComments = stmt.leadingComments.filter((comment) => {
            const value = comment.value.trim();
            return value !== "@flow" && !value.startsWith("$FlowFixMe");
          });
        }
        if (stmt.trailingComments) {
          stmt.trailingComments = stmt.trailingComments.filter((comment) => {
            const value = comment.value.trim();
            return value !== "@flow" && !value.startsWith("$FlowFixMe");
          });
        }
      }
    },
    exit(path, state) {
      const { body } = path.node;
      if (state.usedUtilityTypes.size > 0) {
        const specifiers = [...state.usedUtilityTypes].map((name) => {
          const imported = t.identifier(name);
          const local = t.identifier(name);
          return t.importSpecifier(local, imported);
        });
        const source = t.stringLiteral("utility-types");
        const importDeclaration = t.importDeclaration(specifiers, source);
        path.node.body = [importDeclaration, ...path.node.body];
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
    path.replaceWith(t.tsLiteralType(t.stringLiteral(path.node.value)));
  },
  BooleanLiteralTypeAnnotation(path) {
    path.replaceWith(t.tsLiteralType(t.booleanLiteral(path.node.value)));
  },
  NumberLiteralTypeAnnotation(path) {
    path.replaceWith(t.tsLiteralType(t.numericLiteral(path.node.value)));
  },
  NullLiteralTypeAnnotation(path) {
    path.replaceWith(t.tsNullKeyword());
  },

  // It's okay to process these non-leaf nodes on enter()
  // since we're modifying them in a way doesn't affect
  // the processing of other nodes.
  FunctionDeclaration(path, state) {
    trackComments(path, state);

    transformFunction(path);
  },
  FunctionExpression(path) {
    transformFunction(path);
  },
  ArrowFunctionExpression(path) {
    transformFunction(path);
  },

  VariableDeclaration(path, state) {
    trackComments(path, state);
  },

  ObjectProperty(path, state) {
    trackComments(path, state);
  },

  // All other non-leaf nodes must be processed on exit()
  TypeAnnotation: {
    exit(path) {
      const { typeAnnotation } = path.node;
      path.replaceWith(t.tsTypeAnnotation(typeAnnotation));
    },
  },
  NullableTypeAnnotation: {
    exit(path) {
      const { typeAnnotation } = path.node;

      // conditionally unwrap TSTypeAnnotation nodes
      const unwrappedType = t.isTSTypeAnnotation(typeAnnotation)
        ? typeAnnotation.typeAnnotation
        : typeAnnotation;

      path.replaceWith(
        t.tsUnionType([
          // conditionally wrap function types in parens
          t.isTSFunctionType(unwrappedType)
            ? t.tsParenthesizedType(unwrappedType)
            : unwrappedType,
          t.tsNullKeyword(),
          t.tsUndefinedKeyword(),
        ])
      );
    },
  },
  ArrayTypeAnnotation: {
    exit(path) {
      const { elementType } = path.node;
      path.replaceWith(t.tsArrayType(elementType));
    },
  },
  TupleTypeAnnotation: {
    exit(path) {
      const { types } = path.node;
      const elementTypes = types;
      path.replaceWith(t.tsTupleType(elementTypes));
    },
  },
  FunctionTypeAnnotation: {
    exit(path) {
      const { typeParameters, params, rest, returnType } = path.node;
      const parameters = params.map((param, index) => {
        if (param.name === "") {
          return {
            ...param,
            name: `arg${index}`,
          };
        } else {
          return param;
        }
      });
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
        !path.parent ||
          t.isUnionTypeAnnotation(path.parent) ||
          t.isIntersectionTypeAnnotation(path.parent) ||
          t.isArrayTypeAnnotation(path.parent)
          ? t.tsParenthesizedType(
              t.tsFunctionType(typeParameters, parameters, typeAnnotation)
            )
          : t.tsFunctionType(typeParameters, parameters, typeAnnotation)
      );
    },
  },
  FunctionTypeParam: {
    exit(path) {
      const { name, optional, typeAnnotation } = path.node;
      const decorators = []; // flow doesn't support decorators
      const identifier = {
        type: "Identifier",
        name: name ? name.name : "",
        optional,
        typeAnnotation: t.tsTypeAnnotation(typeAnnotation),
      };
      // TODO: patch @babel/types - t.identifier omits typeAnnotation
      // const identifier = t.identifier(name.name, decorators, optional, t.tsTypeAnnotation(typeAnnotation));
      path.replaceWith(identifier);
    },
  },
  TypeParameterInstantiation: {
    exit(path) {
      const { params } = path.node;
      path.replaceWith(t.tsTypeParameterInstantiation(params));
    },
  },
  TypeParameterDeclaration: {
    exit(path) {
      const { params } = path.node;
      path.replaceWith(t.tsTypeParameterDeclaration(params));
    },
  },
  TypeParameter: {
    exit(path) {
      const { name, variance, bound } = path.node;
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
    },
  },
  GenericTypeAnnotation: {
    exit(path, state) {
      const { id, typeParameters } = path.node;

      const typeName = id;
      // utility-types doesn't have a definition for $ReadOnlyArray
      // TODO: add one
      if (typeName.name === "$ReadOnlyArray") {
        typeName.name = "ReadonlyArray";
      }

      if (typeName.name === "Function") {
        path.replaceWith(
          t.functionTypeAnnotation(
            null, // type parameters
            [],
            t.functionTypeParam(
              t.identifier("args"),
              t.genericTypeAnnotation(
                t.identifier("Array"),
                t.typeParameterInstantiation([t.anyTypeAnnotation()])
              )
            ),
            t.anyTypeAnnotation()
          )
        );
        return;
      }

      if (typeName.name === "Object") {
        path.replaceWith(
          t.objectTypeAnnotation(
            [],
            [
              t.objectTypeIndexer(
                t.identifier("key"),
                t.stringTypeAnnotation(),
                t.anyTypeAnnotation()
              ),
            ]
          )
        );
        return;
      }

      if (typeName.name in utilityTypes) {
        if (
          (state.options.inlineUtilityTypes &&
            typeof utilityTypes[typeName.name] === "function") ||
          // $Exact doesn't exist in utility-types so we always inline it.
          typeName.name === "$Exact"
        ) {
          const inline = utilityTypes[typeName.name];
          path.replaceWith(inline(...typeParameters.params));
          return;
        } else if (typeof utilityTypes[typeName.name] === "string") {
          const replacementName = utilityTypes[typeName.name];
          path.replaceWith(
            t.tsTypeReference(t.identifier(replacementName), typeParameters)
          );
          state.usedUtilityTypes.add(replacementName);
          return;
        } else {
          state.usedUtilityTypes.add(typeName.name);
        }
      }

      if (typeName.name in UnqualifiedReactTypeNameMap) {
        // TODO: make sure that React was imported in this file
        path.replaceWith(
          t.tsTypeReference(
            t.tsQualifiedName(
              t.identifier("React"),
              t.identifier(UnqualifiedReactTypeNameMap[typeName.name])
            ),
            // TypeScript doesn't support empty type param lists
            typeParameters.params.length > 0 ? typeParameters : null
          )
        );
      } else {
        path.replaceWith(t.tsTypeReference(typeName, typeParameters));
      }
    },
  },
  QualifiedTypeIdentifier: {
    exit(path) {
      const { qualification, id } = path.node;
      const left = qualification;
      const right = id;

      if (left.name === "React" && right.name in QualifiedReactTypeNameMap) {
        path.replaceWith(
          t.tsQualifiedName(
            left,
            t.identifier(QualifiedReactTypeNameMap[right.name])
          )
        );
      } else {
        path.replaceWith(t.tsQualifiedName(left, right));
      }
    },
  },
  ObjectTypeProperty: {
    exit(path, state) {
      trackComments(path, state);

      const { key, value, optional, variance, kind, method } = path.node; // TODO: static, kind
      const typeAnnotation = t.tsTypeAnnotation(value);
      const initializer = undefined; // TODO: figure out when this used
      const computed = false; // TODO: maybe set this to true for indexers
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
          optional,
          readonly,
        };
        // TODO: patch @babel/types - tsPropertySignature ignores typeAnnotation, optional, and readonly
        // const = propertySignature = t.tsPropertySignature(key, typeAnnotation, initializer, computed, optional, readonly),
        path.replaceWith(propertySignature);
      }
    },
  },
  ObjectTypeIndexer: {
    exit(path, state) {
      trackComments(path, state);

      const { id, key, value, variance } = path.node;

      const readonly = variance && variance.kind === "plus";
      if (variance && variance.kind === "minus") {
        // TODO: include file and location of infraction
        console.warn("typescript doesn't support writeonly properties");
      }

      const identifier = {
        type: "Identifier",
        name: id ? id.name : "key",
        typeAnnotation: t.tsTypeAnnotation(key),
      };
      // TODO: patch @babel/types - t.identifier omits typeAnnotation
      // const identifier = t.identifier(name.name, decorators, optional, t.tsTypeAnnotation(typeAnnotation));

      const indexSignature = {
        type: "TSIndexSignature",
        parameters: [identifier], // TODO: figure when multiple parameters are used
        typeAnnotation: t.tsTypeAnnotation(value),
        readonly,
      };
      // TODO: patch @babel/types - t.tsIndexSignature omits readonly
      // const indexSignature = t.tsIndexSignature([identifier], t.tsTypeAnnotation(value), readonly);
      path.replaceWith(indexSignature);
    },
  },
  ObjectTypeAnnotation: {
    enter(path, state) {
      const { properties } = path.node;
      if (properties.length > 0) {
        // Workaround babylon bug where the last ObjectTypeProperty in an
        // ObjectTypeAnnotation doesn't have its trailingComments.
        // TODO: file a ticket for this bug
        const trailingComments = [];
        const lastProp = properties[properties.length - 1];
        for (let i = lastProp.loc.end.line; i < path.node.loc.end.line; i++) {
          if (state.startLineToComments[i]) {
            trailingComments.push(state.startLineToComments[i]);
          }
        }
        lastProp.trailingComments = trailingComments;
      }
    },
    exit(path) {
      const { exact, properties, indexers } = path.node; // TODO: callProperties, inexact

      if (exact) {
        console.warn("downgrading exact object type");
      }

      // TODO: create multiple sets of elements so that we can convert
      // {x: number, ...T, y: number} to {x: number} & T & {y: number}
      const elements = [];
      const spreads = [];

      for (const prop of properties) {
        if (t.isObjectTypeSpreadProperty(prop)) {
          const { argument } = prop;
          spreads.push(argument);
        } else {
          elements.push(prop);
        }
      }

      // TODO: maintain the position of indexers
      indexers.forEach((indexer) => {
        const value = indexer.typeAnnotation.typeAnnotation;
        const key = indexer.parameters[0].typeAnnotation.typeAnnotation;
        if (
          t.isTSSymbolKeyword(key) ||
          t.isTSStringKeyword(key) ||
          t.isTSNumberKeyword(key)
        ) {
          elements.push(indexer);
        } else {
          const typeParameter = t.tsTypeParameter(key);
          typeParameter.name = indexer.parameters[0].name;

          const mappedType = {
            type: "TSMappedType",
            typeParameter: typeParameter,
            typeAnnotation: value,
            optional: true,
          };

          spreads.push(mappedType);
        }
      });

      if (spreads.length > 0 && elements.length > 0) {
        path.replaceWith(
          t.tsIntersectionType([...spreads, t.tsTypeLiteral(elements)])
        );
      } else if (spreads.length > 0) {
        path.replaceWith(t.tsIntersectionType(spreads));
      } else {
        const typeLiteral = t.tsTypeLiteral(elements);
        path.replaceWith(typeLiteral);
      }
    },
  },
  TypeAlias: {
    exit(path, state) {
      trackComments(path, state);

      const { id, typeParameters, right } = path.node;

      path.replaceWith(t.tsTypeAliasDeclaration(id, typeParameters, right));
    },
  },
  IntersectionTypeAnnotation: {
    exit(path) {
      const { types } = path.node;
      path.replaceWith(t.tsIntersectionType(types));
    },
  },
  UnionTypeAnnotation: {
    exit(path) {
      const { types } = path.node;
      path.replaceWith(t.tsUnionType(types));
    },
  },
  TypeofTypeAnnotation: {
    exit(path) {
      const { argument } = path.node;
      // argument has already been converted from GenericTypeAnnotation to
      // TSTypeReference.
      const exprName = argument.typeName;
      path.replaceWith(t.tsTypeQuery(exprName));
    },
  },
  TypeCastExpression: {
    exit(path, state) {
      const { expression, typeAnnotation } = path.node;
      // TODO: figure out how to get this working with prettier and make it configurable
      // const typeCastExpression = {
      //   type: "TSTypeCastExpression",
      //   expression,
      //   typeAnnotation,
      // };
      // TODO: add tsTypeCastExpression to @babel/types
      // const typeCastExpression = t.tsTypeCastExpression(expression, typeAnnotation);
      const tsAsExpression = t.tsAsExpression(
        expression,
        typeAnnotation.typeAnnotation
      );
      path.replaceWith(tsAsExpression);
    },
  },
  InterfaceDeclaration: {
    exit(path) {
      const { id, typeParameters } = path.node; // TODO: implements, mixins
      const body = t.tsInterfaceBody(path.node.body.members);
      const _extends =
        path.node.extends.length > 0 ? path.node.extends : undefined;
      path.replaceWith(
        t.tsInterfaceDeclaration(id, typeParameters, _extends, body)
      );
    },
  },
  InterfaceExtends: {
    exit(path) {
      const { id, typeParameters } = path.node;
      path.replaceWith(t.tsExpressionWithTypeArguments(id, typeParameters));
    },
  },
  ClassImplements: {
    exit(path) {
      const { id, typeParameters } = path.node;
      path.replaceWith(t.tsExpressionWithTypeArguments(id, typeParameters));
    },
  },
  ExportAllDeclaration: {
    exit(path) {
      // TypeScript doesn't support `export type * from ...`
      path.node.exportKind = "value";
      if (path.node.source) {
        stripSuffixFromImportSource(path);
      }
    },
  },
  ExportNamedDeclaration: {
    exit(path) {
      if (path.node.source) {
        stripSuffixFromImportSource(path);
      }
    },
  },
  ImportDeclaration: {
    exit(path) {
      stripSuffixFromImportSource(path);
      if (
        path.node.importKind === "typeof" &&
        t.isImportDefaultSpecifier(path.node.specifiers[0])
      ) {
        path.replaceWith(
          t.tsTypeAliasDeclaration(
            path.node.specifiers[0].local,
            undefined,
            t.tsTypeQuery(
              t.tsImportType(path.node.source, t.identifier("default"))
            )
          )
        );
      }
    },
  },
  ImportSpecifier: {
    exit(path) {
      // TODO(#223): Handle "typeof" imports.
      if (path.node.importKind === "typeof") {
        path.node.importKind = "value";
      }
    },
  },
  DeclareVariable: {
    exit(path) {
      const { id } = path.node;

      // TODO: patch @babel/types - t.variableDeclaration omits declare param
      // const declaration = t.variableDeclaration("var", [
      //   t.variableDeclarator(id),
      // ], true),

      path.replaceWith({
        type: "VariableDeclaration",
        kind: "var",
        declarations: [t.variableDeclarator(id)],
        declare: true,
      });
    },
  },
  DeclareClass: {
    exit(path) {
      const { id, body, typeParameters } = path.node;
      const superClass =
        path.node.extends.length > 0 ? path.node.extends[0] : undefined;

      // TODO: patch @babel/types - t.classDeclaration omits typescript params
      // t.classDeclaration(id, superClass, body, [], false, true, [], undefined)

      path.replaceWith({
        type: "ClassDeclaration",
        id,
        typeParameters,
        superClass,
        superClassTypeParameters: superClass
          ? superClass.typeParameters
          : undefined,
        body,
        declare: true,
      });
    },
  },
  DeclareFunction: {
    exit(path) {
      const { id } = path.node;
      const { name, typeAnnotation } = id;

      // TSFunctionType
      const functionType = typeAnnotation.typeAnnotation;

      // TODO: patch @babel/types - t.tsDeclaration only accepts 4 params but should accept 7
      // t.tsDeclareFunction(
      //   t.identifier(name),
      //   t.noop(),
      //   functionType.parameters,
      //   functionType.typeAnnotation,
      //   false, // async
      //   true,
      //   false, // generator
      // ),

      path.replaceWith({
        type: "TSDeclareFunction",
        id: t.identifier(name),
        typeParameters: functionType.typeParameters,
        params: functionType.parameters,
        returnType: functionType.typeAnnotation,
        declare: !t.isDeclareExportDeclaration(path.parent),
        async: false, // TODO
        generator: false, // TODO
      });
    },
  },
  DeclareExportDeclaration: {
    exit(path) {
      const { declaration, default: _default } = path.node;

      path.replaceWith({
        type: _default ? "ExportDefaultDeclaration" : "ExportNamedDeclaration",
        declaration,
      });
    },
  },
};

module.exports = transform;
