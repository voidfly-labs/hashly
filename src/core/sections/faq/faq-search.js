import { Format } from '~core/lib/format.js';
import { iconHref } from '~core/lib/icon.js';
import { findRanges, matchesTerms, searchTerms } from '~core/lib/search.js';
import { createSearchField } from '~core/ui/search-field/search-field.js';

// Set on what a search leaves out: a question (its heading and what follows it) or a panel with
// no match, and, as `DIM`, a tab whose panel has none. See faq.css.
const MISS = 'data-faq-miss';
const DIM = 'data-faq-dim';

/** The FAQ's search: a field under the tab strip that, while it holds a query, shows the matching
 *  questions of every panel at once (each panel under a label with its tab's name), hides the rest
 *  and marks the matches. Clearing it brings the tab view back as it was.
 *
 *  A panel is a flat run of siblings, so a question is an `h3` with what follows it up to the next `h3`.
 *
 *  `info` is the FAQ's card and `tabs`/`panels` its tabs and their panels, in the same order.
 *  Returns `{ clear, searching }`; `clear()` ends a search without touching the tab view. */
export function createFaqSearch({ info, tabs, panels }) {
  const groups = panels.flatMap((panel, i) => {
    const label = document.createElement('div');
    label.className = 'info__panel-label';
    label.append(
      tabs[i].firstChild.textContent.trim(),
      Object.assign(document.createElement('span'), { className: 'info__panel-count' }),
    );
    panel.prepend(label);

    const found = [];
    for (const node of [...panel.children].slice(1)) {
      if (node.tagName === 'H3') found.push({ panel, tab: tabs[i], nodes: [] });
      found[found.length - 1]?.nodes.push(node);
    }
    return found;
  });

  const empty = document.createElement('div');
  empty.className = 'info__empty';
  empty.hidden = true;
  info.append(empty);

  const field = createSearchField({
    label: 'Search the FAQ',
    placeholder: 'Search questions and answers',
    mobilePlaceholder: 'Search the FAQ',
    noun: 'questions',
    onChange: run,
  });
  tabs[0].closest('.info__tabs-wrap').after(field.el);
  field.update({ matched: groups.length, total: groups.length });

  const input = field.el.querySelector('input');
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !input.value) return;
    e.preventDefault();
    field.reset();
    run('');
  });
  empty.addEventListener('click', (e) => {
    if (!e.target.closest('[data-search-clear]')) return;
    field.reset();
    run('');
    input.focus();
  });

  /** Replaces every mark under `root` by its text, so the next search starts from plain text. */
  function unmark(root) {
    for (const mark of root.querySelectorAll('mark')) {
      const parent = mark.parentNode;
      mark.replaceWith(mark.textContent);
      parent.normalize();
    }
  }

  /** Wraps the occurrences of `terms` in the text under `node` in `<mark>`. */
  function mark(node, terms) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (const text of texts) {
      const ranges = findRanges(text.data, terms);
      if (!ranges.length) continue;
      const fragment = document.createDocumentFragment();
      let at = 0;
      for (const [start, end] of ranges) {
        fragment.append(text.data.slice(at, start));
        fragment.append(Object.assign(document.createElement('mark'), { textContent: text.data.slice(start, end) }));
        at = end;
      }
      fragment.append(text.data.slice(at));
      text.replaceWith(fragment);
    }
  }

  function run(query) {
    const terms = searchTerms(query);
    unmark(info);

    const perPanel = new Map(panels.map((p) => [p, 0]));
    let matched = 0;
    for (const group of groups) {
      const hit =
        !terms.length ||
        matchesTerms(
          terms,
          group.nodes.map((n) => n.textContent),
        );
      for (const node of group.nodes) node.toggleAttribute(MISS, !hit);
      if (!hit) continue;
      matched++;
      perPanel.set(group.panel, perPanel.get(group.panel) + 1);
      if (terms.length) group.nodes.forEach((n) => mark(n, terms));
    }

    info.classList.toggle('info--searching', terms.length > 0);
    panels.forEach((panel, i) => {
      const count = perPanel.get(panel);
      const miss = terms.length > 0 && !count;
      panel.toggleAttribute(MISS, miss);
      tabs[i].toggleAttribute(DIM, miss);
      panel.querySelector('.info__panel-count').textContent = count === 1 ? '1 match' : `${count} matches`;
    });

    empty.hidden = !terms.length || matched > 0;
    if (!empty.hidden) {
      empty.innerHTML = `
        <svg class="info__empty-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('search')}"></use></svg>
        <p class="info__empty-text">No questions match “${Format.escapeHtml(query.trim())}”</p>
        <button type="button" class="btn" data-search-clear>
          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('close')}"></use></svg>
          Clear search
        </button>`;
    }
    field.update({ matched, total: groups.length });
  }

  return {
    searching: () => info.classList.contains('info--searching'),
    clear() {
      if (!field.value()) return;
      field.reset();
      run('');
    },
  };
}
