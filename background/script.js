const LEGACY_VERSIONS = [
  '0.5.20',
  '0.6.0',
  '0.6.1',
  '0.6.2',
];
const NOTIFY_UPGRADE = 'minimalistUpdate';

console.debug('Initializing...');
const db = new Database();
const updater = new Updater(db);
const runtime = new Runtime(db, updater);
db.load()
  .then(updater.upgrade.bind(updater))
  .then(runtime.init.bind(runtime))
  .then(() => console.debug('initialized!'));
