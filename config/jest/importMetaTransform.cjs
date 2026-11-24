const reactScriptsTransform = require('react-scripts/config/jest/babelTransform');

module.exports = {
  ...reactScriptsTransform,
  process(source, filename, options) {
    const jestCompatibleSource = source.replace(
      /import\.meta\.env\.VITE_API_BASE_URL/g,
      'process.env.VITE_API_BASE_URL'
    );
    return reactScriptsTransform.process(jestCompatibleSource, filename, options);
  },
};
