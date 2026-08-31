export type Subject = { id: string; name: string; description: string; studyPlan: string };

export const defaultSubjects: Subject[] = [
  { id: "math", name: "الرياضيات", description: "الجبر والهندسة والتفاضل.", studyPlan: "راجع درساً واحداً، ثم حل تمارين اليوم نفسه." },
  { id: "physics", name: "الفيزياء", description: "المفاهيم والقوانين والتطبيقات.", studyPlan: "احفظ القانون مع وحداته ثم طبّقه على مسائل متنوعة." },
  { id: "chemistry", name: "الكيمياء", description: "التفاعلات والحسابات الكيميائية.", studyPlan: "لخّص التفاعل واكتب أمثلة قبل حل الأسئلة." },
  { id: "biology", name: "الأحياء", description: "الأنظمة الحيوية والوراثة.", studyPlan: "ارسم مخططاً صغيراً لكل درس وراجعه أسبوعياً." },
  { id: "islamic", name: "العلوم الإسلامية", description: "القرآن والحديث والفقه.", studyPlan: "اقرأ الدرس ثم دوّن الفوائد والأسئلة الرئيسة." },
  { id: "arabic", name: "اللغة العربية", description: "النحو والأدب والبلاغة.", studyPlan: "تدرّب يومياً على الإعراب والقراءة التحليلية." },
  { id: "english", name: "اللغة الإنجليزية", description: "القواعد والقراءة والمفردات.", studyPlan: "تعلّم مفردات الدرس واستخدمها في جمل قصيرة." },
  { id: "history", name: "التاريخ", description: "الأحداث والتحولات التاريخية.", studyPlan: "رتّب الأحداث في خط زمني ثم راجع الأسباب والنتائج." },
];

export const now = (): Date => new Date();
