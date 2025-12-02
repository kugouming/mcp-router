const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

// Enable type checking in both development and production
export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: "webpack-infrastructure",
    typescript: {
      configFile: "./tsconfig.json",
    },
  }),
];
