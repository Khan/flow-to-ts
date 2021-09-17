import * as t from "@babel/types";
import { trackComments } from "../util";

export const ObjectTypeAnnotation = {
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
    const { exact, callProperties, properties, indexers } = path.node; // TODO: inexact

    if (exact) {
      console.warn("downgrading exact object type");
    }

    // TODO: create multiple sets of elements so that we can convert
    // {x: number, ...T, y: number} to {x: number} & T & {y: number}
    const elements = [];
    const spreads = [];

    if (callProperties) {
      for (const prop of callProperties) {
        elements.push(prop);
      }
    }

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
        t.isTSNumberKeyword(key) ||
        t.isTSTypeReference(key)
      ) {
        elements.push(indexer);
      } else {
        const name = indexer.parameters[0].name;
        // @ts-ignore
        const typeParameter = t.tsTypeParameter(key, undefined, name);

        const mappedType = {
          type: "TSMappedType",
          typeParameter: typeParameter,
          typeAnnotation: value,
          optional: true,
        };

        spreads.push(mappedType);
      }
    });

    // If there's only one property and it's an indexer convert the object
    // type to use Record, e.g.
    // {[string]: number} -> Record<string, number>
    if (
      spreads.length === 0 &&
      elements.length === 1 &&
      indexers.length === 1
    ) {
      const indexer = indexers[0];
      const value = indexer.typeAnnotation.typeAnnotation;
      const key = indexer.parameters[0].typeAnnotation.typeAnnotation;

      const record = t.tsTypeReference(
        t.identifier("Record"),
        t.tsTypeParameterInstantiation([key, value])
      );

      if (indexer.readonly) {
        path.replaceWith(
          t.tsTypeReference(
            t.identifier("Readonly"),
            t.tsTypeParameterInstantiation([record])
          )
        );
      } else {
        path.replaceWith(record);
      }

      return;
    }

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
};

export const ObjectTypeCallProperty = {
  exit(path, state) {
    // NOTE: `value` has already been converted to a TSFunctionType
    const { value, leadingComments, trailingComments, loc } = path.node;
    const { typeParameters, parameters, typeAnnotation } = value;
    const replacement = t.tsCallSignatureDeclaration(
      typeParameters,
      parameters,
      typeAnnotation
    );
    replacement.leadingComments = leadingComments;
    replacement.trailingComments = trailingComments;
    replacement.loc = loc;

    trackComments(replacement, state);

    path.replaceWith(replacement);
  },
};

export const ObjectTypeProperty = {
  exit(path, state) {
    let { key } = path.node;
    const {
      value,
      optional,
      variance,
      kind,
      method,
      leadingComments,
      trailingComments,
      loc,
    } = path.node; // TODO: static, kind
    const typeAnnotation = t.tsTypeAnnotation(value);
    const initializer = undefined; // TODO: figure out when this used
    let computed = false;
    const readonly = variance && variance.kind === "plus";
    if (variance && variance.kind === "minus") {
      // TODO: include file and location of infraction
      console.warn("typescript doesn't support writeonly properties");
    }
    if (kind !== "init") {
      console.warn("we don't handle get() or set() yet, :P");
    }

    if (t.isIdentifier(key)) {
      if (key.name.startsWith("@@")) {
        key = t.memberExpression(
          t.identifier("Symbol"),
          t.identifier(key.name.replace("@@", ""))
        );
        computed = true;
      }
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
        leadingComments,
        trailingComments,
        loc,
      };

      trackComments(methodSignature, state);

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
        leadingComments,
        trailingComments,
        loc,
      };

      trackComments(propertySignature, state);

      // TODO: patch @babel/types - tsPropertySignature ignores typeAnnotation, optional, and readonly
      // const = propertySignature = t.tsPropertySignature(key, typeAnnotation, initializer, computed, optional, readonly),
      path.replaceWith(propertySignature);
    }
  },
};

export const ObjectTypeIndexer = {
  exit(path, state) {
    const {
      id,
      key,
      value,
      variance,
      leadingComments,
      trailingComments,
      loc,
    } = path.node;

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
      leadingComments,
      trailingComments,
      loc,
    };

    trackComments(indexSignature, state);

    // TODO: patch @babel/types - t.tsIndexSignature omits readonly
    // const indexSignature = t.tsIndexSignature([identifier], t.tsTypeAnnotation(value), readonly);
    path.replaceWith(indexSignature);
  },
};
