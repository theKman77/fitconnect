import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type AppLocale = 'en' | 'ar';

const STORAGE_KEY = 'fitconnect.locale';

const EN = {
  'nav.home': 'Home',
  'nav.discover': 'Discover',
  'nav.progress': 'Progress',
  'nav.account': 'Account',
  'nav.business': 'Business',
  'nav.bookings': 'Bookings',
  'nav.messages': 'Messages',
  'language.title': 'App language',
  'language.subtitle': 'Arabic layout preview',
  'language.english': 'English',
  'language.arabic': 'العربية',
  'welcome.kicker': 'PERSONAL TRAINING, REBUILT',
  'welcome.title': 'Your next level is\ncloser than you think.',
  'welcome.subtitle': 'Discover trusted coaches, book around your schedule, and turn every session into visible progress.',
  'welcome.vetted': 'Vetted trainers',
  'welcome.fastBooking': 'Book in minutes',
  'welcome.riyadh': 'Across Riyadh',
  'welcome.find': 'Find your trainer',
  'welcome.signIn': 'Sign in',
  'welcome.momentum': "TODAY'S MOMENTUM",
  'welcome.streak': 'WEEK STREAK',
  'welcome.session': 'Strength session',
  'welcome.sessionTime': 'Maya · Today, 6:30 PM',
  'welcome.demo': 'Demo workspace · Sample trainers and progress are included',
  'schedule.chooseDate': 'Choose a date',
  'schedule.previous': 'Previous two weeks',
  'schedule.next': 'Next two weeks',
  'schedule.openingsLegend': 'Number = openings',
  'schedule.moreDates': 'Tap arrows for more dates',
  'schedule.morning': 'Morning',
  'schedule.morningHint': 'Before 12 PM',
  'schedule.afternoon': 'Afternoon',
  'schedule.afternoonHint': '12 - 5 PM',
  'schedule.evening': 'Evening',
  'schedule.eveningHint': 'After 5 PM',
  'schedule.available': 'Available',
  'schedule.unavailable': 'Unavailable',
  'schedule.popular': 'Popular time',
  'schedule.saving': 'Saving...',
  'schedule.empty': 'No openings on this day.',
  'availability.title': 'Availability',
  'availability.heroTitle': 'Own your week',
  'availability.heroCopy': 'Publish only the times you want clients to book. Tap a time again to remove it.',
  'availability.chooseDay': 'Choose a day',
  'availability.openings': 'One-hour openings',
  'availability.selected': 'SELECTED',
  'availability.published': 'Published openings',
  'availability.live': 'LIVE',
  'availability.emptyTitle': 'No openings published',
  'availability.emptyCopy': 'Choose a day and tap the times clients may book.',
  'availability.removeTitle': 'Remove opening?',
  'availability.removeCopy': 'Clients will no longer see this time.',
  'availability.remove': 'Remove',
  'availability.minutes': 'minutes',
  'availability.eveningRate': 'evening rate',
} as const;

type TranslationKey = keyof typeof EN;

const AR: Record<TranslationKey, string> = {
  'nav.home': 'الرئيسية',
  'nav.discover': 'اكتشف',
  'nav.progress': 'تقدمي',
  'nav.account': 'حسابي',
  'nav.business': 'أعمالي',
  'nav.bookings': 'الحجوزات',
  'nav.messages': 'الرسائل',
  'language.title': 'لغة التطبيق',
  'language.subtitle': 'معاينة الواجهة العربية',
  'language.english': 'English',
  'language.arabic': 'العربية',
  'welcome.kicker': 'تدريب شخصي بتجربة جديدة',
  'welcome.title': 'مستواك القادم\nأقرب مما تتخيل.',
  'welcome.subtitle': 'اكتشف مدربين موثوقين، واحجز في الوقت المناسب لك، وحوّل كل جلسة إلى تقدم واضح.',
  'welcome.vetted': 'مدربون موثوقون',
  'welcome.fastBooking': 'حجز خلال دقائق',
  'welcome.riyadh': 'في أنحاء الرياض',
  'welcome.find': 'ابحث عن مدربك',
  'welcome.signIn': 'تسجيل الدخول',
  'welcome.momentum': 'إنجاز اليوم',
  'welcome.streak': 'أسابيع متتالية',
  'welcome.session': 'جلسة قوة',
  'welcome.sessionTime': 'مايا · اليوم، ٦:٣٠ م',
  'welcome.demo': 'نسخة تجريبية · تتضمن مدربين وبيانات تقدم تجريبية',
  'schedule.chooseDate': 'اختر التاريخ',
  'schedule.previous': 'الأسبوعان السابقان',
  'schedule.next': 'الأسبوعان التاليان',
  'schedule.openingsLegend': 'الرقم = المواعيد المتاحة',
  'schedule.moreDates': 'استخدم الأسهم لعرض تواريخ أخرى',
  'schedule.morning': 'صباحاً',
  'schedule.morningHint': 'قبل ١٢ ظهراً',
  'schedule.afternoon': 'بعد الظهر',
  'schedule.afternoonHint': 'من ١٢ إلى ٥ مساءً',
  'schedule.evening': 'مساءً',
  'schedule.eveningHint': 'بعد ٥ مساءً',
  'schedule.available': 'متاح',
  'schedule.unavailable': 'غير متاح',
  'schedule.popular': 'وقت شائع',
  'schedule.saving': 'جارٍ الحفظ...',
  'schedule.empty': 'لا توجد مواعيد متاحة في هذا اليوم.',
  'availability.title': 'الأوقات المتاحة',
  'availability.heroTitle': 'نظّم أسبوعك',
  'availability.heroCopy': 'انشر فقط الأوقات التي تريد أن يحجزها العملاء. اضغط على الوقت مرة أخرى لإزالته.',
  'availability.chooseDay': 'اختر يوماً',
  'availability.openings': 'مواعيد لمدة ساعة',
  'availability.selected': 'محدد',
  'availability.published': 'المواعيد المنشورة',
  'availability.live': 'مباشر',
  'availability.emptyTitle': 'لا توجد مواعيد منشورة',
  'availability.emptyCopy': 'اختر يوماً ثم اضغط على الأوقات التي يمكن للعملاء حجزها.',
  'availability.removeTitle': 'إزالة الموعد؟',
  'availability.removeCopy': 'لن يظهر هذا الموعد للعملاء بعد الآن.',
  'availability.remove': 'إزالة',
  'availability.minutes': 'دقيقة',
  'availability.eveningRate': 'تسعيرة مسائية',
};

interface LocaleContextValue {
  locale: AppLocale;
  localeTag: 'en-US' | 'ar-SA';
  isRTL: boolean;
  ready: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  localeTag: 'en-US',
  isRTL: false,
  ready: false,
  setLocale: async () => {},
  t: (key) => EN[key],
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'ar' || saved === 'en') setLocaleState(saved);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.lang = locale === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    localeTag: locale === 'ar' ? 'ar-SA' : 'en-US',
    isRTL: locale === 'ar',
    ready,
    setLocale: async (next) => {
      setLocaleState(next);
      await AsyncStorage.setItem(STORAGE_KEY, next);
    },
    t: (key) => locale === 'ar' ? AR[key] : EN[key],
  }), [locale, ready]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
