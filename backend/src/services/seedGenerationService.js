const TOPIC_TEMPLATES = {
  Deutsch: [
    ["wortschatz", "der Wortschatz", "word", "A2", "словарный запас", "Все слова и выражения, которыми человек может пользоваться.", "die Wortschätze"],
    ["bedeutung", "die Bedeutung", "word", "A2", "значение", "Смысл слова, фразы или ситуации.", "die Bedeutungen"],
    ["aussprechen", "aussprechen", "verb", "A2", "произносить", "Говорить слово вслух с определённым звучанием.", null],
    ["nachfragen", "nachfragen", "verb", "B1", "переспрашивать", "Просить повторить или уточнить информацию.", null],
    ["ich-habe-das-nicht-verstanden", "Ich habe das nicht verstanden", "phrase", "A1", "Я этого не понял", "Полезная фраза для уточнения в разговоре.", null],
    ["was-bedeutet-das", "Was bedeutet das?", "phrase", "A1", "Что это значит?", "Короткий вопрос о значении.", null]
  ],
  Alltag: [
    ["termin", "der Termin", "word", "A1", "встреча, назначенное время", "Заранее согласованное время для встречи или визита.", "die Termine"],
    ["vereinbaren", "vereinbaren", "verb", "A2", "договариваться", "Согласовать время, условия или встречу.", null],
    ["absagen", "absagen", "verb", "A2", "отменять", "Сообщить, что встреча или событие не состоится.", null],
    ["pünktlich", "pünktlich", "concept", "A1", "вовремя", "Без опоздания, в назначенное время.", null],
    ["bescheid-geben", "Bescheid geben", "phrase", "A2", "дать знать", "Сообщить кому-то важную информацию.", null],
    ["öffnungszeiten", "die Öffnungszeiten", "word", "A2", "часы работы", "Время, когда учреждение или магазин открыты.", null]
  ],
  Arbeit: [
    ["bewerbung", "die Bewerbung", "word", "A2", "заявление о приёме на работу", "Пакет документов для отклика на вакансию.", "die Bewerbungen"],
    ["lebenslauf", "der Lebenslauf", "word", "A2", "резюме", "Краткое описание образования и опыта работы.", "die Lebensläufe"],
    ["vorstellungsgespraech", "das Vorstellungsgespräch", "word", "B1", "собеседование", "Разговор кандидата с работодателем.", "die Vorstellungsgespräche"],
    ["sich-bewerben", "sich bewerben", "verb", "A2", "подавать заявку", "Официально претендовать на работу или место.", null],
    ["gehalt", "das Gehalt", "word", "A2", "зарплата", "Регулярная оплата труда.", "die Gehälter"],
    ["arbeitsvertrag", "der Arbeitsvertrag", "word", "B1", "трудовой договор", "Договор между сотрудником и работодателем.", "die Arbeitsverträge"],
    ["eine-bewerbung-schicken", "eine Bewerbung schicken", "phrase", "A2", "отправить заявление", "Типичное действие при поиске работы.", null]
  ],
  Wohnung: [
    ["miete", "die Miete", "word", "A1", "арендная плата", "Регулярная оплата за пользование жильём.", "die Mieten"],
    ["mietvertrag", "der Mietvertrag", "word", "A2", "договор аренды", "Договор между арендатором и владельцем жилья.", "die Mietverträge"],
    ["kaution", "die Kaution", "word", "B1", "залог", "Сумма, которую арендодатель временно получает как гарантию.", "die Kautionen"],
    ["nebenkosten", "die Nebenkosten", "word", "A2", "коммунальные расходы", "Дополнительные расходы помимо базовой аренды.", null],
    ["vermieter", "der Vermieter", "word", "A2", "арендодатель", "Человек или компания, сдающие жильё.", "die Vermieter"],
    ["kuendigen", "kündigen", "verb", "B1", "расторгать договор", "Официально завершить договорные отношения.", null],
    ["die-miete-ueberweisen", "die Miete überweisen", "phrase", "A2", "перевести арендную плату", "Типичное ежемесячное действие арендатора.", null]
  ],
  Behörde: [
    ["anmeldung", "die Anmeldung", "word", "A1", "регистрация", "Официальная регистрация человека, адреса или услуги.", "die Anmeldungen"],
    ["antrag", "der Antrag", "word", "A2", "заявление", "Официальная письменная просьба в учреждение.", "die Anträge"],
    ["beantragen", "beantragen", "verb", "B1", "запрашивать официально", "Подавать официальный запрос на документ или услугу.", null],
    ["bescheinigung", "die Bescheinigung", "word", "B1", "справка, подтверждение", "Официальный документ, подтверждающий факт.", "die Bescheinigungen"],
    ["formular", "das Formular", "word", "A1", "бланк", "Документ с полями, которые нужно заполнить.", "die Formulare"],
    ["unterlagen", "die Unterlagen", "word", "A2", "документы", "Набор документов для заявления или процедуры.", null],
    ["frist", "die Frist", "word", "B1", "срок", "Последняя допустимая дата для действия.", "die Fristen"],
    ["einen-antrag-stellen", "einen Antrag stellen", "phrase", "B1", "подать заявление", "Устойчивое выражение для официальной подачи заявления.", null],
    ["eine-bescheinigung-vorlegen", "eine Bescheinigung vorlegen", "phrase", "B1", "предъявить справку", "Передать документ для официальной проверки.", null]
  ],
  Gesundheit: [
    ["arzttermin", "der Arzttermin", "word", "A1", "приём у врача", "Назначенное время посещения врача.", "die Arzttermine"],
    ["beschwerden", "die Beschwerden", "word", "B1", "жалобы, симптомы", "Проблемы со здоровьем, о которых рассказывают врачу.", null],
    ["rezept", "das Rezept", "word", "A2", "рецепт", "Документ врача для получения лекарства.", "die Rezepte"],
    ["krankenversicherung", "die Krankenversicherung", "word", "A2", "медицинская страховка", "Страхование расходов на медицинскую помощь.", "die Krankenversicherungen"],
    ["untersuchen", "untersuchen", "verb", "A2", "обследовать", "Проверять состояние здоровья пациента.", null],
    ["krankgeschrieben", "krankgeschrieben", "concept", "B1", "на больничном", "Официально освобождён от работы из-за болезни.", null],
    ["ein-rezept-ausstellen", "ein Rezept ausstellen", "phrase", "B1", "выписать рецепт", "Типичное действие врача.", null]
  ],
  Familie: [
    ["verwandte", "die Verwandten", "word", "A2", "родственники", "Люди, связанные семейными отношениями.", null],
    ["erziehen", "erziehen", "verb", "B1", "воспитывать", "Помогать ребёнку развиваться и усваивать правила.", null],
    ["sich-verstehen", "sich gut verstehen", "phrase", "A2", "хорошо ладить", "Иметь хорошие отношения друг с другом.", null],
    ["generation", "die Generation", "word", "B1", "поколение", "Люди примерно одного возраста.", "die Generationen"],
    ["unterstuetzen", "unterstützen", "verb", "A2", "поддерживать", "Помогать человеку делом или словами.", null],
    ["gemeinsam", "gemeinsam", "concept", "A1", "вместе, совместно", "Делать что-либо вместе с другими.", null],
    ["allein", "allein", "concept", "A1", "один, самостоятельно", "Без других людей.", null]
  ],
  Einkaufen: [
    ["angebot", "das Angebot", "word", "A2", "предложение, скидка", "Товар или услуга по определённой цене.", "die Angebote"],
    ["umtauschen", "umtauschen", "verb", "B1", "обменивать товар", "Возвращать товар и получать другой.", null],
    ["kassenbon", "der Kassenbon", "word", "A2", "кассовый чек", "Подтверждение покупки.", "die Kassenbons"],
    ["ausverkauft", "ausverkauft", "concept", "A2", "распродано", "Товара больше нет в продаже.", null],
    ["etwas-zurueckgeben", "etwas zurückgeben", "phrase", "A2", "вернуть товар", "Отнести покупку обратно продавцу.", null],
    ["preiswert", "preiswert", "concept", "B1", "выгодный по цене", "Имеющий хорошее соотношение цены и качества.", null]
    ,["teuer", "teuer", "concept", "A1", "дорогой", "Стоящий много денег.", null],
    ["verfuegbar", "verfügbar", "concept", "B1", "доступный, в наличии", "Имеющийся для покупки или использования.", null]
  ],
  Essen: [
    ["gericht", "das Gericht", "word", "A2", "блюдо", "Приготовленная еда.", "die Gerichte"],
    ["bestellen", "bestellen", "verb", "A1", "заказывать", "Просить принести товар или еду.", null],
    ["zutaten", "die Zutaten", "word", "A2", "ингредиенты", "Продукты, из которых готовят блюдо.", null],
    ["vertragen", "vertragen", "verb", "B1", "переносить, усваивать", "Не испытывать проблем после еды или лекарства.", null],
    ["die-rechnung-bitte", "Die Rechnung, bitte", "phrase", "A1", "Счёт, пожалуйста", "Фраза для завершения визита в ресторан.", null],
    ["scharf", "scharf", "concept", "A1", "острый", "Имеющий сильный жгучий вкус.", null]
  ],
  Reisen: [
    ["unterkunft", "die Unterkunft", "word", "A2", "жильё в поездке", "Место временного проживания.", "die Unterkünfte"],
    ["verspaetung", "die Verspätung", "word", "A2", "опоздание, задержка", "Прибытие позже запланированного времени.", "die Verspätungen"],
    ["umsteigen", "umsteigen", "verb", "A2", "делать пересадку", "Переходить с одного транспорта на другой.", null],
    ["reservieren", "reservieren", "verb", "A2", "бронировать", "Заранее закреплять место или услугу.", null],
    ["eine-reise-planen", "eine Reise planen", "phrase", "A2", "планировать поездку", "Продумывать маршрут и детали путешествия.", null],
    ["sehenswert", "sehenswert", "concept", "B1", "достойный посещения", "Интересный для осмотра.", null]
  ],
  Verkehr: [
    ["haltestelle", "die Haltestelle", "word", "A1", "остановка", "Место остановки общественного транспорта.", "die Haltestellen"],
    ["fahrplan", "der Fahrplan", "word", "A2", "расписание", "План времени движения транспорта.", "die Fahrpläne"],
    ["ausfallen", "ausfallen", "verb", "B1", "отменяться", "Не состояться по плану.", null],
    ["stau", "der Stau", "word", "A2", "пробка", "Скопление автомобилей на дороге.", "die Staus"],
    ["zu-fuss", "zu Fuß", "phrase", "A1", "пешком", "Передвигаться без транспорта.", null],
    ["erreichbar", "erreichbar", "concept", "B1", "доступный, досягаемый", "Туда можно добраться или связаться.", null]
  ],
  Bildung: [
    ["ausbildung", "die Ausbildung", "word", "A2", "профессиональное обучение", "Подготовка к конкретной профессии.", "die Ausbildungen"],
    ["pruefung", "die Prüfung", "word", "A1", "экзамен", "Проверка знаний или навыков.", "die Prüfungen"],
    ["bestehen", "bestehen", "verb", "A2", "сдать экзамен", "Успешно пройти проверку.", null],
    ["sich-vorbereiten", "sich vorbereiten", "verb", "A2", "готовиться", "Делать необходимое перед событием.", null],
    ["kenntnisse-erweitern", "Kenntnisse erweitern", "phrase", "B1", "расширять знания", "Узнавать больше в определённой области.", null],
    ["anspruchsvoll", "anspruchsvoll", "concept", "B2", "требовательный, сложный", "Требующий значительных усилий или способностей.", null]
  ],
  Freizeit: [
    ["veranstaltung", "die Veranstaltung", "word", "A2", "мероприятие", "Организованное событие.", "die Veranstaltungen"],
    ["teilnehmen", "teilnehmen", "verb", "A2", "участвовать", "Быть участником события.", null],
    ["sich-erholen", "sich erholen", "verb", "A2", "отдыхать, восстанавливаться", "Возвращать силы после нагрузки.", null],
    ["leidenschaft", "die Leidenschaft", "word", "B1", "увлечение, страсть", "Очень сильный интерес к чему-либо.", "die Leidenschaften"],
    ["zeit-verbringen", "Zeit verbringen", "phrase", "A2", "проводить время", "Заниматься чем-либо в течение времени.", null],
    ["abwechslungsreich", "abwechslungsreich", "concept", "B2", "разнообразный", "Содержащий много разных элементов.", null]
  ],
  Beziehungen: [
    ["vertrauen", "das Vertrauen", "word", "B1", "доверие", "Уверенность в честности и надёжности другого.", null],
    ["sich-entschuldigen", "sich entschuldigen", "verb", "A2", "извиняться", "Просить прощения за поступок.", null],
    ["missverstaendnis", "das Missverständnis", "word", "B1", "недоразумение", "Неправильное понимание слов или ситуации.", "die Missverständnisse"],
    ["ruecksicht-nehmen", "Rücksicht nehmen", "phrase", "B1", "считаться с другими", "Учитывать потребности другого человека.", null],
    ["zuverlaessig", "zuverlässig", "concept", "B1", "надёжный", "Тот, на кого можно положиться.", null],
    ["enttaeuscht", "enttäuscht", "concept", "B1", "разочарованный", "Огорчённый из-за несбывшихся ожиданий.", null]
  ],
  Gesellschaft: [
    ["gleichberechtigung", "die Gleichberechtigung", "word", "B2", "равноправие", "Одинаковые права и возможности.", null],
    ["beitrag", "der Beitrag", "word", "B1", "вклад", "Часть общего результата или обсуждения.", "die Beiträge"],
    ["sich-engagieren", "sich engagieren", "verb", "B2", "активно участвовать", "Вкладывать усилия в общественно важное дело.", null],
    ["verantwortung-uebernehmen", "Verantwortung übernehmen", "phrase", "B2", "брать ответственность", "Отвечать за решение и последствия.", null],
    ["vielfalt", "die Vielfalt", "word", "B2", "многообразие", "Наличие множества разных форм и людей.", null],
    ["gerecht", "gerecht", "concept", "B1", "справедливый", "Соответствующий принципам справедливости.", null],
    ["gesellschaftlicher-zusammenhalt", "der gesellschaftliche Zusammenhalt", "phrase", "C1", "общественная сплочённость", "Прочность связей и солидарности внутри общества.", null],
    ["ungerecht", "ungerecht", "concept", "B1", "несправедливый", "Не соответствующий принципам справедливости.", null]
  ],
  Natur: [
    ["umwelt", "die Umwelt", "word", "A2", "окружающая среда", "Природный мир вокруг человека.", null],
    ["vermeiden", "vermeiden", "verb", "B1", "избегать", "Не допускать чего-либо.", null],
    ["nachhaltig", "nachhaltig", "concept", "B2", "устойчивый, экологичный", "Сохраняющий ресурсы на длительное время.", null],
    ["energie-sparen", "Energie sparen", "phrase", "A2", "экономить энергию", "Использовать меньше энергии.", null],
    ["auswirkung", "die Auswirkung", "word", "B2", "последствие, воздействие", "Результат влияния события.", "die Auswirkungen"],
    ["verschmutzung", "die Verschmutzung", "word", "B1", "загрязнение", "Попадание вредных веществ в среду.", "die Verschmutzungen"]
  ],
  Kultur: [
    ["ausstellung", "die Ausstellung", "word", "A2", "выставка", "Публичный показ искусства или предметов.", "die Ausstellungen"],
    ["auffuehrung", "die Aufführung", "word", "B1", "представление, постановка", "Показ спектакля или музыкального произведения.", "die Aufführungen"],
    ["darstellen", "darstellen", "verb", "B2", "изображать, представлять", "Показывать что-либо определённым образом.", null],
    ["eindruck-machen", "Eindruck machen", "phrase", "B1", "производить впечатление", "Сильно воздействовать на восприятие.", null],
    ["zeitgenoessisch", "zeitgenössisch", "concept", "B2", "современный", "Относящийся к настоящему времени.", null],
    ["werk", "das Werk", "word", "B1", "произведение", "Результат творческой работы.", "die Werke"],
    ["vielschichtig", "vielschichtig", "concept", "C1", "многогранный", "Имеющий несколько смысловых или структурных уровней.", null]
  ],
  Finanzen: [
    ["ausgabe", "die Ausgabe", "word", "B1", "расход", "Деньги, потраченные на что-либо.", "die Ausgaben"],
    ["einnahme", "die Einnahme", "word", "B1", "доход, поступление", "Полученные деньги.", "die Einnahmen"],
    ["ueberweisen", "überweisen", "verb", "A2", "переводить деньги", "Отправлять деньги на другой счёт.", null],
    ["sich-leisten", "sich etwas leisten", "phrase", "B1", "позволить себе", "Иметь достаточно денег для покупки.", null],
    ["schulden", "die Schulden", "word", "B1", "долги", "Деньги, которые нужно вернуть.", null],
    ["sparsam", "sparsam", "concept", "B1", "экономный", "Осторожно расходующий деньги и ресурсы.", null],
    ["verschwenderisch", "verschwenderisch", "concept", "B2", "расточительный", "Расходующий слишком много денег или ресурсов.", null]
  ],
  Emotionen: [
    ["begeistert", "begeistert", "concept", "B1", "в восторге", "Очень рад и увлечён.", null],
    ["sich-aergern", "sich ärgern", "verb", "A2", "злиться, раздражаться", "Испытывать недовольство.", null],
    ["unsicherheit", "die Unsicherheit", "word", "B2", "неуверенность", "Отсутствие уверенности или ясности.", "die Unsicherheiten"],
    ["erleichtert", "erleichtert", "concept", "B1", "испытывающий облегчение", "Спокойный после исчезновения тревоги.", null],
    ["angst-haben-vor", "Angst haben vor", "phrase", "A2", "бояться чего-либо", "Испытывать страх перед чем-либо.", null],
    ["gelassen", "gelassen", "concept", "B2", "спокойный, невозмутимый", "Сохраняющий спокойствие в трудной ситуации.", null],
    ["zwiespaeltig", "zwiespältig", "concept", "C1", "противоречивый, двойственный", "Одновременно вызывающий противоположные чувства.", null],
    ["nervoes", "nervös", "concept", "A2", "нервный", "Испытывающий сильное беспокойство.", null]
  ]
};

