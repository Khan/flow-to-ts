import * as React from "react";
import MonacoEditor from 'react-monaco-editor';

import convert from "../../src/convert.js";

const initCode = `// @flow
let a: number = 5;

type Foo<T> = {
    bar: string,
    baz: ?number,
    +qux: T,
};
`;

class App extends React.Component {
    editor: any;
    
    state = {
        flowCode: initCode,
        tsCode: convert(initCode),
    };

    editorDidMount = (editor, monaco) =>{
        console.log('editorDidMount', editor);
        editor.focus();
        this.editor = editor;
    }

    componentDidMount() {
		window.addEventListener('resize', () => {
            if (this.editor) {
                this.editor.layout();
            }
        });
	}

    onChange = (newValue: string, e) => {
        const flowCode = newValue;
        const tsCode = convert(newValue);

        this.setState({
            flowCode,
            tsCode,
        });
    }

    render() {
        const options = {
            selectOnLineNumbers: true,
            fontSize: 16,
            minimap: {
                enabled: false,
            },
        };

        const {flowCode, tsCode} = this.state;
        
        return <div 
            style={{
                display: "grid", 
                gridTemplateColumns: "50% 50%",
                gridTemplateRows: "auto minmax(0, 1fr)",
                height: "100%",
            }}
        >
            <div>
                <h1>Flow (input)</h1>
            </div>
            <div>
                <h1>TypeScript (output)</h1>
            </div>
            <MonacoEditor
                language="flow" // TODO: enable syntax highlighting
                theme="vs"
                value={flowCode}
                options={options}
                onChange={this.onChange}
                editorDidMount={this.editorDidMount}
            />
            <MonacoEditor
                language="typescript" // TODO: enable syntax highlighting
                theme="vs"
                value={tsCode}
                options={{...options, readOnly: true}}
                onChange={this.onChange}
                editorDidMount={this.editorDidMount}
            />            
        </div>;
    }
}

export default App;
