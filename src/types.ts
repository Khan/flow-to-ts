export type Options = {
  inlineUtilityTypes: boolean;
  prettier: boolean;
  prettierOptions: {
    semi: boolean;
    singleQuote: boolean;
    tabWidth: number;
    trailingComma: "all" | "es5" | "none";
    bracketSpacing: boolean;
    arrowParens: "avoid" | "always";
    printWidth: number;
  };
  retainLines: boolean;
  debug: boolean;
};
