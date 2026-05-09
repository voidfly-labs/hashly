function buildBaseTagMap(routes) {
  return Object.fromEntries(Object.entries(routes).map(([, tmpl]) => [tmpl, tmpl.slice(0, tmpl.lastIndexOf('/') + 1)]));
}

function rewriteMiddleware(routes) {
  return (req, res, next) => {
    if (routes[req.url]) req.url = routes[req.url];
    next();
  };
}

function injectBaseTag(html, baseHref) {
  return html.replace('<head>', `<head><base href="${baseHref}">`);
}

/**
 * @param {Record<string, string>} routes - map of request path → template path
 */
export function devRewrites(routes) {
  const baseTagMap = buildBaseTagMap(routes);

  return {
    name: 'dev-rewrites',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(rewriteMiddleware(routes));
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.server) return html;
        const baseHref = baseTagMap[ctx.path];
        return baseHref ? injectBaseTag(html, baseHref) : html;
      },
    },
  };
}
