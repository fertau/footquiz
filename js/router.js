// Simple hash router
export class Router {
  constructor(routes) {
    this.routes = routes;
    this._onHashChange = this._onHashChange.bind(this);
    window.addEventListener('hashchange', this._onHashChange);
  }

  start() {
    this._onHashChange();
  }

  _onHashChange() {
    const hash = location.hash || '#/';
    for (const [pattern, handler] of Object.entries(this.routes)) {
      const match = this._match(pattern, hash);
      if (match) {
        handler(match.params);
        return;
      }
    }
    // Fallback to home
    location.hash = '#/';
  }

  _match(pattern, hash) {
    const patternParts = pattern.split('/');
    const hashParts = hash.split('/');
    if (patternParts.length !== hashParts.length) return null;
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(hashParts[i]);
      } else if (patternParts[i] !== hashParts[i]) {
        return null;
      }
    }
    return { params };
  }

  navigate(hash) {
    location.hash = hash;
  }
}