const SPECIAL_COLLOCATIONS = {
  termin: [{ de: "einen Termin vereinbaren", ru: "договориться о встрече" }],
  anmeldung: [{ de: "eine Anmeldung ausfüllen", ru: "заполнить регистрацию" }],
  antrag: [{ de: "einen Antrag stellen", ru: "подать заявление" }],
  bescheinigung: [{ de: "eine Bescheinigung vorlegen", ru: "предъявить справку" }],
  bewerbung: [{ de: "eine Bewerbung schicken", ru: "отправить заявление" }],
  miete: [{ de: "die Miete überweisen", ru: "перевести арендную плату" }],
  rezept: [{ de: "ein Rezept ausstellen", ru: "выписать рецепт" }]
};

const slugify = (value) => value
  .toLowerCase()
  .replace(/[ä]/g, "ae")
  .replace(/[ö]/g, "oe")
  .replace(/[ü]/g, "ue")
  .replace(/[ß]/g, "ss")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

export function generateCollocationsForWord(word) {
  return SPECIAL_COLLOCATIONS[word.id] || [];
}

export function generateExamplesForWord(word) {
  const collocation = generateCollocationsForWord(word)[0];
  if (collocation) {
    return [{ de: `Ich muss ${collocation.de}.`, ru: `Мне нужно: ${collocation.ru}.` }];
  }
  // A missing example is preferable to a fake sentence about memorising a word.
  // PostgreSQL seeds contain curated contextual examples, while AI-generated
  // nodes are required to return natural usage examples.
  return [];
}

