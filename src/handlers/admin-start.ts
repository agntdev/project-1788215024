import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { adminChatId, inlineButton, inlineKeyboard, registerMainMenuItem, requireOwner } from "../toolkit/index.js";
import { deleteSubject, listQuestions, listSubjects, newRecordId, saveResource, saveSubject } from "../study-store.js";

registerMainMenuItem({ label: "تواصل مع الإدارة", data: "admin:start", order: 40 });
registerMainMenuItem({ label: "إدارة المحتوى", data: "admin:manage", order: 50 });
const composer = new Composer<Ctx>();
const menu = inlineKeyboard([[inlineButton("العودة للقائمة", "menu:main")]]);
function reset(ctx: Ctx) { ctx.session.step = undefined; ctx.session.draftText = undefined; }

composer.callbackQuery("admin:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!adminChatId(ctx)) { await ctx.reply("التواصل مع الإدارة غير متاح الآن لأن الإعداد غير مكتمل.", { reply_markup: menu }); return; }
  reset(ctx); ctx.session.step = "admin-message";
  await ctx.reply("اكتب رسالتك للإدارة في رسالة واحدة.", { reply_markup: { force_reply: true } });
});
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "admin-message") return next();
  const text = ctx.message.text.trim();
  if (!text || text.startsWith("/")) { await ctx.reply("اكتب الرسالة ثم أرسلها.", { reply_markup: { force_reply: true } }); return; }
  const admin = adminChatId(ctx); reset(ctx);
  if (!admin) { await ctx.reply("التواصل مع الإدارة غير متاح الآن لأن الإعداد غير مكتمل.", { reply_markup: menu }); return; }
  const name = ctx.from?.first_name ?? "طالب"; const username = ctx.from?.username ? ` (@${ctx.from.username})` : "";
  try { await ctx.api.sendMessage(admin, `رسالة من ${name}${username}\n\n${text}`); await ctx.reply("تم إرسال رسالتك إلى الإدارة.", { reply_markup: menu }); } catch { await ctx.reply("تعذر إرسال الرسالة الآن. حاول مرة أخرى لاحقاً.", { reply_markup: menu }); }
});

composer.callbackQuery("admin:manage", async (ctx) => {
  if (!(await requireOwner(ctx))) return;
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("اختر ما تريد إدارته.", { reply_markup: inlineKeyboard([[inlineButton("إضافة مادة", "admin:add-subject"), inlineButton("إضافة مورد", "admin:add-resource")], [inlineButton("حذف مادة", "admin:delete-list"), inlineButton("سجل الأسئلة", "admin:questions")], [inlineButton("العودة للقائمة", "menu:main")]]) });
});
composer.callbackQuery("admin:add-subject", async (ctx) => { if (!(await requireOwner(ctx))) return; await ctx.answerCallbackQuery(); reset(ctx); ctx.session.step = "add-subject"; await ctx.reply("اكتب اسم المادة الجديدة.", { reply_markup: { force_reply: true } }); });
composer.callbackQuery("admin:add-resource", async (ctx) => { if (!(await requireOwner(ctx))) return; await ctx.answerCallbackQuery(); reset(ctx); ctx.session.step = "add-resource"; await ctx.reply("اكتب البيانات بهذا الترتيب: المادة | العنوان | النوع | الوصف | الرابط\nالنوع: المصادر أو الملخصات أو الامتحانات. اترك الرابط فارغاً عند عدم توفره.", { reply_markup: { force_reply: true } }); });
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "add-subject") return next();
  const name = ctx.message.text.trim(); if (!name || name.startsWith("/")) { await ctx.reply("اكتب اسم المادة فقط.", { reply_markup: { force_reply: true } }); return; }
  try { const saved = await saveSubject(ctx, { id: newRecordId("sub"), name, description: `مواد ${name} لدفعة 27`, resources: [] }); reset(ctx); await ctx.reply(saved ? "تمت إضافة المادة." : "لا يتوفر حفظ المحتوى في هذه البيئة الآن.", { reply_markup: menu }); } catch { reset(ctx); await ctx.reply("تعذر حفظ المادة الآن.", { reply_markup: menu }); }
});
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "add-resource") return next();
  const parts = ctx.message.text.split("|").map((part) => part.trim());
  if (parts.length !== 5 || !["المصادر", "الملخصات", "الامتحانات"].includes(parts[2]) || !parts[0] || !parts[1]) { await ctx.reply("اكتب المادة | العنوان | النوع | الوصف | الرابط، واختر نوعاً صحيحاً.", { reply_markup: { force_reply: true } }); return; }
  const subject = (await listSubjects(ctx)).find((item) => item.name === parts[0]);
  if (!subject) { await ctx.reply("لم أجد هذه المادة. تحقق من الاسم ثم أعد الإرسال.", { reply_markup: { force_reply: true } }); return; }
  try { const saved = await saveResource(ctx, subject.id, { title: parts[1], type: parts[2] as "المصادر" | "الملخصات" | "الامتحانات", description: parts[3], url: parts[4] || undefined }); reset(ctx); await ctx.reply(saved ? "تمت إضافة المورد." : "لا يتوفر حفظ المحتوى في هذه البيئة الآن.", { reply_markup: menu }); } catch { reset(ctx); await ctx.reply("تعذر حفظ المورد الآن.", { reply_markup: menu }); }
});
composer.callbackQuery("admin:delete-list", async (ctx) => { if (!(await requireOwner(ctx))) return; await ctx.answerCallbackQuery(); const subjects = await listSubjects(ctx); await ctx.editMessageText("اختر المادة المراد حذفها.", { reply_markup: inlineKeyboard([...subjects.map((s) => [inlineButton(s.name, `admin:delete:${s.id}`)]), [inlineButton("العودة", "admin:manage")]]) }); });
composer.on("callback_query:data", async (ctx, next) => { const id = ctx.callbackQuery.data.startsWith("admin:delete:") ? ctx.callbackQuery.data.slice(13) : undefined; if (!id) return next(); if (!(await requireOwner(ctx))) return; await ctx.answerCallbackQuery(); try { const saved = await deleteSubject(ctx, id); await ctx.editMessageText(saved ? "تم حذف المادة." : "لا يتوفر حفظ المحتوى في هذه البيئة الآن.", { reply_markup: menu }); } catch { await ctx.editMessageText("تعذر حذف المادة الآن.", { reply_markup: menu }); } });
composer.callbackQuery("admin:questions", async (ctx) => { if (!(await requireOwner(ctx))) return; await ctx.answerCallbackQuery(); try { const questions = await listQuestions(ctx); if (questions === undefined) { await ctx.editMessageText("لا يتوفر سجل الأسئلة في هذه البيئة الآن.", { reply_markup: menu }); return; } if (!questions.length) { await ctx.editMessageText("لا توجد أسئلة مسجلة بعد.", { reply_markup: menu }); return; } await ctx.editMessageText(questions.slice(-10).map((q) => `${q.sender_name}${q.sender_username ? ` (@${q.sender_username})` : ""}\n${q.text}`).join("\n\n"), { reply_markup: menu }); } catch { await ctx.editMessageText("تعذر عرض سجل الأسئلة الآن.", { reply_markup: menu }); } });
export default composer;
