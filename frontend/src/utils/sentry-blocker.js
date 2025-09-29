export function disableSentry() {
  if (typeof window === 'undefined') return;
  
  // Block Sentry initialization
  window.Sentry = {
    init: () => console.warn('Sentry disabled - refresh loops prevented'),
    captureException: () => {},
    captureMessage: () => {},
    configureScope: () => {},
    withScope: (callback) => callback({ setTag: () => {}, setExtra: () => {} }),
    setUser: () => {},
    setContext: () => {},
    addBreadcrumb: () => {},
  };

  // Block Sentry loader
  window.__SENTRY__ = {
    hub: {
      getScope: () => ({ setUser: () => {}, setTag: () => {} }),
      getClient: () => null,
    },
    logger: {
      enable: () => {},
      disable: () => {},
    },
    extensions: {},
    globalEventProcessors: [],
    integrations: [],
  };

  // Prevent Sentry script loading
  const originalAppendChild = document.head.appendChild;
  document.head.appendChild = function(element) {
    if (element.src && element.src.includes('sentry')) {
      console.log('Blocked Sentry script:', element.src);
      return element;
    }
    return originalAppendChild.call(this, element);
  };

  // Block Sentry iframes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'IFRAME' && node.src?.includes('sentry')) {
          node.remove();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}