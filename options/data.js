/**
 * Import/Export for Minimalist
 *
 * © 2013 Ansel Santosa
 * Licensed under GNU GPL v3
 **/

let exportTimer,
  tabId;

/* Initialize data tab*/
(() => {
  chrome.tabs.getCurrent((response) => tabId = response.id);

  $("#repair").on("click", () => {
    $("#repair").html(
      `<div class="fa fa-spinner fa-spin pull-left"></div>
            Repairing...`
    );
    chrome.extension.sendMessage({name: "updateCoreModulesModule"}, (response) => {
      buildDashboard(false);
      setTimeout(() => {
        $("#repair").html(
          `<div class="fa fa-ambulance pull-left"></div>
                    Repairing Core Modules`
        );
        navigate("Dashboard");
      }, 750);
    });

  });

  $("#reset").on("click", () =>
    $("#reset-cancel, #reset-confirm")
      .removeClass("hidden")
      .siblings("#reset")
      .addClass("hidden")
  );

  $("#reset-cancel").on("click", () =>
    $("#reset-cancel, #reset-confirm")
      .addClass("hidden")
      .siblings("#reset")
      .removeClass("hidden")
  );

  $("#reset-confirm").on("click", () => {
    chrome.extension.sendMessage({name: "reset"});
    $("#reset-cancel").click();
    $("#reset").html(
      `<div class="fa fa-spinner fa-spin pull-left"></div>
    Reseting Data...`
    );
    setTimeout(function() {
      $("#reset").html(
        `<div class="fa fa-exclamation-triangle pull-left"></div>
      Nuke Settings`
      );
      buildDashboard(false);
    }, 2000);
  });

  $("#sync-upload").on("click", (evt) => {
    $(evt.currentTarget).find("span").text("Uploading...");
    chrome.extension.sendMessage({name: "upload"}, () =>
      setTimeout(() => {
        $("#sync-upload span").text("Uploaded!");
        setTimeout(() => $("#sync-upload span").text("Upload Data"), 2000);
      }, 750)
    );
  });

  $("#sync-download").on("click", (evt) => {
    $(evt.currentTarget).find("span").text("Downloading...");
    chrome.extension.onMessage.addListener((request) => {
      if (request.action === "onDownload") {
        if (request.response) {
          setTimeout(() => {
            $("#sync-download span").text("Downloaded!");
            setTimeout(buildDashboard, 2000);
          }, 750);
        } else
          setTimeout(() => $("#sync-download span").text("No Cloud Data!"), 750);
        setTimeout(() => $("#sync-download span").text("Download Data"), 2000);
      }
    });
    chrome.extension.sendMessage({
      name: "download",
      tabId: tabId
    });
  });

  $("#export").on("click", (evt) => {
    clearTimeout(exportTimer);
    $(evt.currentTarget)
      .addClass("hidden")
      .siblings("#exportSome, #exportAll")
      .removeClass("hidden")
      .end();
    exportTimer = setTimeout(hideExportOptions, 10000);
  });

  $("#exportAll").on("click", () =>
    chrome.extension.sendMessage({name: "getRawData"}, (response) => {
        $("#dataField").val(response.data);
        $("#import span").text("Import");
        hideExportOptions();
      }
    ));

  $("#exportSelected").on("click", () =>
    chrome.extension.sendMessage({name: "getGranularRawData"}, (response) => {
      const exportData = response;
      exportData.modules = exportData.modules.filter((module, i) =>
        $(`#export-${i}`).is(":checked")
      );
      $("#dataField").val(JSON.stringify(exportData));
      $("#import span").text("Import");
      hideExportOptions();
    })
  );

  $("#exportSome").on("click", buildExportList);

  $("#import").on("click", () => {
    const importData = $("#dataField").val();
    if (importData.length < 1) {
      $("#import")
        .removeClass("green")
        .addClass("red")
        .find("span")
        .text("Nothing to Import!");
      setTimeout(() =>
          $("#import")
            .removeClass("red")
            .addClass("green")
            .find("span")
            .text("Import")
        , 2000);
    } else if (importData.substr(0,1) !== "{") {
      $("#import")
        .removeClass("green")
        .addClass("red")
        .find("span")
        .text("Incompatible!");
      setTimeout(() =>
          $("#import")
            .removeClass("red")
            .addClass("green")
            .find("span")
            .text("Import")
        , 2000);
    } else
      chrome.extension.sendMessage({name: "importRawData", data: importData}, (response) => {
        $("#import span").text("Success!");
        setTimeout(() => {
          $("#import span").text("Import");
          buildDashboard(false);
        }, 2000);
      });
  });

  $("#exportCopy").on("click", () => {
    copyContents();
    $("#exportCopy")
      .addClass("disabled")
      .addClass("subtle")
      .find("span")
      .text("Copied!")
    ;
    setTimeout(() =>
        $("#exportCopy")
          .removeClass("subtle")
          .removeClass("disabled")
          .find("span")
          .text("Copy Code")
      , 2000);
  });

  $("#checkAll + label").on("click", (evt) => {
    const $self = $(evt.currentTarget);
    const checked = $self.prop("checked");
    $self
      .find("span")
      .text(checked ? "Check All" : "Uncheck All")
      .end()
      .prev()
      .prop("checked", !checked)
      .end()
      .parent().siblings().children("input").prop("checked", !checked);
  });

  $("#dataField").on("input propertychange", (evt) => {
    if ($(evt.currentTarget).val().length > 0)
      $("#exportCopy").removeClass("hidden");
    else
      $("#exportCopy").addClass("hidden");
  });
})();

/**
 * Hide all the export buttons except the parent
 */
function hideExportOptions() {
  $("#export")
    .removeClass("hidden")
    .siblings("#exportSome, #exportAll, #exportSelected")
    .addClass("hidden")
  ;
}

/**
 * Copy export into clipboard
 * @return {[type]} [description]
 */
function copyContents() {
  const targetField = document.io.dataField;
  targetField.focus();
  targetField.select();
  document.execCommand("Copy");
}

/**
 * Build list of modules to selectively export
 */
function buildExportList() {
  hideExportOptions();
  clearTimeout(exportTimer);
  $("#export")
    .addClass("hidden")
    .next()
    .removeClass("hidden");
  $("#exportList").removeClass("hidden");
  $("#exportList li:not(#checkAllWrap)").remove();
  $("#exportList").append(...modules.map((module, i) =>
    `<li><input type="checkbox" id="export-${i}" /><label for="export-${i}"><div class="input">&#10003;</div>${module.name}</li>`
  ))
}