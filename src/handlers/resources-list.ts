import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { resources, subjects } from "../domain.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard, urlButton } from "../toolkit/index.js";
registerMainMenuItem({ label: "المصادر", data: "resources:list", order: 20 });
const composer = new Composer<Ctx>();
composer.callbackQuery("resources:list", async (ctx) => {
  await ctx.answerCallbackQuery(); const list = await resources(ctx);
  if (!list.length) return ctx.reply("المصادر قيد التحديث حالياً.", { reply_markup: inlineKeyboard([[inlineButton("عرض المواد", "subjects:list")], [inlineButton("العودة للقائمة", "menu:main")]]) });
  const names = new Map((await subjects(ctx)).map((s) => [s.id, s.name]));
  const rows = list.map((r) => r.url ? [urlButton(`${names.get(r.subjectId) ?? "مادة"}: ${r.title}`, r.url)] : [inlineButton(`${r.title} — غير متوفر حالياً`, `unavailable:${r.id}`)]);
  await ctx.reply("هذه كل المصادر المتاحة.", { reply_markup: inlineKeyboard([...rows, [inlineButton("العودة للقائمة", "menu:main")]]) });
});
export default composer;
