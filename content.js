(function () {
  "use strict";

  /**
   * Extract the current search query from the URL.
   */
  function getQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  }

  /**
   * Build the Google Search URL for a given query string.
   */
  function googleUrl(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  /**
   * The inline SVG for the classic Google "G" logo (official colours).
   */
  function googleLogoSVG() {
    return `<svg viewBox="0 0 48 48" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>`;
  }

  /**
   * Create the Google redirect button element.
   */
  function createButton(query) {
    const btn = document.createElement("a");
    btn.id = "bg-google-redirect-btn";
    btn.href = googleUrl(query);
    btn.target = "_self";
    btn.title = `Search "${query}" on Google`;
    btn.setAttribute("aria-label", `Search "${query}" on Google`);
    btn.innerHTML = googleLogoSVG();
    return btn;
  }

  /**
   * Find the search bar form/container and place button to its right.
   * We try multiple selectors to be robust against DOM changes.
   */
  function findSearchBarContainer() {
    // Try the form that wraps the search input
    const selectors = [
      "form#searchform",
      "form[action='/search']",
      "#searchbox-container",
      ".searchbox",
      "#searchbox"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        // Walk up to the form or a meaningful container
        if (sel === "#searchbox") {
          // Walk up from input to find the form
          let parent = el.closest("form");
          if (parent) return parent;
          // Or find the wrapper div
          parent = el.closest("[class*='searchbox']") || el.parentElement;
          return parent;
        }
        return el;
      }
    }
    return null;
  }

  /**
   * Ensure the button exists on the page. Called repeatedly.
   */
  function ensureButton() {
    const query = getQuery();
    if (!query) return;

    // Already present? Done.
    if (document.getElementById("bg-google-redirect-btn")) return;

    const searchBar = findSearchBarContainer();
    if (searchBar) {
      const btn = createButton(query);

      const parent = searchBar.parentElement;
      if (parent) {
        // Force the parent into a flex row so the button sits on the same line
        parent.style.display = "flex";
        parent.style.alignItems = "center";
        parent.style.flexWrap = "nowrap";

        // Insert button right after the search bar
        searchBar.insertAdjacentElement("afterend", btn);
        console.log("[Brave→Google] ✅ Button injected after search bar");
      } else {
        document.body.appendChild(btn);
        btn.classList.add("bg-btn-fixed");
        console.log("[Brave→Google] ✅ Button injected (fixed fallback)");
      }
    }
  }

  // --- Persistent injection via MutationObserver ---
  // Brave Search (Svelte) re-renders the DOM frequently, removing our button.
  // We watch for removals and re-inject immediately.
  function startPersistentInjection() {
    // Initial injection
    ensureButton();

    // Poll briefly on load for Svelte hydration
    const intervals = [100, 300, 600, 1000, 2000, 4000];
    intervals.forEach((ms) => setTimeout(ensureButton, ms));

    // MutationObserver: re-inject whenever our button gets removed
    const observer = new MutationObserver((mutations) => {
      // Check if our button was removed
      if (!document.getElementById("bg-google-redirect-btn")) {
        ensureButton();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Also handle SPA navigation (URL changes without page reload)
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Remove old button, re-inject with new query
        const old = document.getElementById("bg-google-redirect-btn");
        if (old) old.remove();
        setTimeout(ensureButton, 300);
      }
    }, 500);
  }

  // --- Start ---
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPersistentInjection);
  } else {
    startPersistentInjection();
  }
})();
