// Original short lessons for the local interface prototype, not an exam bank.
export const topics = [
  {
    id: 'basis', title: 'Грамматическая основа', group: 'Основы', time: '5 минут',
    description: 'Научись видеть, о ком говорится в предложении и что происходит.',
    rule: 'Грамматическая основа — главные члены предложения. В двусоставном предложении это подлежащее и сказуемое.',
    points: ['Подлежащее называет того, о ком или о чём говорится: кто? что?', 'Сказуемое сообщает, что делает подлежащее, каково оно или что с ним происходит.', 'Сначала найди основу, а затем переходи к остальным словам.'],
    example: 'За окном медленно падал снег.',
    explanation: 'Что? Снег. Что делал? Падал. Основа — «снег падал». Слова «за окном» и «медленно» уточняют, где и как это происходило.',
    question: 'Найди грамматическую основу предложения.',
    sentence: 'На подоконнике тихо спал рыжий кот.',
    choices: ['Рыжий кот', 'Кот спал', 'Тихо спал'], answer: 1,
    correct: 'Да. «Кот» — подлежащее, «спал» — сказуемое. «Рыжий» и «тихо» поясняют главные члены.',
    hint: 'Найди, о ком говорится, и задай вопрос: что он делал? В основе нужны оба главных члена.'
  },
  {
    id: 'homogeneous', title: 'Однородные члены', group: 'Основы', time: '4 минуты',
    description: 'Отличи несколько действий одного героя от нескольких основ.',
    rule: 'Однородные члены отвечают на один вопрос и относятся к одному слову. Например, одно подлежащее может иметь несколько однородных сказуемых.',
    points: ['Найди слово, к которому относятся однородные члены.', 'Проверь, отвечают ли они на один и тот же вопрос.', 'Перед одиночным «и» между двумя однородными членами запятая обычно не нужна.'],
    example: 'Кот потянулся и уснул.',
    explanation: 'Кот что сделал? Потянулся и уснул. Оба сказуемых относятся к одному подлежащему. Это простое предложение с однородными сказуемыми.',
    question: 'Нужна ли запятая перед «и»?',
    sentence: 'Девушка открыла тетрадь и взяла ручку.',
    choices: ['Нужна запятая', 'Запятая не нужна'], answer: 1,
    correct: 'Верно. «Открыла» и «взяла» относятся к одному подлежащему — «девушка». Между ними стоит одиночный союз «и».',
    hint: 'Оба действия выполняет девушка. Посмотри, сколько здесь подлежащих и к чему относятся сказуемые.'
  },
  {
    id: 'compound', title: 'Сложное предложение', group: 'Пунктуация', time: '5 минут',
    description: 'Найди границу между частями и выбери знак перед союзом.',
    rule: 'В сложном предложении две грамматические основы или больше. Части сложносочинённого предложения обычно разделяются запятой.',
    points: ['Найди грамматическую основу в каждой части.', 'Проверь, соединяет ли «и» части предложения или однородные члены.', 'Помни об исключениях: например, общий второстепенный член может отменять запятую. Здесь начнём с примера без таких условий.'],
    example: 'Снег перестал, и во дворе стало тихо.',
    explanation: 'Первая основа — «снег перестал». Вторая часть — односоставная, её главный член — «стало тихо». Перед союзом «и» ставим запятую.',
    question: 'Нужна ли запятая перед «и»?',
    sentence: 'Солнце село и во дворе зажглись фонари.',
    choices: ['Нужна запятая', 'Запятая не нужна'], answer: 0,
    correct: 'Верно. Основы — «солнце село» и «фонари зажглись». Союз соединяет две части, поэтому перед ним нужна запятая.',
    hint: 'В первой части говорится о солнце, во второй — о фонарях. Найди сказуемое для каждого подлежащего.'
  },
  {
    id: 'introductory', title: 'Вводные слова', group: 'Пунктуация', time: '4 минуты',
    description: 'Замечай слова, которые передают отношение говорящего к мысли.',
    rule: 'Вводные слова могут выражать уверенность, предположение или порядок мыслей. Они не являются членами предложения и обычно выделяются запятыми.',
    points: ['Проверь, выражает ли слово отношение говорящего к сообщению.', 'К вводному слову нельзя задать вопрос от других членов предложения.', 'Одинаковое слово в разных предложениях может выполнять разные роли. Всегда смотри на контекст.'],
    example: 'Кажется, снег скоро закончится.',
    explanation: '«Кажется» передаёт неуверенность говорящего. В этом предложении оно вводное, поэтому после него ставится запятая.',
    question: 'Как расставить знаки в этом предложении?',
    sentence: 'К счастью дождь быстро закончился.',
    choices: ['К счастью, дождь быстро закончился.', 'К счастью дождь быстро закончился.'], answer: 0,
    correct: 'Да. «К счастью» выражает оценку сообщения и не входит в основу «дождь закончился». Вводное сочетание отделяем запятой.',
    hint: '«К счастью» показывает, как говорящий оценивает событие. Это вводное сочетание.'
  }
];

export const stepLabels = ['Коротко о главном', 'Разберём пример', 'Проверь себя'];
export const storageKey = 'kunilingo.russian.path.v1';

export function restorePath(value) {
  const state = {selected: topics[0].id, mode: 'overview', progress: {}};
  if (!value || typeof value !== 'object') return state;
  if (topics.some(topic => topic.id === value.selected)) state.selected = value.selected;
  if (['overview', 'lesson', 'done'].includes(value.mode)) state.mode = value.mode;
  for (const topic of topics) {
    const saved = value.progress?.[topic.id];
    if (!saved || typeof saved !== 'object') continue;
    const stage = Number.isInteger(saved.stage) && saved.stage >= 0 && saved.stage <= 3 ? saved.stage : 0;
    const choice = Number.isInteger(saved.choice) && saved.choice >= 0 && saved.choice < topic.choices.length ? saved.choice : null;
    state.progress[topic.id] = {stage, choice, checked: choice !== null && saved.checked === true, completed: saved.completed === true || stage === 3};
  }
  if (state.mode === 'done' && state.progress[state.selected]?.stage !== 3) state.mode = 'overview';
  return state;
}

export function topicProgress(state, id = state.selected) {
  return state.progress[id] || {stage: 0, choice: null, checked: false};
}

export function completedSteps(state) {
  return topics.reduce((total, topic) => total + (topicProgress(state, topic.id).completed ? 3 : topicProgress(state, topic.id).stage), 0);
}

export function advancePath(state) {
  const topic = topics.find(topic => topic.id === state.selected);
  const progress = {...topicProgress(state)};
  if (progress.stage === 2 && (!progress.checked || progress.choice !== topic.answer)) return false;
  progress.stage = Math.min(3, progress.stage + 1);
  state.progress[topic.id] = progress;
  if (progress.stage === 3) { progress.completed = true; state.mode = 'done'; }
  return true;
}
