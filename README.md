# JARVIS - وكيل ذكاء اصطناعي متعدد الوكلاء

تطبيق ويب متقدم يوفر واجهة ذكية للتحكم والتفاعل مع أنظمة متعددة عبر وكلاء ذكاء اصطناعي.

> تم إنشاء هذا المشروع باستخدام [v0](https://v0.app)

## المتطلبات الأساسية

- **Node.js**: الإصدار 18 أو أحدث
- **npm** أو **pnpm** أو **yarn**
- **متغيرات البيئة**: Redis/Upstash و API Keys

## التثبيت السريع

### 1️⃣ استنساخ أو تحميل المشروع

```bash
git clone <repo-url>
cd v0-jarvis-mobile-port
```

### 2️⃣ تثبيت المتطلبات

```bash
npm install
# أو
pnpm install
# أو
yarn install
```

### 3️⃣ إعداد متغيرات البيئة

```bash
cp .env.example .env.local
```

أضف المتغيرات المطلوبة في `.env.local`:

```env
# Redis/Upstash (مطلوب)
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=your-token
KV_REST_API_READ_ONLY_TOKEN=your-read-only-token

# API Keys (اختياري)
GROQ_API_KEY=your-key
```

### 4️⃣ التطوير

```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)

### 5️⃣ الإنتاج

```bash
npm run build
npm start
```

---

## 🔧 حل المشاكل الشائعة

### ❌ مشكلة: الأزرار لا تستجيب / الواجهة غير مستجيبة للتمرير

**🔍 الأسباب المحتملة:**

1. **ملفات الإعدادات الناقصة** - v0 ينشئها تلقائياً، لكنها قد تكون ناقصة عند الاستيراد
2. **متغيرات البيئة غير صحيحة** - التوصل إلى Redis قد يفشل
3. **Tailwind CSS لم يتم بناؤه بشكل صحيح** - الأنماط لم تُحمل

**✅ الحلول:**

**الحل 1: التحقق من الملفات المطلوبة**

تأكد من وجود هذه الملفات:
- ✓ `tailwind.config.ts` - إعدادات Tailwind CSS
- ✓ `postcss.config.js` - إعدادات PostCSS
- ✓ `next.config.js` - إعدادات Next.js
- ✓ `.env.local` - متغيرات البيئة

**الحل 2: مسح الملفات المؤقتة والإعادة**

```bash
# حذف الملفات المؤقتة
rm -rf .next node_modules/.cache

# إعادة التثبيت والبناء
npm install
npm run build

# التشغيل
npm run dev
```

**الحل 3: التحقق من متغيرات البيئة**

```bash
# تأكد من وجود جميع المتغيرات:
echo $KV_URL
echo $KV_REST_API_URL
echo $KV_REST_API_TOKEN
```

إذا كانت فارغة، أضفها إلى `.env.local`

**الحل 4: فحص الأخطاء في الكونسول**

1. افتح المتصفح (F12)
2. انتقل إلى Console
3. ابحث عن أخطاء حمراء
4. ابحث عن رسائل "[v0]" للتتبع

### ❌ مشكلة: "Cannot find module"

```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ مشكلة: أخطاء في CSS/الأنماط

```bash
# مسح Tailwind و Next.js
rm -rf .next
npm run build

# إذا استمرت المشكلة
rm -rf node_modules .next
npm install
npm run build
```

### ❌ مشكلة: خطأ "Redis connection failed"

```bash
# تأكد من المتغيرات:
# 1. KV_URL يبدأ بـ redis://
# 2. KV_REST_API_URL يبدأ بـ https://
# 3. جميع الـ tokens صحيحة
```

---

## 📁 هيكل المشروع

```
v0-jarvis-mobile-port/
├── app/
│   ├── api/                 # مسارات API
│   ├── page.tsx             # الصفحة الرئيسية (Chat)
│   ├── layout.tsx           # Layout الرئيسي
│   ├── globals.css          # الأنماط العامة
│   ├── settings/            # صفحة الإعدادات
│   ├── devices/             # صفحة الأجهزة
│   └── logs/                # صفحة السجلات
├── components/
│   ├── jarvis/              # مكونات خاصة بـ Jarvis
│   │   ├── nav-bar.tsx      # شريط التنقل (4 أزرار)
│   │   ├── status-bar.tsx   # شريط الحالة
│   │   └── ...
│   └── ui/                  # مكونات UI عامة (shadcn)
├── lib/
│   ├── config.ts            # إدارة الإعدادات
│   ├── providers.ts         # إعدادات مزودي الخدمة
│   └── ...
├── tailwind.config.ts       # ⚙️ إعدادات Tailwind
├── postcss.config.js        # ⚙️ إعدادات PostCSS
├── next.config.js           # ⚙️ إعدادات Next.js
├── tsconfig.json            # ⚙️ إعدادات TypeScript
├── package.json             # المتطلبات
├── .env.example             # مثال على المتغيرات
└── README.md                # هذا الملف
```

---

## 🚀 الميزات

- 🤖 **وكلاء ذكاء اصطناعي متعددة**: OpenAI, Anthropic, Google, Groq, xAI, Mistral, OpenRouter
- 🎯 **Tencent HY3 Free**: دعم كامل من خلال OpenRouter
- 📱 **واجهة مستجيبة**: تعمل على جميع الأجهزة
- 🌍 **دعم اللغات**: العربية والإنجليزية (RTL/LTR)
- 💾 **تشفير البيانات**: جميع مفاتيح API مشفرة
- 🔄 **معالجة أخطاء شاملة**: رسائل خطأ واضحة

---

## 📚 الموارد

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [v0 Documentation](https://v0.app/docs)

---

## 🔗 الروابط المفيدة

- [مشروع v0](https://v0.app/chat/projects/prj_ebAi1bXUa5swQwAPs4v1188KTrlv)
- [فتح في Kiro](https://v0.app/chat/api/kiro/clone/rokanybnproject-boop/v0-jarvis-mobile-port)
