# flow-to-ts

Convert flow code to typescript.

# Quick start

- yarn
- In @babel/traverse/lib/path/replacement.js disable the calls to validate() 
  in _replaceWith(node).
- yarn test

# TODO

- fork @babel/traverse to allow validate() calls to be disabled
- create a playground
- handle cast/type coercion
- intersection and union types
- function predicates
- utility types
- convert spreads to intersection types
- rewrite imports
- remove $FlowFixMe, $FlowIgnore, etc. type comments
- cli to rewrite .js files as .ts(x) files
