# سند — Bot specification

**Archetype:** education

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

بوت Telegram موجه لطلاب الشهادة السودانية دفعة 27 يقدم محتوى دراسي منظّم بالعربية: مواد دراسية مع مصادر، ملخصات، امتحانات سابقة، خطة دراسة، وقسم أسئلة يُحوّل للإدارة مع هوية المرسل. يحتفظ بالمحتوى للتصفح اللامركزي ويسجل الأسئلة مع هوية المرسل.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- طلاب الشهادة السودانية دفعة 27

## Success criteria

- 90% من المستخدمين يجدون المواد المطلوبة عبر القائمة الرئيسية
- الأسئلة تصل للإدارة في أقل من 5 ثوانٍ بعد الإرسال
- الواجهة العربية تُظهر بدون أخطاء لغوية

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — عرض شاشة ترحيب وقائمة رئيسية
- **مواد دراسية** (button, actor: user, callback: subjects:list) — عرض قائمة المواد الدراسية
- **المصادر** (button, actor: user, callback: resources:list) — عرض جميع المصادر التعليمية
- **الأسئلة والاستفسارات** (button, actor: user, callback: questions:start) — فتح نموذج إرسال سؤال
- **تواصل مع الإدارة** (button, actor: user, callback: admin:start) — إرسال رسالة مباشرة للإدارة

## Flows

### material_navigation
_Trigger:_ subjects:list

1. عرض قائمة المواد (زر لكل مادة)
2. عند اختيار مادة: عرض خيارات (المصادر، الملخصات، الامتحانات، خطة الدراسة)
3. عند اختيار خيار: عرض قائمة الموارد الخاصة بالمادة

_Data touched:_ Subject, Resource

### question_submission
_Trigger:_ questions:start

1. طلب نص السؤال عبر ForceReply
2. تأكيد الإرسال عبر زر 'أرسل'
3. إرسال السؤال مع هوية المستخدم للإدارة

_Data touched:_ Question

## Owner-supplied settings

The OWNER provides these; they are collected in chat and injected into the environment at deploy. Read each one from the environment where it is used (`ctx.env.<KEY>` / `env.<KEY>` on Cloudflare Workers; `process.env.<KEY>` only as a Node/harness fallback — never the sole read). Do NOT invent your own way of learning the value, do NOT ask for it in a bot message, and do NOT hardcode a default.

- **ADMIN_CHAT_ID** — شات الأدمن لاستقبال الأسئلة والاستفسارات
  - this is the OWNER's own chat id; the platform already knows it. Read `ADMIN_CHAT_ID` via `ctx.env` (prefer toolkit `adminChatId` / `requireOwner`) — never ask a user, never treat whoever writes first as the admin, never invent claim-admin or open manage for everyone.
  - may be UNSET at runtime: the bot must still start, and the feature needing ADMIN_CHAT_ID must say so plainly instead of failing.

Your behavioral specs run WITHOUT these values, so no spec may depend on one.

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

An entity that merely NAMES an owner-supplied setting above (an admin chat, an API account) is not something to store or discover — read it from the environment.

- **Subject** _(retention: persistent)_ — مادة دراسية مع مواردها
  - fields: name, description, resources, study_plan
- **Resource** _(retention: persistent)_ — مصدر تعليمي (مذكرة/فيديو/رابط)
  - fields: title, type, description, url
- **Question** _(retention: persistent)_ — سؤال من المستخدم مع هويته
  - fields: text, sender_name, sender_username, timestamp

## Integrations

- **Telegram** (required) — Bot API messaging
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- إضافة/حذف مواد دراسية
- رفع موارد جديدة (مذكرة/فيديو/رابط)
- عرض سجل الأسئلة مع هوية المرسل

## Notifications

- إشعار فوري للأدمن عند إرسال سؤال جديد مع اسم المستخدم/يوزر

## Permissions & privacy

- لا يُطلب أي معلومات شخصية للمستخدمين
- الأسئلة تحتفظ بهوية المرسل فقط (لا تتضمن معلومات اتصال)

## Edge cases

- المواد الدراسية غير متوفرة بعد (عرض رسالة 'قيد التحديث')
- الموارد بدون رابط (عرض رسالة 'غير متوفر حالياً')

## Required tests

- اختبار القائمة الرئيسية: تأكد من ظهور جميع الأزرار بالعربية
- اختبار إرسال سؤال: تأكد من وصوله للإدارة مع هوية المستخدم

## Assumptions

- 8 مواد دراسية مُدخلة مسبقًا (رياضيات، فيزياء، كيمياء، أحياء، علوم إسلامية، لغة عربية، إنجليزي، تاريخ)
- الموارد تُعرض كروابط نصية فقط (لا دعم لملفات PDF/DOC)
