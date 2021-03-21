/**
 * Track which nodes a comment is attached to.
 *
 * state.commentsToNodesMap is a Map() between comment position in the file and
 * an object with references to node(s) it was attached to as either a leading
 * or trailing comment (or both).
 *
 * In order to call this function correctly, the transformed node must be passed
 * in.  This requires copying over the following properties from the original
 * node:
 * - loc
 * - leadingComments
 * - trailingComments
 *
 * NOTE: The copied `loc` will be wrong for the new node.  It's need by convert
 * though which uses it to determine whether maintain the position of trailing
 * line comments.
 *
 * @param {*} node
 * @param {*} state
 */
export const trackComments = (node, state) => {
  if (node.leadingComments) {
    for (const comment of node.leadingComments) {
      const { start, end } = comment;
      const key = `${start}:${end}`;

      if (state.commentsToNodesMap.has(key)) {
        state.commentsToNodesMap.get(key).leading = node;
      } else {
        state.commentsToNodesMap.set(key, { leading: node });
      }
    }
  }
  if (node.trailingComments) {
    for (const comment of node.trailingComments) {
      const { start, end } = comment;
      const key = `${start}:${end}`;

      if (state.commentsToNodesMap.has(key)) {
        state.commentsToNodesMap.get(key).trailing = node;
      } else {
        state.commentsToNodesMap.set(key, { trailing: node });
      }
    }
  }
};
