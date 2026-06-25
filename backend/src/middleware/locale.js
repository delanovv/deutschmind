const translations = new Map([
  ["Нужна авторизация", "Anmeldung erforderlich"],
  ["Сессия недействительна или истекла", "Die Sitzung ist ungültig oder abgelaufen"],
  ["Слишком много попыток. Попробуй позже.", "Zu viele Versuche. Bitte später erneut versuchen."],
  ["Слишком много запросов", "Zu viele Anfragen"],
  ["Лимит AI-запросов временно исчерпан", "Das Limit für AI-Anfragen ist vorübergehend erreicht"],
  ["Проверь email и пароль: минимум 8 символов", "E-Mail und Passwort prüfen: mindestens 8 Zeichen"],
  ["Этот email уже зарегистрирован", "Diese E-Mail-Adresse ist bereits registriert"],
  ["Некорректный email или пароль", "E-Mail-Adresse oder Passwort ist ungültig"],
  ["Пользователь не найден", "Benutzer nicht gefunden"],
  ["Материал не найден", "Material nicht gefunden"],
  ["Нужно изображение JPEG, PNG, WebP или GIF", "Ein JPEG-, PNG-, WebP- oder GIF-Bild ist erforderlich"],
  ["Текст пуст", "Der Text ist leer"],
  ["Паутина не найдена", "Wissensnetz nicht gefunden"],
  ["Задача не найдена", "Aufgabe nicht gefunden"],
  ["Некорректный режим или оценка повторения", "Ungültiger Übungsmodus oder ungültige Bewertung"],
  ["Поле text обязательно", "Das Feld „text“ ist erforderlich"],
  ["Напиши вопрос или текст для проверки", "Bitte eine Frage oder einen zu prüfenden Text eingeben"],
  ["AI-тьютор временно недоступен. Проверь ключ, модель и лимиты API.", "Der AI-Tutor ist vorübergehend nicht verfügbar. API-Schlüssel, Modell und Limits prüfen."],
  ["Поле items должно быть массивом", "Das Feld „items“ muss ein Array sein"],
  ["Добавленное слово не найдено", "Das hinzugefügte Wort wurde nicht gefunden"],
  ["Node не найден", "Knoten nicht gefunden"],
  ["Внутренняя ошибка сервера", "Interner Serverfehler"],
  ["Фотография слишком большая для отправки. Попробуй снять её с меньшим разрешением.", "Das Foto ist zu groß. Bitte ein Bild mit geringerer Auflösung verwenden."],
]);

function translateError(message, language) {
  if (language !== "de" || typeof message !== "string") return message;
  if (message.startsWith("Текст слишком длинный. Максимум:")) {
    return message.replace("Текст слишком длинный. Максимум:", "Der Text ist zu lang. Maximum:");
  }
  return translations.get(message) || message;
}

export function localeMiddleware(req, res, next) {
  req.language = String(req.headers["accept-language"] || "de").toLowerCase().startsWith("ru") ? "ru" : "de";
  const json = res.json.bind(res);
  res.json = (body) => {
    if (body?.error) return json({ ...body, error: translateError(body.error, req.language) });
    return json(body);
  };
  next();
}
