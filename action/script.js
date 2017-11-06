let allModules;
let isEnabled = false;
let modules;
let title;
let url;

$("#open-dashboard").on("click", () => openOptions("dashboard"));
//$("#toggle-minimalist").on("click", () => toggle(-1));
$("body")
  .on("click", ".toggle-module", (evt) => toggle($(evt.currentTarget).data("index")))
  .on("click", ".anchor", (evt) => openPage($(evt.currentTarget).attr("href")));
$("#new-module").on("click", () => openOptions("new"));

chrome.extension.sendMessage({name: "isEnabled"}, (response) => {
  isEnabled = response.isEnabled;
  $("#toggle-minimalist").removeClass("disabled");
  toggleButton(-1);
});

chrome.tabs.getSelected(null, (tab) => {
  url = tab.url;
  title = tab.title;
  chrome.extension.sendMessage({
    name: "getTargetModulesOfURL",
    url: tab.url
  }, (response) => {
    modules = response.modules;
    chrome.extension.sendMessage({name: "getAllModules"}, (response) => {
      allModules = response.modules.map(Module.factory);
      const el = $("#activeModules li")
      if (modules.length > 0)
        el.remove();
      else if (url.indexOf("chrome://") !== -1 || url.indexOf("chrome-extension://") !== -1 || url.indexOf("vivaldi://") !== -1)
        el.html('<a href="http://code.google.com/chrome/extensions/faq.html#faq-dev-15" class="anchor">Page cannot be modified</a>')
          .parent()
          .css("border-bottom-color", "transparent;")
          .end()
          .siblings("a")
          .remove();
      else
        el.text("No modules for this page");

      $("#activeModules").append(...modules.map((module, i) => `
                    <li>
                        <button class="toggle-module button subtle square ${module.isEnabled ? "red" : "green"}" data-index="${i}" tip="Error: Could not get module state"><div class="fa fa-toggle-${module.isEnabled ? "on" : "off" }"></div></button>
                        <span>${modules[i].name}&nbsp;</span>
                    </li>
                `));

      $("li span").on("click", (evt) => {
        let i = $(evt.currentTarget).prev().data("index");
        if (evt.ctrlKey)
          chrome.tabs.create({
            url: chrome.extension.getURL(`/options/index.html?cmd=Options&index=${getTrueIndex(i)}`)
          });
        else if (evt.shiftKey)
          chrome.tabs.create({
            url: chrome.extension.getURL(`/options/index.html?cmd=Edit&index=${getTrueIndex(i)}`)
          });
      });
    });
  });
});

/**
 * Toggles the visual and interactive state of the button for target module
 * @param  {int} target index of target module
 */
function toggleButton(target) {
  const el = $(`.toggle-module[data-index="${target}"]`)
  if (
    (target === -1 && isEnabled) ||
    (target !== -1 && modules[target].isEnabled)
  ) {
    el.removeClass("green")
      .addClass("red")
      .attr("tip", "Disable module");
    if (target === -1)
      $("#toggle-minimalist span").text("Disable");
    else
      el.children()
        .removeClass("fa-toggle-off")
        .addClass("fa-toggle-on");
  } else {
    el.removeClass("red")
      .addClass("green")
      .attr("tip", "Enable module");
    if (target === -1)
      $("#toggle-minimalist span").text("Enable");
    else
      el.children()
        .removeClass("fa-toggle-on")
        .addClass("fa-toggle-off");
  }
}

/**
 * Toggles the enabled state of target module
 * @param  {int} target index of target module
 */
function toggle(target) {
  chrome.extension.sendMessage({
    name: $(`.toggle-module[data-index="${target}"]`).hasClass("red") ? "disable" : "enable",
    module: getTrueIndex(target)
  });
  if (target === -1)
    chrome.extension.sendMessage({name: "isEnabled"}, (response) => {
      isEnabled = response.isEnabled;
      toggleButton(-1);
      chrome.extension.sendMessage({
        name: "reload",
        module: getTrueIndex(target)
      });
    });
  else {
    chrome.extension.sendMessage({
      name: "getTargetModulesOfURL",
      url: url
    }, (response) => {
      modules = response.modules;
      toggleButton(target);
      if (isEnabled || target === -1)
        chrome.extension.sendMessage({
          name: "reload",
          module: getTrueIndex(target)
        });
    });
  }
}

/**
 * Gets the storage-side index of the module
 * @param  {int} targetIndex index of the module in the UI popup
 * @return {int}        index of the module in localStorage
 */
function getTrueIndex(targetIndex) {
  const target = modules[targetIndex];
  if (!target) return -1;
  return allModules.findIndex(
    (module) => module.name === target.name && module.author === target.author
  );
}

/**
 * Open the options page to target deep-link
 * @param  {String} target deep link for options page
 */
function openOptions(target) {
  if (target === "new")
    chrome.tabs.create({url:chrome.extension.getURL(`options/index.html#new=${stripHost(url)}&title=${title}`)});
  else if (target === "find")
    chrome.tabs.create({url:"http://wiki.minimalistsuite.com/modules"});
  else
    chrome.tabs.create({url:chrome.extension.getURL("options/index.html")});
}

/**
 * Strips a url down to its hostname
 * @param  {String} url url to strip
 * @return {String}     hostname of url
 */
function stripHost(url) {
  return url.match(/:\/\/(www\.)?(.[^\/:]+)/)[2];
}

/**
 * Opens a new tab with the given URL
 * @param  {String} target url to open
 */
function openPage(target) {
  chrome.tabs.create({url:target});
}
