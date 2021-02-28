import * as React from "react";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/mode/jsx/jsx.js";
import "codemirror/mode/javascript/javascript.js";

import convert from "../../src/convert.js";
import OptionsPanel, { Options } from "./options-panel";
import { maybeDecodeHash, encodeHash } from "./hash";

import smallLogo from "../images/GitHub-Mark-Light-32px.png";
import largeLogo from "../images/GitHub-Mark-Light-64px.png";

const initCode = `// @flow
let a: number = 5;

type Foo<T> = {
    bar: string,
    baz: ?number,
    +qux: T,
};
`;

type Flow = {
  registerFile: (filename: string, contents: string) => void;
  setLibs: (libs: string[]) => void;
};

// Copied from https://github.com/facebook/flow/blob/master/website/_assets/js/flow-loader.js.es6
const TRY_LIB_CONTENTS = `
declare type $JSXIntrinsics = {
  [string]: {
    instance: any,
    props: {
      children?: React$Node,
      [key: string]: any,
    },
  },
};
`.slice(1);

type Props = {};
type State = {
  flowCode: string;
  tsCode: string;
  errors: string[];
  focusedEditor: any;
  options: Options;
  scroll: { x: number; y: number };
};

const defaultOptions: Options = {
  prettier: true,
  prettierOptions: {
    semi: true,
    singleQuote: false,
    tabWidth: 4,
    trailingComma: "all",
    bracketSpacing: false,
    arrowParens: "avoid",
    printWidth: 80
  },
  inlineUtilityTypes: false
};

class App extends React.Component<Props, State> {
  flowEditor: any;
  tsEditor: any;
  flow: any;

  constructor(props: Props) {
    super(props);
    const { hash } = window.location;

    const data = maybeDecodeHash(hash);

    const flowCode = (data && data.code) || initCode;
    const options = (data && data.options) || defaultOptions;

    try {
      this.state = {
        flowCode,
        tsCode: convert(flowCode, options),
        errors: [],
        focusedEditor: null,
        options,
        scroll: { x: 0, y: 0 }
      };
    } catch (e) {
      this.state = {
        flowCode,
        tsCode: "",
        errors: [e.toString()],
        focusedEditor: null,
        options: defaultOptions,
        scroll: { x: 0, y: 0 }
      };
    }
  }