export function generateWordNode(wordConfig) {
  const [id, label, type, cefr, translationRu, explanationRu, plural] = wordConfig.template;
  const articleMatch = label.match(/^(der|die|das)\s/i);
  const node = {
    id,
    label,
    type,
    lang: "de",
    article: articleMatch ? articleMatch[1] : null,
    plural,
    cefr,
    topic: wordConfig.topic,
    status: "unknown",
    knowledgeScore: 10,
    seenCount: 0,
    correctCount: 0,
    lastSeenAt: null,
    translationRu,
    explanationRu,
    related: [],
    collocations: [],
    examples: [],
    position: wordConfig.position
  };
  node.collocations = generateCollocationsForWord(node);
  node.examples = generateExamplesForWord(node);
  return node;
}

export function generateTopicSeed(topic, wordsPerTopic = 10, topicIndex = 0) {
  const templates = TOPIC_TEMPLATES[topic] || [];
  const selected = templates.slice(0, Math.max(1, wordsPerTopic));
  const centerX = 130 + (topicIndex % 2) * 245;
  const centerY = 100 + Math.floor(topicIndex / 2) * 205;
  const topicId = `topic-${slugify(topic)}`;
  const topicNode = {
    id: topicId,
    label: topic,
    type: "topic",
    lang: "de",
    article: null,
    plural: null,
    cefr: null,
    topic,
    status: "boundary",
    knowledgeScore: 50,
    seenCount: 0,
    correctCount: 0,
    lastSeenAt: null,
    translationRu: topic,
    explanationRu: `Тематический кластер «${topic}».`,
    related: [],
    collocations: [],
    examples: [],
    position: { x: centerX, y: centerY }
  };
  const nodes = selected.map((template, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(selected.length, 1);
    return generateWordNode({
      template,
      topic,
      position: {
        x: Math.round(centerX + Math.cos(angle) * 78),
        y: Math.round(centerY + Math.sin(angle) * 70)
      }
    });
  });
  return [topicNode, ...nodes];
}

