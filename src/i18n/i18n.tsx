// Minimal i18n: UI strings are written as Arabic/English pairs next to where
// they are used (t('…', '…')), and data carries { ar, en }. Direction follows
// the language. See docs/ARCHITECTURE.md for how to add a language.
import { createContext, useContext } from 'react';
import type { L, Lang } from '../domain/types';

export const LangContext = createContext<Lang>('ar');

export function useT() {
  const lang = useContext(LangContext);
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const tx = (l: L | undefined) => (l ? l[lang] : '');
  return { lang, t, tx, dir: lang === 'ar' ? 'rtl' : 'ltr' } as const;
}

export const QUAL_LABEL: Record<string, L> = {
  first_aid: { ar: 'إسعافات أولية', en: 'First aid' },
  stop_bleed: { ar: 'السيطرة على النزيف', en: 'Stop the bleed' },
  aed_cpr: { ar: 'إنعاش ومزيل رجفان', en: 'CPR & AED' },
  mci_triage_support: { ar: 'مساندة الفرز في الحوادث متعددة الإصابات', en: 'MCI triage support' },
  crowd_guidance: { ar: 'إرشاد الحشود', en: 'Crowd guidance' },
  paramedic: { ar: 'مسعف', en: 'Paramedic' },
};

export const STATUS_LABEL: Record<string, L> = {
  ready: { ar: 'جاهز', en: 'Ready' },
  not_ready: { ar: 'غير جاهز', en: 'Not ready' },
  maintenance: { ar: 'صيانة', en: 'Maintenance' },
  out_of_service: { ar: 'خارج الخدمة', en: 'Out of service' },
  open: { ar: 'مفتوحة', en: 'Open' },
  assigned: { ar: 'مُسندة', en: 'Assigned' },
  accepted: { ar: 'مقبولة', en: 'Accepted' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In progress' },
  delivered: { ar: 'مُسلّمة', en: 'Delivered' },
  closed: { ar: 'مغلقة', en: 'Closed' },
  declined: { ar: 'مرفوضة', en: 'Declined' },
  pending: { ar: 'بانتظار الاعتماد', en: 'Pending approval' },
  approved: { ar: 'معتمد', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  activated: { ar: 'أُرسل للشريك', en: 'Sent to partner' },
  fulfilled: { ar: 'مُنفّذ', en: 'Fulfilled' },
  reported: { ar: 'مُبلّغ', en: 'Reported' },
  verified: { ar: 'متحقق منه', en: 'Verified' },
  active: { ar: 'نشط', en: 'Active' },
  recovery: { ar: 'تعافٍ', en: 'Recovery' },
  new: { ar: 'جديد', en: 'New' },
};

export const KIND_LABEL: Record<string, L> = {
  aed: { ar: 'مزيل رجفان', en: 'AED' },
  trauma_kit: { ar: 'حقيبة إصابات', en: 'Trauma kit' },
  bleeding_kit: { ar: 'سيطرة على النزيف', en: 'Bleeding control' },
  ambulance: { ar: 'إسعاف', en: 'Ambulance' },
  transport: { ar: 'نقل', en: 'Transport' },
  logistics: { ar: 'إمداد', en: 'Logistics' },
  care: { ar: 'رعاية', en: 'Care' },
  comms: { ar: 'اتصالات', en: 'Comms' },
};

export const ZONE_LABEL: Record<string, L> = {
  hot: { ar: 'خطر', en: 'Hot' },
  warm: { ar: 'دافئة', en: 'Warm' },
  cold: { ar: 'آمنة', en: 'Cold' },
};

export const ROLE_LABEL: Record<string, L> = {
  manager: { ar: 'مدير الحدث', en: 'Incident manager' },
  readiness: { ar: 'مسؤول التأهب والجاهزية', en: 'Readiness officer' },
  partner: { ar: 'شريك القطاع الخاص', en: 'Private partner' },
  responder: { ar: 'المستجيب المؤهل', en: 'Qualified responder' },
  citizen: { ar: 'المواطن', en: 'Citizen' },
};
