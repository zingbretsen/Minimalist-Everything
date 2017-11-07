/**
 * Minimalist
 *
 * © 2013 Ansel Santosa
 * Licensed under GNU GPL v3
 **/

let preferences,
  modules,
  bootstrapTarget,
  bodyScripts = "",
  headScripts = "",
  styles = "",
  lastCheck = null
;

chrome.extension.sendMessage({name: "getPreferences"}, (response) => {
  preferences = response.preferences;
  if (preferences.isEnabled)
    chrome.extension.sendMessage({name: "getActiveModules"}, (response) => {
        modules = response.modules;
        if (modules.length > 0) {
          buildModules();
          injectHead();
          chrome.extension.sendMessage({name: "activateBrowserAction"});
          window.addEventListener("DOMContentLoaded", injectBody);
          /*if (modules[0].bootstrapTarget) {
              window.addEventListener("DOMSubtreeModified", init);
          } else {
              console.debug("no bootstrap target. Skipping load...");
              injectBody();
          }*/
        }
      }
    );
});

// listen for openTab requests
document.addEventListener("openTab", (evt) =>
  chrome.extension.sendMessage({
    name: "openTab",
    url: evt.detail.url,
    isSelected: evt.detail.isSelected
  })
);

/**
 * Gets bootstrap target
 * @return {HTMLElement} boostrapTarget
 */
function getTarget() {
  return document.querySelectorAll(bootstrapTarget)[0];
}

/**
 * Recursively check for full initialization for AJAX pages
 */
function init() {
  console.debug("bootstrapping...");
  if (getTarget() === lastCheck) {
    return;
  }
  if (lastCheck !== null) {
    lastCheck.removeEventListener("DOMSubtreeModified", injectBody);
  }
  lastCheck = getTarget();
  if (lastCheck !== null) {
    lastCheck.addEventListener("DOMSubtreeModified", injectBody);
  }
}

/**
 * Build modules for injection
 */
function buildModules() {
  // loop through modules
  const options = [].concat(...modules.map((module) => module.options))
    .filter((option) => option.isEnabled);

  const _min = options.map((option) =>
      (option.fields.map)
      ? Object.assign({}, ...(option.fields.map((field) => ({[field.name]: field.val}))))
      : {}
    ).map(JSON.stringify);

  styles += options
    .map((option) => option.head && option.head.css)
    .filter(Boolean)
    .map((styleData) => styleData.join("\n"))
    .join("\n");

  headScripts += options
    .map((option) => option.head && option.head.js)
    .filter(Boolean)
    .map((scriptData, i) => scriptData.join("\n").replace(/_min\./g, `_min[${i}].`))
    .join("\n");

  bodyScripts += options
    .map((option) => option.load && option.load.js)
    .filter(Boolean)
    .map((scriptData, i) => scriptData.join("\n").replace(/_min\./g, `_min[${i}].`))
    .join("\n");

  while (styles.indexOf("_min.") !== -1) {
    styles = styles.replace(
      styles.substring(
        styles.indexOf("_min."),
        styles.indexOf(" ", styles.indexOf("_min."))
      ),
      JSON.parse(_min[i])[styles.substring(
        styles.indexOf("_min.") + 5,
        styles.indexOf(" ", styles.indexOf("_min."))
      )]
    );
  }
  headScripts = `\n    var _min = [${_min}];${headScripts}`;
}

/**
 * Inject scripts into body
 */
function injectBody() {
  if (bodyScripts.length > 0) {
    console.debug("injecting body JavaScript...");
    const bodies = document.getElementsByTagName("body");
    if (bodies.length > 0) {
      const scriptBlock = document.createElement("script");
      scriptBlock.appendChild(document.createTextNode(bodyScripts));
      bodies[0].appendChild(scriptBlock);
    }
  }
}

/**
 * Inject style and scripts into head
 */
function injectHead() {
  if (styles.length > 0 || headScripts.length > 0) {
    console.debug("injecting CSS...");
    const heads = document.getElementsByTagName("head");
    if (heads.length > 0) {
      if (styles.length > 0) {
        const styleBlock = document.createElement("style");
        styleBlock.appendChild(document.createTextNode(styles));
        heads[0].appendChild(styleBlock);
      }
      if (headScripts.length > 0) {
        const scriptBlock = document.createElement("script");
        scriptBlock.appendChild(document.createTextNode(headScripts));
        heads[0].appendChild(scriptBlock);
      }
    }
  }
}
