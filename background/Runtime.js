function tabs(windows) { return [].concat(...[].concat(...windows)); }

class Runtime {
  constructor(db, updater) {
    this.db = db;
    this.updater = updater;
  }

  init() {
    this._startListeners();
  }

  showDashboard(notificationId, buttonIndex) {
    if (notificationId === NOTIFY_UPGRADE) {
      chrome.tabs.create({url: chrome.extension.getURL("options/index.html")});
      chrome.notifications.clear(NOTIFY_UPGRADE, () => {});
    }
  }

  /**
   * Listens for messages passed from other parts of Minimalist
   */
  _startListeners() {
    console.debug("Loading message service...");
    chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.name) {
        case "activateBrowserAction":
          this.activateBrowserAction(sender.tab);
          sendResponse();
          break;

        case "installModule":
          this.db.installModule(request.module);
          sendResponse();
          break;

        case "uninstallModule":
          this.db.uninstallModule(request.module);
          sendResponse();
          break;

        case "getModuleIndex":
          sendResponse({
            index: this.db.getModuleIndex(request.meta.name, request.meta.author) > -1
          });
          break;

        case "disable":
          this.db.disable(request.module);
          sendResponse();
          break;

        case "enable":
          this.db.enable(request.module);
          sendResponse();
          break;

        case "getActiveModules":
          sendResponse({modules: this.getTargetModules(sender.tab.url, true)});
          break;

        case "getAllModules":
          sendResponse({modules: this.db.getModules()});
          break;

        case "getGranularRawData":
          sendResponse({
            version: this.updater.version_package,
            preferences: this.db.getPreferences(),
            modules: this.db.getModules(),
          });
          break;

        case "getPreferences":
          sendResponse({preferences: this.db.getPreferences()});
          break;

        case "getRawData":
          sendResponse({data: this.db.getRawData()});
          break;

        case "getTargetModulesOfURL":
          sendResponse({modules: this.getTargetModules(request.url, false)});
          break;

        case "updateCoreModulesModule":
          this.updater.upgradeCoreModules();
          sendResponse();
          break;

        case "openTab":
          chrome.tabs.create({
            "url": request.url,
            "selected": request.isSelected
          }, sendResponse);
          break;

        case "reinit":
          window.location.reload();
          sendResponse();
          break;

        case "reload":
          if (request.module < 0) {
            this.reloadAll();
          }
          else {
            this.reload(request.module);
          }
          sendResponse();
          break;

        case "reset":
          this.db.reset().then(sendResponse);
          break;

        case "isEnabled":
          sendResponse({isEnabled: this.db.getPreferences().isEnabled});
          break;

        case "save":
          if (request.hasOwnProperty("modules"))
            this.db.setModules(request.modules.map(Module.factory));
          if (request.hasOwnProperty("preferences"))
            this.db.setPreferences(request.preferences);
          this.db.save();
          sendResponse();
          break;

        case "importRawData":
          this.db.importRawData(request.data);
          sendResponse();
          break;

        case "upload":
          chrome.storage.sync.clear();
          let data = this.db.getRawData(true);
          if (data.length > Math.floor(chrome.storage.sync.QUOTA_BYTES_PER_ITEM / 6)) {
            data = data.match(new RegExp(`.{1,${Math.floor(chrome.storage.sync.QUOTA_BYTES_PER_ITEM / 6)}}`, "g"));
            console.log(data);
          }
          chrome.storage.sync.set(Object.assign(...data.map((el, i) => ({
            [`data${i < 10 ? "0" + i : i}`]: el
          }))));
          sendResponse();
          break;

        case "download":
          chrome.storage.sync.get(null, (response) => {
            const buffer = Object.values(response).join("")
            if (buffer)
              importRawData(buffer, () => {
                chrome.tabs.sendMessage(request.tabId, {
                  action: "onDownload",
                  response: true
                });
              });
            else
              chrome.tabs.sendMessage(request.tabId, {
                action: "onDownload",
                response: false
              });
          });
          return true;

        default:
          console.error(`Unexpected message: ${request.name}`);
          break;
      }
    });
  }

  /**
   * Get modules that target given url
   * @param  {String}  url        query url
   * @param  {Boolean} activeOnly optional, only gets enabled modules
   * @return {Array}              matched modules
   */
  getTargetModules(url, activeOnly) {
    if (!url) {
      console.debug("Getting current tab...");
      chrome.tabs.getSelected(null, (tab) => {
        return this.getTargetModules(tab.url);
      });
    }
    console.debug(`Getting ${(activeOnly ? " active" : "")} modules that target ${url}...`);
    return this.db.getModules().filter((module) =>
      module.matches(url) && (!activeOnly || module.isEnabled));
  }

  /**
   * Gets active modules for given page
   * @param  {String} url query url
   * @return {Array}      matched modules
   */
  getActiveModules(url) {
    return getTargetModules(url, true);
  }

  /**
   * Set browserAction to active state
   * @param  {Tab} tab active browserAction on given tab
   */
  activateBrowserAction(tab) {
    console.debug(`Activating browser action for ${tab.url}...`);
    chrome.browserAction.setIcon({
      path: "icons/19_active.png",
      tabId: tab.id
    });
  }
  /**
   * Reload all tabs targetted by active modules
   */
  reloadAll() {
    console.debug("Reloading tabs targetted by all active modules...")
    chrome.windows.getAll({populate: true}, (windows) =>
      windows.map(tabs)
        .filter((tab) => this.getTargetModules(tab.url, true).length > 0)
        .forEach(this.reload)
    )
  }

  /**
   * Reload all tabs containing URL or reload given tab
   * @param  {Int|Tab} target index of module or Tab
   */
  reload(target) {
    if (Number(target)) {
      // target is Tab
      console.debug(`reloading ${target.url}`);
      chrome.tabs.update(target.id, {url: target.url, selected: target.selected}, null);
    }
    else {
      console.debug(`Reloading tabs targeted by ${target}...`);
      chrome.windows.getAll({populate: true}, (windows) =>
        windows.map(tabs)
          .filter((tab) => tab.url === target)
          .forEach((tab) =>
            chrome.tabs.update(tab.id, {url: tab.url, selected: target.selected}, null)
          )
      )
    }
  }
}