export function generateEdgesForNodes(nodes) {
  const edges = [];
  const byTopic = Object.groupBy
    ? Object.groupBy(nodes.filter((node) => node.type !== "topic"), (node) => node.topic)
    : nodes.filter((node) => node.type !== "topic").reduce((acc, node) => {
      acc[node.topic] = acc[node.topic] || [];
      acc[node.topic].push(node);
      return acc;
    }, {});

  Object.entries(byTopic).forEach(([topic, topicNodes]) => {
    const topicId = `topic-${slugify(topic)}`;
    topicNodes.forEach((node, index) => {
      edges.push({
        id: `${topicId}-${node.id}`,
        source: topicId,
        target: node.id,
        type: "parent_of",
        labelRu: "входит в тему"
      });
      if (index > 0) {
        edges.push({
          id: `related-${topicNodes[index - 1].id}-${node.id}`,
          source: topicNodes[index - 1].id,
          target: node.id,
          type: node.type === "phrase" ? "collocation" : "related_to",
          labelRu: node.type === "phrase" ? "устойчивое сочетание" : "связано"
        });
      }
    });
  });

  const addEdge = (source, target, type, labelRu) => {
    if (nodes.some((node) => node.id === source) && nodes.some((node) => node.id === target)) {
      edges.push({ id: `${type}-${source}-${target}`, source, target, type, labelRu });
    }
  };
  addEdge("termin", "vereinbaren", "verb_for", "глагол для встречи");
  addEdge("termin", "anmeldung", "related_to", "часто встречаются в учреждениях");
  addEdge("anmeldung", "antrag", "prerequisite", "регистрация помогает понять процедуру");
  addEdge("antrag", "beantragen", "verb_for", "глагол для заявления");
  addEdge("antrag", "einen-antrag-stellen", "collocation", "устойчивое выражение");
  addEdge("bescheinigung", "eine-bescheinigung-vorlegen", "collocation", "устойчивое выражение");
  addEdge("bewerbung", "eine-bewerbung-schicken", "collocation", "устойчивое выражение");
  addEdge("miete", "die-miete-ueberweisen", "collocation", "устойчивое выражение");
  addEdge("preiswert", "teuer", "opposite_of", "противоположное значение");
  addEdge("ausverkauft", "verfuegbar", "opposite_of", "противоположное значение");
  addEdge("gemeinsam", "allein", "opposite_of", "противоположное значение");
  addEdge("einnahme", "ausgabe", "opposite_of", "доход и расход");
  addEdge("sparsam", "verschwenderisch", "opposite_of", "противоположное значение");
  addEdge("gerecht", "ungerecht", "opposite_of", "противоположное значение");
  addEdge("begeistert", "enttaeuscht", "opposite_of", "противоположные эмоции");
  addEdge("gelassen", "nervoes", "opposite_of", "противоположные состояния");
  return edges;
}

export function generateSeedGraph(options = {}) {
  // Later this mock generator can be replaced with a real LLM-based generator.
  const {
    targetLanguage = "de",
    nativeLanguage = "ru",
    topics = ["Deutsch", "Alltag", "Arbeit", "Wohnung", "Behörde", "Gesundheit", "Familie", "Einkaufen", "Essen", "Reisen", "Verkehr", "Bildung", "Freizeit", "Beziehungen", "Gesellschaft", "Natur", "Kultur", "Finanzen", "Emotionen"],
    wordsPerTopic = 10
  } = options;
  const normalizedTopics = [...new Set(["Deutsch", "Alltag", ...topics])].filter((topic) => TOPIC_TEMPLATES[topic]);
  const nodes = normalizedTopics.flatMap((topic, index) =>
    generateTopicSeed(topic, wordsPerTopic, index)
  );
  const edges = generateEdgesForNodes(nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  edges.forEach((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (source && target && source.type !== "topic" && target.type !== "topic") {
      source.related.push(target.id);
      target.related.push(source.id);
    }
  });
  return {
    nodes,
    edges,
    metadata: {
      generatedBy: "mock-seed-generator",
      targetLanguage,
      nativeLanguage,
      createdAt: new Date().toISOString()
    }
  };
}
