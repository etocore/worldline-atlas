(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r25';
  const UNIT_PATTERN = /\b(\d[\d,]*(?:\.\d+)?)\s*(Ga|Ma|ka)\b/g;
  const ROOT_SELECTORS = [
    '#timelineHud',
    '#controlPanel',
    '#placeSheet',
    '#searchShell'
  ];
  const ACCESSIBLE_ATTRIBUTES = ['aria-label', 'aria-valuetext', 'title'];

  let observer = null;
  let frame = 0;

  function expandTimeUnits(value) {
    return String(value ?? '').replace(UNIT_PATTERN, (_match, amount, unit) => {
      const word = unit === 'Ga'
        ? 'billion'
        : unit === 'Ma'
          ? 'million'
          : 'thousand';
      return `${amount} ${word} years ago`;
    });
  }

  function rewriteTextNodes(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script, style, template')) return NodeFilter.FILTER_REJECT;
        return UNIT_PATTERN.test(node.nodeValue || '')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const matches = [];
    while (walker.nextNode()) matches.push(walker.currentNode);
    matches.forEach((node) => {
      const next = expandTimeUnits(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function rewriteAccessibleText(root) {
    if (!root) return;
    const elements = [root, ...root.querySelectorAll('[aria-label], [aria-valuetext], [title]')];
    elements.forEach((element) => {
      ACCESSIBLE_ATTRIBUTES.forEach((attribute) => {
        if (!element.hasAttribute?.(attribute)) return;
        const current = element.getAttribute(attribute);
        const next = expandTimeUnits(current);
        if (next !== current) element.setAttribute(attribute, next);
      });
    });
  }

  function syncTimelineAccessibility() {
    const value = document.querySelector('#timelineHudValue')?.textContent?.trim();
    const slider = document.querySelector('#timelinePrimarySlider');
    if (value && slider && slider.getAttribute('aria-valuetext') !== value) {
      slider.setAttribute('aria-valuetext', value);
    }
  }

  function rewriteInterface() {
    frame = 0;
    ROOT_SELECTORS.forEach((selector) => {
      const root = document.querySelector(selector);
      rewriteTextNodes(root);
      rewriteAccessibleText(root);
    });
    syncTimelineAccessibility();
  }

  function scheduleRewrite() {
    if (frame) return;
    frame = requestAnimationFrame(rewriteInterface);
  }

  function install() {
    if (observer || !document.body) return false;
    observer = new MutationObserver(scheduleRewrite);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ACCESSIBLE_ATTRIBUTES
    });
    scheduleRewrite();
    globalThis.WorldlineTimeLanguage = Object.freeze({
      BUILD,
      expandTimeUnits,
      refresh: scheduleRewrite
    });
    return true;
  }

  if (!install()) {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  }
})();
