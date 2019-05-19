import { Options } from "./options-panel";

export const maybeDecodeHash = (
  hash: string
): { code: string; options: Options } => {
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

export const encodeHash = (code: string, options: Options) => {
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
