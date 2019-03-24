# flow-to-ts

Convert flow code to typescript.

# Quick start

- yarn
- yarn test

# TODO

- fork @babel/traverse to allow validate() calls to be disabled
- create a playground
- handle cast/type coercion
- intersection and union types
- function predicates
- utility types (use https://github.com/piotrwitek/utility-types)
- type spreads (see https://github.com/Microsoft/TypeScript/pull/28234)
- rewrite imports
- remove $FlowFixMe, $FlowIgnore, etc. type comments
- other things (see https://github.com/niieani/typescript-vs-flowtype/blob/master/README.md)
- cli to rewrite .js files as .ts(x) files
