import * as t from "@babel/types";

export const ImportSpecifier = {
  exit(path, state) {
    const { local, imported } = path.node;

    if (
      path.parent.source.value === "react" &&
      // TODO: Support transforming unqualified React types imported as aliases.
      local.name === imported.name
    ) {
      state.unqualifiedReactImports.add(local.name);

      if (local.name in QualifiedReactTypeNameMap) {
        return t.importSpecifier(
          t.identifier(QualifiedReactTypeNameMap[local.name]),
          t.identifier(QualifiedReactTypeNameMap[local.name])
        );
      }

      if (local.name === "ElementConfig") {
        return t.importSpecifier(
          t.identifier("ComponentProps"),
          t.identifier("ComponentProps")
        );
      }
    }
  },
};

export const ImportDeclaration = {
  exit(path, state) {
    if (path.node?.source?.value === "react") {
      let seenComponentProps = false;
      path.node.specifiers = (path.node.specifiers ?? []).filter((n) => {
        if (
          n.local?.name === "ComponentProps" &&
          n.imported?.name === "ComponentProps"
        ) {
          if (!seenComponentProps) {
            seenComponentProps = true;
            return true;
          } else {
            return false;
          }
        } else if (
          n.local?.name === "ChildrenArray" &&
          n.imported?.name === "ChildrenArray"
        ) {
          return false;
        } else {
          return true;
        }
      });
    }
  },
};

export const GenericTypeAnnotation = {
  exit(path, state) {
    const { id: typeName, typeParameters } = path.node;

    if (typeName.name in UnqualifiedReactTypeNameMap) {
      // TODO: make sure that React was imported in this file
      return t.tsTypeReference(
        t.tsQualifiedName(
          t.identifier("React"),
          t.identifier(UnqualifiedReactTypeNameMap[typeName.name])
        ),
        // TypeScript doesn't support empty type param lists
        typeParameters && typeParameters.params.length > 0
          ? typeParameters
          : null
      );
    }

    if (
      typeName.name in QualifiedReactTypeNameMap &&
      state.unqualifiedReactImports.has(typeName.name)
    ) {
      return t.tsTypeReference(
        t.identifier(QualifiedReactTypeNameMap[typeName.name])
      );
    }

    if (typeName.name === "React$Node") {
      // React$Node -> React.ReactNode
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier("React"), t.identifier("ReactNode"))
      );
    }

    if (typeName.name === "React$Element") {
      // React$Element<T> -> React.ReactElement<React.ComponentProps<T>, T>
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier("React"), t.identifier("ReactElement")),
        t.tsTypeParameterInstantiation([
          // React.ComponentProps<T>
          t.tsTypeReference(
            t.tsQualifiedName(
              t.identifier("React"),
              t.identifier("ComponentProps")
            ),
            t.tsTypeParameterInstantiation([typeParameters.params[0]])
          ),
          typeParameters.params[0],
        ])
      );
    }

    if (typeName.name === "React$Component") {
      // React$Component<Props, State> -> React.Component<Props, State>
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier("React"), t.identifier("Component")),
        typeParameters
      );
    }

    if (typeName.name === "React$ComponentType") {
      // React$ComponentType<Props> -> React.ComponentType<Props>
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier("React"), t.identifier("ComponentType")),
        typeParameters
      );
    }

    if (typeName.name === "React$Context") {
      // React$Context<T> -> React.Context<T>
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier("React"), t.identifier("Context")),
        typeParameters
      );
    }

    if (typeName.name === "React$Ref") {
      // React$Ref<T> -> React.Ref<T>
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier("React"), t.identifier("Ref")),
        typeParameters
      );
    }

    if (typeName.name === "React$StatelessFunctionalComponent") {
      // React$StatelessFunctionalComponent<Props> -> React.FC<Props>
      return t.tsTypeReference(
        t.tsQualifiedName(t.identifier("React"), t.identifier("FC")),
        typeParameters
      );
    }

    if (
      typeName.name === "ChildrenArray" &&
      state.unqualifiedReactImports.has("ChildrenArray")
    ) {
      return t.tsUnionType([
        typeParameters.params[0],
        t.tsArrayType(typeParameters.params[0]),
      ]);
    }

    if (
      typeName.name === "ElementConfig" &&
      state.unqualifiedReactImports.has("ElementConfig")
    ) {
      // ElementConfig<T> -> JSX.LibraryManagedAttributes<T, ComponentProps<T>>
      return t.tsTypeReference(
        t.tsQualifiedName(
          t.identifier("JSX"),
          t.identifier("LibraryManagedAttributes")
        ),
        t.tsTypeParameterInstantiation([
          typeParameters.params[0],
          t.tsTypeReference(
            t.identifier("ComponentProps"),
            t.tsTypeParameterInstantiation([typeParameters.params[0]])
          ),
        ])
      );
    }

    if (t.isTSQualifiedName(typeName)) {
      const { left, right } = typeName;

      // React.ElementConfig<T> -> JSX.LibraryManagedAttributes<T, React.ComponentProps<T>>
      if (
        t.isIdentifier(left, { name: "React" }) &&
        t.isIdentifier(right, { name: "ElementConfig" })
      ) {
        return t.tsTypeReference(
          t.tsQualifiedName(
            t.identifier("JSX"),
            t.identifier("LibraryManagedAttributes")
          ),
          t.tsTypeParameterInstantiation([
            typeParameters.params[0],
            t.tsTypeReference(
              t.tsQualifiedName(
                t.identifier("React"),
                t.identifier("ComponentProps")
              ),
              t.tsTypeParameterInstantiation([typeParameters.params[0]])
            ),
          ])
        );
      }

      if (
        t.isIdentifier(left, { name: "React" }) &&
        t.isIdentifier(right, { name: "ChildrenArray" })
      ) {
        return t.tsUnionType([
          typeParameters.params[0],
          t.tsArrayType(typeParameters.params[0]),
        ]);
      }
    }
  },
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

  // React$ElementType takes no type params, but React.ElementType takes one
  // optional type param
  React$ElementType: "ElementType",
};

export const QualifiedTypeIdentifier = {
  exit(path, state) {
    const { qualification, id } = path.node;
    const left = qualification;
    const right = id;

    if (left.name === "React" && right.name in QualifiedReactTypeNameMap) {
      return t.tsQualifiedName(
        left,
        t.identifier(QualifiedReactTypeNameMap[right.name])
      );
    }
  },
};

// Only types with different names are included.
const QualifiedReactTypeNameMap = {
  Node: "ReactNode",
  Text: "ReactText",
  Child: "ReactChild",
  Element: "ReactElement", // 1:1 mapping is wrong, since ReactElement takes two type params
  Portal: "ReactPortal",
  NodeArray: "ReactNodeArray",

  // TODO: private types, e.g. React$ElementType, React$Node, etc.

  // TODO: handle ComponentType, ElementConfig, ElementProps, etc.
};
