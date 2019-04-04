import * as React from "react";

// examples
import basicTypes from "!!raw-loader!../examples/basic-types.js";
import functionTypes from "!!raw-loader!../examples/function-types.js";
import generics from "!!raw-loader!../examples/generics.js";
import imports from "!!raw-loader!../examples/imports.js";
import objectTypes from "!!raw-loader!../examples/object-types.js";
import utilityTypes from "!!raw-loader!../examples/utility-types.js";

const examples = {
  basicTypes,
  functionTypes,
  generics,
  imports,
  objectTypes,
  utilityTypes
};

console.log(examples);

type PrettierOptions = {
  semi: boolean;
  singleQuote: boolean;
  tabWidth: number;
  trailingComma: "all" | "es5" | "none";
  bracketSpacing: boolean;
  arrowParens: "avoid" | "always";
  printWidth: number;
};

export type Options = {
  prettier: PrettierOptions | false;
  inlineUtilityTypes: boolean;
};

type Props = {
  options: Options;
  onOptionsChange: (newOptions: Options) => unknown;
  onCodeChange: (newCode: string) => unknown;
};

const defaultPrettierOptions = {
  semi: true,
  singleQuote: false,
  tabWidth: 4,
  trailingComma: "all",
  bracketSpacing: false,
  arrowParens: "avoid",
  printWidth: 80
} as PrettierOptions;

class OptionsPanel extends React.Component<Props> {
  prettierOptions: PrettierOptions;

  constructor(props: Props) {
    super(props);

    this.prettierOptions = props.options.prettier || defaultPrettierOptions;
  }

  componentDidUpdate() {
    // Store the most recent copy of prettier options so that we can show
    // them as disabled if someone disables prettier.
    if (this.props.options.prettier) {
      this.prettierOptions = this.props.options.prettier;
    }
  }

  handleExampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.currentTarget.value;
    if (value in examples) {
      this.props.onCodeChange(examples[value]);
    }
  };

  render() {
    const optionsPanel = {
      gridRow: "2 / span 3",
      padding: 8,
      backgroundColor: "#DDD",
      fontFamily: "sans-serif",
      color: "#333",
      display: "flex",
      flexDirection: "column"
    } as React.CSSProperties;

    const { options, onOptionsChange } = this.props;
    const prettier = options.prettier ? options.prettier : this.prettierOptions;

    return (
      <div style={optionsPanel}>
        <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 700 }}>
          Example:
        </div>
        <select onChange={this.handleExampleChange}>
          <option>Select...</option>
          <option value="basicTypes">Basic types</option>
          <option value="objectTypes">Object types</option>
          <option value="generics">Generics</option>
          <option value="utilityTypes">Utility types</option>
          <option value="functionTypes">Function types</option>
          <option value="imports">Imports</option>
        </select>

        <div style={{ marginTop: 24, fontWeight: 700 }}>Output Options</div>
        <form
          style={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            gridColumnGap: 16,
            gridRowGap: 4
          }}
        >
          <div style={{ height: 8, gridColumn: "1 / span 2" }} />
          <label htmlFor="prettier">prettier</label>
          <input
            id="prettier"
            type="checkbox"
            checked={Boolean(options.prettier)}
            onChange={e => {
              onOptionsChange({
                ...options,
                prettier: e.currentTarget.checked ? this.prettierOptions : false
              });
            }}
          />
          <div style={{ height: 0, gridColumn: "1 / span 2" }} />
          <label htmlFor="semicolons" style={{ paddingLeft: 16 }}>
            semicolons:
          </label>
          <input
            id="semicolons"
            type="checkbox"
            checked={prettier.semi}
            disabled={!options.prettier}
            onChange={e => {
              onOptionsChange({
                ...options,
                prettier: {
                  ...prettier,
                  semi: e.currentTarget.checked
                }
              });
            }}
          />
          <label htmlFor="single-quotes" style={{ paddingLeft: 16 }}>
            single quotes:
          </label>
          <input
            id="single-quotes"
            type="checkbox"
            checked={prettier.singleQuote}
            disabled={!options.prettier}
            onChange={e => {
              onOptionsChange({
                ...options,
                prettier: {
                  ...prettier,
                  singleQuote: e.currentTarget.checked
                }
              });
            }}
          />
          <label htmlFor="bracket-spacing" style={{ paddingLeft: 16 }}>
            bracket spacing:
          </label>
          <input
            id="bracket-spacing"
            type="checkbox"
            checked={prettier.bracketSpacing}
            onChange={e => {
              onOptionsChange({
                ...options,
                prettier: {
                  ...prettier,
                  bracketSpacing: e.currentTarget.checked
                }
              });
            }}
          />
          <label htmlFor="tab-width" style={{ paddingLeft: 16 }}>
            tab width:
          </label>
          <select
            id="tab-width"
            value={prettier.tabWidth}
            disabled={!options.prettier}
            onChange={e => {
              onOptionsChange({
                ...options,
                prettier: {
                  ...prettier,
                  tabWidth: Number(e.currentTarget.value)
                }
              });
            }}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
          <label htmlFor="arrow-parens" style={{ paddingLeft: 16 }}>
            arrow parens:
          </label>
          <select
            id="arrow-parens"
            value={prettier.arrowParens}
            disabled={!options.prettier}
            onChange={e => {
              onOptionsChange({
                ...options,
                prettier: {
                  ...prettier,
                  arrowParens: e.currentTarget.value as "avoid" | "always"
                }
              });
            }}
          >
            <option value="avoid">avoid</option>
            <option value="always">always</option>
          </select>
          <label htmlFor="trailing-commas" style={{ paddingLeft: 16 }}>
            trailing commas:
          </label>
          <select
            id="trailing-commas"
            value={prettier.trailingComma}
            disabled={!options.prettier}
            onChange={e => {
              onOptionsChange({
                ...options,
                prettier: {
                  ...prettier,
                  trailingComma: e.currentTarget.value as "none" | "es5" | "all"
                }
              });
            }}
          >
            <option value="none">none</option>
            <option value="es5">es5</option>
            <option value="all">all</option>
          </select>
          <label htmlFor="print-width" style={{ paddingLeft: 16 }}>
            print width:
          </label>
          <input
            id="print-width"
            type="text"
            value={prettier.printWidth}
            disabled={!options.prettier}
            onChange={e => {
              onOptionsChange({
                ...options,
                prettier: {
                  ...prettier,
                  printWidth: Number(e.currentTarget.value)
                }
              });
            }}
          />
          <div style={{ height: 8, gridColumn: "1 / span 2" }} />
          <label htmlFor="inline-utility-types">inline utility types</label>
          <input
            id="inline-utility-types"
            type="checkbox"
            checked={options.inlineUtilityTypes}
            onChange={e => {
              onOptionsChange({
                ...options,
                inlineUtilityTypes: e.currentTarget.checked
              });
            }}
          />
        </form>
      </div>
    );
  }
}

export default OptionsPanel;
