import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { listSubjects } from "../study-store.js";
registerMainMenuItem({ label: "المصادر", data: "resources:list", order: 20 });
const composer = new Composer<Ctx>();
composer.callbackQuery("resources:list", async (ctx) => {
  await ctx.answerCallbackQuery();
  const subjects = await listSubjects(ctx);
  const resources = subjects.flatMap((subject) => subject.resources.map((resource) => ({ subject, resource })));
  const keyboard = inlineKeyboard([[inlineButton("العودة للقائمة", "menu:main")]]);
  if (!resources.length) { await ctx.editMessageText("المصادر التعليمية قيد التحديث.", { reply_markup: keyboard }); return; }
  await ctx.editMessageText(resources.map(({ subject, resource }) => `${subject.name}: ${resource.title}\n${resource.url ?? "غير متوفر حالياً"}`).join("\n\n"), { reply_markup: keyboard });
});
export default composer;
