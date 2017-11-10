
/**
 * Module editor for Minimalist
 *
 * © 2013 Ansel Santosa
 * Licensed under GNU GPL v3
 **/

let editorCss,
  editorJs,
  editorJsBody,
  editorAbout;

/**
 * Build module editor
 * @param {Int}      i        index of module to edit
 * @param {Function} callback optional callback function
 */
function buildEditor(moduleIndex, callback) {
  const options = modules[moduleIndex].options;

  // set name
  $("#page-edit h1").attr("id", `module-${moduleIndex}`).text(modules[moduleIndex].name);

  // reset tree
  $("#options-tree").html('<li id="metadata">Module Metadata<li>');

  // populate metadata
  $("#moduleName").val(modules[moduleIndex].name);
  $("#moduleAuthor").val(modules[moduleIndex].author);
  $("#moduleIncludes").val(modules[moduleIndex].includes);
  $("#moduleVersion").val(modules[moduleIndex].version || "");

  // loop through options
  $("#options-tree").append(...options.map((option, j) =>
    `<li id="edit-option-${j}" class="edit-option">
      <span>${option.description}</span>
      </li>`));

  // add option creator
  $(
    `<li>
    <button id="option-new" class="button blue"><div class="fa fa-plus pull-left"></div>Add Option</button>
    </li>`
  ).appendTo("#options-tree");

  // view metadata by default
  $("#metadata").addClass("current");
  $("#meta-module").removeClass("hidden");
  $("#meta-option, #editors").addClass("hidden");

  editorAbout = editorAbout || $("#editor-about")[0];

  editorCss = editorCss || $("#editor-css")[0];

  editorJs = editorJs || $("#editor-js")[0];

  editorJsBody = editorJsBody || $("#editor-js-body")[0];

// populate about field
  if (modules[moduleIndex].hasOwnProperty("about"))
    editorAbout.value = modules[moduleIndex].about.join("");



  editorAbout.addEventListener("input", activateEditSaveButton);
  editorCss.addEventListener("input", activateEditSaveButton);
  editorJs.addEventListener("input", activateEditSaveButton);
  editorJsBody.addEventListener("input", activateEditSaveButton);

  if (typeof callback === "function") callback();
}

/**
 * Create new option
 */
function makeNewOption() {
  const moduleIndex = $("#page-edit h1").attr("id").replace("module-",""),
    option = {
      description: "New Option",
      isEnabled: true,
      tab: "General",
      section: "General",
      type: "checkbox",
      fields: [],
      head: {},
      load: {}
    };
  modules[moduleIndex].options.push(option);
  chrome.extension.sendMessage({name: "save", modules: modules}, () => {
    buildEditor(moduleIndex);
    editOption(modules[moduleIndex].options.length - 1);
  });
}

/**
 * Delete option from module
 * @param  {Int} optionIndex index of option to be deleted
 */
function deleteOption(optionIndex) {
  const moduleIndex = $("#page-edit h1").attr("id").replace("module-","");
  modules[moduleIndex].options.splice(optionIndex, 1);

  chrome.extension.sendMessage({name: "save", modules: modules}, () =>
    buildEditor($("#page-edit h1").attr("id").replace("module-",""))
  );
}

/**
 * Add event listeners to editor
 */
