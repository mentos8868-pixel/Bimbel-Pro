import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const root = new URL('../game/public/bimbel/', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const html = read('index.html');
const source = html.match(/<script>\s*([\s\S]*?)const DEF=/)?.[1];
if (!source) throw new Error('Skrip latihan Ruang Bimbel tidak ditemukan.');

const context = createContext({ window: {} });
runInContext(`
  let seed = 20261121;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
`, context);
for (const [, file] of html.matchAll(/<script src="([^"]+)"/g)) {
  runInContext(read(file), context, { filename: file });
}
runInContext(source, context, { filename: 'bimbel/index.html' });
const curriculum = runInContext(`
  Object.entries(KURS).flatMap(([kur, config]) =>
    Array.from({ length: 12 }, (_, i) => i + 1).flatMap(kelas =>
      Object.keys(config.mapel).flatMap(mapel => topicsFor(mapel, kelas, kur))))
`, context);
const sample = runInContext(`(topic, level, count) => {
  LV = level;
  return Array.from({ length: count }, () => buildSession(topic, JUMLAH_SOAL));
}`, context);
const takeSource = (start, end) => {
  const first = html.indexOf(start);
  const last = html.indexOf(end, first + start.length);
  if (first < 0 || last < 0) throw new Error(`Bagian aplikasi hilang: ${start}`);
  return html.slice(first, last);
};
runInContext([
  takeSource('function check(', 'function renderQ('),
  takeSource('const TRYOUT_TINGKAT=', 'const mixShort='),
  takeSource('function mixLevels(', 'const fmtT='),
  takeSource('function buildExam(', 'function tryoutHist('),
].join('\n'), context);
const check = runInContext('check', context);
const buildExam = runInContext('buildExam', context);

const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase()
  .replace(/&nbsp;|&#160;/g, ' ').replace(/<br\s*\/?>/g, ' ')
  .replace(/\s+/g, ' ').trim();
const visible = value => normalize(value).replace(/<[^>]*>/g, '').trim();
const optionText = value => String(value ?? '').normalize('NFKC')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/<br\s*\/?>/g, ' ')
  .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const questionKey = value => /<(svg|img)\b/i.test(value)
  ? normalize(value)
  : visible(value);
const template = value => visible(value).replace(/\d+(?:[.,]\d+)*/g, '#');
const group = (map, key, value) => {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
};
const location = ({ kur, kelas, mapel, id }) => ({ kur, kelas, mapel, id });
const prompts = new Map();
const templates = new Map();
const formatIssues = [];
const variation = [];
const sessionIssues = [];
const examIssues = [];
const examTopics = new Map();
let bankCount = 0;
let sessionCount = 0;
const sessionsPerLevel = 40;

for (const topic of curriculum) {
  const loc = location(topic);
  if (!topic.mix && topic.g !== '__mix') {
    group(examTopics, JSON.stringify([loc.kur, loc.mapel, loc.kelas]), topic);
  }
  for (const [index, item] of (topic.bank ?? []).entries()) {
    bankCount++;
    const entry = { ...loc, number: index + 1, level: item.lv, question: item.q, answer: item.o?.[item.a] };
    const options = Array.isArray(item.o) ? item.o.map(optionText) : [];
    if (!entry.question?.trim() || !item.p?.trim() || ![1, 2, 3].includes(item.lv)
        || options.length !== 4 || options.includes('') || new Set(options).size !== 4
        || !Number.isInteger(item.a) || item.a < 0 || item.a >= options.length) {
      formatIssues.push(entry);
    }
    if (!entry.question) continue;
    group(prompts, questionKey(entry.question), entry);
    const key = template(entry.question);
    if (key !== visible(entry.question)) {
      group(templates, JSON.stringify([loc.kur, loc.mapel, loc.kelas, loc.id, key]), entry);
    }
  }
  for (const level of [1, 2, 3]) {
    let sessions;
    try {
      sessions = sample(topic, level, sessionsPerLevel);
    } catch (error) {
      sessionIssues.push({ ...loc, level, error: String(error) });
      continue;
    }
    sessionCount += sessions.length;
    const counts = new Map();
    let repeatedSessions = 0;
    let invalidItems = 0;
    let invalidExample;
    let repeatedExample;
    for (const session of sessions) {
      const seen = new Set();
      let repeats = false;
      for (const item of session) {
        const key = questionKey(item.q);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (seen.has(key)) {
          repeats = true;
          repeatedExample ??= visible(item.q);
        }
        seen.add(key);
        if (!key || item.ans == null || !item.steps?.length
            || (item.choices && (new Set(item.choices.map(optionText)).size !== item.choices.length
                || item.choices.filter(choice => check(item, choice) === true).length !== 1))) {
          invalidItems++;
          invalidExample ??= { question: visible(item.q), answer: item.ans, choices: item.choices,
            accepted: item.choices?.filter(choice => check(item, choice) === true) };
        }
      }
      if (repeats) repeatedSessions++;
    }
    if (invalidItems) sessionIssues.push({ ...loc, level, invalidItems, invalidExample });
    const draws = sessions.reduce((sum, session) => sum + session.length, 0);
    const mostFrequentCount = Math.max(0, ...counts.values());
    variation.push({ ...loc, level, type: topic.bank ? 'bank' : topic.parts || topic.g === '__mix' ? 'campuran' : 'otomatis',
      draws, unique: counts.size, mostFrequentCount, repeatedSessions, repeatedExample });
  }
}

