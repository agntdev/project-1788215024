import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { listSubjects, type Subject } from "../study-store.js";

registerMainMenuItem({ label: "مواد دراسية", data: "subjects:list", order: 10 });
const composer = new Composer<Ctx>();
const back = inlineKeyboard([[inlineButton("العودة للقائمة", "menu:main")]]);
const categoryLabel: Record<string, string> = { resources: "المصادر", summaries: "الملخصات", exams: "الامتحانات", plan: "خطة الدراسة" };

function subjectKeyboard(subjects: Subject[]) { return inlineKeyboard([...subjects.map((s) => [inlineButton(s.name, `sub:${s.id}`)]), [inlineButton("العودة للقائمة", "menu:main")]]); }
function subjectOptions(subject: Subject) { return inlineKeyboard([[inlineButton("المصادر", `subcat:${subject.id}:resources`), inlineButton("الملخصات", `subcat:${subject.id}:summaries`)], [inlineButton("الامتحانات", `subcat:${subject.id}:exams`), inlineButton("خطة الدراسة", `subcat:${subject.id}:plan`)], [inlineButton("كل المواد", "subjects:list")]]); }

composer.callbackQuery("subjects:list", async (ctx) => {
  await ctx.answerCallbackQuery();
  const subjects = await listSubjects(ctx);
  if (!subjects.length) { await ctx.editMessageText("المواد الدراسية قيد التحديث.", { reply_markup: back }); return; }
  await ctx.editMessageText("اختر المادة التي تريد مراجعتها.", { reply_markup: subjectKeyboard(subjects) });
});
composer.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("sub:")) return next();
  await ctx.answerCallbackQuery();
  const subject = (await listSubjects(ctx)).find((item) => item.id === data.slice(4));
  if (!subject) { await ctx.editMessageText("هذه المادة غير متوفرة الآن.", { reply_markup: back }); return; }
  await ctx.editMessageText(`${subject.name}\n${subject.description}\n\nاختر نوع المحتوى.`, { reply_markup: subjectOptions(subject) });
});
composer.on("callback_query:data", async (ctx, next) => {
  const match = /^subcat:([^:]+):(resources|summaries|exams|plan)$/.exec(ctx.callbackQuery.data);
  if (!match) return next();
  await ctx.answerCallbackQuery();
  const subject = (await listSubjects(ctx)).find((item) => item.id === match[1]);
  if (!subject) { await ctx.editMessageText("هذه المادة غير متوفرة الآن.", { reply_markup: back }); return; }
  if (match[2] === "plan") {
    await ctx.editMessageText(subject.studyPlan ?? `خطة دراسة ${subject.name} قيد التحديث.`, { reply_markup: subjectOptions(subject) }); return;
  }
  const type: Record<string, string> = { resources: "المصادر", summaries: "الملخصات", exams: "الامتحانات" };
  const resources = subject.resources.filter((resource) => resource.type === type[match[2]]);
  if (!resources.length) { await ctx.editMessageText(`${categoryLabel[match[2]]} الخاصة بمادة ${subject.name} قيد التحديث.`, { reply_markup: subjectOptions(subject) }); return; }
  const lines = resources.map((r) => r.url ? `${r.title}\n${r.description}\n${r.url}` : `${r.title}\n${r.description}\nغير متوفر حالياً`).join("\n\n");
  await ctx.editMessageText(lines, { reply_markup: subjectOptions(subject) });
});
export default composer;