function addEditorListeners() {
  console.debug("Adding editor listeners...");

  // reset save button
  $("#save-edits").addClass("disabled").text("Save Changes");

  $("#optionAdvanced").on("click", (evt) => {
    $("#meta-option .editor-row.hidden").removeClass("hidden");
    $(evt.currentTarget).parent().parent().addClass("hidden");
  });

  $("#options-tree")
    .on("click", "#metadata", (evt) => {
      $("#options-tree .current").removeClass("current");
      $(evt.currentTarget).addClass("current");

      $("#meta-module").removeClass("hidden");
      $("#meta-option, #editors").addClass("hidden");
    })
    .on("click", "#option-new", makeNewOption)
    .on("click", ".edit-option", (evt) =>
      editOption($(evt.currentTarget).attr("id").replace("edit-option-","")))
    // toggle tree
    .on("click", ".edit-tab, .edit-section", (evt) => {
      const $self = $(evt.currentTarget);
      if ($self.parent().hasClass("collapsed"))
        $self.parent()
          .animate({
            height: $self.parent().attr("min_height")
          }, 150, (evt) => {
            $(evt.currentTarget)
              .removeClass("collapsed")
              .attr("style","")
            ;
          });
      else
        $self
          .parent()
          .attr("min_height", $self.parent().height())
          .animate({height: 16}, 150)
          .addClass("collapsed");
    }
  );

  $("#option-delete").on("click", (evt) =>
    $(evt.currentTarget)
      .addClass("hidden")
      .siblings()
      .removeClass("hidden")
  );
  $("#option-delete-cancel").on("click", (evt) =>
    $(evt.currentTarget)
      .add("#option-delete-confirm")
      .addClass("hidden")
      .siblings("#option-delete")
      .removeClass("hidden")
  );
  $("#option-delete-confirm").on("click", () =>
    deleteOption($("#options-tree .current").attr("id").replace("edit-option-",""))
  );

  // listen for content changes
  $("#meta-module input, #meta-option input").on("keypress", activateEditSaveButton);
  $("#meta-module input, #meta-option input").on("keydown", checkForChange);
  $('#meta-option input[type="checkbox"]').on("change", activateEditSaveButton);

  $("#save-edits").click((evt) => saveEdits(evt.shiftKey));

  $("#deleteScreen").on("click", () => {
    $("#optionPreview").removeAttr("src");
    $("#uploadScreenButton").removeClass("group last");
    activateEditSaveButton();
  });

  $("#page-edit")
    .on("click", ".isColor", (evt) => { // init color picker
    const $self = $(evt.currentTarget)
    if ($self.is(":checked")) {
      $self.prev().colorPicker({
        dir: "../../img/libs/",
        format: "rgba",
        preview: true,
        userinput: true,
        validate: true,
        color: null
      });
    } else {
      $self.prev().colorPicker("destroy");
    }
  })
    .on("click", "#newField", (evt) => {
      const $self = $(evt.currentTarget)
      const count = $self.siblings(".field-row").length + 1;
      $self.before($(
        `<div class="field-row" count="${count}">
         <input type="text" class="s desc normal" size="20" tip="field description">
         <input type="text" class="s var normal" size="10" tip="var name">
         <input type="text" class="s def normal" size="10" tip="default value">
         <input class="isColor" id="isColor_${count}" type="checkbox">
         <label for="isColor_${count}" tip="whether this field should have a color picker attached to it.">
         <div class="input"></div>Color Picker</label>
         <button class="removeField button red subtle"><div class="fa fa-trash"></div></button>
         </div>`
      ));
    })
    .on("click", ".removeField", (evt) => {
      $(evt.currentTarget).parent().remove();
      activateEditSaveButton();
    });

  addSaveHotkey();
}

/**
 * edit given option in current module
 * @param  {Int} optionIndex index of option to edit
 */
function editOption(optionIndex) {
  const module = modules[$("#page-edit h1").attr("id").replace("module-", "")],
    option = module.options[optionIndex];

  if ($("#metadata").hasClass("current")) {
    $("#meta-option, #editors").removeClass("hidden");
    $("#meta-module").addClass("hidden");
  }
  $("#options-tree .current").removeClass("current");

  $("#option-delete-cancel").click();

  // select and reveal option
  $(`#edit-option-${optionIndex}`)
    .addClass("current")
    .parents(".collapsed")
    .removeClass("collapsed")
  ;

  $("#meta-option .editor-row.hidden")
    .removeClass("hidden")
    .siblings(".advanced")
    .addClass("hidden")
    .parent()
    .find("#editor-fields")
    .html(
      `<button id="newField" class="button blue subtle">
      <div class="faf fa-plus pull-left"></div>
      Add new Field
      </button>`
    )
  ;

  if (option.fields) option.fields.map((field, i) =>
    `<div class="field-row" count="${i}">
         <input type="text" class="s field-description normal" size="20" value="${option.fields[i].description}" tip="field description">
         <input type="text" class="s field-variable normal" size="10" value="${option.fields[i].name}" tip="var name">
         <input type="text" class="s field-default normal" size="10" value="${option.fields[i].val}" tip="default value">
         <input class="isColor" id="isColor_${i}" ${option.fields[i].isColor ? "checked " : ""}type="checkbox">
         <label for="isColor_${i}" tip="whether this field should have a color picker attached to it.">
         <div class="input">&#10003;</div>Color Picker</label>
         <button class="removeField button red subtle"><div class="fa fa-trash"></div></button>
         </div>`).forEach($("#newField").before);

  if (option.tab.length < 1 || option.tab === "New Tab") {
    $("#meta-option .editor-row:nth-child(3)").removeClass("hidden");
  }
  if (option.section.length < 1 || option.section === "New Section") {
    $("#meta-option .editor-row:nth-child(4)").removeClass("hidden");
  }

  $("#optionState").prop("checked", option.isEnabled);
  $("#optionDescription").val(option.description);
  $("#optionTab").val(option.tab);
  $("#optionSection").val(option.section);

  if (option.screen) {
    $("#optionPreview").attr("src", option.screen);
    $("#uploadScreenButton").addClass("group last");
  } else {
    $("#optionPreview").removeAttr("src");
    $("#uploadScreenButton").removeClass("group last");
  }

  editorCss.value = (option.head && option.head.css) ?
    option.head.css.join("\n") : "";

  editorJs.value = (option.head && option.head.js) ?
    option.head.js.join("\n") : "";

  editorJsBody.value = (option.load && option.load.js) ?
    option.load.js.join("\n") : "";

  disableEditSaveButton();

  $(".isColor:checked").prev().colorPicker({
    dir: "../../img/libs/",
    format: "rgba",
    preview: true,
    userinput: true,
    validate: true,
    color: null
  });
  window.location = "#";
}

