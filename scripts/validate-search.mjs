import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [dataSource, searchSource] = await Promise.all([
  readFile('data.js', 'utf8'),
  readFile('search-index.js', 'utf8')
]);

const context = {
  console,
  URL,
  window: null,
  globalThis: null
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(dataSource, context, { filename: 'data.js' });
vm.runInContext(`
  const reconstructionPackageRegistry = [{
    id: 'rome-117',
    title: 'Rome in 117 CE',
    aliases: ['rome', 'roma', 'ancient rome', 'imperial rome'],
    validWindow: { start: 117, end: 117 },
    camera: { center: [12.49, 41.90] }
  }];
  ${searchSource}
`, context, { filename: 'search-index.js' });

const search = context.WorldlineSearch.search;
const failures = [];

function expect(query, predicate, description) {
  const response = search(query, { currentYear: 117, limit: 8 });
  if (!response.results.some(predicate)) {
    failures.push(`${description}: ${query} -> ${response.results.map((item) => `${item.type}:${item.title}`).join(', ')}`);
  }
}

expect('Istanbul in 1000', (result) => result.type === 'site' && result.title === 'Constantinople', 'Modern alias should resolve to historical place');
expect('Warka 2500 BCE', (result) => result.type === 'site' && result.title === 'Uruk' && result.requestedYear === -2500, 'Ancient alias and BCE year should resolve');
expect('Heian-kyo', (result) => result.type === 'site' && result.title === 'Kyoto', 'Former capital name should resolve');
expect('Roman Empire', (result) => result.type === 'topic' && result.title === 'Roman Empire', 'Civilization topic should resolve');
expect('5th century BCE', (result) => result.type === 'year' && result.year === -450, 'Century expression should resolve to midpoint');
expect('Rome 117 CE', (result) => result.type === 'package' && result.packageDef.id === 'rome-117', 'Reviewed reconstruction should outrank generic place');
expect('Mexico City 1500', (result) => result.type === 'site' && result.title === 'Tenochtitlan', 'Modern city alias should resolve to historical settlement');

if (failures.length) {
  console.error('Historical search validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Historical search aliases and time parsing are valid.');
