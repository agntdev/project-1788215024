import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { subjects, resources } from "../domain.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard, urlButton } from "../toolkit/index.js";
registerMainMenuItem({ label: "مواد دراسية", data: "subjects:list", order: 10 });
const composer = new Composer<Ctx>();
const back = [inlineButton("العودة للقائمة", "menu:main")];
async function showSubjects(ctx: Ctx, edit = false) {
  const list = await subjects(ctx); const keyboard = inlineKeyboard([...list.map((s) => [inlineButton(s.name, `subject:${s.id}`)]), back]);
  const text = list.length ? "اختر المادة التي تريد دراستها." : "المواد قيد التحديث حالياً.";
  if (edit) await ctx.editMessageText(text, { reply_markup: keyboard }); else await ctx.reply(text, { reply_markup: keyboard });
}
composer.callbackQuery("subjects:list", async (ctx) => { await ctx.answerCallbackQuery(); await showSubjects(ctx); });
composer.callbackQuery(/^subject:([a-z-]+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const id = ctx.match[1]; const item = (await subjects(ctx)).find((s) => s.id === id); if (!item) return ctx.editMessageText("هذه المادة غير متوفرة حالياً."); await ctx.editMessageText(`${item.name}\n${item.description}\nاختر ما تريد عرضه.`, { reply_markup: inlineKeyboard([[inlineButton("المصادر", `mat:${id}:resources`)], [inlineButton("الملخصات", `mat:${id}:summaries`)], [inlineButton("الامتحانات", `mat:${id}:exams`)], [inlineButton("خطة الدراسة", `mat:${id}:plan`)], [inlineButton("كل المواد", "subjects:list")]]) }); });
composer.callbackQuery(/^mat:([a-z-]+):(resources|summaries|exams|plan)$/, async (ctx) => { await ctx.answerCallbackQuery(); const [, id, kind] = ctx.match; const item = (await subjects(ctx)).find((s) => s.id === id); if (!item) return ctx.editMessageText("هذه المادة غير متوفرة حالياً."); if (kind === "plan") return ctx.editMessageText(`خطة ${item.name}\n${item.studyPlan}`, { reply_markup: inlineKeyboard([[inlineButton("خيارات المادة", `subject:${id}`)], back]) }); const list = (await resources(ctx, id)).filter((r) => kind === "resources" || r.type === kind); if (!list.length) return ctx.editMessageText("المحتوى قيد التحديث حالياً.", { reply_markup: inlineKeyboard([[inlineButton("خيارات المادة", `subject:${id}`)], back]) }); const rows = list.map((r) => r.url ? [urlButton(r.title, r.url)] : [inlineButton(`${r.title} — غير متوفر حالياً`, `unavailable:${r.id}`)]); await ctx.editMessageText(`موارد ${item.name}`, { reply_markup: inlineKeyboard([...rows, [inlineButton("خيارات المادة", `subject:${id}`)], back]) }); });
composer.callbackQuery(/^unavailable:\d+$/, async (ctx) => { await ctx.answerCallbackQuery({ text: "غير متوفر حالياً", show_alert: true }); });
export default composer;
