let modules,
  preferences;

/**
 * Initialize
 */
chrome.extension.sendMessage({name: "getPreferences"}, (response) => {
  preferences = response.preferences;
  buildDashboard(true, () => {
    const hash = window.location.hash.replace(/^#/,"");
    if (hash.indexOf("new") > -1) {
      // module creation request
      const options = getOptions(hash);
      window.location.hash = "";
      makeNewModule(options.title, options["new"]);
    }
    // check for shortcut commands in url
    const option = getOptions();  // ?cmd=[option, edit]&index=[0, 1, ...]
    if (option["cmd"] && option["index"] >= 0)
      $(`#module-${option["index"]} .module${option["cmd"]}`).click();
  });
  $("#module-list").on("click", "#updateCoreModules", () => {
    chrome.extension.sendMessage({name: "updateCoreModulesModule"}, (response) =>
      buildDashboard(false)
    );
  });

  // listen for module controls
  $("#module-list")
    .on("click", ".moduleOptions", (evt) =>
      buildOptions($(evt.currentTarget).parent().parent().attr("id").substr(7))
    )
    .on("click", ".moduleEdit", (evt) =>
        buildEditor($(evt.currentTarget).parent().parent().attr("id").substr(7))
    )
    .on("click", ".moduleToggle", (evt) => {
      const $self = $(evt.currentTarget),
        module = $self.parent().parent().attr("id").substr(7);
      if ($self.find("span").text() === "Disable") {
        chrome.extension.sendMessage({name: "disable", module: module}, (response) => {});
        $(`#module-${module}`)
          .addClass("disabled")
          .find(".moduleToggle")
          .removeClass("red")
          .addClass("green")
          .find("span")
          .text("Enable");
      } else {
        chrome.extension.sendMessage({name: "enable", module: module}, (response) => {});
        $(`#module-${module}`)
          .removeClass("disabled")
          .find(".moduleToggle")
          .addClass("red")
          .removeClass("green")
          .find("span")
          .text("Disable");
      }
      buildDashboard(false);
    })
    .on("click", ".moduleDelete", (evt) =>
      $(evt.currentTarget).addClass("hidden").next().removeClass("hidden").next().removeClass("hidden")
    )
    .on("click", ".moduleDeleteCancel", (evt) =>
      $(evt.currentTarget).addClass("hidden").next().addClass("hidden").end().prev().removeClass("hidden")
    )
    .on("click", ".moduleDeleteConfirm", (evt) =>
      chrome.extension.sendMessage({
        name: "uninstallModule",
        module: $(evt.currentTarget).closest("li").attr("id").replace("module-","")
      }, buildDashboard)
    );

  $(document.body)
  // listen for disabled buttons
    .on("click", ".disabled", (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
    })
    // listen for navigation links
    .on("click", ".nav", (evt) => navigate($(evt.currentTarget).attr("href")));

  $("#new-module").on("click", makeNewModule);

  addOptionsListeners();
  addEditorListeners();

  // check for special hashes
  if (window.location.hash.length > 0) {
    const hash = window.location.hash.substr(1);
    if (hash === "update") {
      navigate("about");
    } else if (hash === "data") {
      navigate("data");
    }
  }

  // populate version
  $("#version").text(localStorage.version);

  // populate update
  if (localStorage.hasUpdated) {
    // show notice
    $("#update-notice").removeClass("hidden");
    $("#update-dismiss").on("click", () => {
      $("#update-notice").addClass("hidden");
      delete localStorage.hasUpdated;
    });
  }
});

/**
 * Populates modules list on dashboard
 * @param {Boolean}  andSwitch optional, false if view should NOT switch to dashboard after build
 * @param {Function} callback  optional callback function
 */
function buildDashboard(andSwitch, callback) {
  modules = undefined;
  console.debug("Loading Dashboard...");

  chrome.extension.sendMessage({name: "getAllModules"}, (response) => {
    modules = response.modules.map(Module.factory);

    const $moduleControls = $(
      `<div class="module-control">
      <button href="#options" class="moduleOptions nav button group first subtle blue"><div class="fa fa-cog pull-left"></div>Options</button>
      <button href="#edit" class="moduleEdit nav button group subtle green"><div class="fa fa-pencil pull-left"></div>Edit</button>
      <button class="moduleToggle button group subtle red"><div class="fa fa-power-off pull-left"></div><span>Disable</span></button>
      <button class="moduleDelete button group last subtle red"><div class="fa fa-trash pull-left"></div>Delete</button>
      <button class="moduleDeleteCancel button group green hidden"><div class="fa fa-ban pull-left"></div>Cancel Delete</button>
      <button class="moduleDeleteConfirm button group last red hidden"><div class="fa fa-check-circle pull-left"></div>Confirm Delete</button>
      </div>`
    );
    const $moduleList = $("#module-list").empty();

    if (modules.length === 0) {
      if (localStorage.hasUpdated) {
        chrome.extension.sendMessage({name: "updateCoreModulesModule"}, buildDashboard);
      }
      $moduleList.html(
        `<h2>You have no modules installed...</h2>
        <br>
        <button id="updateCoreModules" class="button first group big blue">
        <div class="fa fa-plus pull-left"></div>
        Install Core Modules
        </button>
        <a href="http://code.google.com/p/minimalist/wiki/Modules" class="button big last group red" target="_blank">
        <div class="fa fa-questionicon-question-sign pull-left"></div>
        What is a Module?
        </a>`
      );
    }

    // create module list
    modules.forEach((module, i) => {
      $(`
                <li id="module-${i}" class="${modules[i].isEnabled}">
                    <h2>${module.name}</h2>
                    <h4>${module.includes}</h4>
                </li>
            `)
        .append($moduleControls.clone())
        .appendTo($moduleList);
      if (!module.isEnabled)
        $(`#module-${i}`)
          .addClass("disabled")
          .find(".moduleToggle")
          .removeClass("red")
          .addClass("green")
          .find("span")
          .text("Enable");
    });
  });

  if (typeof andSwitch === "undefined" || andSwitch)
    navigate("dashboard");
  if (typeof callback === "function") callback();
}

/**
 * Creates a new module and edits it
 * @param  {String} title optional starting title of module
 * @param  {String} host  optional starting include of module
 */
function makeNewModule(title = "New Module", host = "*minimalistsuite.com*") {

  modules.push(new Module({
    name: title,
    author: "Your Name",
    includes: host,
    version: "1.0.0",
    isEnabled: true,
    options: [{
      description: "New Option",
      isEnabled: true,
      tab: "General",
      section: "General",
      type: "checkbox",
      fields: [],
      head: {},
      load: {}
    }]
  }));
  chrome.extension.sendMessage({name: "save", modules: modules});
  buildEditor(modules.length - 1);
  buildDashboard(false);
  navigate("edit");
}

/**
 * Navigates the user"s view to the given page
 * @param  {String} tag Strips "#" and any characters after the first 3
 */
function navigate(tag) {
  // truncate readable tags
  tag = tag.toLowerCase().replace("#","");
  console.debug(`Navigating to ${tag}...`);
  $("nav a.current, .page.current").removeClass("current");
  $(`#page-${tag}, #nav-${tag}`).addClass("current");
  window.location.hash = tag;
}

/**
 * Parses options from query params
 * @param  {String} url to parse from
 * @return {Object}     options parsed from url
 */
function getOptions(url = location.href) {
  const option = {};
  url.replace(/^.*\?/, "").replace(/([^=&]*)=([^=&]*)&?/g, (str, p1, p2) => {
    if (option[p1]) {
      option[p1] = typeof option[p1] === "string" ? [option[p1], p2] : option[p1].push(p2);
    } else {
      option[p1] = p2;
    }
  });
  return option;
}