  componentDidMount() {
    // Flow type checking the playground is disabled until we can figure out
    // how to enable optional chaining and nullish coalescing.
    // this.loadFlow();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      JSON.stringify(prevState.options) !== JSON.stringify(this.state.options)
    ) {
      const { flowCode } = this.state;
      // update the permalink regardless of whether conversion succeeds
      window.location.hash = encodeHash(flowCode, this.state.options);
      try {
        const tsCode = convert(flowCode, this.state.options);
        this.setState({ tsCode });
        this.typeCheck(flowCode);
      } catch (e) {
        debugger;
        this.setState({ errors: [e.toString()] });
        console.log(e);
      }
    }
  }

  loadFlow() {
    import(`../static/0.98.1/flow.js`).then((flow: Flow) => {
      Promise.all([
        fetch(`/static/0.98.1/flowlib/core.js"`),
        fetch(`/static/0.98.1/flowlib/react.js"`),
        fetch(`/static/0.98.1/flowlib/intl.js"`)
      ])
        .then(results => Promise.all(results.map(res => res.text())))
        .then(values => {
          const [core, react, intl] = values;
          try {
            flow.registerFile(`/static/0.98.1/flowlib/core.js`, core);
            flow.registerFile(`/static/0.98.1/flowlib/react.js`, react);
            flow.registerFile(`/static/0.98.1/flowlib/intl.js`, intl);
            flow.registerFile("try-lib.js", TRY_LIB_CONTENTS);
            flow.setLibs([
              `/static/0.98.1/flowlib/core.js`,
              `/static/0.98.1/flowlib/react.js`,
              `/static/0.98.1/flowlib/intl.js`,
              "try-lib.js"
            ]);
          } catch (e) {
            // ignore errors
          }

          this.flow = flow;
          this.typeCheck(this.state.flowCode);
        });
    });
  }

  update(flowCode: string) {
    window.location.hash = encodeHash(flowCode, this.state.options);
    try {
      this.setState({ flowCode });
      const tsCode = convert(flowCode, this.state.options);
      this.setState({ tsCode });
      this.typeCheck(flowCode);
    } catch (e) {
      debugger;
      this.setState({ errors: [e.toString()] });
      console.log(e);
    }
  }

  typeCheck(flowCode: string) {
    if (this.flow) {
      const errors = this.flow.checkContent("-", flowCode);
      console.log(errors);
      if (errors.length > 0) {
        this.setState({ errors: errors.map(error => error.message[0].descr) });
      } else {
        this.setState({ errors: [] });
      }
    }
  }

  render() {
    const { errors } = this.state;

    const editorStyle = {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    } as React.CSSProperties;

    const flowOverlayStyle = {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: errors.length > 0 ? "" : "none",
      zIndex: 3
    } as React.CSSProperties;

    const errorStyle = {
      backgroundColor: errors.length > 0 ? "rgba(255, 0, 0, 0.5)" : "",
      padding: 16,
      fontSize: 16,
      fontFamily: "sans-serif"
    };

    const tsOverlayStyle = {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none",
      backgroundColor: errors.length > 0 ? "rgba(255, 255, 255, 0.5)" : ""
    } as React.CSSProperties;

    const headerStyle = {
      fontFamily: "sans-serif",
      margin: 0,
      fontSize: 24,
      fontWeight: 500
    } as React.CSSProperties;

    const globalHeader = {
      backgroundColor: "#444",
      gridColumn: "1 / span 3",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 8,
      color: "white"
    } as React.CSSProperties;

    const tabStyle = {
      padding: "8px 16px 8px 16px",
      backgroundColor: "#FFF",
      fontFamily: "sans-serif",
      fontWeight: 300
    } as React.CSSProperties;

    const tabContainerStyle = {
      backgroundColor: "#DDD",
      display: "flex",
      borderBottom: "solid 1px #DDD"
    } as React.CSSProperties;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "250px calc(50% - 125px) calc(50% - 125px)",
          gridTemplateRows: "auto auto minmax(0, 1fr)",
          height: "100%",
          overflow: "hidden"
        }}
      >
        <div style={globalHeader}>
          <h1 style={headerStyle}>flow-to-ts</h1>
          <a href="https://github.com/Khan/flow-to-ts" target="_blank">
            <picture>
              <source srcSet={`${smallLogo}, ${largeLogo} 2x`} />
              <img src={smallLogo} alt="github" width={32} height={32} />
            </picture>
          </a>
        </div>
        <OptionsPanel
          options={this.state.options}
          onOptionsChange={options => this.setState({ options })}
          onCodeChange={code => this.update(code)}
        />
        <div style={tabContainerStyle}>
          <div
            style={{
              ...tabStyle,
              color:
                this.state.focusedEditor === this.flowEditor ? "black" : "#777"
            }}
          >
            input.js
          </div>
        </div>
        <div style={tabContainerStyle}>
          <div
            style={{
              ...tabStyle,
              color:
                this.state.focusedEditor === this.tsEditor ? "black" : "#777"
            }}
          >
            output.ts [readonly]
          </div>
        </div>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <CodeMirror
            value={this.state.flowCode}
            options={{
              mode: {
                name: "jsx",
                base: { name: "javascript", typescript: true }
              },
              lineNumbers: true,
              scrollbarStyle: "native"
            }}
            editorDidMount={editor => (this.flowEditor = editor)}
            onBeforeChange={(editor, data, value) => {
              this.update(value);
            }}
            onScroll={(editor, data) => {
              this.tsEditor.scrollTo(data.left, data.top);
            }}
            onFocus={(editor, event) =>
              this.setState({ focusedEditor: editor })
            }
            scroll={this.state.scroll}
          />
          <div style={flowOverlayStyle}>
            {errors.length > 0 &&
              errors.map((error, index) => (
                <div key={index} style={errorStyle}>
                  {error}
                </div>
              ))}
          </div>
        </div>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <CodeMirror
            value={this.state.tsCode}
            options={{
              mode: {
                name: "jsx",
                base: { name: "javascript", typescript: true }
              },
              lineNumbers: true,
              scrollbarStyle: "native"
            }}
            editorDidMount={editor => (this.tsEditor = editor)}
            onBeforeChange={(editor, data, value) => {
              // we only want changes to flow editor to update the ts editor
            }}
            onScroll={(editor, data) => {
              this.flowEditor && this.flowEditor.scrollTo(data.left, data.top);
            }}
            onFocus={(editor, event) =>
              this.setState({ focusedEditor: editor })
            }
            scroll={this.state.scroll}
          />
          <div style={tsOverlayStyle} />
        </div>
      </div>
    );
  }
}

export default App;
