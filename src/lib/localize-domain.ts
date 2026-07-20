import type { AppLocale } from '@/context/locale';

const ARABIC: Record<string, string> = {
  Riyadh: 'الرياض',
  'Strength & conditioning coach': 'مدربة قوة ولياقة بدنية',
  'HIIT & boxing': 'تمارين عالية الشدة وملاكمة',
  'Yoga & mobility': 'يوغا وتحسين الحركة',
  'Powerlifting coach': 'مدرب رفع الأثقال',
  'Pilates & core': 'بيلاتس وتقوية الجذع',
  'Running & endurance': 'جري وقدرة على التحمّل',
  'Personal trainer': 'مدرب شخصي',
  Strength: 'القوة',
  Conditioning: 'اللياقة البدنية',
  Mobility: 'الحركة',
  HIIT: 'تمارين عالية الشدة',
  Boxing: 'الملاكمة',
  Cardio: 'الكارديو',
  Yoga: 'اليوغا',
  Recovery: 'الاستشفاء',
  Powerlifting: 'رفع الأثقال',
  Pilates: 'البيلاتس',
  Core: 'عضلات الجذع',
  Posture: 'القوام',
  Running: 'الجري',
  Endurance: 'التحمّل',
  'Single session': 'جلسة واحدة',
  '5-session pack': 'باقة ٥ جلسات',
  'Pro plan': 'الخطة الاحترافية',
  'One-off, in-person or virtual': 'جلسة واحدة حضورية أو عن بُعد',
  'Save when you commit to five': 'وفّر عند حجز خمس جلسات',
  '8 sessions / month + chat support': '٨ جلسات شهرياً مع دعم عبر المحادثة',
  '10+ years coaching strength athletes and everyday clients. I build progressive, joint-friendly programs and keep every rep honest.':
    'أكثر من ١٠ سنوات في تدريب الرياضيين والعملاء بمختلف مستوياتهم، مع برامج تدريجية تراعي المفاصل وتهتم بجودة كل تكرار.',
  'High-energy conditioning and boxing fundamentals. Sweat guaranteed, form first.':
    'تدريب لياقة عالي الطاقة وأساسيات الملاكمة، مع أولوية دائمة للحركة الصحيحة.',
  'Vinyasa flow, breathwork, and mobility for people who sit at a desk all day.':
    'تمارين فينياسا وتنفس وحركة مناسبة لمن يقضون ساعات طويلة خلف المكتب.',
  'Squat, bench, deadlift. Competition prep and raw strength for all levels.':
    'سكوات وبنش وديدلفت، مع إعداد للمنافسات وبناء القوة لجميع المستويات.',
  'Reformer-inspired mat pilates. Core stability, posture, and control.':
    'بيلاتس أرضي مستوحى من الريفورمر لتثبيت الجذع وتحسين القوام والتحكم.',
  'From couch to 10k and beyond. Gait analysis, pacing, and smart mileage.':
    'من البداية إلى سباق ١٠ كلم وما بعده، مع تحليل الخطوة وتوزيع السرعة والمسافات بذكاء.',
};

export function localizeDomain(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return '';
  return locale === 'ar' ? ARABIC[value] ?? value : value;
}
