// Translation Service with local cache and multiple providers

import { useTranslationCache, useProgressStore, useSettingsStore } from '@/stores';
import type { TranslationResult } from '@/types';

interface DictionaryEntry {
  word: string;
  translations: string[];
  partOfSpeech?: string;
  pronunciation?: string;
  examples?: { en: string; ar: string }[];
}

class TranslationService {
  private localDictionary: Map<string, DictionaryEntry> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Load built-in dictionary (common words)
    this.loadBuiltInDictionary();
    this.initialized = true;
  }

  private loadBuiltInDictionary(): void {
    // Common English words with Arabic translations
    const commonWords: DictionaryEntry[] = [
      { word: 'the', translations: ['ال', 'هذا', 'هذه'], partOfSpeech: 'article' },
      { word: 'be', translations: ['يكون', 'كان', 'يوجد'], partOfSpeech: 'verb' },
      { word: 'to', translations: ['إلى', 'لكي', 'من أجل'], partOfSpeech: 'preposition' },
      { word: 'of', translations: ['من', 'عن', 'ب'], partOfSpeech: 'preposition' },
      { word: 'and', translations: ['و', 'أيضاً', 'ثم'], partOfSpeech: 'conjunction' },
      { word: 'a', translations: ['واحد', 'أي', 'نوع من'], partOfSpeech: 'article' },
      { word: 'in', translations: ['في', 'داخل', 'أثناء'], partOfSpeech: 'preposition' },
      { word: 'is', translations: ['هو', 'يكون', 'يساوي'], partOfSpeech: 'verb' },
      { word: 'it', translations: ['هو', 'هي', 'هذا'], partOfSpeech: 'pronoun' },
      { word: 'for', translations: ['من أجل', 'ل', 'إلى'], partOfSpeech: 'preposition' },
      { word: 'on', translations: ['على', 'فوق', 'بخصوص'], partOfSpeech: 'preposition' },
      { word: 'with', translations: ['مع', 'باستخدام', 'ب'], partOfSpeech: 'preposition' },
      { word: 'as', translations: ['كما', 'بينما', 'مثل'], partOfSpeech: 'conjunction' },
      { word: 'I', translations: ['أنا', 'أنا'], partOfSpeech: 'pronoun' },
      { word: 'you', translations: ['أنت', 'أنتم', 'حضرتك'], partOfSpeech: 'pronoun' },
      { word: 'he', translations: ['هو', 'هو'], partOfSpeech: 'pronoun' },
      { word: 'she', translations: ['هي', 'هي'], partOfSpeech: 'pronoun' },
      { word: 'we', translations: ['نحن', 'نحن'], partOfSpeech: 'pronoun' },
      { word: 'they', translations: ['هم', 'هن', 'هم'], partOfSpeech: 'pronoun' },
      { word: 'this', translations: ['هذا', 'هذه', 'ذلك'], partOfSpeech: 'pronoun' },
      { word: 'that', translations: ['ذلك', 'تلك', 'ذاك'], partOfSpeech: 'pronoun' },
      { word: 'have', translations: ['لدي', 'أملك', 'أحصل على'], partOfSpeech: 'verb' },
      { word: 'has', translations: ['لديه', 'تملك', 'يحصل على'], partOfSpeech: 'verb' },
      { word: 'had', translations: ['كان لدي', 'امتلك', 'حصل على'], partOfSpeech: 'verb' },
      { word: 'do', translations: ['أفعل', 'أقوم بـ', 'أؤدي'], partOfSpeech: 'verb' },
      { word: 'does', translations: ['يفعل', 'يقوم بـ', 'يؤدي'], partOfSpeech: 'verb' },
      { word: 'did', translations: ['فعل', 'قام بـ', 'أدى'], partOfSpeech: 'verb' },
      { word: 'say', translations: ['يقول', 'يتحدث', 'يعبر'], partOfSpeech: 'verb' },
      { word: 'said', translations: ['قال', 'تحدث', 'عبر'], partOfSpeech: 'verb' },
      { word: 'see', translations: ['يرى', 'يشاهد', 'يفهم'], partOfSpeech: 'verb' },
      { word: 'saw', translations: ['رأى', 'شاهد', 'فهم'], partOfSpeech: 'verb' },
      { word: 'know', translations: ['يعرف', 'يدرك', 'يفهم'], partOfSpeech: 'verb' },
      { word: 'knew', translations: ['عرف', 'أدرك', 'فهم'], partOfSpeech: 'verb' },
      { word: 'think', translations: ['يفكر', 'يعتقد', 'يرى'], partOfSpeech: 'verb' },
      { word: 'thought', translations: ['فكر', 'اعتقد', 'رأى'], partOfSpeech: 'verb' },
      { word: 'take', translations: ['يأخذ', 'يتناول', 'يستغرق'], partOfSpeech: 'verb' },
      { word: 'took', translations: ['أخذ', 'تناول', 'استغرق'], partOfSpeech: 'verb' },
      { word: 'come', translations: ['يأتي', 'يحضر', 'يصل'], partOfSpeech: 'verb' },
      { word: 'came', translations: ['جاء', 'حضر', 'وصل'], partOfSpeech: 'verb' },
      { word: 'go', translations: ['يذهب', 'يسير', 'يتجه'], partOfSpeech: 'verb' },
      { word: 'went', translations: ['ذهب', 'سار', 'اتجه'], partOfSpeech: 'verb' },
      { word: 'get', translations: ['يحصل على', 'يصل', 'يصبح'], partOfSpeech: 'verb' },
      { word: 'got', translations: ['حصل على', 'وصل', 'أصبح'], partOfSpeech: 'verb' },
      { word: 'make', translations: ['يصنع', 'يفعل', 'يجعل'], partOfSpeech: 'verb' },
      { word: 'made', translations: ['صنع', 'فعل', 'جعل'], partOfSpeech: 'verb' },
      { word: 'like', translations: ['يحب', 'يشبه', 'يريد'], partOfSpeech: 'verb' },
      { word: 'liked', translations: ['أحب', 'شبه', 'أراد'], partOfSpeech: 'verb' },
      { word: 'want', translations: ['يريد', 'يتمنى', 'يحتاج'], partOfSpeech: 'verb' },
      { word: 'wanted', translations: ['أراد', 'تمنى', 'احتاج'], partOfSpeech: 'verb' },
      { word: 'need', translations: ['يحتاج', 'يجب أن', 'يلزم'], partOfSpeech: 'verb' },
      { word: 'needed', translations: ['احتاج', 'كان يجب أن', 'لزم'], partOfSpeech: 'verb' },
      { word: 'work', translations: ['يعمل', 'يشتغل', 'يعمل (اسم)'], partOfSpeech: 'verb' },
      { word: 'worked', translations: ['عمل', 'اشتغل', 'نجح'], partOfSpeech: 'verb' },
      { word: 'use', translations: ['يستخدم', 'يستعمل', 'يستفيد من'], partOfSpeech: 'verb' },
      { word: 'used', translations: ['استخدم', 'استعمل', 'استفاد من'], partOfSpeech: 'verb' },
      { word: 'find', translations: ['يجد', 'يعثر على', 'يكتشف'], partOfSpeech: 'verb' },
      { word: 'found', translations: ['وجد', 'عثر على', 'اكتشف'], partOfSpeech: 'verb' },
      { word: 'give', translations: ['يعطي', 'يمنح', 'يقدم'], partOfSpeech: 'verb' },
      { word: 'gave', translations: ['أعطى', 'منح', 'قدم'], partOfSpeech: 'verb' },
      { word: 'tell', translations: ['يخبر', 'يقول', 'يروي'], partOfSpeech: 'verb' },
      { word: 'told', translations: ['أخبر', 'قال', 'روى'], partOfSpeech: 'verb' },
      { word: 'ask', translations: ['يسأل', 'يطلب', 'يستفسر'], partOfSpeech: 'verb' },
      { word: 'asked', translations: ['سأل', 'طلب', 'استفسر'], partOfSpeech: 'verb' },
      { word: 'seem', translations: ['يبدو', 'يظهر', 'يخيل'], partOfSpeech: 'verb' },
      { word: 'seemed', translations: ['بدا', 'ظهر', 'خيل'], partOfSpeech: 'verb' },
      { word: 'feel', translations: ['يشعر', 'يحس', 'يلمس'], partOfSpeech: 'verb' },
      { word: 'felt', translations: ['شعر', 'أحس', 'لمس'], partOfSpeech: 'verb' },
      { word: 'try', translations: ['يحاول', 'يحاول أن', 'يجرب'], partOfSpeech: 'verb' },
      { word: 'tried', translations: ['حاول', 'حاول أن', 'جرب'], partOfSpeech: 'verb' },
      { word: 'leave', translations: ['يترك', 'يغادر', 'يمضي'], partOfSpeech: 'verb' },
      { word: 'left', translations: ['ترك', 'غادر', 'مضى'], partOfSpeech: 'verb' },
      { word: 'call', translations: ['يتصل', 'ينادي', 'يسمي'], partOfSpeech: 'verb' },
      { word: 'called', translations: ['اتصل', 'نادى', 'سمى'], partOfSpeech: 'verb' },
      { word: 'good', translations: ['جيد', 'طيب', 'صالح'], partOfSpeech: 'adjective' },
      { word: 'bad', translations: ['سيء', 'رديء', 'شرير'], partOfSpeech: 'adjective' },
      { word: 'new', translations: ['جديد', 'حديث', 'مستحدث'], partOfSpeech: 'adjective' },
      { word: 'old', translations: ['قديم', 'عتيق', 'كبير في السن'], partOfSpeech: 'adjective' },
      { word: 'big', translations: ['كبير', 'ضخم', 'عظيم'], partOfSpeech: 'adjective' },
      { word: 'small', translations: ['صغير', 'صغير الحجم', 'قليل'], partOfSpeech: 'adjective' },
      { word: 'large', translations: ['كبير', 'واسع', 'ضخم'], partOfSpeech: 'adjective' },
      { word: 'little', translations: ['قليل', 'صغير', 'ضئيل'], partOfSpeech: 'adjective' },
      { word: 'long', translations: ['طويل', 'طويل المدة', 'ممتد'], partOfSpeech: 'adjective' },
      { word: 'short', translations: ['قصير', 'مختصر', 'قليل'], partOfSpeech: 'adjective' },
      { word: 'high', translations: ['عالي', 'مرتفع', 'شاهق'], partOfSpeech: 'adjective' },
      { word: 'low', translations: ['منخفض', 'واطئ', 'قليل'], partOfSpeech: 'adjective' },
      { word: 'early', translations: ['مبكر', 'باكر', 'في وقت مبكر'], partOfSpeech: 'adjective' },
      { word: 'late', translations: ['متأخر', 'مؤخر', 'في وقت متأخر'], partOfSpeech: 'adjective' },
      { word: 'right', translations: ['صحيح', 'يمين', 'حق'], partOfSpeech: 'adjective' },
      { word: 'wrong', translations: ['خطأ', 'خاطئ', 'غير صحيح'], partOfSpeech: 'adjective' },
      { word: 'different', translations: ['مختلف', 'متنوع', 'آخر'], partOfSpeech: 'adjective' },
      { word: 'same', translations: ['نفس', 'مطابق', 'مشابه'], partOfSpeech: 'adjective' },
      { word: 'important', translations: ['مهم', 'هام', 'جوهري'], partOfSpeech: 'adjective' },
      { word: 'easy', translations: ['سهل', 'بسيط', 'ميسر'], partOfSpeech: 'adjective' },
      { word: 'difficult', translations: ['صعب', 'عسير', 'معقد'], partOfSpeech: 'adjective' },
      { word: 'hard', translations: ['صعب', 'قاسي', 'شاق'], partOfSpeech: 'adjective' },
      { word: 'simple', translations: ['بسيط', 'سهل', 'غير معقد'], partOfSpeech: 'adjective' },
      { word: 'complex', translations: ['معقد', 'مركب', 'صعب'], partOfSpeech: 'adjective' },
      { word: 'possible', translations: ['ممكن', 'محتمل', 'مقدور'], partOfSpeech: 'adjective' },
      { word: 'impossible', translations: ['مستحيل', 'غير ممكن', 'لا يطاق'], partOfSpeech: 'adjective' },
      { word: 'necessary', translations: ['ضروري', 'لازم', 'واجب'], partOfSpeech: 'adjective' },
      { word: 'unnecessary', translations: ['غير ضروري', 'زائد', 'ليس لازماً'], partOfSpeech: 'adjective' },
      { word: 'true', translations: ['صحيح', 'حقيقي', 'حقيقي'], partOfSpeech: 'adjective' },
      { word: 'false', translations: ['كاذب', 'خطأ', 'مزيف'], partOfSpeech: 'adjective' },
      { word: 'real', translations: ['حقيقي', 'واقعي', 'أصلي'], partOfSpeech: 'adjective' },
      { word: 'fake', translations: ['مزيف', 'مقلد', 'كاذب'], partOfSpeech: 'adjective' },
      { word: 'time', translations: ['وقت', 'زمن', 'مرة'], partOfSpeech: 'noun' },
      { word: 'person', translations: ['شخص', 'إنسان', 'فرد'], partOfSpeech: 'noun' },
      { word: 'people', translations: ['ناس', 'أشخاص', 'شعب'], partOfSpeech: 'noun' },
      { word: 'year', translations: ['سنة', 'عام', 'حول'], partOfSpeech: 'noun' },
      { word: 'day', translations: ['يوم', 'نهار', 'يوم عمل'], partOfSpeech: 'noun' },
      { word: 'week', translations: ['أسبوع', 'أسبوع عمل', 'سبعة أيام'], partOfSpeech: 'noun' },
      { word: 'month', translations: ['شهر', 'شهر قمري', 'شهر ميلادي'], partOfSpeech: 'noun' },
      { word: 'hour', translations: ['ساعة', 'وقت', 'حصة'], partOfSpeech: 'noun' },
      { word: 'minute', translations: ['دقيقة', 'لحظة', 'محضر'], partOfSpeech: 'noun' },
      { word: 'second', translations: ['ثانية', 'ثاني', 'لحظة'], partOfSpeech: 'noun' },
      { word: 'morning', translations: ['صباح', 'صباحاً', 'فجر'], partOfSpeech: 'noun' },
      { word: 'afternoon', translations: ['بعد الظهر', 'ظهيرة', 'عصر'], partOfSpeech: 'noun' },
      { word: 'evening', translations: ['مساء', 'عشية', 'غروب'], partOfSpeech: 'noun' },
      { word: 'night', translations: ['ليل', 'ليلة', 'مساء'], partOfSpeech: 'noun' },
      { word: 'today', translations: ['اليوم', 'هذا اليوم', 'الآن'], partOfSpeech: 'adverb' },
      { word: 'tomorrow', translations: ['غداً', 'الغد', 'في الغد'], partOfSpeech: 'adverb' },
      { word: 'yesterday', translations: ['أمس', 'الأمس', 'في الأمس'], partOfSpeech: 'adverb' },
      { word: 'now', translations: ['الآن', 'حالياً', 'في الوقت الحاضر'], partOfSpeech: 'adverb' },
      { word: 'then', translations: ['ثم', 'في ذلك الوقت', 'لذلك'], partOfSpeech: 'adverb' },
      { word: 'here', translations: ['هنا', 'هنا', 'في هذا المكان'], partOfSpeech: 'adverb' },
      { word: 'there', translations: ['هناك', 'ثم', 'في ذلك المكان'], partOfSpeech: 'adverb' },
      { word: 'where', translations: ['أين', 'في أي مكان', 'إلى أين'], partOfSpeech: 'adverb' },
      { word: 'when', translations: ['متى', 'في أي وقت', 'عندما'], partOfSpeech: 'adverb' },
      { word: 'why', translations: ['لماذا', 'لأي سبب', 'بأي سبب'], partOfSpeech: 'adverb' },
      { word: 'how', translations: ['كيف', 'بأي طريقة', 'إلى أي مدى'], partOfSpeech: 'adverb' },
      { word: 'what', translations: ['ماذا', 'ما', 'أي شيء'], partOfSpeech: 'pronoun' },
      { word: 'which', translations: ['أي', 'أي منهما', 'الذي'], partOfSpeech: 'pronoun' },
      { word: 'who', translations: ['من', 'الذي', 'الذين'], partOfSpeech: 'pronoun' },
      { word: 'whose', translations: ['لمن', 'الخاص بـ', 'المتعلق بـ'], partOfSpeech: 'pronoun' },
      { word: 'yes', translations: ['نعم', 'بلى', 'أكيد'], partOfSpeech: 'interjection' },
      { word: 'no', translations: ['لا', 'كلا', 'ليس'], partOfSpeech: 'interjection' },
      { word: 'maybe', translations: ['ربما', 'قد', 'من المحتمل'], partOfSpeech: 'adverb' },
      { word: 'please', translations: ['من فضلك', 'رجاءً', 'لو سمحت'], partOfSpeech: 'interjection' },
      { word: 'thank', translations: ['يشكر', 'يمتن', 'يعبر عن الشكر'], partOfSpeech: 'verb' },
      { word: 'thanks', translations: ['شكراً', 'شكرا', 'متشكر'], partOfSpeech: 'noun' },
      { word: 'sorry', translations: ['آسف', 'معذرة', 'أعتذر'], partOfSpeech: 'adjective' },
      { word: 'excuse', translations: ['يعذر', 'يسامح', 'يبرر'], partOfSpeech: 'verb' },
      { word: 'hello', translations: ['مرحبا', 'أهلاً', 'سلام'], partOfSpeech: 'interjection' },
      { word: 'goodbye', translations: ['مع السلامة', 'وداعاً', 'إلى اللقاء'], partOfSpeech: 'interjection' },
      { word: 'welcome', translations: ['أهلاً بك', 'مرحباً', 'منور'], partOfSpeech: 'interjection' },
      { word: 'friend', translations: ['صديق', 'رفيق', 'زميل'], partOfSpeech: 'noun' },
      { word: 'family', translations: ['عائلة', 'أسرة', 'أهل'], partOfSpeech: 'noun' },
      { word: 'mother', translations: ['أم', 'والدة', 'ماما'], partOfSpeech: 'noun' },
      { word: 'father', translations: ['أب', 'والد', 'بابا'], partOfSpeech: 'noun' },
      { word: 'brother', translations: ['أخ', 'شقيق', 'أخ أكبر/أصغر'], partOfSpeech: 'noun' },
      { word: 'sister', translations: ['أخت', 'شقيقة', 'أخت أكبر/أصغر'], partOfSpeech: 'noun' },
      { word: 'son', translations: ['ابن', 'ولد', 'إبن'], partOfSpeech: 'noun' },
      { word: 'daughter', translations: ['ابنة', 'بنت', 'ابنة'], partOfSpeech: 'noun' },
      { word: 'husband', translations: ['زوج', 'رجل', 'قرين'], partOfSpeech: 'noun' },
      { word: 'wife', translations: ['زوجة', 'امرأة', 'قرينة'], partOfSpeech: 'noun' },
      { word: 'child', translations: ['طفل', 'ابن', 'قاصر'], partOfSpeech: 'noun' },
      { word: 'children', translations: ['أطفال', 'أولاد', 'صغار'], partOfSpeech: 'noun' },
      { word: 'home', translations: ['منزل', 'بيت', 'مسكن'], partOfSpeech: 'noun' },
      { word: 'house', translations: ['منزل', 'بيت', 'مسكن'], partOfSpeech: 'noun' },
      { word: 'room', translations: ['غرفة', 'حجرة', 'قاعة'], partOfSpeech: 'noun' },
      { word: 'door', translations: ['باب', 'مدخل', 'مخرج'], partOfSpeech: 'noun' },
      { word: 'window', translations: ['نافذة', 'شباك', 'فتحة'], partOfSpeech: 'noun' },
      { word: 'table', translations: ['طاولة', 'مائدة', 'جدول'], partOfSpeech: 'noun' },
      { word: 'chair', translations: ['كرسي', 'مقعد', 'منصب'], partOfSpeech: 'noun' },
      { word: 'bed', translations: ['سرير', 'فراش', 'مضجع'], partOfSpeech: 'noun' },
      { word: 'book', translations: ['كتاب', 'مجلد', 'كتيب'], partOfSpeech: 'noun' },
      { word: 'pen', translations: ['قلم', 'قلم حبر', 'قلم جاف'], partOfSpeech: 'noun' },
      { word: 'paper', translations: ['ورق', 'ورقة', 'صحيفة'], partOfSpeech: 'noun' },
      { word: 'computer', translations: ['كمبيوتر', 'حاسوب', 'جهاز كمبيوتر'], partOfSpeech: 'noun' },
      { word: 'phone', translations: ['هاتف', 'جوال', 'تلفون'], partOfSpeech: 'noun' },
      { word: 'car', translations: ['سيارة', 'عربة', 'مركبة'], partOfSpeech: 'noun' },
      { word: 'bus', translations: ['حافلة', 'باص', 'أوتوبيس'], partOfSpeech: 'noun' },
      { word: 'train', translations: ['قطار', 'سكة حديد', 'مقطورة'], partOfSpeech: 'noun' },
      { word: 'plane', translations: ['طائرة', 'طيران', 'مستوي'], partOfSpeech: 'noun' },
      { word: 'airport', translations: ['مطار', 'مطار جوي', 'مهبط'], partOfSpeech: 'noun' },
      { word: 'station', translations: ['محطة', 'موقف', 'مركز'], partOfSpeech: 'noun' },
      { word: 'ticket', translations: ['تذكرة', 'بطاقة', 'إيصال'], partOfSpeech: 'noun' },
      { word: 'money', translations: ['مال', 'نقود', 'عملة'], partOfSpeech: 'noun' },
      { word: 'price', translations: ['سعر', 'ثمن', 'قيمة'], partOfSpeech: 'noun' },
      { word: 'cheap', translations: ['رخيص', 'بخس', 'قليل التكلفة'], partOfSpeech: 'adjective' },
      { word: 'expensive', translations: ['غالي', 'مكلف', 'ذو ثمن باهظ'], partOfSpeech: 'adjective' },
      { word: 'buy', translations: ['يشتري', 'يقتني', 'يبتاع'], partOfSpeech: 'verb' },
      { word: 'bought', translations: ['اشترى', 'اقتنى', 'ابتاع'], partOfSpeech: 'verb' },
      { word: 'sell', translations: ['يبيع', 'يتاجر', 'يبيع'], partOfSpeech: 'verb' },
      { word: 'sold', translations: ['باع', 'تجر', 'باع'], partOfSpeech: 'verb' },
      { word: 'pay', translations: ['يدفع', 'يسدد', 'يؤدي'], partOfSpeech: 'verb' },
      { word: 'paid', translations: ['دفع', 'سدد', 'أدى'], partOfSpeech: 'verb' },
      { word: 'cost', translations: ['يكلف', 'يقدر بـ', 'سعر'], partOfSpeech: 'verb' },
      { word: 'food', translations: ['طعام', 'أكل', 'غذاء'], partOfSpeech: 'noun' },
      { word: 'water', translations: ['ماء', 'ماء', 'مياه'], partOfSpeech: 'noun' },
      { word: 'drink', translations: ['مشروب', 'شراب', 'يشرب'], partOfSpeech: 'noun' },
      { word: 'eat', translations: ['يأكل', 'يتناول الطعام', 'يلتهم'], partOfSpeech: 'verb' },
      { word: 'ate', translations: ['أكل', 'تناول الطعام', 'التهم'], partOfSpeech: 'verb' },
      { word: 'breakfast', translations: ['فطور', 'إفطار', 'وجبة الصباح'], partOfSpeech: 'noun' },
      { word: 'lunch', translations: ['غداء', 'وجبة الظهر', 'غذاء'], partOfSpeech: 'noun' },
      { word: 'dinner', translations: ['عشاء', 'وجبة المساء', 'عشاء'], partOfSpeech: 'noun' },
      { word: 'restaurant', translations: ['مطعم', 'مأكولات', 'مطعم'], partOfSpeech: 'noun' },
      { word: 'menu', translations: ['قائمة الطعام', 'قائمة', 'برنامج'], partOfSpeech: 'noun' },
      { word: 'order', translations: ['يطلب', 'يأمر', 'يرتب'], partOfSpeech: 'verb' },
      { word: 'waiter', translations: ['نادل', 'خادم', 'مقدم'], partOfSpeech: 'noun' },
      { word: 'delicious', translations: ['لذيذ', 'شهي', 'طيب المذاق'], partOfSpeech: 'adjective' },
      { word: 'tasty', translations: ['لذيذ', 'طيب الطعم', 'شهي'], partOfSpeech: 'adjective' },
      { word: 'hot', translations: ['ساخن', 'حار', 'حار جداً'], partOfSpeech: 'adjective' },
      { word: 'cold', translations: ['بارد', 'مثلج', 'بارد جداً'], partOfSpeech: 'adjective' },
      { word: 'spicy', translations: ['حار', 'باهر', 'متبل'], partOfSpeech: 'adjective' },
      { word: 'sweet', translations: ['حلو', 'سكر', 'عذب'], partOfSpeech: 'adjective' },
      { word: 'salty', translations: ['مالح', 'ملح', 'ذي ملوحة'], partOfSpeech: 'adjective' },
      { word: 'sour', translations: ['حامض', 'مكاره', 'ذو طعم حامض'], partOfSpeech: 'adjective' },
      { word: 'bitter', translations: ['مر', 'مُر', 'قاسي'], partOfSpeech: 'adjective' },
      { word: 'school', translations: ['مدرسة', 'مؤسسة تعليمية', 'كلية'], partOfSpeech: 'noun' },
      { word: 'student', translations: ['طالب', 'تلميذ', 'دارس'], partOfSpeech: 'noun' },
      { word: 'teacher', translations: ['معلم', 'مدرس', 'أستاذ'], partOfSpeech: 'noun' },
      { word: 'class', translations: ['فصل', 'حصة', 'صف'], partOfSpeech: 'noun' },
      { word: 'lesson', translations: ['درس', 'حصة', 'موضوع'], partOfSpeech: 'noun' },
      { word: 'homework', translations: ['واجب منزلي', 'واجب', 'عمل منزلي'], partOfSpeech: 'noun' },
      { word: 'exam', translations: ['امتحان', 'اختبار', 'فحص'], partOfSpeech: 'noun' },
      { word: 'test', translations: ['اختبار', 'امتحان', 'فحص'], partOfSpeech: 'noun' },
      { word: 'grade', translations: ['درجة', 'تقدير', 'صف دراسي'], partOfSpeech: 'noun' },
      { word: 'pass', translations: ['ينجح', 'يمر', 'يجتاز'], partOfSpeech: 'verb' },
      { word: 'fail', translations: ['يرسب', 'يفشل', 'لا ينجح'], partOfSpeech: 'verb' },
      { word: 'study', translations: ['يدرس', 'يتعلم', 'يبحث'], partOfSpeech: 'verb' },
      { word: 'learn', translations: ['يتعلم', 'يدرس', 'يكتسب'], partOfSpeech: 'verb' },
      { word: 'teach', translations: ['يعلم', 'يدرس', 'يلقن'], partOfSpeech: 'verb' },
      { word: 'read', translations: ['يقرأ', 'يطالع', 'يفهم'], partOfSpeech: 'verb' },
      { word: 'write', translations: ['يكتب', 'يدون', 'يراسل'], partOfSpeech: 'verb' },
      { word: 'listen', translations: ['يسمع', 'يستمع', 'ينصت'], partOfSpeech: 'verb' },
      { word: 'speak', translations: ['يتكلم', 'يتحدث', 'ينطق'], partOfSpeech: 'verb' },
      { word: 'understand', translations: ['يفهم', 'يدرك', 'يستوعب'], partOfSpeech: 'verb' },
      { word: 'question', translations: ['سؤال', 'استفسار', 'مسألة'], partOfSpeech: 'noun' },
      { word: 'answer', translations: ['إجابة', 'رد', 'حل'], partOfSpeech: 'noun' },
      { word: 'exercise', translations: ['تمرين', 'تمرين رياضي', 'تمرين'], partOfSpeech: 'noun' },
      { word: 'practice', translations: ['ممارسة', 'تمرين', 'تطبيق'], partOfSpeech: 'noun' },
      { word: 'vocabulary', translations: ['مفردات', 'كلمات', 'مصطلحات'], partOfSpeech: 'noun' },
      { word: 'grammar', translations: ['قواعد', 'نحو', 'صرف'], partOfSpeech: 'noun' },
      { word: 'pronunciation', translations: ['نطق', 'لفظ', 'طريقة النطق'], partOfSpeech: 'noun' },
      { word: 'sentence', translations: ['جملة', 'حكم', 'عقوبة'], partOfSpeech: 'noun' },
      { word: 'word', translations: ['كلمة', 'لفظة', 'مصطلح'], partOfSpeech: 'noun' },
      { word: 'letter', translations: ['حرف', 'رسالة', 'حرف أبجدي'], partOfSpeech: 'noun' },
      { word: 'sound', translations: ['صوت', 'صوت', 'رنين'], partOfSpeech: 'noun' },
      { word: 'meaning', translations: ['معنى', 'مغزى', 'دلالة'], partOfSpeech: 'noun' },
      { word: 'example', translations: ['مثال', 'نموذج', 'عينة'], partOfSpeech: 'noun' },
      { word: 'explain', translations: ['يشرح', 'يوضح', 'يفسر'], partOfSpeech: 'verb' },
      { word: 'definition', translations: ['تعريف', 'تعريف', 'تحديد'], partOfSpeech: 'noun' },
      { word: 'dictionary', translations: ['قاموس', 'معجم', 'موسوعة'], partOfSpeech: 'noun' },
      { word: 'translate', translations: ['يترجم', 'ينقل', 'يعرب'], partOfSpeech: 'verb' },
      { word: 'translation', translations: ['ترجمة', 'نقل', 'تعريب'], partOfSpeech: 'noun' },
    ];

    commonWords.forEach((entry) => {
      this.localDictionary.set(entry.word.toLowerCase(), entry);
    });
  }

  async translate(
    text: string,
    context?: string,
    provider: 'local' | 'dictionary' | 'ai' = 'local'
  ): Promise<TranslationResult> {
    await this.initialize();

    const cache = useTranslationCache.getState();
    const cacheKey = `${text.toLowerCase()}:${context || ''}:${provider}`;
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      return { ...cached, cached: true };
    }

    let result: TranslationResult;

    switch (provider) {
      case 'local':
        result = await this.translateLocal(text, context);
        break;
      case 'dictionary':
        result = await this.translateDictionary(text, context);
        break;
      case 'ai':
        result = await this.translateAI(text, context);
        break;
      default:
        result = await this.translateLocal(text, context);
    }

    if (result.source !== 'unavailable') {
      cache.set(cacheKey, result);
    }

    return result;
  }

  private async translateLocal(text: string, context?: string): Promise<TranslationResult> {
    const words = text.toLowerCase().split(/\s+/);
    const mainWord = words[0];

    // Check local dictionary first
    const dictEntry = this.localDictionary.get(mainWord);
    if (dictEntry) {
      return {
        word: text,
        translation: dictEntry.translations[0],
        partOfSpeech: dictEntry.partOfSpeech,
        pronunciation: dictEntry.pronunciation,
        alternatives: dictEntry.translations.slice(1),
        exampleSentences: dictEntry.examples,
        source: 'local',
        cached: false,
      };
    }

    // Try to find in vocabulary store
    const { vocabulary } = useProgressStore.getState();
    const vocabMatch = vocabulary.find(
      (v) => v.word.toLowerCase() === mainWord
    );
    
    if (vocabMatch) {
      return {
        word: text,
        translation: vocabMatch.translation,
        partOfSpeech: vocabMatch.partOfSpeech,
        pronunciation: vocabMatch.pronunciation,
        audioId: vocabMatch.audioId,
        contextSentence: vocabMatch.contextSentence,
        contextTranslation: vocabMatch.contextTranslation,
        source: 'local',
        cached: false,
      };
    }

    return {
      word: text,
      translation: '',
      source: 'unavailable',
      cached: false,
    };
  }

  private async translateDictionary(text: string, context?: string): Promise<TranslationResult> {
    // Could integrate with a local dictionary file or API
    // For now, fall back to local
    return this.translateLocal(text, context);
  }

  private async translateAI(text: string, context?: string): Promise<TranslationResult> {
    // This would integrate with an AI translation service
    // Requires API key configuration
    const settings = useSettingsStore.getState().settings;
    
    if (!settings.translation.apiKey) {
      return {
        word: text,
        translation: '',
        source: 'unavailable',
        cached: false,
      };
    }

    // Placeholder for AI translation
    // In production, this would call an API like Google Translate, DeepL, or OpenAI
    try {
      // const response = await fetch('https://api.translation-service.com/translate', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${settings.translation.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ text, target: 'ar', context }),
      // });
      // const data = await response.json();
      // return { ...data, source: 'ai', cached: false };
      
      return {
        word: text,
        translation: '[AI Translation would appear here]',
        source: 'ai',
        cached: false,
      };
    } catch {
      return {
        word: text,
        translation: '',
        source: 'unavailable',
        cached: false,
      };
    }
  }

  // Batch translate multiple words
  async translateBatch(words: string[], context?: string): Promise<Map<string, TranslationResult>> {
    const results = new Map<string, TranslationResult>();
    
    for (const word of words) {
      results.set(word, await this.translate(word, context));
    }
    
    return results;
  }

  // Add custom vocabulary entry
  addToDictionary(entry: DictionaryEntry): void {
    this.localDictionary.set(entry.word.toLowerCase(), entry);
  }

  // Get all cached translations
  getCacheStats(): { size: number; keys: string[] } {
    const cache = useTranslationCache.getState();
    return {
      size: Object.keys(cache.cache).length,
      keys: Object.keys(cache.cache),
    };
  }

  clearCache(): void {
    useTranslationCache.getState().clear();
  }
}

export const translationService = new TranslationService();

// React hook for translation
import { useState, useCallback } from 'react';

export function useTranslation() {
  const [translating, setTranslating] = useState(false);
  const [lastResult, setLastResult] = useState<TranslationResult | null>(null);

  const translate = useCallback(async (text: string, context?: string) => {
    setTranslating(true);
    try {
      const result = await translationService.translate(text, context);
      setLastResult(result);
      return result;
    } finally {
      setTranslating(false);
    }
  }, []);

  return { translate, translating, lastResult };
}