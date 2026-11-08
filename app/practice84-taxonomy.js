import {examTasks} from './route-map72-data.js';
import {wordlists} from './course79-wordlists.js';
const rule=(id,label,pattern)=>({id,label,pattern});
const branch=(id,label,children)=>({id,label,children});
export const sections=[
  {id:'norms',label:'Нормы речи',tasks:[4,5,6,7,8]},
  {id:'spelling',label:'Орфография',tasks:[9,10,11,12,13,14,15]},
  {id:'punctuation',label:'Пунктуация',tasks:[16,17,18,19,20,21]},
  {id:'text',label:'Работа с текстом',tasks:[1,2,3,23,24,25,26]},
  {id:'expression',label:'Выразительность',tasks:[22]},
  {id:'essay',label:'Сочинение',tasks:[27]},
  {id:'other',label:'Дополнительные задания',tasks:[0]}
];
export const topics={
  1:[
    branch('link-pronoun','Местоимения',[rule('link-personal','Личные',String.raw`личн.{0,15}местоимен`),rule('link-demonstrative','Указательные',String.raw`указательн`),rule('link-possessive','Притяжательные',String.raw`притяжательн`),rule('link-defining','Определительные',String.raw`определительн`),rule('link-relative','Относительные',String.raw`относительн`),rule('link-negative','Отрицательные и неопределённые',String.raw`отрицательн|неопределённ`)]),
    branch('link-conjunction','Союзы',[rule('link-coordinating','Сочинительные',String.raw`сочинительн|противительн|соединительн|разделительн`),rule('link-subordinating','Подчинительные',String.raw`подчинительн|причинн|следств|условн|целев|уступительн|изъяснительн`)]),
    rule('link-particle','Частицы',String.raw`частиц`),rule('link-preposition','Предлоги',String.raw`предлог`),rule('link-adverb','Наречия',String.raw`нареч`),rule('link-intro','Вводные слова и сочетания',String.raw`вводн`),rule('link-phrase','Сочетания слов',String.raw`сочетани`)
  ],
  2:[rule('meaning-context','Значение в контексте',String.raw`контекст|значени`),rule('meaning-direct','Прямое и переносное значение',String.raw`переносн|прямом`),rule('meaning-polysemy','Многозначность',String.raw`значени|словарн`),rule('meaning-collocation','Лексическая сочетаемость',String.raw`сочетаем`)],
  3:[branch('styles','Функциональные стили',[rule('style-science','Научный',String.raw`научн`),rule('style-business','Официально-деловой',String.raw`официально|делов`),rule('style-public','Публицистический',String.raw`публицист`),rule('style-art','Художественный',String.raw`художествен`),rule('style-colloquial','Разговорный',String.raw`разговорн`)]),rule('style-vocabulary','Лексические признаки',String.raw`лексик|термин|слов`),rule('style-morphology','Морфологические признаки',String.raw`морфолог|глагол|существительн`),rule('style-syntax','Синтаксические признаки',String.raw`синтакс|предложен|конструкц`),rule('style-purpose','Цель и жанр текста',String.raw`жанр|цел[ьи]`)],
  4:[branch('stress-pos','Ударение по частям речи',[rule('stress-nouns','Существительные',String.raw`аэропорт|торт|бант|каталог|квартал|свёкл|договор|диспансер|досуг|жалюзи|эксперт|кран`),rule('stress-adjectives','Прилагательные',String.raw`красив|верн|оптов|мозаич|сливов|кухонн`),rule('stress-verbs','Глаголы',String.raw`звон|балова|включ|взял|брала|нача|облегч|занял|понял|создал`),rule('stress-participles','Причастия',String.raw`занят|принят|начат|заперт|создан|включён|согнут`),rule('stress-adverbs','Наречия',String.raw`завидно|вовремя|донельзя|досуха|доверху|надолго`)]),rule('stress-mobile','Подвижное ударение',String.raw`взял|брала|нача|принят|занят|созда`),rule('stress-form','Ударение в формах слова',String.raw`торт|бант|краны|новост|двер|аэропорт`)],
  5:[branch('paronym-pairs','Паронимические пары',[rule('paronym-effect','Эффектный / эффективный',String.raw`эффект`),rule('paronym-wear','Одеть / надеть',String.raw`оде[твл]|наде[твл]`),rule('paronym-provide','Представить / предоставить',String.raw`представ|предостав`),rule('paronym-pay','Оплатить / заплатить / уплатить',String.raw`оплат|заплат|уплат|выплат`),rule('paronym-address','Адресат / адресант',String.raw`адреса`),rule('paronym-diplomat','Дипломат / дипломант',String.raw`диплом`),rule('paronym-economic','Экономный / экономичный / экономический',String.raw`эконом`),rule('paronym-organic','Органичный / органический',String.raw`органич`),rule('paronym-proud','Гордый / горделивый / гордыня',String.raw`горд`),rule('paronym-friendly','Дружеский / дружественный / дружный',String.raw`друж`)]),rule('paronym-context','Выбор паронима по контексту',String.raw`пароним`)],
  6:[branch('lexical-excess','Речевая избыточность',[rule('lexical-pleonasm','Плеоназм',String.raw`исключив лишнее|лишнее слово|главн.{0,12}приоритет|памятн.{0,12}сувенир`),rule('lexical-tautology','Тавтология',String.raw`тавтологи|повтор`)]),rule('lexical-replace','Замена неточного слова',String.raw`заменив|замените`),rule('lexical-collocation','Нарушение сочетаемости',String.raw`сочетаем|заменив`),rule('lexical-phrase','Устойчивые сочетания',String.raw`фразеолог|устойчив`)],
  7:[branch('forms-nouns','Формы существительных',[rule('forms-gender','Род',String.raw`род|тюль|шампун|кофе`),rule('forms-plural','Именительный множественного числа',String.raw`директор|доктор|инженер|профессор|бухгалтер|договор`),rule('forms-genitive','Родительный множественного числа',String.raw`носк|чулок|сапог|килограмм|апельсин|помидор|яблок|туф|плеч|солдат`)]),rule('forms-adjective','Степени сравнения',String.raw`более|менее|красив|лучше|хуже|сильн`),rule('forms-number','Склонение числительных',String.raw`стам|сот|сотен|восьм|пят|двух|обо|тро|полутор`),rule('forms-pronoun','Местоимения',String.raw`ихн|ево|ейный|них|их`),branch('forms-verbs','Формы глаголов',[rule('forms-imperative','Повелительное наклонение',String.raw`езжай|ехай|ляг|ляж|полож|ложи`),rule('forms-personal','Личные формы',String.raw`побежд|убед|жг|пек|маш|полощ`),rule('forms-past','Прошедшее время',String.raw`сох|мок|мерз|замёрз|стер`)])],
  8:[rule('syntax-agreement','Связь подлежащего и сказуемого',String.raw`сказуем|подлежащ`),rule('syntax-government','Управление и падежные формы',String.raw`падеж|предлог|управлен`),rule('syntax-homogeneous','Однородные члены',String.raw`однородн`),rule('syntax-participle','Причастный оборот',String.raw`причастн`),rule('syntax-gerund','Деепричастный оборот',String.raw`деепричастн`),rule('syntax-apposition','Несогласованное приложение',String.raw`приложен`),rule('syntax-indirect','Косвенная речь',String.raw`косвенн`),rule('syntax-complex','Сложное предложение',String.raw`сложн`),rule('syntax-tense','Видо-временная соотнесённость',String.raw`видо-врем|соотнесённост|соотнесенност`),rule('syntax-number','Употребление числительных',String.raw`числительн`)],
  9:[
    rule('root-checked','Проверяемые гласные',String.raw`проверяем|пров[е.]+р|посв[я.]+т|прим[е.]+р|зам[е.]+р[яи]`),
    rule('root-unchecked','Непроверяемые гласные',String.raw`непроверяем|словарн|в[ие.]+н[еи.]+грет|к[оа.]+мп[оа.]+нент|пр[ие.]+вилег|инт[е.]+лл[еи.]+г`),
    branch('root-alternation','Чередующиеся гласные',[
      branch('root-suffix','Зависимость от суффикса -а-',[rule('root-kas','-кас- / -кос-',String.raw`к[ао. …_()]*с(?:ат|ан|а[юе]|ну|нов)`),rule('root-ber','-бер- / -бир-',String.raw`б[еи. …_()]*р(?:а[тюея]|у|ё|ет)|б[еи. …_()]*рать`),rule('root-der','-дер- / -дир-',String.raw`д[еи. …_()]*р(?:а[тюея]|у|ёт|ет)`),rule('root-mer','-мер- / -мир-',String.raw`м[еи. …_()]*р(?:а[тюея]|еть|ев|ло)`),rule('root-per','-пер- / -пир-',String.raw`п[еи. …_()]*р(?:а[тюея]|еть|ев)`),rule('root-ter','-тер- / -тир-',String.raw`т[еи. …_()]*р(?:а[тюея]|еть|ев)`),rule('root-blest','-блест- / -блист-',String.raw`бл[еи. …_()]*ст`),rule('root-stel','-стел- / -стил-',String.raw`ст[еи. …_()]*л(?:а[тюея]|ить|ет)`),rule('root-zheg','-жег- / -жиг-',String.raw`ж[еи. …_()]*г|жёг`),rule('root-chet','-чет- / -чит-',String.raw`ч[еи. …_()]*т(?:а[тюея]|ет|ёт)`),rule('root-im','-им- / -а(я)-, -ин- / -а(я)-',String.raw`сж[и.]*м|прин[и.]*м|нач[и.]*н|разм[и.]*н`)]),
      branch('root-stress','Зависимость от ударения',[rule('root-gar','-гар- / -гор-',String.raw`[гГ][ао. …_()]*р(?:ел|ет|еть|яче|ев|н[ыи]|н[яе]|а[юл]|о[кд])`),rule('root-zar','-зар- / -зор-',String.raw`з[ао. …_()]*р(?:я|ев|ни|ьк|ян|евать)`),rule('root-klan','-клан- / -клон-',String.raw`кл[ао. …_()]*н`),rule('root-tvar','-твар- / -твор-',String.raw`тв[ао. …_()]*р(?:ить|ен|ец|чес|ит)`),rule('root-plav','-плав- / -плов-',String.raw`пл[ао. …_()]*в`)]),
      branch('root-consonant','Зависимость от согласной',[rule('root-rast','-раст- / -ращ- / -рос-',String.raw`р[ао. …_()]*с(?:т|л|ш)|р[ао. …_()]*щ`),rule('root-lag','-лаг- / -лож-',String.raw`л[ао. …_()]*г(?:а|ать)|л[ао. …_()]*ж(?:и|ен)`),rule('root-skak','-скак- / -скоч-',String.raw`ск[ао. …_()]*[кч]`)]),
      branch('root-meaning','Зависимость от значения',[rule('root-mak','-мак- / -мок-',String.raw`м[ао. …_()]*к(?:а[тюея]|ну|ш|р|ать|ок)`),rule('root-ravn','-равн- / -ровн-',String.raw`р[ао. …_()]*вн`)])
    ]),rule('root-consonants','Проверяемые и непроизносимые согласные',String.raw`согласн`)
  ],
  10:[branch('prefix-types','Написание приставок',[rule('prefix-unchanged','Неизменяемые приставки',String.raw`[оа.]+тб|[пП][оа.]+д|[пП][оа.]+д[пб]|[нН][ао.]+д`),rule('prefix-zs','Приставки на З / С',String.raw`бе[зс.]*|ра[зс.]*|и[зс.]*|во[зс.]*|в[зс.]*|ни[зс.]*`),rule('prefix-prepri','ПРЕ- / ПРИ-',String.raw`пр[еи. …_()]+`)]),rule('prefix-yi','Ы / И после приставок',String.raw`[ыи. …_()]+нтерес|[ыи. …_()]+грат|[ыи. …_()]+стор|[ыи. …_()]+скат|меж[ыи.]|сверх`),branch('prefix-signs','Разделительные знаки',[rule('prefix-hard','Разделительный Ъ',String.raw`[ъь. …_()]+[еёюя]|об[ъ.]*|под[ъ.]*|с[ъ.]*е`),rule('prefix-soft','Разделительный Ь',String.raw`в[ь.]*ю|сем[ь.]*я|вороб[ь.]*|п[ь.]*ес`)])],
  11:[rule('suffix-noun','Суффиксы существительных',String.raw`существительн|[чщ]ик|[еи.]*к|[еи.]*ц`),rule('suffix-adjective','Суффиксы прилагательных',String.raw`чив|лив|еват|оват|чат|ист|к[и.]*й`),rule('suffix-verb','Суффиксы глаголов -ова-/-ева-, -ыва-/-ива-',String.raw`[оеыи. …_()]+ва|[ыи. …_()]+ва`),rule('suffix-adverb','Суффиксы наречий',String.raw`издавн|досух|снов|слев|направ|запрост`),rule('suffix-vowel','Гласные после шипящих и Ц',String.raw`[жшчщц][ое. …_()]+`)],
  12:[branch('conjugation','Личные окончания глаголов',[rule('conjugation-first','I спряжение',String.raw`[еую. …_()]+т|[е.]*м|[е.]*шь`),rule('conjugation-second','II спряжение',String.raw`[ияа. …_()]+т|[и.]*м|[и.]*шь`),rule('conjugation-exceptions','Глаголы-исключения',String.raw`держ|дыш|слыш|гон|гн|смотр|вид|ненавид|обид|терп|завис|верт|бр[еи.]|стел`)]),branch('participle-suffix','Суффиксы причастий',[rule('participle-present','Настоящее время: -ущ-/-ющ-, -ащ-/-ящ-',String.raw`[уюая. …_()]+щ`),rule('participle-passive','Страдательные: -ем-/-им-',String.raw`[еи. …_()]+м(?:ый|ая|ое|ые)`),rule('participle-past','Прошедшее время: гласная перед -вш-',String.raw`[аяеи. …_()]+вш`)])],
  13:[branch('not-pos','НЕ с разными частями речи',[rule('not-noun','Существительные',String.raw`не\)\s*[а-яё]+ость|не\)\s*правд`),rule('not-adjective','Прилагательные и наречия',String.raw`не\)\s*[а-яё]+(?:ый|ая|ое|о)`),rule('not-verb','Глаголы и деепричастия',String.raw`не\)\s*[а-яё]+(?:ть|ться|я|в)`),rule('not-participle','Причастия',String.raw`не\)\s*[а-яё]+(?:нный|вший|ющий|тый)|причаст`)]),rule('not-contrast','Противопоставление с союзом А',String.raw`а\s|противопостав`),rule('not-amplify','Далеко не, вовсе не, отнюдь не',String.raw`далеко|вовсе|отнюдь|ничуть|нисколько`),rule('not-without','Без НЕ не употребляется',String.raw`невеж|негод|ненав|нелеп|неизбеж`),rule('ni-not','Различение НЕ / НИ',String.raw`ни\)|не и ни|частиц`)],
  14:[branch('spacing-parts','Части речи и омонимичные сочетания',[rule('spacing-conjunction','Союзы и сочетания: тоже, также, чтобы',String.raw`то\)?\s*\(?же|так\)?\s*\(?же|что\)?\s*\(?бы|за\)?\s*\(?то`),rule('spacing-preposition','Производные предлоги',String.raw`течени|продолжени|следстви|несмотря|счёт|счет`),rule('spacing-adverb','Наречия и сочетания',String.raw`сначала|с\)?\s*\(?начала|в\)?\s*\(?последстви|на\)?\s*\(?встреч`),rule('spacing-pronoun','Местоимения с частицами и предлогами',String.raw`кто|что|котор|какой`)]),branch('spacing-hyphen','Дефис',[rule('hyphen-po','Наречия с ПО-',String.raw`по\)?\s*\(?[а-яё]+(?:ому|ему|ски|цки)`),rule('hyphen-particle','Частицы -то, -либо, -нибудь, кое-',String.raw`либо|нибудь|кое|таки`),rule('hyphen-compound','Сложные слова',String.raw`пол\)|северо|юго|ярко|бледно`)])],
  15:[branch('nn-pos','Часть речи и форма',[rule('nn-adjective','Прилагательные от существительных',String.raw`прилагательн|кожан|серебрян|стеклян|оловян|деревян`),rule('nn-verbal','Отглагольные прилагательные и причастия',String.raw`причаст|отглагольн|жаре|краше|печё|печен|плетё|плетен`),rule('nn-short','Краткие формы',String.raw`кратк|[на]\([1-9]\)[аоы]`),rule('nn-adverb','Наречия и существительные',String.raw`нареч|ветре|пута|торжестве`)]),rule('nn-dependents','Зависимые слова',String.raw`зависим|масл|печи`),rule('nn-prefix','Приставка и вид глагола',String.raw`совершенн|пристав`),rule('nn-exceptions','Исключения',String.raw`ветрен|стеклян|оловян|деревян|кован|жёван|жеван|ранен`)],
  16:[branch('homogeneous-unions','Однородные члены и союзы',[
    rule('homogeneous-single','Одиночные соединительные и разделительные союзы',String.raw` и | да | или | либо `),
    rule('homogeneous-repeat','Повторяющиеся союзы',String.raw`то .* то |и .* и |ни .* ни |или .* или `),
    rule('homogeneous-pair','Парные союзы',String.raw`не только|как .* так|не столько|если не`),
    rule('homogeneous-no-union','Бессоюзный ряд',String.raw`перечисл|однородн`),
    rule('homogeneous-adversative','Противительные и уступительные союзы',String.raw` а | но | зато | однако | хотя `),
    rule('homogeneous-joining','Присоединительные союзы',null),
    rule('homogeneous-paired-groups','Попарное объединение членов',null),
    rule('homogeneous-different-rows','Разные однородные ряды и уровни связи',null),
    rule('homogeneous-definitions','Однородные и неоднородные определения',null),
    rule('homogeneous-stable','Устойчивые сочетания',null),
    rule('homogeneous-explanatory','Пояснительный союз ИЛИ',null)
  ]),rule('compound-simple','Сложносочинённое предложение',String.raw`сложносочинён|сложносочинен`),
    rule('compound-common','Общий компонент и границы его действия',null),
    rule('compound-special','Особые случаи отсутствия запятой в ССП',null)],
  17:[branch('separate-definition','Обособленные определения',[rule('separate-participle','Причастный оборот',String.raw`[вюя]щ|нн|причаст`),rule('separate-adjective','Прилагательные с зависимыми словами',String.raw`определен|определён|прилагательн`)]),rule('separate-gerund','Деепричастные обороты',String.raw`[а-яё]+[ая]сь|[а-яё]+вши|деепричаст`),rule('separate-apposition','Приложения',String.raw`приложен`),rule('separate-specify','Уточняющие и пояснительные члены',String.raw`то есть|а именно|уточн|поясн`),rule('separate-exception','Исключения и устойчивые обороты',String.raw`не покладая|спустя рукава|очертя голову`)],
  18:[branch('intro-meaning','Вводные конструкции по значению',[rule('intro-confidence','Уверенность и неуверенность',String.raw`конечно|разумеется|вероятно|кажется|безусловно|возможно`),rule('intro-source','Источник сообщения',String.raw`по словам|по мнению|говорят|как известно`),rule('intro-order','Порядок мыслей и связь',String.raw`во-первых|во-вторых|итак|следовательно|таким образом|наконец`),rule('intro-feeling','Чувства говорящего',String.raw`к счастью|к сожалению|к удивлению`)]),rule('intro-member','Вводное слово или член предложения',String.raw`кажется|однако|наконец|значит`),rule('intro-address','Обращения',String.raw`обращен|друзья|друг|душа|родина|мама`),rule('intro-interjection','Междометия',String.raw`ах|ох|увы|о\s*\(`)],
  19:[branch('subordinate-kind','Виды придаточных',[rule('subordinate-definition','Определительные',String.raw`котор|чей`),rule('subordinate-explanation','Изъяснительные',String.raw`что|чтобы|будто`),rule('subordinate-circumstance','Обстоятельственные',String.raw`когда|если|потому|так как|хотя|чтобы|где`)]),rule('subordinate-sequence','Последовательное подчинение',String.raw`котор.*что|что.*котор`),rule('subordinate-parallel','Однородное и неоднородное подчинение',String.raw`подчинен|подчинён`),rule('subordinate-soyuz','Союзное слово внутри придаточной части',String.raw`котор`)],
  20:[rule('mixed-join','Сочинение и подчинение',String.raw` и | а | но `),rule('mixed-contact','Стык союзов',String.raw`что\s*\(\d\)\s*если|что\s*\(\d\)\s*когда|и\s*\(\d\)\s*хотя|но\s*\(\d\)\s*если`),rule('mixed-double','Двойные союзы: если… то, хотя… но',String.raw`если|хотя|так|то`),rule('mixed-asindetic','Бессоюзная связь',String.raw`бессоюз|двоеточ|тире`),rule('mixed-boundaries','Границы частей и схемы',String.raw`расставьте|укажите`)],
  21:[branch('analysis-sign','Знак препинания',[rule('analysis-comma','Запятая',String.raw`запят`),rule('analysis-colon','Двоеточие',String.raw`двоеточ`),rule('analysis-dash','Тире',String.raw`тире`)]),branch('analysis-reason','Основание постановки',[rule('analysis-basis','Между подлежащим и сказуемым',String.raw`подлежащ|сказуем`),rule('analysis-homogeneous','Однородные члены и обобщение',String.raw`однородн|обобщающ`),rule('analysis-isolation','Обособление',String.raw`обособл|оборот`),rule('analysis-complex','Между частями сложного предложения',String.raw`сложн|частями`),rule('analysis-speech','Прямая речь и цитирование',String.raw`прямая речь|цитир`)])],
  22:[branch('tropes','Тропы',[rule('trope-epithet','Эпитет',String.raw`эпитет`),rule('trope-metaphor','Метафора',String.raw`метафор`),rule('trope-person','Олицетворение',String.raw`олицетвор`),rule('trope-comparison','Сравнение',String.raw`сравнен`),rule('trope-metonymy','Метонимия',String.raw`метоним`),rule('trope-hyperbole','Гипербола и литота',String.raw`гипербол|литот`),rule('trope-irony','Ирония',String.raw`ирони`)]),branch('figures','Синтаксические фигуры',[rule('figure-anaphora','Анафора и эпифора',String.raw`анафор|эпифор`),rule('figure-antithesis','Антитеза',String.raw`антитез`),rule('figure-gradation','Градация',String.raw`градац`),rule('figure-parallel','Параллелизм',String.raw`параллел`),rule('figure-parcel','Парцелляция',String.raw`парцелл`),rule('figure-inversion','Инверсия',String.raw`инверси`),rule('figure-rhetoric','Риторические вопрос, восклицание, обращение',String.raw`риторич`),rule('figure-repeat','Лексический повтор',String.raw`повтор`),rule('figure-unions','Многосоюзие и бессоюзие',String.raw`многосоюз|бессоюз`)]),branch('sounds','Звукопись',[rule('sound-alliteration','Аллитерация',String.raw`аллитерац`),rule('sound-assonance','Ассонанс',String.raw`ассонанс`)]),rule('expression-lexis','Лексические средства выразительности',String.raw`фразеолог|синоним|антоним|диалект|разговорн`)],
  23:[rule('text-fact','Соответствие фактам текста',String.raw`соответств|утвержден`),rule('text-distortion','Искажение смысла',String.raw`не соответств|неверн`),rule('text-main','Главная и второстепенная информация',String.raw`главн|основн|информац`),rule('text-conclusion','Вывод и авторская позиция',String.raw`вывод|автор|содержан`)],
  24:[branch('speech-types','Типы речи',[rule('speech-narration','Повествование',String.raw`повествован`),rule('speech-description','Описание',String.raw`описан`),rule('speech-reasoning','Рассуждение',String.raw`рассужден`)]),branch('text-relations','Отношения между фрагментами',[rule('relations-cause','Причина и следствие',String.raw`причин|следств`),rule('relations-explain','Пояснение и уточнение',String.raw`поясн|уточн|объясн`),rule('relations-opposition','Противопоставление и сопоставление',String.raw`противопостав|сопостав`),rule('relations-example','Пример и иллюстрация',String.raw`пример|иллюстр`)])],
  25:[rule('lexis-synonym','Синонимы, в том числе контекстные',String.raw`синоним`),rule('lexis-antonym','Антонимы, в том числе контекстные',String.raw`антоним`),rule('lexis-phrase','Фразеологизмы',String.raw`фразеолог`),rule('lexis-colloquial','Разговорная и просторечная лексика',String.raw`разговорн|простореч`),rule('lexis-meaning','Слово по заданному значению',String.raw`значени|означа`)],
  26:[branch('cohesion-lexical','Лексические средства связи',[rule('cohesion-repeat','Лексический повтор',String.raw`лексическ.{0,10}повтор`),rule('cohesion-synonym','Синонимы и однокоренные слова',String.raw`синоним|однокоренн`),rule('cohesion-antonym','Антонимы',String.raw`антоним`)]),branch('cohesion-grammar','Грамматические средства связи',[rule('cohesion-pronoun','Местоимения',String.raw`местоимен`),rule('cohesion-adverb','Наречия',String.raw`нареч`),rule('cohesion-conjunction','Союзы и частицы',String.raw`союз|частиц`),rule('cohesion-forms','Формы слов',String.raw`форм.{0,10}слов`),rule('cohesion-parallel','Синтаксический параллелизм',String.raw`параллел`)])],
  27:[rule('essay-author','Позиция автора',String.raw`позици.{0,15}автор`),branch('essay-comment','Комментарий',[rule('essay-examples','Два примера-иллюстрации',String.raw`пример|иллюстрац`),rule('essay-explanation','Пояснение примеров',String.raw`пояснен|пояснит`),rule('essay-link','Смысловая связь и её анализ',String.raw`связ|проанализ`)]),rule('essay-stance','Собственное отношение и обоснование',String.raw`сво[её]|собственн|отношени`),rule('essay-argument','Пример-аргумент',String.raw`аргумент|обосну`),rule('essay-logic','Логика и композиция',String.raw`сочинени`),rule('essay-literacy','Грамотность и речевое оформление',String.raw`сочинени`)]
};
// Every group from the official inventory is available, including groups with no
// examples in the current bank. Only highlighted target words drive pair tags.
const paronymRules=wordlists.paronyms.groups.map((label,index)=>{
  const stems=label.toLowerCase().replaceAll('ё','е').split(/\s*[–—]\s*/).map(word=>word.trim().replace(/(?:ый|ий|ой|ая|яя|ое|ее|ть|ти|ь|а|я)$/u,''));
  return rule('paronym-list-'+(index+1),label,'(?:^|[^а-яё])(?:'+stems.join('|')+')[а-яё]*');
});
topics[5]=[branch('paronym-pairs','Паронимические пары',[
  ['А–В','абв'],['Г–Д','гд'],['Е–К','еёжзийк'],['Л–О','лмно'],['П–Р','пр'],['С–Я','стуфхцчшщъыьэюя']
].map(([label,letters],index)=>branch('paronym-alphabet-'+index,label,paronymRules.filter(rule=>letters.includes(rule.label[0].toLowerCase()))))),
rule('paronym-context','Выбор паронима по контексту',String.raw`пароним`)];
const introRules=topics[18][0].children;
introRules.find(rule=>rule.id==='intro-source').pattern=String.raw`по (?:[а-яё]+ ){0,2}(?:словам|мнению)|говорят|как известно`;
topics[18].find(rule=>rule.id==='intro-interjection').pattern=String.raw`(?:^|[^а-яё])(?:ах|ох|увы|о)(?=[^а-яё]|$)`;
export const tasks=examTasks.map(item=>({...item,section:sections.find(section=>section.tasks.includes(item.number)).id,topics:topics[item.number]}));
export function topicEntries(number) {
  const result=[];
  function walk(nodes,ancestors=[]){for(const node of nodes){const path=[...ancestors,node];result.push({...node,path:path.map(x=>x.id),labels:path.map(x=>x.label)});if(node.children)walk(node.children,path);}}
  walk(topics[number]||[]);return result;
}
export function classifyQuestion(item) {
  const text=item.stem.toLowerCase().replaceAll('ё','е'),all=item.bodyText.toLowerCase().replaceAll('ё','е'),has=code=>item.codes.some(c=>c===code||c.startsWith(code+'.'));
  let task=0;
  if(/напишите сочинение/.test(text))task=27;
  else if(/одним и тем же (?:пунктуационным )?правилом/.test(text))task=21;
  else if(/средств.*выразительност|выразительн.*средств|прочитайте фрагмент рецензии/.test(text)||['3.2.2','3.3.2','3.6.2'].some(has))task=22;
  else if(/связан[оы].*предыдущ|связ.*предыдущ.*помощ/.test(text))task=26;
  else if(/из предложени.*выпиш|найдите.*(?:синоним|антоним|фразеолог)/.test(text))task=25;
  else if(/соответств.*содержани/.test(text))task=23;
  else if(/самостоятельно подберите|подберите.*(?:союз|частиц|местоимени|наречи|вводн)|должно стоять на месте пропуска/.test(text))task=1;
  else if(/словарн.*стать|значени.*слов|выделенн.*слов.*значен/.test(text))task=2;
  else if(/характеристик.*фрагмент|характеристик.*текст|стилистическ.*анализ/.test(text))task=3;
  else if(/главн.*информац/.test(text))task=23;
  else if(/утвержден.*(?:верн|ошибоч)/.test(text)&&item.passage)task=24;
  else if(has('3.2.3'))task=4;
  else if(/пароним/.test(text))task=5;
  else if(/лексическ.*ошиб|отредактируйте/.test(text))task=6;
  else if(/образовани.*форм|форм.*слов.*ошиб/.test(text)||item.codes.some(c=>/^3\.5\.[2-6]$/.test(c)))task=7;
  else if(/грамматическ.*ошиб/.test(text)||item.codes.some(c=>/^3\.6\.[3-7]$/.test(c)))task=8;
  else if(has('3.7.2'))task=9;
  else if(has('3.7.3')||has('3.7.4'))task=10;
  else if(has('3.7.8'))task=12;
  else if(has('3.7.5'))task=11;
  else if(has('3.7.7'))task=13;
  else if(has('3.7.9'))task=14;
  else if(has('3.7.6'))task=15;
  else if(has('3.8.6'))task=18;
  else if(has('3.8.5'))task=17;
  else if(has('3.8.8'))task=20;
  else if(has('3.8.7')&&!has('3.8.4'))task=19;
  else if(has('3.8.4'))task=16;
  const legacy=/одну из проблем|в одном из приведенн.*неверно выделена|прочитайте фрагмент рецензии/.test(text);
  return {task,tags:inferTags(task,item.bodyText),format:legacy?'legacy':'unspecified'};
}
export function inferTags(task,bodyText){
  // Task 16 needs a syntactic analysis of each option. Repeated words alone
  // cannot prove a shared homogeneous row, a common component, or even its type.
  // Import candidates stay untagged until the source-bound review is applied.
  if(Number(task)===16)return [];
  const tags=new Set();let all=bodyText.toLowerCase().replaceAll('ё','е');
  if(task===16)all=all.replace(/\d\)\s*/g,'\n');
  const stressIds=['stress-nouns','stress-adjectives','stress-verbs','stress-participles','stress-verbs','stress-adverbs'];
  if(task===4){
    const normalize=s=>s.toLowerCase().replaceAll('ё','е');
    const words=new Set((bodyText.match(/[а-яё]*[АЕЁИОУЫЭЮЯ][а-яё]+/gu)||[]).map(normalize));
    all=[...words].join(' ');
    wordlists.stress.groups.forEach((group,i)=>{
      const official=group.entries.flatMap(entry=>(entry.match(/[а-яё]*[АЕЁИОУЫЭЮЯ][а-яё]+/gu)||[]).map(normalize));
      if(official.some(word=>words.has(word))){tags.add('stress-pos');tags.add(stressIds[i]);}
    });
  }
  const highlighted=(bodyText.match(/[А-ЯЁ]{3,}/gu)||[]).join(' ').toLowerCase().replaceAll('ё','е');
  for(const topic of topicEntries(task))if(!(task===4&&stressIds.includes(topic.id))&&topic.pattern&&new RegExp(topic.pattern.replaceAll('ё','е'),'iu').test(task===5&&topic.id.startsWith('paronym-list-')?highlighted:all))topic.path.forEach(id=>tags.add(id));
  return [...tags];
}
export function filterCatalog(items,{section='',task=0,topic='',year='all',query='',status='all'}={},work={}) {
  const needle=query.trim().toLowerCase();
  return items.filter(item=>{
    if(section&&!sections.find(s=>s.id===section)?.tasks.includes(item.task))return false;
    if(task&&item.task!==Number(task))return false;
    if(topic&&!item.tags.includes(topic))return false;
    if(year!=='all'&&(year==='unknown'?item.year!==null:String(item.year)!==String(year)))return false;
    if(status==='done'&&!work[item.id]?.done||status==='new'&&work[item.id]?.done)return false;
    if(!needle)return true;
    const definition=tasks.find(t=>t.number===item.task),labels=topicEntries(item.task).filter(t=>item.tags.includes(t.id)).map(t=>t.label);
    return [item.id,definition?.title,...labels,...item.codes].join(' ').toLowerCase().includes(needle);
  });
}
