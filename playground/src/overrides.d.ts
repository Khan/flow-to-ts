// allows us to use `import` statements with .png files
declare module "*.png";

declare var module: {
  hot: {
    accept(path?: string, callback?: () => void): void;
    dispose(callback: (data: any) => void): void;
  };
};