/**
 * Listen for [ Ctrl ] + [ S ]
 */
function addSaveHotkey() {
  $(window).keydown((evt) => {
    if ((evt.which === 83 && evt.ctrlKey) || (evt.which === 19)) {
      evt.preventDefault();
      if ($("#page-edit").hasClass("current") && !$("#save-edits").hasClass("disabled"))
        saveEdits(evt.shiftKey);
      else if ($("#page-options").hasClass("current") && !$("#save-options").hasClass("disabled"))
        saveOptions();
      return false;
    }
  });
}

/**
 * Check for change
 */
function checkForChange() {
  if (event.which === 8)
    activateEditSaveButton();
}

/**
 * Enable the Save Changes button
 */
function activateEditSaveButton() {
  $("#save-edits")
    .removeClass("disabled")
    .find("span")
    .text("Save Changes")
  ;
}

/**
 * Disable the Save Changes button
 * @return {[type]} [description]
 */
function disableEditSaveButton() {
  $("#save-edits")
    .addClass("disabled")
    .find("span")
    .text("Save Changes")
  ;
}

/**
 * Save current edits
 * @param {Boolean} andSuppressReload optional, false if relevant tabs should NOT reload after save
 */
function saveEdits(andSuppressReload) {
  if (!$("#save-edits").hasClass("disabled")) {

    const moduleIndex = $("#page-edit h1").attr("id").replace("module-","");
    let optionIndex;

    if ($("#metadata").hasClass("current")) {
      isOption = false;
      modules[moduleIndex].name = $("#moduleName").val();
      modules[moduleIndex].author = $("#moduleAuthor").val();
      modules[moduleIndex].includes = $("#moduleIncludes").val().split(" ").join("");
      modules[moduleIndex].version = $("#moduleVersion").val();

      const editsAbout = editorAbout.value;
      if (editsAbout.length > 0) {
        modules[moduleIndex].about = editsAbout.split("\n");
      } else if(modules[moduleIndex].hasOwnProperty("about")) {
        delete modules[moduleIndex].about;
      }
    } else {
      optionIndex = $("#options-tree .current").attr("id").replace("edit-option-","");
      const option = modules[moduleIndex].options[optionIndex],
        css = editorCss.value,
        jsHead = editorJs.value,
        jsBody = editorJsBody.value;

      if (css.length > 0)
        option.head.css = css.split("\n");
      else if (option.head && option.head.css)
        delete option.head.css;

      if (jsHead.length > 0)
        option.head.js = jsHead.split("\n");
      else if (option.head && option.head.js)
        delete option.head.js;

      if (jsBody.length > 0)
        option.load.js = jsBody.split("\n");
      else if (option.load && option.load.js)
        delete option.load.js;

      option.isEnabled = $("#optionState").is(":checked");
      option.description = $("#optionDescription").val();
      option.tab = $("#optionTab").val();
      option.section = $("#optionSection").val();
      // loop through fields
      option.fields = $("#page-edit .field-row").get().map($).map(el => ({
        description: el.find(".field-description").val(),
        name: el.find(".field-variable").val(),
        val: el.find(".field-default").val(),
        isColor: el.find(".isColor").is(":checked")
      }));

      if ($("#optionPreview").attr("src") !== undefined)
        option.screen = $("#optionPreview").attr("src");
      else
        delete option.screen;
      modules[moduleIndex].options[optionIndex] = option;
    }

    chrome.extension.sendMessage({name: "save", modules: modules});
    if (typeof andSuppressReload === "undefined" || !andSuppressReload) {
      chrome.extension.sendMessage({name: "reload", module: moduleIndex});
    }

    buildEditor($("#page-edit h1").attr("id").replace("module-",""), () => {
      if (optionIndex)
        editOption(optionIndex);
    });
    buildDashboard(false);

    $("#save-edits")
      .addClass("disabled")
      .find("sapn")
      .text("Changes Saved!");
  }
}
