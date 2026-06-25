import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_KEY = "deutschmind:language";

const messages = {
  de: {
    navToday: "Heute", navMap: "Karte", navImport: "Import", navMemory: "Fortschritt",
    mainNavigation: "Hauptnavigation", tagline: "Deine persönliche Deutsch-Lernkarte",
    mapEyebrow: "DEIN WORTSCHATZ", mapTitle: "Karte",
    mapIntro: "Suche, ergänze und vertiefe Wörter. Der Graph zeigt Zusammenhänge, die Liste hilft beim schnellen Arbeiten.",
    all: "Alle", known: "Sicher", boundary: "Unsicher", unknown: "Neu",
    zoomIn: "Vergrößern", zoomOut: "Verkleinern", resetMap: "Karte zentrieren",
    graphLabel: "Wissensnetze der deutschen Sprache", mastered: "Gelernt",
    legendKnown: "Sicher", legendBoundary: "Unsicher", legendUnknown: "Neu",
    welcomeBack: "Willkommen zurück", createMap: "Erstelle deine Lernkarte",
    personalMap: "PERSÖNLICHE SPRACHKARTE",
    authIntro: "Jeder Account besitzt eigene Wissensnetze, Lernstände, Materialien, Einstellungen und Wiederholungen.",
    name: "Name", passwordHint: "Passwort – mindestens 8 Zeichen",
    wait: "Bitte warten…", login: "Anmelden", createAccount: "Konto erstellen",
    noAccount: "Ich habe noch kein Konto", hasAccount: "Ich habe bereits ein Konto",
    todayTitle: "Heute",
    todayIntro: "Eine kurze Übung mit Wörtern, die du bald vergessen könntest oder die an deiner Lerngrenze liegen.",
    yourPractice: "DEINE ÜBUNG", minutes: "Min.", wordsNeedAttention: "Wörter brauchen Aufmerksamkeit",
    practiceIntro: "Erkennen, aktiv erinnern und kurze Sätze – ohne unnötige Theorie.",
    startPractice: "Übung starten", next: "ALS NÄCHSTES", nearestWords: "Passende Wörter",
    basedOnMap: "aus deiner Karte", of: "von", recall: "ERINNERN", use: "ANWENDEN", rate: "BEWERTEN",
    showCard: "Wortkarte anzeigen", easy: "Leicht", hard: "Schwierig", forgot: "Vergessen",
    searchWords: "Wort, Übersetzung oder Thema suchen", word: "Wort", verb: "Verb", phrase: "Phrase",
    concept: "Begriff", add: "Hinzufügen", expandTopic: "✦ Karte nach Thema erweitern",
    topicExample: "Zum Beispiel: Bewerbung, Steuern, Softwarearchitektur", creating: "Wird erstellt…",
    add15: "15 hinzufügen", allLevels: "Alle Niveaus", elements: "Elemente",
    historyEyebrow: "PERSÖNLICHER VERLAUF", memoryTitle: "Fortschritt",
    memoryIntro: "Hier siehst du, was du hinzugefügt, wiederholt und wieder zu vergessen begonnen hast.",
    logout: "Abmelden", wordsInMap: "Wörter in der Karte", addedByYou: "von dir hinzugefügt", sessions: "Übungen",
    personalization: "PERSONALISIERUNG", suggestions: "Was soll vorgeschlagen werden?",
    settingsIntro: "Dieser Bereich gilt für neue AI-Wörter, Übungen, Empfehlungen und Materialanalysen. Gespeicherte Wörter bleiben erhalten.",
    allLevelsPreset: "Alle Niveaus", onlyC1: "Nur C1", from: "Von", to: "Bis", practiceSize: "Wörter pro Übung",
    verbs: "Verben", phrases: "Phrasen", antonyms: "Antonyme", saving: "Wird gespeichert…",
    settingsSaved: "✓ Einstellungen gespeichert", saveLearning: "Lerneinstellungen speichern",
    activity14: "14 TAGE", activity: "Aktivität", needsReview: "WIEDERHOLEN", weakPoints: "Schwachstellen",
    recently: "KÜRZLICH", materials: "Materialien", germanMaterial: "Deutsches Material", text: "Text",
    noMaterials: "Analysierte Fotos und Texte erscheinen hier.", recentActions: "LETZTE AKTIONEN",
    history: "Verlauf", noHistory: "Der Verlauf erscheint nach der ersten Übung oder dem ersten eigenen Wort.",
    importEyebrow: "AI-ANALYSE IM HINTERGRUND", importTitle: "Import",
    importIntro: "Du kannst die Seite verlassen: Die Analyse läuft in einer Warteschlange und das Ergebnis bleibt in deinem Konto.",
    photo: "Foto", takePhoto: "Material fotografieren", fileDeleted: "Die Datei wird nach der Analyse aus dem Speicher entfernt",
    pasteGerman: "Deutschen Text einfügen…", sendAnalysis: "Zur Analyse senden",
    queued: "In Warteschlange", analyzing: "AI analysiert das Material", done: "Fertig", error: "Fehler",
    connectionLost: "Verbindung unterbrochen", retry: "Erneut versuchen",
    loadingMap: "Deine Deutschkarte wird aufgebaut…", confidence: "Sicherheit",
    aiContinuation: "AI-ERWEITERUNG", searchingWord: "Ein passendes neues Wort wird gesucht…",
    aiExpanding: "AI erweitert das Wissensnetz im Hintergrund.", branchExpanded: "Zweig erweitert.",
    retryAgain: "Noch einmal versuchen", typicalVerbs: "TYPISCHE VERBEN", related: "ÄHNLICHE WÖRTER",
    collocations: "WORTVERBINDUNGEN", example: "BEISPIEL", partial: "Teilweise", edit: "Bearbeiten",
    delete: "Löschen", save: "Speichern", cancel: "Abbrechen", anotherWeb: "anderes Netz",
    newMaterial: "NEUES MATERIAL", importLegacyIntro: "Fotografiere eine Seite oder füge Text ein. Die AI erkennt nützliche Wörter, Phrasen und Verben.",
    analyze: "Analysieren", cancelAnalysis: "Abbrechen", usefulVocabulary: "Nützlicher Wortschatz",
    forLearning: "ZUM LERNEN", addImportant: "Wichtige hinzufügen", adding: "Wird hinzugefügt…",
    inMap: "✓ In der Karte", addToMap: "Zur Karte hinzufügen", sourceMaterial: "AUS DEM MATERIAL",
    readyPhrases: "Nützliche Wendungen", words: "Wörter", familiar: "Bekannt", review: "Wiederholen",
    useful: "Nützlich", showSource: "Materialtext anzeigen", selectedMaterial: "Ausgewähltes Material",
    replacePhoto: "Foto wechseln", prepareImage: "Bild wird vorbereitet…", analyzePhoto: "Foto analysieren",
    privacyPhoto: "Das Foto wird zur Analyse an OpenAI gesendet und nicht als Datei in der App gespeichert.",
    photoPage: "Seite fotografieren", chooseGallery: "Oder ein vorhandenes Bild aus der Galerie auswählen",
    statusChanged: "Lernstand geändert", nodeAdded: "Neues Wort hinzugefügt",
    nodeDeleted: "Eigenes Wort gelöscht", nodeEdited: "Eigenes Wort bearbeitet",
    crashTitle: "Die Ansicht ist abgestürzt", crashText: "Deine gespeicherten Wörter sind sicher. Die Oberfläche kann neu geladen werden.",
    returnApp: "Zurück zur App", reload: "Seite neu laden",
  },
  ru: {
    navToday: "Сегодня", navMap: "Карта", navImport: "Импорт", navMemory: "Память",
    mainNavigation: "Основная навигация", tagline: "Карта твоего немецкого мозга",
    mapEyebrow: "ТВОЙ СЛОВАРЬ", mapTitle: "Карта",
    mapIntro: "Ищи, добавляй и уточняй слова. Граф показывает связи, список помогает быстро работать.",
    all: "Все", known: "Знаю", boundary: "На границе", unknown: "Новое",
    zoomIn: "Приблизить", zoomOut: "Отдалить", resetMap: "Вернуть карту в центр",
    graphLabel: "Паутины знаний немецкого языка", mastered: "Освоено",
    legendKnown: "Знаю", legendBoundary: "На границе", legendUnknown: "Не знаю",
    welcomeBack: "С возвращением", createMap: "Создай свою карту", personalMap: "ПЕРСОНАЛЬНАЯ КАРТА ЯЗЫКА",
    authIntro: "У каждого пользователя — отдельные паутины, знания, материалы, настройки и история повторений.",
    name: "Имя", passwordHint: "Пароль — минимум 8 символов", wait: "Подождите…", login: "Войти",
    createAccount: "Создать аккаунт", noAccount: "У меня ещё нет аккаунта", hasAccount: "У меня уже есть аккаунт",
    todayTitle: "Сегодня", todayIntro: "Небольшая практика из слов, которые начинают забываться или находятся рядом с твоей границей.",
    yourPractice: "ТВОЯ ПРАКТИКА", minutes: "мин", wordsNeedAttention: "слов требуют внимания",
    practiceIntro: "Узнавание, активное вспоминание и короткие предложения — без лишней теории.",
    startPractice: "Начать практику", next: "ДАЛЬШЕ", nearestWords: "Ближайшие слова", basedOnMap: "по твоей карте",
    of: "из", recall: "ВСПОМНИ", use: "ИСПОЛЬЗУЙ", rate: "ОЦЕНИ", showCard: "Показать карточку слова",
    easy: "Легко", hard: "С трудом", forgot: "Не помню", searchWords: "Найти слово, перевод или тему",
    word: "Слово", verb: "Глагол", phrase: "Фраза", concept: "Понятие", add: "Добавить",
    expandTopic: "✦ Расширить карту по теме", topicExample: "Например: собеседование, налоги, архитектура ПО",
    creating: "Создаём…", add15: "Добавить 15", allLevels: "Все уровни", elements: "элементов",
    historyEyebrow: "ЛИЧНАЯ ИСТОРИЯ", memoryTitle: "Память",
    memoryIntro: "Здесь видно не абстрактный уровень, а то, что ты добавлял, повторял и начинал забывать.",
    logout: "Выйти", wordsInMap: "слов в карте", addedByYou: "добавлено тобой", sessions: "практик",
    personalization: "ПЕРСОНАЛИЗАЦИЯ", suggestions: "Что мне предлагать",
    settingsIntro: "Этот диапазон применяется к новым AI-словам, практике, рекомендациям и разбору материалов. Уже сохранённые слова не удаляются.",
    allLevelsPreset: "Все уровни", onlyC1: "Только C1", from: "От", to: "До", practiceSize: "Слов в практике",
    verbs: "Глаголы", phrases: "Фразы", antonyms: "Антонимы", saving: "Сохраняем…",
    settingsSaved: "✓ Настройки сохранены", saveLearning: "Сохранить обучение", activity14: "14 ДНЕЙ",
    activity: "Активность", needsReview: "НУЖНО ВЕРНУТЬ", weakPoints: "Слабые места", recently: "НЕДАВНО",
    materials: "Материалы", germanMaterial: "Немецкий материал", text: "Текст",
    noMaterials: "Здесь появятся проанализированные фотографии и тексты.", recentActions: "ПОСЛЕДНИЕ ДЕЙСТВИЯ",
    history: "История", noHistory: "История появится после первой практики или добавленного слова.",
    importEyebrow: "ФОНОВЫЙ AI-АНАЛИЗ", importTitle: "Импорт",
    importIntro: "Можно уйти с экрана: анализ выполняется в очереди, а результат хранится в твоём аккаунте.",
    photo: "Фото", takePhoto: "Сфотографировать материал", fileDeleted: "Файл удалится из хранилища после анализа",
    pasteGerman: "Вставь немецкий текст…", sendAnalysis: "Отправить на анализ", queued: "В очереди",
    analyzing: "AI анализирует материал", done: "Готово", error: "Ошибка", connectionLost: "Связь потерялась",
    retry: "Попробовать снова", loadingMap: "Строим карту твоего немецкого…", confidence: "Уверенность",
    aiContinuation: "AI-ПРОДОЛЖЕНИЕ ПАУТИНЫ", searchingWord: "Ищу новое близкое слово, которого ещё нет в твоей карте…",
    aiExpanding: "AI расширяет паутину в фоне.", branchExpanded: "Ветка расширена.", retryAgain: "Попробовать ещё раз",
    typicalVerbs: "ТИПИЧНЫЕ ГЛАГОЛЫ", related: "ПЕРЕЙТИ К ПОХОЖИМ", collocations: "СЛОВОСОЧЕТАНИЯ",
    example: "ПРИМЕР", partial: "Частично", edit: "Редактировать", delete: "Удалить", save: "Сохранить",
    cancel: "Отмена", anotherWeb: "другая паутина", newMaterial: "НОВЫЙ МАТЕРИАЛ",
    importLegacyIntro: "Сфотографируй страницу или вставь текст. AI поймёт материал и выберет полезные слова, фразы и глаголы.",
    analyze: "Анализировать", cancelAnalysis: "Отменить", usefulVocabulary: "Полезная лексика", forLearning: "ДЛЯ ИЗУЧЕНИЯ",
    addImportant: "Добавить важные", adding: "Добавляем…", inMap: "✓ В карте", addToMap: "Добавить в карту",
    sourceMaterial: "ИЗ МАТЕРИАЛА", readyPhrases: "Готовые выражения", words: "Слов", familiar: "Знакомые",
    review: "Повторить", useful: "Полезные", showSource: "Показать текст материала", selectedMaterial: "Выбранный материал",
    replacePhoto: "Сменить фото", prepareImage: "Подготавливаем изображение…", analyzePhoto: "Проанализировать фотографию",
    privacyPhoto: "Фото отправляется в OpenAI для анализа и не сохраняется приложением как файл.",
    photoPage: "Сфотографировать страницу", chooseGallery: "Или выбрать готовое изображение из галереи",
    statusChanged: "Изменена уверенность", nodeAdded: "Добавлено новое слово", nodeDeleted: "Удалено личное слово",
    nodeEdited: "Отредактировано личное слово", crashTitle: "Экран споткнулся",
    crashText: "Твои сохранённые слова не потеряны. Можно безопасно восстановить интерфейс.",
    returnApp: "Вернуться в приложение", reload: "Перезагрузить страницу",
  },
};

const LanguageContext = createContext(null);

export function getStoredLanguage() {
  return localStorage.getItem(LANGUAGE_KEY) || "de";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage);
  const setLanguage = (next) => {
    localStorage.setItem(LANGUAGE_KEY, next);
    setLanguageState(next);
  };
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key) => messages[language]?.[key] || messages.de[key] || key,
    locale: language === "de" ? "de-DE" : "ru-RU",
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-switch" aria-label="Sprache / Язык">
      {["de", "ru"].map((item) => (
        <button key={item} className={language === item ? "active" : ""} onClick={() => setLanguage(item)}>
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
