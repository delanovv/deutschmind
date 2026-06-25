import "dotenv/config";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { pool, query } from "../src/db/pool.js";

const ItemSchema = z.object({
  id: z.string(),
  examples: z.array(
    z.object({
      de: z.string(),
      ru: z.string(),
    }),
  ).min(1).max(2),
});

const ResultSchema = z.object({
  items: z.array(ItemSchema),
});

const PLACEHOLDER_PATTERN =
  /^(heute\s+)?lerne\s+ich\b|^das\s+wort\b.*\b(bedeutet|heißt)\b|^ich\s+kenne\s+(das\s+)?wort\b/i;

function hasPlaceholder(examples) {
  return (Array.isArray(examples) ? examples : []).some((example) =>
    PLACEHOLDER_PATTERN.test(String(example?.de || "").trim()),
  );
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY не настроен");
}

const rows = (
  await query(
    `SELECT id,label,type,cefr,translation_ru AS "translationRu",
            explanation_ru AS "explanationRu",collocations,examples
     FROM nodes
     ORDER BY created_at`,
  )
).rows.filter((node) => hasPlaceholder(node.examples));

if (!rows.length) {
  console.log("Шаблонных примеров не найдено.");
  process.exit(0);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let updated = 0;

for (const batch of chunks(rows, 25)) {
  const response = await client.chat.completions.parse({
    model: process.env.OPENAI_EXAMPLE_MODEL || "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `Создай для каждого элемента 1–2 коротких, естественных немецких примера с точным русским переводом.

Правила:
- Немецкое слово или выражение должно реально употребляться в предложении в своём основном значении.
- Покажи типичную бытовую, рабочую, учебную или общественную ситуацию.
- Для глагола покажи естественное управление; для существительного — типичный контекст; для прилагательного — существительное или ситуацию, которую оно описывает.
- Немецкое предложение должно содержать минимум четыре слова.
- Русский текст должен переводить всё предложение естественно и точно.
- Не пиши предложения о заучивании или значении слова.
- Запрещены шаблоны "Heute lerne ich ...", "Das Wort bedeutet ...", "Ich kenne das Wort ...".
- Не меняй id и верни каждый переданный элемент ровно один раз.`,
      },
      {
        role: "user",
        content: JSON.stringify(
          batch.map(({ id, label, type, cefr, translationRu, explanationRu, collocations }) => ({
            id,
            label,
            type,
            cefr,
            translationRu,
            explanationRu,
            collocations,
          })),
        ),
      },
    ],
    response_format: zodResponseFormat(ResultSchema, "natural_examples"),
  });

  const items = response.choices[0]?.message?.parsed?.items || [];
  const expectedIds = new Set(batch.map((item) => item.id));
  for (const item of items) {
    if (!expectedIds.has(item.id)) continue;
    const validExamples = item.examples.filter(
      (example) =>
        !PLACEHOLDER_PATTERN.test(example.de.trim()) &&
        example.de.trim().split(/\s+/).length >= 4,
    );
    if (!validExamples.length) continue;
    await query(
      "UPDATE nodes SET examples=$2::jsonb,updated_at=now() WHERE id=$1",
      [item.id, JSON.stringify(validExamples)],
    );
    updated += 1;
  }
  console.log(`Обновлено ${updated} из ${rows.length}`);
}

console.log(`Готово. Заменено примеров: ${updated}.`);
await pool.end();
