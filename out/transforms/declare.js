"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclareExportDeclaration = exports.DeclareFunction = exports.DeclareClass = exports.DeclareVariable = void 0;
const t = __importStar(require("../../babel-types/lib/index.js"));
const util_js_1 = require("../util.js");
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
        const { id, body, typeParameters, leadingComments, trailingComments, loc, } = path.node;
        const superClass = path.node.extends.length > 0 ? path.node.extends[0] : undefined;
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
        util_js_1.trackComments(replacementNode);
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
            async: false,
            generator: false,
            leadingComments,
            trailingComments,
            loc,
        };
        util_js_1.trackComments(replacementNode, state);
        path.replaceWith(replacementNode);
    },
};
exports.DeclareExportDeclaration = {
    exit(path, state) {
        const { declaration, default: _default, leadingComments, trailingComments, loc, } = path.node;
        const replacementNode = {
            type: _default ? "ExportDefaultDeclaration" : "ExportNamedDeclaration",
            declaration,
            leadingComments,
            trailingComments,
            loc,
        };
        util_js_1.trackComments(replacementNode, state);
        path.replaceWith(replacementNode);
    },
};
