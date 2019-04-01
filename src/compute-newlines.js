const getChildren = node => {
  switch (node.type) {
    case "Program":
    case "BlockStatement":
    case "ClassBody":
      return node.body;
    case "ObjectExpression":
    case "ObjectTypeAnnotation":
      return node.properties;
    case "SwitchStatement":
      return node.cases;
    default:
      throw new Error(`cannot computed newlines on ${node.type} node`);
  }
};

/**
 * Since we don't know how many lines an updated statement will take before we codegen
 * it with babel-generator, it's hard to know how to update the loc(ation) data.  Also,
 * babel-generator doesn't respect this data when generating code.
 *
 * Instead, we look at the blank lines (gaps) betwen statements in the original code and
 * hae babel-generator use that information to ensure that the same gaps are in the output
 * code.
 *
 * Each gap is an array whose length matches the number of lines between the current
 * statement and the previous.  There is an extra gap added for lines between the last
 * statement and the end of the parent.
 *
 * Lines without comments are undefined entries in the array.  Lines with comments are
 * defined to be the comment itself.
 *
 * Example input:
 * function foo() {
 *
 *   // bar
 *   bar();
 *
 * }
 *
 * Example output:
 * gaps = [
 *   [undefined, undefined, LineComment],
 *   [undefined, undefined],
 * ];
 *
 * TODO: block comments
 *
 * @param {BlockStatment|Program} node
 */
const computeNewlines = node => {
  const children = getChildren(node);
  const newlines = [];

  const leadingLines = new Array(
    children[0].loc.start.line - node.loc.start.line
  );
  if (children[0].leadingComments) {
    for (const comment of children[0].leadingComments) {
      const offset = comment.loc.start.line - node.loc.start.line;
      const count = comment.loc.end.line - comment.loc.start.line + 1;
      leadingLines.splice(offset, count, comment);
      // ClassBody statements get printed with an extra newline after the opening
      // brace so we remove it here.
      // TODO: remove the changes we made to babel-generator/lib/base.js for
      // BlockStatement by adding extra logic here.
      if (node.type === "ClassBody") {
        leadingLines.shift();
      }
    }
  }
  newlines.push(leadingLines);

  for (let i = 0; i < children.length - 1; i++) {
    const lines = new Array(
      children[i + 1].loc.start.line - children[i].loc.end.line
    );
    if (children[i].trailingComments) {
      for (const comment of children[i].trailingComments) {
        const offset = comment.loc.start.line - children[i].loc.end.line;
        const count = comment.loc.end.line - comment.loc.start.line + 1;
        lines.splice(offset, count, comment);
      }
    }
    if (children[i + 1].leadingComments) {
      for (const comment of children[i + 1].leadingComments) {
        const offset = comment.loc.start.line - children[i].loc.end.line;
        const count = comment.loc.end.line - comment.loc.start.line + 1;
        lines.splice(offset, count, comment);
      }
    }
    // SwitchCase statements get a trailing newline, we remove it from the front
    // of the `newlines` following the SwitchCase.
    if (node.type === "SwitchStatement") {
      lines.shift();
    }
    newlines.push(lines);
  }

  const trailingLines = new Array(
    node.loc.end.line - children[children.length - 1].loc.end.line
  );

  if (children[children.length - 1].trailingComments) {
    for (const comment of children[children.length - 1].trailingComments) {
      const offset =
        comment.loc.start.line - children[children.length - 1].loc.end.line;
      const count = comment.loc.end.line - comment.loc.start.line + 1;
      if (comment.type === "CommentBlock") {
        // printer.js::_printComment() includes a newline before and after block comments
        trailingLines.splice(offset - 1, count + 1, comment);
      } else {
        trailingLines.splice(offset, count, comment);
      }
    }
  }
  newlines.push(trailingLines);

  return newlines;
};

module.exports = computeNewlines;
