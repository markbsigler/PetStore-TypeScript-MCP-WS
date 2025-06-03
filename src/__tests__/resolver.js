const path = require('path');
const fs = require('fs');

function resolveJsToTs(request, options) {
  // If the request doesn't end with .js, let the default resolver handle it
  if (!request.endsWith('.js')) {
    return null;
  }

  // Try to resolve .ts file instead
  const tsRequest = request.replace(/\.js$/, '.ts');
  try {
    return options.defaultResolver(tsRequest, {
      ...options,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    });
  } catch (e) {
    // If that fails, try to find the file in the src directory
    const srcPath = path.join(options.basedir || process.cwd(), '..', 'src', request);
    const tsSrcPath = srcPath.replace(/\.js$/, '.ts');
    
    if (fs.existsSync(tsSrcPath)) {
      return tsSrcPath;
    }
    
    return null;
  }
}

module.exports = {
  sync: function (request, options) {
    try {
      // First try the default resolver
      return options.defaultResolver(request, options);
    } catch (error) {
      // If that fails, try to resolve .js to .ts
      const result = resolveJsToTs(request, options);
      if (result) {
        return result;
      }
      
      // If we get here, re-throw the original error
      throw error;
    }
  },
  
  // Async resolver (not used by Jest, but required by the interface)
  async: async function (request, options) {
    try {
      return this.sync(request, options);
    } catch (error) {
      const result = resolveJsToTs(request, options);
      if (result) {
        return result;
      }
      throw error;
    }
  }
};
