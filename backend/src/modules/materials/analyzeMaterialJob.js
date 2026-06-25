import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { deletePrivateObject, readPrivateObject } from "./objectStorage.js";

const MaterialAnalysis = z.object({
  sourceText: z.string(),
  titleRu: z.string(),
  summaryRu: z.string(),
  difficulty: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  vocabulary: z.array(z.object({
    label: z.string(),
    translationRu: z.string(),
    type: z.enum(["word", "verb", "phrase", "concept"]),
    cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
    explanationRu: z.string()
  }))
});

export async function processAnalyzeMaterialJob({ userId, payload }) {
  const materialResult = await query(
    `SELECT m.*,u.preferences FROM materials m JOIN users u ON u.id=m.user_id WHERE m.id=$1 AND m.user_id=$2`,
    [payload.materialId, userId]
  );
  const material = materialResult.rows[0];
  if (!material) throw new Error("Материал не найден");
  await query("UPDATE materials SET status='processing',updated_at=now() WHERE id=$1", [material.id]);
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let userContent;
    if (material.type === "image") {
      const buffer = await readPrivateObject(material.storage_key);
      const extension = material.storage_key.split(".").at(-1);
      const mime = extension === "jpg" ? "jpeg" : extension;
      userContent = [
        { type: "input_text", text: `Проанализируй немецкий материал. Настройки пользователя: ${JSON.stringify(material.preferences)}` },
        { type: "input_image", image_url: `data:image/${mime};base64,${buffer.toString("base64")}`, detail: "high" }
      ];
    } else {
      userContent = `Проанализируй немецкий материал с учётом настроек ${JSON.stringify(material.preferences)}:\n${material.source_text}`;
    }
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      reasoning: { effort: "low" },
      text: { verbosity: "low", format: zodTextFormat(MaterialAnalysis, "material_analysis") },
      input: [
        { role: "system", content: "Ты анализируешь немецкий учебный материал для русскоязычного пользователя. Выделяй только полезную лексику разрешённого диапазона CEFR." },
        { role: "user", content: userContent }
      ]
    });
    await query(
      `UPDATE materials SET status='ready',source_text=$2,analysis=$3::jsonb,storage_key=NULL,updated_at=now() WHERE id=$1`,
      [material.id, response.output_parsed.sourceText, JSON.stringify(response.output_parsed)]
    );
    if (material.storage_key) await deletePrivateObject(material.storage_key);
    return {
      result: { materialId: material.id, analysis: response.output_parsed },
      usage: { model: response.model, inputTokens: response.usage?.input_tokens, outputTokens: response.usage?.output_tokens }
    };
  } catch (error) {
    if (material.storage_key) await deletePrivateObject(material.storage_key).catch(() => {});
    await query("UPDATE materials SET status='failed',error_message=$2,storage_key=NULL,updated_at=now() WHERE id=$1", [material.id, error.message]);
    throw error;
  }
}
