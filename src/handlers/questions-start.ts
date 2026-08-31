import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { saveQuestion } from "../domain.js";
import { now } from "../content.js";
import { adminChatId, inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
registerMainMenuItem({ label: "الأسئلة والاستفسارات", data: "questions:start", order: 30 });
const composer = new Composer<Ctx>();
function prompt(ctx: Ctx, kind: "question" | "contact") { ctx.session.step = kind; ctx.session.draftText = undefined; return ctx.reply(kind === "question" ? "اكتب سؤالك الدراسي في رسالة واحدة." : "اكتب رسالتك للإدارة في رسالة واحدة.", { reply_markup: { force_reply: true, input_field_placeholder: "اكتب رسالتك هنا" } }); }
composer.callbackQuery("questions:start", async (ctx) => { await ctx.answerCallbackQuery(); await prompt(ctx, "question"); });
export async function sendDraft(ctx: Ctx, kind: "question" | "contact") {
  const text = ctx.session.draftText; if (!text || !ctx.from) return;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "مستخدم Telegram";
  const stored = await saveQuestion(ctx, { text, senderName: name, senderUsername: ctx.from.username ? `@${ctx.from.username}` : null, timestamp: now().toISOString(), kind });
  if (!stored) { await ctx.editMessageText("حفظ الرسالة غير متاح حالياً. حاول مرة أخرى لاحقاً."); return; }
  const owner = adminChatId(ctx);
  if (!owner) { ctx.session.step = undefined; ctx.session.draftText = undefined; await ctx.editMessageText("تم حفظ رسالتك. استقبال الإدارة غير مُعدّ بعد."); return; }
  try { await ctx.api.sendMessage(owner, `${kind === "question" ? "سؤال جديد" : "رسالة جديدة"}\nالمرسل: ${name}${ctx.from.username ? ` (${ctx.from.username})` : ""}\nالنص: ${text}`); } catch { ctx.session.step = undefined; ctx.session.draftText = undefined; await ctx.editMessageText("تم حفظ رسالتك، وتعذّر إرسال التنبيه للإدارة الآن."); return; }
  ctx.session.step = undefined; ctx.session.draftText = undefined; await ctx.editMessageText("وصلت رسالتك إلى الإدارة.");
}
composer.on("message:text", async (ctx, next) => { const kind = ctx.session.step; if (kind !== "question" && kind !== "contact") return next(); const text = ctx.message.text.trim(); if (text.length < 3) return ctx.reply("اكتب رسالة أوضح من ثلاثة أحرف.", { reply_markup: { force_reply: true, input_field_placeholder: "اكتب رسالتك هنا" } }); if (text.length > 1500) return ctx.reply("اجعل رسالتك أقصر من 1500 حرفاً ثم أرسلها.", { reply_markup: { force_reply: true, input_field_placeholder: "اكتب رسالتك هنا" } }); ctx.session.draftText = text; await ctx.reply("راجع رسالتك ثم اختر الإرسال.", { reply_markup: inlineKeyboard([[inlineButton("أرسل", `draft:${kind}:send`)], [inlineButton("إلغاء", "draft:cancel")]]) }); });
composer.callbackQuery(/^draft:(question|contact):send$/, async (ctx) => { await ctx.answerCallbackQuery(); await sendDraft(ctx, ctx.match[1] as "question" | "contact"); });
composer.callbackQuery("draft:cancel", async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.step = undefined; ctx.session.draftText = undefined; await ctx.editMessageText("أُلغي إرسال الرسالة."); });
export { prompt };
export default composer;
