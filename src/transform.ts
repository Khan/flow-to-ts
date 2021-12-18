import * as t from "@babel/types";
import { ImportSpecifier, ImportDeclaration } from "@babel/types";

import * as declare from "./transforms/declare";
import * as reactTypes from "./transforms/react-types";
import * as objectType from "./transforms/object-type";
import * as utilityTypes from "./transforms/utility-types";

import { trackComments, partition, returning } from "./util";

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
      // @ts-ignore: Property 'optional' does not exist on type 'ObjectPattern'.
      param.left.optional = false;
    }
  }
};

export const transform = {
  Program: {
    enter(path, state) {
      const { body } = path.node;

      for (let i = 0; i < body.length; i++) {
        const stmt = body[i];

        // filter out @flow and $FlowIssue comments
        if (stmt.leadingComments) {
          stmt.leadingComments = stmt.leadingComments.filter((comment) => {
            const value = comment.value.trim();
            return !(value.includes("@flow") || value.includes("$FlowIssue"));
          });
        }
        if (stmt.trailingComments) {
          stmt.trailingComments = stmt.trailingComments.filter((comment) => {
            const value = comment.value.trim();
            return !(value.includes("@flow") || value.includes("$FlowIssue"));
          });
        }

        // TODO(#207): Handle error codes
        // - filter out [incompatible-exact] comments
        // - merge remaining comments
        // convert $FlowFixMe, $FlowIgnore, $FlowExpectedError comments
        if (stmt.leadingComments) {
          for (const comment of stmt.leadingComments) {
            comment.value = comment.value
              .replace(/\$(FlowFixMe|FlowExpectError)/g, "@ts-expect-error")
              .replace(/\$FlowIgnore/g, "@ts-ignore");
          }
        }
        if (stmt.trailingComments) {
          for (const comment of stmt.trailingComments) {
            comment.value = comment.value
              .replace(/\$(FlowFixMe|FlowExpectError)/g, "@ts-expect-error")
              .replace(/\$FlowIgnore/g, "@ts-ignore");
          }
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
    trackComments(path.node, state);

    transformFunction(path);
  },
  FunctionExpression(path) {
    transformFunction(path);
  },
  ArrowFunctionExpression(path) {
    transformFunction(path);
  },

  VariableDeclaration(path, state) {
    trackComments(path.node, state);
  },

  ObjectProperty(path, state) {
    trackComments(path.node, state);
  },

  // Statements
  ExpressionStatement(path, state) {
    trackComments(path.node, state);
  },
  BlockStatement(path, state) {
    trackComments(path.node, state);
  },
  EmptyStatement(path, state) {
    trackComments(path.node, state);
  },
  DebuggerStatement(path, state) {
    trackComments(path.node, state);
  },
  WithStatement(path, state) {
    trackComments(path.node, state);
  },
  ReturnStatement(path, state) {
    trackComments(path.node, state);
  },
  LabeledStatement(path, state) {
    trackComments(path.node, state);
  },
  BreakStatement(path, state) {
    trackComments(path.node, state);
  },
  ContinueStatement(path, state) {
    trackComments(path.node, state);
  },
  IfStatement(path, state) {
    trackComments(path.node, state);
  },
  SwitchStatement(path, state) {
    trackComments(path.node, state);
  },
  SwitchCase(path, state) {
    trackComments(path.node, state);
  },
  ThrowStatement(path, state) {
    trackComments(path.node, state);
  },
  TryStatement(path, state) {
    trackComments(path.node, state);
  },
  CatchClause(path, state) {
    trackComments(path.node, state);
  },
  WhileStatement(path, state) {
    trackComments(path.node, state);
  },
  DoWhileStatement(path, state) {
    trackComments(path.node, state);
  },
  ForStatement(path, state) {
    trackComments(path.node, state);
  },
  ForInStatement(path, state) {
    trackComments(path.node, state);
  },
  ForOfStatement(path, state) {
    trackComments(path.node, state);
  },

  // Class children
  ClassMethod(path, state) {
    trackComments(path.node, state);
  },
  ClassPrivateMethod(path, state) {
    trackComments(path.node, state);
  },
  ClassProperty(path, state) {
    trackComments(path.node, state);

    const { node } = path;
    if (node.variance && node.variance.kind === "plus") {
      node.readonly = true;
    }
    delete node.variance;
  },
  ClassPrivateProperty(path, state) {
    trackComments(path.node, state);

    // There's a @babel/generator bug such that the `readonly` modifier isn't
    // included in the output.
    const { node } = path;
    if (node.variance && node.variance.kind === "plus") {
      node.readonly = true;
    }
    delete node.variance;
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

      let replacement;

      replacement = utilityTypes.GenericTypeAnnotation.exit(path, state);
      if (replacement) {
        path.replaceWith(replacement);
        return;
      }

      replacement = reactTypes.GenericTypeAnnotation.exit(path, state);
      if (replacement) {
        path.replaceWith(replacement);
        return;
      }

      // fallthrough case
      path.replaceWith(t.tsTypeReference(typeName, typeParameters));
    },
  },
  QualifiedTypeIdentifier: {
    exit(path, state) {
      const { qualification, id } = path.node;
      const left = qualification;
      const right = id;

      const replacement = reactTypes.QualifiedTypeIdentifier.exit(path, state);
      if (replacement) {
        path.replaceWith(replacement);
        return;
      }

      // fallthrough case
      path.replaceWith(t.tsQualifiedName(left, right));
    },
  },
  ObjectTypeCallProperty: objectType.ObjectTypeCallProperty,
  ObjectTypeProperty: objectType.ObjectTypeProperty,
  ObjectTypeIndexer: objectType.ObjectTypeIndexer,
  ObjectTypeAnnotation: objectType.ObjectTypeAnnotation,
  TypeAlias: {
    exit(path, state) {
      const {
        id,
        typeParameters,
        right,
        leadingComments,
        trailingComments,
        loc,
      } = path.node;

      const replacementNode = t.tsTypeAliasDeclaration(
        id,
        typeParameters,
        right
      );
      replacementNode.leadingComments = leadingComments;
      replacementNode.trailingComments = trailingComments;
      replacementNode.loc = loc;

      trackComments(replacementNode, state);

      path.replaceWith(replacementNode);
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
    exit(path, state) {
      const {
        id,
        typeParameters,
        leadingComments,
        trailingComments,
        loc,
      } = path.node; // TODO: implements, mixins
      const body = t.tsInterfaceBody(path.node.body.members);
      const _extends =
        path.node.extends.length > 0 ? path.node.extends : undefined;
      const replacementNode = t.tsInterfaceDeclaration(
        id,
        typeParameters,
        _extends,
        body
      );

      replacementNode.leadingComments = leadingComments;
      replacementNode.trailingComments = trailingComments;
      replacementNode.loc = loc;

      trackComments(replacementNode, state);

      path.replaceWith(replacementNode);
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
    exit(path, state) {
      trackComments(path.node, state);

      // TypeScript doesn't support `export type * from ...`
      path.node.exportKind = "value";
      if (path.node.source) {
        stripSuffixFromImportSource(path);
      }
    },
  },
  ExportNamedDeclaration: {
    exit(path, state) {
      trackComments(path.node, state);

      if (path.node.source) {
        stripSuffixFromImportSource(path);
      }
    },
  },
  ImportDeclaration: {
    exit(path, state) {
      stripSuffixFromImportSource(path);
      let replacementNode = null;

      const {
        importKind,
        specifiers,
        source,
        leadingComments,
        trailingComments,
        loc,
      } = path.node as ImportDeclaration;

      if (
        importKind === "typeof" &&
        t.isImportDefaultSpecifier(specifiers[0])
      ) {
        replacementNode = t.tsTypeAliasDeclaration(
          specifiers[0].local,
          undefined,
          t.tsTypeQuery(t.tsImportType(source, t.identifier("default")))
        );
        replacementNode.leadingComments = leadingComments;
        replacementNode.trailingComments = trailingComments;
        replacementNode.loc = loc;
      } else if (importKind === "value") {
        // find any "type" imports within the ImportSpecifier list
        // and pull them out to separate ImportDeclarations

        const [valSpecs, typeSpecs] = partition(
          specifiers,
          (s): s is ImportSpecifier =>
            s.type === "ImportSpecifier" && s.importKind === "type"
        );

        if (typeSpecs.length > 0) {
          const typeNode = t.importDeclaration(
            typeSpecs.map((s) =>
              t.importSpecifier(
                returning(t.identifier(s.local.name), (n) => {
                  n.loc = s.local.loc;
                }),
                returning(
                  t.identifier(
                    s.imported.type === "Identifier"
                      ? s.imported.name
                      : s.imported.value
                  ),
                  (n) => {
                    n.loc = s.imported.loc;
                  }
                )
              )
            ),
            source
          );
          typeNode.leadingComments = leadingComments;
          typeNode.importKind = "type";
          typeNode.loc = loc;

          const valNode = t.importDeclaration(valSpecs, source);
          valNode.trailingComments = trailingComments;
          valNode.loc = {
            start: {
              line: loc.start.line + 1,
              column: 0,
            },
            end: {
              line: loc.start.line + 1,
              column: 0,
            },
          };

          replacementNode = [typeNode, valNode];
        }
      }

      trackComments(replacementNode ?? path.node, state);

      if (replacementNode != null) {
        if (Array.isArray(replacementNode)) {
          // Fixes https://github.com/Khan/flow-to-ts/issues/281
          // Imports with multiple types will be moved to their own node leaving the source node without specifiers;
          // do not print it as it will result in an import declaration without specifiers
          replacementNode = replacementNode.filter(
            (x) => x.specifiers.length > 0
          );
          path.replaceWithMultiple(replacementNode);
        } else {
          path.replaceWith(replacementNode);
        }
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
  DeclareVariable: declare.DeclareVariable,
  DeclareClass: declare.DeclareClass,
  DeclareFunction: declare.DeclareFunction,
  DeclareExportDeclaration: declare.DeclareExportDeclaration,
};
