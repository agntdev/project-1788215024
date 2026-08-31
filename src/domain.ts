import { defaultSubjects, type Subject } from "./content.js";

type D1Statement = { bind(...values: unknown[]): { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }> } };
type D1 = { prepare(query: string): D1Statement };
export type Resource = { id: number; subjectId: string; title: string; type: string; description: string; url: string | null };
export type Question = { text: string; senderName: string; senderUsername: string | null; timestamp: string; kind: string };

function db(ctx: { env?: { DB?: unknown } }): D1 | undefined {
  const candidate = ctx.env?.DB;
  return candidate && typeof (candidate as D1).prepare === "function" ? candidate as D1 : undefined;
}

async function ready(database: D1): Promise<void> {
  await database.prepare("CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, study_plan TEXT NOT NULL)").bind().run();
  await database.prepare("CREATE TABLE IF NOT EXISTS resources (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id TEXT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL, description TEXT NOT NULL, url TEXT)").bind().run();
  await database.prepare("CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, sender_name TEXT NOT NULL, sender_username TEXT, timestamp TEXT NOT NULL, kind TEXT NOT NULL)").bind().run();
  for (const subject of defaultSubjects) await database.prepare("INSERT OR IGNORE INTO subjects (id, name, description, study_plan) VALUES (?, ?, ?, ?)").bind(subject.id, subject.name, subject.description, subject.studyPlan).run();
}

export async function subjects(ctx: { env?: { DB?: unknown } }): Promise<Subject[]> {
  const database = db(ctx); if (!database) return defaultSubjects;
  await ready(database);
  const rows = await database.prepare("SELECT id, name, description, study_plan FROM subjects ORDER BY rowid").bind().all<{ id: string; name: string; description: string; study_plan: string }>();
  return rows.results.map((r) => ({ id: r.id, name: r.name, description: r.description, studyPlan: r.study_plan }));
}
export async function resources(ctx: { env?: { DB?: unknown } }, subjectId?: string): Promise<Resource[]> {
  const database = db(ctx); if (!database) return [];
  await ready(database);
  const query = subjectId ? "SELECT id, subject_id, title, type, description, url FROM resources WHERE subject_id = ? ORDER BY id DESC" : "SELECT id, subject_id, title, type, description, url FROM resources ORDER BY id DESC";
  const rows = await database.prepare(query).bind(...(subjectId ? [subjectId] : [])).all<{ id: number; subject_id: string; title: string; type: string; description: string; url: string | null }>();
  return rows.results.map((r) => ({ id: r.id, subjectId: r.subject_id, title: r.title, type: r.type, description: r.description, url: r.url }));
}
export async function saveQuestion(ctx: { env?: { DB?: unknown } }, question: Question): Promise<boolean> {
  const database = db(ctx); if (!database) return false;
  await ready(database);
  await database.prepare("INSERT INTO questions (text, sender_name, sender_username, timestamp, kind) VALUES (?, ?, ?, ?, ?)").bind(question.text, question.senderName, question.senderUsername, question.timestamp, question.kind).run();
  return true;
}
export async function questionLog(ctx: { env?: { DB?: unknown } }): Promise<Question[] | undefined> {
  const database = db(ctx); if (!database) return undefined;
  await ready(database);
  const rows = await database.prepare("SELECT text, sender_name, sender_username, timestamp, kind FROM questions ORDER BY id DESC LIMIT 20").bind().all<Question>();
  return rows.results;
}
export async function addSubject(ctx: { env?: { DB?: unknown } }, name: string): Promise<boolean> {
  const database = db(ctx); if (!database) return false;
  await ready(database); const id = `custom-${encodeURIComponent(name).slice(0, 40)}`;
  await database.prepare("INSERT OR IGNORE INTO subjects (id, name, description, study_plan) VALUES (?, ?, ?, ?)").bind(id, name, "مادة أضافتها الإدارة.", "حدّد خطة المراجعة للمادة.").run(); return true;
}
export async function deleteSubject(ctx: { env?: { DB?: unknown } }, id: string): Promise<boolean> {
  const database = db(ctx); if (!database) return false;
  await ready(database); await database.prepare("DELETE FROM resources WHERE subject_id = ?").bind(id).run(); await database.prepare("DELETE FROM subjects WHERE id = ?").bind(id).run(); return true;
}
export async function addResource(ctx: { env?: { DB?: unknown } }, subjectId: string, title: string, type: string, description: string, url: string | null): Promise<boolean> {
  const database = db(ctx); if (!database) return false;
  await ready(database); await database.prepare("INSERT INTO resources (subject_id, title, type, description, url) VALUES (?, ?, ?, ?, ?)").bind(subjectId, title, type, description, url).run(); return true;
}
