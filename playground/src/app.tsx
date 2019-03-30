import * as React from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.main.js";
import smallLogo from "../images/GitHub-Mark-32px.png";
import largeLogo from "../images/GitHub-Mark-64px.png";

import convert from "../../src/convert.js";

// @ts-ignore
self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
		if (label === 'typescript' || label === 'javascript') {
			return './ts.worker.js';
		}
		return './editor.worker.js';
	},
};

monaco.languages.register({ id: 'flow' });

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
    flowCode: string,
    tsCode: string,
    error: string | null,
};

class App extends React.Component<Props, State> {
    editor: any;
    flowRef: React.RefObject<HTMLDivElement>;
    tsRef: React.RefObject<HTMLDivElement>;
    flowEditor: monaco.editor.IStandaloneCodeEditor;
    tsEditor: monaco.editor.IStandaloneCodeEditor;
    
    constructor(props: Props) {
        super(props);
        const {hash} = window.location;

        const flowCode = hash ? decodeURIComponent(hash).slice(1) : initCode;

        try {
            this.state = {
                flowCode,
                tsCode: convert(flowCode),
                error: null,
            };
        } catch (e) {
            // This shouldn't happen b/c we don't update the permalink when
            // there's a parse error.
            this.state = {
                flowCode,
                tsCode: "",
                error: e,
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
                enabled: false,
            },
        });

        this.flowEditor.onDidChangeModelContent((e) => {
            try {
                const flowCode = this.flowEditor.getValue();
                const tsCode = convert(flowCode);
                this.tsEditor.setValue(tsCode);
                this.setState({error: null});
                window.location.hash = encodeURIComponent(flowCode);
            } catch (e) {
                this.setState({error: e.toString()});
                console.log(e);
            }
        })
        
        this.tsEditor = monaco.editor.create(this.tsRef.current, {
            value: this.state.tsCode,
            language: "typescript",
            selectOnLineNumbers: true,
            fontSize: 16,
            minimap: {
                enabled: false,
            },
            readOnly: true,
        });

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
        
		window.addEventListener('resize', () => {
            if (this.flowEditor) {
                this.flowEditor.layout();
            }
            if (this.tsEditor) {
                this.tsEditor.layout();
            }
        });
    }

    render() {
        const {error} = this.state;

        const editorStyle = {
            position: "absolute",
            left: 0, top: 0, right: 0, bottom: 0,
        };

        const flowOverlayStyle = {
            position: "absolute", 
            left: 0, right: 0, bottom: 0,
            pointerEvents: error ? "" : "none",
            backgroundColor: error ? "rgba(255, 0, 0, 0.5)" : "",
            padding: 16,
            fontSize: 16,
            fontFamily: "sans-serif",
        };

        const tsOverlayStyle = {
            position: "absolute", 
            left: 0, top: 0, right: 0, bottom: 0,
            pointerEvents: "none",
            backgroundColor: error ? "rgba(255, 255, 255, 0.5)" : "",
        };

        const headerStyle = {
            fontFamily: "sans-serif",
            margin: 8,
            fontSize: 24,
            fontWeight: 300,
        };

        const tsHeaderContainer = {
            backgroundColor: "#DDD", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            paddingRight: 8,
        };

        return <div 
            style={{
                display: "grid", 
                gridTemplateColumns: "50% 50%",
                gridTemplateRows: "auto minmax(0, 1fr)",
                height: "100%",
            }}
        >
            <div style={{backgroundColor: "#DDD"}}>
                <h1 style={headerStyle}>Flow (input)</h1>
            </div>
            <div style={tsHeaderContainer}>
                <h1 style={headerStyle}>TypeScript (output)</h1>
                <a 
                    href="https://github.com/Khan/flow-to-ts"
                    target="_blank"
                >
                    <picture>
                        <source srcSet={`${smallLogo}, ${largeLogo} 2x`} />
                        <img src={smallLogo} alt="github" />
                    </picture>
                </a>
            </div>
            <div style={{position: "relative"}}>
                <div ref={this.flowRef} style={editorStyle}></div>
                <div style={flowOverlayStyle}>
                    {error}
                </div>
            </div>
            <div style={{position: "relative", display: "flex"}}>
                <div ref={this.tsRef} style={editorStyle}></div>
                <div style={tsOverlayStyle}></div>
            </div>
        </div>;
    }
}

export default App;