const examsPerSize = 10;
for (const topics of examTopics.values()) {
  const { kur, kelas, mapel } = topics[0];
  for (const target of [30, 50]) {
    const bankOnly = topics.every(topic => topic.bank);
    const planned = bankOnly ? Math.min(target, topics.reduce((n, t) => n + t.bank.length, 0)) : target;
    let shortest = target;
    let shortExams = 0;
    let repeats = 0;
    let scoringIssues = 0;
    for (let trial = 0; trial < examsPerSize; trial++) {
      const exam = buildExam(topics, target);
      shortest = Math.min(shortest, exam.length);
      if (exam.length < planned) shortExams++;
      if (new Set(exam.map(item => questionKey(item.q))).size !== exam.length) repeats++;
      scoringIssues += exam.filter(item => item.choices
        && item.choices.filter(choice => check(item, choice) === true).length !== 1).length;
    }
    if (shortExams || repeats || scoringIssues) {
      examIssues.push({ kur, kelas, mapel, target, planned, shortest, shortExams, repeats, scoringIssues });
    }
  }
}

const duplicates = [...prompts.values()].filter(items => items.length > 1).map(items => ({
  sameTopic: new Set(items.map(item => JSON.stringify(location(item)))).size < items.length,
  answerDiffers: new Set(items.map(item => visible(item.answer))).size > 1,
  items,
}));
const similarTemplates = [...templates.values()].filter(items =>
  new Set(items.map(item => questionKey(item.question))).size > 1);
const auto = variation.filter(row => row.type === 'otomatis');
const lowVariation = auto.filter(row => row.draws && (row.unique <= 5 || row.mostFrequentCount / row.draws >= 0.25));
const repeating = variation.filter(row => row.repeatedSessions).sort((a, b) => b.repeatedSessions - a.repeatedSessions);
const summary = {
  bankCount, topics: curriculum.length, sessionsPerLevel, sessionCount,
  duplicateGroups: duplicates.length, duplicateGroupsInsideTopic: duplicates.filter(row => row.sameTopic).length,
  duplicateGroupsWithDifferentAnswer: duplicates.filter(row => row.answerDiffers).length,
  similarTemplateGroups: similarTemplates.length, formatIssues: formatIssues.length,
  sessionIssueGroups: sessionIssues.length, combinationsWithRepeatedSessions: repeating.length,
  lowVariationAutomaticCombinations: lowVariation.length,
  trialExams: examTopics.size * 2 * examsPerSize, examIssueGroups: examIssues.length,
};
const report = { summary, duplicates, similarTemplates, formatIssues, sessionIssues, examIssues, lowVariation, repeating, variation };
console.log(JSON.stringify(process.argv.includes('--json') ? report : {
  summary,
  repeatExamples: repeating.filter(row => row.type === 'otomatis').slice(0, 5),
  duplicateExamples: duplicates.filter(row => row.sameTopic).slice(0, 5),
  examExamples: examIssues.slice(0, 5),
}, null, 2));
