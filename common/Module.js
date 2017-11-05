class Module {
  constructor(params) {
    Object.assign(this, params);
  }

  applyOptions(module) {
    this.options.forEach((newOption) =>
      Object.assign(newOption, ...module.options.filter((oldOption) =>
        oldOption.description === newOption.description
      ))
    );
  }

  migrateOptions(module) {
    this.isEnabled = module.isEnabled;
    module.options.forEach((newOption) => this.options.forEach((oldOption) => {
      if (newOption.description === oldOption.description) {
        newOption.isEnabled = oldOption.isEnabled;
        newOption.fields.forEach((field, index) =>
          field.val = oldOption.fields[index].val
        );
      }
    }))
  }

  is(module) {
    return this.name === module.name && this.author === module.author;
  }

  /**
   * Checks if given URL matches this module
   * @param  {String}  url      query URL
   * @return {Boolean}          matches
   */
  matches(url) {
    console.debug(`Checking regex matches for ${url} against ${this.includes}`);
    return this.includes.split(",").some((include) => url.match(toRegExp(include)));
  }

  serialize(strip) {
    const module = JSON.parse(JSON.stringify(this));
    if (strip) // Remove unwanted fields
      module.options = module.options.map(option => ({
        description: option.description,
        isEnabled: option.isEnabled,
        fields: option.fields
      }));
    return module;
  }
}
Module.factory = (m) => new Module(m);
