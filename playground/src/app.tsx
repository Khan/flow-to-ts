import * as React from "react";
import * as monaco from "monaco-editor";

import convert from "../../src/convert.js";
import OptionsPanel, { Options } from "./options-panel";

// images
import smallLogo from "../images/GitHub-Mark-Light-32px.png";
import largeLogo from "../images/GitHub-Mark-Light-64px.png";

monaco.languages.register({ id: "flow" });

const initCode = `// @flow
let a: number = 5;

type Foo<T> = {
    bar: string,
    baz: ?number,
    +qux: T,
};
`;

type Props = {};
type State = {
  flowCode: string;
  tsCode: string;
  error: string | null;
  focusedEditor: monaco.editor.IStandaloneCodeEditor;
  options: Options;
};

const defaultOptions: Options = {
  prettier: true,
  semi: true,
  singleQuote: false,
  tabWidth: 4,
  trailingComma: "all",
  bracketSpacing: false,
  arrowParens: "avoid",
  printWidth: 80,
  inlineUtilityTypes: false
};

const maybeDecodeHash = (hash: string): { code: string; options: Options } => {
  try {
    const urlParams = hash
      .slice(1)
      .split("&")
      .reduce((params, param) => {
        const [key, value] = param.split("=");
        return {
          ...params,
          [key]: value === undefined ? true : value
        };
      }, {}) as any;

    if (!urlParams.code) {
      return;
    }

    const options = {} as Options;

    if (urlParams.prettier) {
      options.prettier = Boolean(parseInt(urlParams.prettier));
    }
    if (urlParams.semi) {
      options.semi = Boolean(parseInt(urlParams.semi));
    }
    if (urlParams.singleQuote) {
      options.singleQuote = Boolean(parseInt(urlParams.singleQuote));
    }
    if (urlParams.tabWidth) {
      options.tabWidth = parseInt(urlParams.tabWidth);
    }
    if (urlParams.trailingComma) {
      options.trailingComma = urlParams.trailingComma;
    }
    if (urlParams.bracketSpacing) {
      options.bracketSpacing = Boolean(parseInt(urlParams.bracketSpacing));
    }
    if (urlParams.arrowParens) {
      options.arrowParens = urlParams.arrowParams;
    }
    if (urlParams.printWidth) {
      options.printWidth = parseInt(urlParams.printWidth);
    }
    if (urlParams.inlineUtilityTypes) {
      options.inlineUtilityTypes = Boolean(
        parseInt(urlParams.inlineUtilityTypes)
      );
    }

    const code = atob(urlParams.code);

    return { code, options };
  } catch (e) {
    return;
  }
};

const encodeHash = (code: string, options: Options) => {
  const urlParams = {
    code: btoa(code)
  } as any;

  for (const [key, value] of Object.entries(options)) {
    urlParams[key] = value;
  }

  return Object.entries(urlParams)
    .map(([key, value]) =>
      typeof value === "boolean" ? `${key}=${value ? 1 : 0}` : `${key}=${value}`
    )
    .join("&");
};

class App extends React.Component<Props, State> {
  flowRef: React.RefObject<HTMLDivElement>;
  tsRef: React.RefObject<HTMLDivElement>;
  flowEditor: monaco.editor.IStandaloneCodeEditor;
  tsEditor: monaco.editor.IStandaloneCodeEditor;

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
        error: null,
        focusedEditor: null,
        options
      };
    } catch (e) {
      this.state = {
        flowCode,
        tsCode: "",
        error: e.toString(),
        focusedEditor: null,
        options: defaultOptions
      };
    }

    this.flowRef = React.createRef();
    this.tsRef = React.createRef();
  }

  componentDidMount() {
    this.flowEditor = monaco.editor.create(this.flowRef.current, {
      value: this.state.flowCode,
      selectOnLineNumbers: true,
      language: "flow",
      fontSize: 16,
      minimap: {
        enabled: false
      }
    });

    this.flowEditor.onDidChangeModelContent(e => {
      const flowCode = this.flowEditor.getValue();
      // update the permalink regardless of whether conversion succeeds
      window.location.hash = encodeHash(flowCode, this.state.options);

      try {
        const tsCode = convert(flowCode, this.state.options);
        this.tsEditor.setValue(tsCode);
        this.setState({ error: null });
      } catch (e) {
        this.setState({ error: e.toString() });
        console.log(e);
      }
    });

    this.tsEditor = monaco.editor.create(this.tsRef.current, {
      value: this.state.tsCode,
      language: "typescript",
      selectOnLineNumbers: true,
      fontSize: 16,
      minimap: {
        enabled: false
      },
      readOnly: true
    });

    this.flowEditor.focus();

    this.flowEditor.onDidScrollChange(e => {
      const scrollTop = this.flowEditor.getScrollTop();
      this.tsEditor.setScrollTop(scrollTop);
      const scrollLeft = this.flowEditor.getScrollLeft();
      this.tsEditor.setScrollLeft(scrollLeft);
    });

    this.tsEditor.onDidScrollChange(e => {
      const scrollTop = this.tsEditor.getScrollTop();
      this.flowEditor.setScrollTop(scrollTop);
      const scrollLeft = this.tsEditor.getScrollLeft();
      this.flowEditor.setScrollLeft(scrollLeft);
    });

    this.flowEditor.onDidFocusEditorText(() => {
      this.setState({
        focusedEditor: this.flowEditor
      });
    });

    this.tsEditor.onDidFocusEditorText(() => {
      this.setState({
        focusedEditor: this.tsEditor
      });
    });

    window.addEventListener("resize", () => {
      if (this.flowEditor) {
        this.flowEditor.layout();
      }
      if (this.tsEditor) {
        this.tsEditor.layout();
      }
    });

    this.setState({
      focusedEditor: this.flowEditor
    });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      JSON.stringify(prevState.options) !== JSON.stringify(this.state.options)
    ) {
      const flowCode = this.flowEditor.getValue();
      // update the permalink regardless of whether conversion succeeds
      window.location.hash = encodeHash(flowCode, this.state.options);
      try {
        const tsCode = convert(flowCode, this.state.options);
        this.tsEditor.setValue(tsCode);
        const { options } = this.state;
        this.tsEditor.getModel().updateOptions({ tabSize: options.tabWidth });
      } catch (e) {
        debugger;
        this.setState({ error: e.toString() });
        console.log(e);
      }
    }
  }

  render() {
    const { error } = this.state;

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
      pointerEvents: error ? "" : "none",
      backgroundColor: error ? "rgba(255, 0, 0, 0.5)" : "",
      padding: 16,
      fontSize: 16,
      fontFamily: "sans-serif"
    } as React.CSSProperties;

    const tsOverlayStyle = {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none",
      backgroundColor: error ? "rgba(255, 255, 255, 0.5)" : ""
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
          onCodeChange={code => this.flowEditor.setValue(code)}
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
        <div style={{ position: "relative" }}>
          <div ref={this.flowRef} style={editorStyle} />
          <div style={flowOverlayStyle}>{error}</div>
        </div>
        <div style={{ position: "relative", display: "flex" }}>
          <div ref={this.tsRef} style={editorStyle} />
          <div style={tsOverlayStyle} />
        </div>
      </div>
    );
  }
}

export default App;
