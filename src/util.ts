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
  let leadingNode = node,
    trailingNode = node;

  if (Array.isArray(node)) {
    leadingNode = node[0];
    trailingNode = node[node.length - 1];
  }

  if (leadingNode.leadingComments) {
    for (const comment of leadingNode.leadingComments) {
      const { start, end } = comment;
      const key = `${start}:${end}`;

      if (state.commentsToNodesMap.has(key)) {
        state.commentsToNodesMap.get(key).leading = leadingNode;
      } else {
        state.commentsToNodesMap.set(key, { leading: leadingNode });
      }
    }
  }
  if (trailingNode.trailingComments) {
    for (const comment of trailingNode.trailingComments) {
      const { start, end } = comment;
      const key = `${start}:${end}`;

      if (state.commentsToNodesMap.has(key)) {
        state.commentsToNodesMap.get(key).trailing = trailingNode;
      } else {
        state.commentsToNodesMap.set(key, { trailing: trailingNode });
      }
    }
  }
};

export function partition<T>(
  iter: Iterable<T>,
  fn: (val: T) => bool
): [T[], T[]] {
  const l = [],
    r = [];
  for (const v of iter) {
    (fn(v) ? r : l).push(v);
  }
  return [l, r];
}

export function returning<T>(v: T, fn: (arg: T) => unknown): T {
  fn(v);
  return v;
}
