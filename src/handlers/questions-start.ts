import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { adminChatId, inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { newRecordId, saveQuestion } from "../study-store.js";
import { now } from "../clock.js";
registerMainMenuItem({ label: "الأسئلة والاستفسارات", data: "questions:start", order: 30 });
const composer = new Composer<Ctx>();
const menu = inlineKeyboard([[inlineButton("العودة للقائمة", "menu:main")]]);
function clear(ctx: Ctx) { ctx.session.step = undefined; ctx.session.draftText = undefined; }
composer.callbackQuery("questions:start", async (ctx) => { await ctx.answerCallbackQuery(); clear(ctx); ctx.session.step = "question"; await ctx.reply("اكتب سؤالك الدراسي في رسالة واحدة.", { reply_markup: { force_reply: true } }); });
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "question") return next();
  const text = ctx.message.text.trim();
  if (!text || text.startsWith("/")) { await ctx.reply("اكتب نص السؤال ثم أرسله.", { reply_markup: { force_reply: true } }); return; }
  ctx.session.draftText = text; ctx.session.senderName = ctx.from?.first_name ?? "طالب"; ctx.session.senderUsername = ctx.from?.username;
  await ctx.reply("راجع سؤالك ثم أرسله للإدارة.", { reply_markup: inlineKeyboard([[inlineButton("أرسل", "question:send"), inlineButton("إلغاء", "question:cancel")]]) });
});
composer.callbackQuery("question:cancel", async (ctx) => { await ctx.answerCallbackQuery(); clear(ctx); await ctx.editMessageText("لم يُرسل السؤال.", { reply_markup: menu }); });
composer.callbackQuery("question:send", async (ctx) => {
  await ctx.answerCallbackQuery(); const text = ctx.session.draftText;
  if (!text) { await ctx.editMessageText("انتهت مسودة السؤال. ابدأ من جديد.", { reply_markup: menu }); return; }
  const question = { id: newRecordId("q"), text, sender_name: ctx.session.senderName ?? "طالب", sender_username: ctx.session.senderUsername, timestamp: now().toISOString() };
  let saved = false;
  try { saved = await saveQuestion(ctx, question); } catch { /* reported below */ }
  if (!saved) { clear(ctx); await ctx.editMessageText("تعذر حفظ السؤال الآن. حاول مرة أخرى.", { reply_markup: menu }); return; }
  clear(ctx); const admin = adminChatId(ctx);
  if (!admin) { await ctx.editMessageText("تم حفظ سؤالك، لكن إعداد الإدارة غير مكتمل بعد.", { reply_markup: menu }); return; }
  const identity = question.sender_username ? `${question.sender_name} (@${question.sender_username})` : question.sender_name;
  try { await ctx.api.sendMessage(admin, `سؤال جديد من ${identity}\n\n${question.text}`); await ctx.editMessageText("تم إرسال سؤالك إلى الإدارة.", { reply_markup: menu }); } catch { await ctx.editMessageText("تم حفظ سؤالك، وتعذر إرساله للإدارة الآن.", { reply_markup: menu }); }
});
export default composer;
