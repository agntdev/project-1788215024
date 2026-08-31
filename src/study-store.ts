/** Durable study data. On Workers it lives in the project's Durable Object.
 * The fixed subject list is the blueprint's initial catalog and is written on
 * first use; it is not an in-memory database. */
export type ResourceKind = "المصادر" | "الملخصات" | "الامتحانات";
export interface Resource { title: string; type: ResourceKind; description: string; url?: string }
export interface Subject { id: string; name: string; description: string; resources: Resource[]; studyPlan?: string }
export interface StoredQuestion { id: string; text: string; sender_name: string; sender_username?: string; timestamp: string }

const initialSubjects: Subject[] = [
  ["math", "رياضيات"], ["physics", "فيزياء"], ["chemistry", "كيمياء"], ["biology", "أحياء"],
  ["islamic", "علوم إسلامية"], ["arabic", "لغة عربية"], ["english", "إنجليزي"], ["history", "تاريخ"],
].map(([id, name]) => ({ id, name, description: `مواد ${name} لدفعة 27`, resources: [] }));

type DomainEnv = { CHAT_DO?: { idFromName(name: string): unknown; get(id: unknown): { fetch(input: string, init?: { method?: string; body?: string }): Promise<Response> } } };
type DomainCtx = { env?: DomainEnv | Record<string, unknown> };
type Request = { action: "catalog" } | { action: "save-subject"; subject: Subject } | { action: "delete-subject"; id: string } | { action: "save-resource"; subjectId: string; resource: Resource } | { action: "save-question"; question: StoredQuestion } | { action: "questions" };

async function request(ctx: DomainCtx, body: Request): Promise<unknown | undefined> {
  const ns = (ctx.env as DomainEnv | undefined)?.CHAT_DO;
  if (!ns) return undefined;
  const res = await ns.get(ns.idFromName("study-domain")).fetch("https://do/study-data", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("domain storage request failed");
  return res.status === 204 ? undefined : res.json();
}

export async function listSubjects(ctx: DomainCtx): Promise<Subject[]> {
  const result = await request(ctx, { action: "catalog" });
  return Array.isArray(result) ? result as Subject[] : initialSubjects.map((subject) => ({ ...subject, resources: [] }));
}
export async function saveSubject(ctx: DomainCtx, subject: Subject): Promise<boolean> { return (await request(ctx, { action: "save-subject", subject })) !== undefined; }
export async function deleteSubject(ctx: DomainCtx, id: string): Promise<boolean> { return (await request(ctx, { action: "delete-subject", id })) !== undefined; }
export async function saveResource(ctx: DomainCtx, subjectId: string, resource: Resource): Promise<boolean> { return (await request(ctx, { action: "save-resource", subjectId, resource })) !== undefined; }
export async function saveQuestion(ctx: DomainCtx, question: StoredQuestion): Promise<boolean> { return (await request(ctx, { action: "save-question", question })) !== undefined; }
export async function listQuestions(ctx: DomainCtx): Promise<StoredQuestion[] | undefined> { const value = await request(ctx, { action: "questions" }); return Array.isArray(value) ? value as StoredQuestion[] : undefined; }
export function newRecordId(prefix: string): string { return `${prefix}-${crypto.randomUUID()}`; }
