(() => {
  const metaContent = (name) => document.querySelector(`meta[name="${name}"]`)?.content ?? '';
  const appName = metaContent('app-name');
  const slugs = metaContent('algorithm-slugs').split(' ');
  const SECTIONS = [
    { key: 'text', results: 'textResults' },
    { key: 'file', results: 'fileResults' },
  ];
  const PERMALINK_PARAMS = ['algorithm', 'text', 'input', 'output'];

  // Same as Format.slug.
  const slug = (id) =>
    id
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const readJson = (key) => {
    try {
      const data = JSON.parse(localStorage.getItem(key) ?? '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch {
      return {};
    }
  };

  const rules = [];
  const solo = [];

  const showOnly = ({ key, results }, target) => {
    const rows = `#${results} .result--skeleton`;
    rules.push(
      `${rows}:not([data-slug="${target}"]){display:none}`,
      `${rows}[data-slug="${target}"]{display:grid}`,
      `#${results} .result-hidden--skeleton{display:flex}`,
    );
    solo.push(key);
  };

  const hideSaved = ({ key, results }, saved) => {
    const rows = `#${results} .result--skeleton`;
    const hidden = new Set(saved.filter((id) => typeof id === 'string').map(slug));
    const known = slugs.filter((s) => hidden.has(s));
    rules.push(`${rows}[data-default-off="true"]{display:grid}`);
    known.forEach((s) => rules.push(`${rows}[data-slug="${s}"]{display:none}`));
    rules.push(`#${results} .result-hidden--skeleton{display:${known.length ? 'flex' : 'none'}}`);
    if (slugs.length - known.length === 1) solo.push(key);
  };

  const collapse = (ids) => {
    ids
      .filter((id) => typeof id === 'string' && /^[\w-]+$/.test(id))
      .forEach((id) =>
        rules.push(`#${id}>:not(.section__label-row):not(.section__label):not(.section__body){display:none}`),
      );
  };

  const params = new URLSearchParams(location.search);
  if (PERMALINK_PARAMS.some((name) => params.has(name))) {
    const target = slug(params.get('algorithm') ?? '');
    if (slugs.includes(target)) SECTIONS.forEach((section) => showOnly(section, target));
  } else if (readJson(`${appName}-settings`).rememberView !== false) {
    const prefs = readJson(`${appName}-preferences`);
    SECTIONS.forEach((section) => {
      const saved = prefs[`${section.key}Hidden`];
      if (Array.isArray(saved)) hideSaved(section, saved);
    });
    if (Array.isArray(prefs.collapsedSections)) collapse(prefs.collapsedSections);
  }

  if (solo.length) document.documentElement.dataset.skeletonSolo = solo.join(' ');
  if (rules.length) {
    const style = document.createElement('style');
    style.textContent = rules.join('');
    document.head.appendChild(style);
  }

  setTimeout(() => {
    if (document.querySelector('[data-skeleton]')) document.documentElement.dataset.skeletonStalled = '';
  }, 10000);
})();
