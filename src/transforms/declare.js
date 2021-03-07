const t = require("../../babel-types/lib/index.js");
const { trackComments } = require("../util.js");

exports.DeclareVariable = {
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
};

exports.DeclareClass = {
  exit(path, state) {
    const {
      id,
      body,
      typeParameters,
      leadingComments,
      trailingComments,
      loc,
    } = path.node;
    const superClass =
      path.node.extends.length > 0 ? path.node.extends[0] : undefined;

    // TODO: patch @babel/types - t.classDeclaration omits typescript params
    // t.classDeclaration(id, superClass, body, [], false, true, [], undefined)

    const replacementNode = {
      type: "ClassDeclaration",
      id,
      typeParameters,
      superClass,
      superClassTypeParameters: superClass
        ? superClass.typeParameters
        : undefined,
      body,
      declare: true,
      leadingComments,
      trailingComments,
      loc,
    };

    trackComments(replacementNode);

    path.replaceWith(replacementNode);
  },
};

exports.DeclareFunction = {
  exit(path, state) {
    const { id, leadingComments, trailingComments, loc } = path.node;
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

    const replacementNode = {
      type: "TSDeclareFunction",
      id: t.identifier(name),
      typeParameters: functionType.typeParameters,
      params: functionType.parameters,
      returnType: functionType.typeAnnotation,
      declare: !t.isDeclareExportDeclaration(path.parent),
      async: false, // TODO
      generator: false, // TODO
      leadingComments,
      trailingComments,
      loc,
    };

    trackComments(replacementNode, state);

    path.replaceWith(replacementNode);
  },
};

exports.DeclareExportDeclaration = {
  exit(path, state) {
    const {
      declaration,
      default: _default,
      leadingComments,
      trailingComments,
      loc,
    } = path.node;

    const replacementNode = {
      type: _default ? "ExportDefaultDeclaration" : "ExportNamedDeclaration",
      declaration,
      leadingComments,
      trailingComments,
      loc,
    };

    trackComments(replacementNode, state);

    path.replaceWith(replacementNode);
  },
};
