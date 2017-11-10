/**
 * Build options page
 * @param  {Int} i index of module to load options for
 */
function buildOptions(moduleIndex) {
  console.debug(`Loading options page for ${modules[moduleIndex].name}...`);
  const options = modules[moduleIndex].options,
    tabs = {};

  // set name
  $("#page-options h1").text(modules[moduleIndex].name).attr("id", "module-" + moduleIndex);

  // clear existing content
  $("#options-nav ~ .tab, #options-nav li").remove();

  // loop through options

  options.forEach((option, i) => {
    // create input element
    const $input = $(`<input id="option-${i}" type="${option.type}">`).prop("checked", option.isEnabled),
      $label = $(`<label for="option-${i}"><div class="input">&#10003;</div>${option.description}</label>`);

    const optionTab = tabs[option.tab] || (tabs[option.tab] = []);
    const optionSection = optionTab[option.section] || (optionTab[option.section] = []);
    optionSection.push($input, $label);

    // check if option has fields
    if (option.fields && option.fields.length > 0) {
      const $fields = $("<div></div>");
      // loop through fields
      $fields.append(...option.fields.map((field) =>
        `<div class="option-${i} field-row">
<label>${option.fields[j].description}: </label>
<input type="text" class="${option.fields[j].isColor ? "color" : ""}" value="${option.fields[j].val || ""}">
</div>`));
      // add field to option
      optionSection.push($fields);
    }
  });

  // clear existing tab
  $("#options-nav > li:first-child").remove();
  // loop through tabs
  Object.entries(tabs).forEach(([label, tab]) => {
    // create tab and tab wrappers
    $(`<li href="#options-tab-${label.replace(" ", "").toLowerCase()}">${label}</li>`).appendTo("#options-nav");
    const $tab = $(`<div id="options-tab-${label.split(" ").join("").toLowerCase()}" class="tab"></div>`);
    const $tabContent = $('<div class="table"></div>');

    Object.entries(tab).forEach(([label, section]) => {
      // create section
      const $section = $(
        `<section><h3>${label}</h3></section>`
      );
      // create options wrapper
      const $options = $("<div></div>");
      $options.append(...section);
      $options.appendTo($section)
      $section.appendTo($tabContent);
    });
    $tabContent.appendTo($tab);
    $("#options-wrapper").append($tab);
  });

  // create about tab
  $('<li href="#options-tab-about">About</li>').appendTo("#options-nav");
  const $tabAbout = $('<div id="options-tab-about" class="tab"></div>');

  // check if module has about page
  if (modules[moduleIndex].hasOwnProperty("about"))
    $tabAbout.html(modules[moduleIndex].about.join("\n"));
  else
    $tabAbout.text("No about page...");

  $tabAbout.appendTo($("#options-wrapper"));

  // Select first tab
  $("#options-nav li:first-child, #options-nav + .tab").addClass("current");

  // Initialize color fields
  $(".color").colorPicker({
    dir: "../img/libs/",
    format: "rgba",
    preview: true,
    userinput: true,
    validate: true,
    color: null
  });

  // reset Save Changes button
  $("#save-options")
    .addClass("disabled")
    .find("span")
    .text("Save Changes");
}

/**
 * Adds event listeners for options page
 */
function addOptionsListeners() {
  console.debug("Adding options listeners...");
  $("#save-options").on("click", saveOptions);
  addSaveHotkey();

  // listen for options tab navigation
  $("#options-nav").on("click", "li", (evt) => {
    const $self = $(evt.currentTarget);
    // select current tab
    $("#options-nav .current").removeClass("current");
    $self.addClass("current");

    // show current content
    $(".tab.current").removeClass("current");
    $($self.attr("href")).addClass("current");
  });

  // listen for options changes
  $("#page-options")
    .on("change", "input", activatesaveOptionsButton)
    .on("focusout", ".color", activatesaveOptionsButton)
    .on("keypress", ".field", activatesaveOptionsButton);
}

/**
 * Sets Save Changes button to active state
 */
function activatesaveOptionsButton() {
  $("#save-options")
    .removeClass("disabled")
    .find("span")
    .text("Save Changes")
  ;
}

/**
 * Saves current options
 */
function saveOptions() {
  const moduleIndex = $("#page-options h1").attr("id").replace("module-",""),
    options = modules[moduleIndex].options;

  // loop through options
  options.forEach((option, i) => {
    option.isEnabled = $(`#option-${i}`).is(":checked");
    option.fields.forEach((field, j) =>
      field.val = $(`.option-${i}.field-row:nth-child(${j + 1}) input`).val()
    );
  });
  // send updated module
  chrome.extension.sendMessage({name: "save", modules: modules}, () => {
    // inform user and reload relevant pages
    $("#save-options")
      .addClass("disabled")
      .find("span")
      .text("Changes Saved!");
    chrome.extension.sendMessage({name: "reload", module: moduleIndex});
  });
}
