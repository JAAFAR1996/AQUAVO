# معالجة اعتماديات الأمان — 2026-11-21

## النتيجة الفعلية ونطاقها

فحص ملف الاعتماديات المقفول الأساسي كشف **18 تنبيها: 7 عالية، 9 متوسطة، 2 منخفضة**. بعد المعالجة والتثبيت المقفول:

| الفحص | النتيجة | عناصر الاعتماديات في خرج الأداة |
|---|---|---:|
| `pnpm audit --prod --json` | صفر تنبيهات في كل درجات الشدة | 676 |
| `pnpm audit --json` | صفر تنبيهات في كل درجات الشدة، بما فيها أدوات التطوير | 1109 |

آخر تحقق في هذه الجلسة: 21 نوفمبر 2026، نحو 03:35 بتوقيت بغداد. الأرقام تخص شجرة `pnpm-lock.yaml` في جذر المشروع وقاعدة التنبيهات المتاحة حين الفحص. ليست شهادة بعدم وجود عيب آخر في كود التطبيق، ولا تشمل جردا منفصلا لكل manifest فرعي غير منضم إلى workspace.

اكتمل التثبيت بأمر `pnpm install --frozen-lockfile --ignore-scripts`؛ لم تُشغّل lifecycle/postinstall scripts ولم يُنزّل متصفح عبر Puppeteer. هذه تغييرات ملفات وتحقق محلي؛ لا تعديل لقاعدة الإنتاج ولا نشر ولا إطلاق متصفح على الموقع الحي.

## الإصدارات التي تغيرت

التغيرات المباشرة اقتصرت على خمس `devDependencies`. أُجريت مقارنة كل importer في ملف القفل مع الأصل؛ اعتماديات التشغيل المباشرة وإصدار Playwright المقفول لم تتغير.

| الاعتماد المباشر | قبل | بعد |
|---|---:|---:|
| `@vitest/ui` | 4.1.11 | 4.1.12 |
| `happy-dom` | 20.8.9 | 21.0.4 |
| `puppeteer` | 25.1.0 | 25.18.1 |
| `sharp` | 0.35.4 | 0.35.5 |
| `vitest` | 4.1.11 | 4.1.12 |

التغييرات غير المباشرة المقصودة:

| السلسلة | قبل | بعد | سبب الاختيار |
|---|---|---|---|
| `@vercel/node@13.0.1 → undici` | 6.28.1 | 6.29.1 | إصدار مصحح في major6 نفسه |
| `@vercel/static-config@3.4.3 → ajv@8.18.0 → fast-uri` | 3.1.8 | 3.1.9 | patch مطابق لخط 3 |
| `@vercel/node@13.0.1 → @vercel/nft` | 1.10.0 | 1.11.11 | تحديث upstream في major1 يطلب glob المصحح رسميا |
| `@vercel/nft → glob → minimatch` | 13.0.0 →10.2.5 | 14.0.6 →11.0.9 | إصدارات تطلبها نسخة NFT الجديدة؛ لا فرض major جديد على المكتبة النهائية ضمن NFT القديم |
| `puppeteer → chromium-bidi → zod` | 25.1.0 →16.0.1 →3.25.76 | 25.18.1 →157.0.8090-0 →4.6.7 | انتقال Zod4 موجود في upstream منذ Puppeteer25.13؛ تحديث الأداة نفسها يحافظ على توافق واجهة التحليل |
| `sharp → librsvg` | sharp0.35.4 | sharp0.35.5 و librsvg2.63.2 | الإصلاح الموصى به من ناشر sharp؛ تحققنا من المكتبة الأصلية المحملة فعليا |

لم نضع override يحوّل Zod3 إلى 4 تحت نسخة Chromium BiDi القديمة. بيانات الحزمة المنشورة لـ BiDi157 تطلب `zod:^4.6.5`، وملف القفل اختار 4.6.7 المصحح. `zod` المباشر في التطبيق بقي 4.6.6؛ لا تغيير لسياسات التحقق أو المال في التطبيق بسبب هذه المعالجة.

حُذف override القديم غير اللازم `glob@13.0.0>minimatch` وقرينه الخاص بـ minimatch10 بعد انتقال NFT، وأُبقيت التصحيحات الأخرى ضمن الخطوط المعتمدة. جرت مزامنة `basic-ftp:6.2.4` في workflow؛ النسخة القديمة من workflow كانت تعيد 6.2.1.

## التنبيهات الثمانية عشر التي عولجت

تطابق الإصدارات المصححة جداول التنبيه الأصلية. تمت قراءة تنبيهات GitHub المعتمدة وإصدارات النشر وبيانات الحزم الأصلية؛ لم تُنفّذ أمثلة استغلال.

| الحزمة | شدة التنبيه | الإصدار المكتشف قبل | الإصدار بعد في السلسلة المتأثرة | المصدر |
|---|---|---|---|---|
| `sharp` | high | `0.35.4` | 0.35.5 | [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) |
| `@vitest/mocker` | moderate | `4.1.11` | 4.1.12 | [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) |
| `@vitest/mocker` | moderate | `4.1.11` | 4.1.12 | [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp) |
| `zod` | high | `3.25.76` | 4.6.7 داخل chromium-bidi؛ اعتماد التطبيق 4.6.6 بقي كما هو | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) |
| `undici` | moderate | `6.28.1` | 6.29.1 | [GHSA-4qv8-2p9j-2685](https://github.com/advisories/GHSA-4qv8-2p9j-2685) |
| `happy-dom` | high | `20.8.9` | 21.0.4 | [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79) |
| `fast-uri` | moderate | `3.1.8` | 3.1.9 | [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) |
| `fast-uri` | low | `3.1.8` | 3.1.9 | [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h) |
| `fast-uri` | moderate | `3.1.8` | 3.1.9 | [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr) |
| `fast-uri` | low | `3.1.8` | 3.1.9 | [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp) |
| `undici` | high | `6.28.1` | 6.29.1 | [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c) |
| `undici` | high | `6.28.1` | 6.29.1 | [GHSA-2m5v-pch6-74hx](https://github.com/advisories/GHSA-2m5v-pch6-74hx) |
| `undici` | high | `6.28.1` | 6.29.1 | [GHSA-qrxm-fqhp-jwvm](https://github.com/advisories/GHSA-qrxm-fqhp-jwvm) |
| `undici` | moderate | `6.28.1` | 6.29.1 | [GHSA-9fm3-97px-rjf6](https://github.com/advisories/GHSA-9fm3-97px-rjf6) |
| `happy-dom` | high | `20.8.9` | 21.0.4 | [GHSA-c8p4-j97h-3vg8](https://github.com/advisories/GHSA-c8p4-j97h-3vg8) |
| `happy-dom` | moderate | `20.8.9` | 21.0.4 | [GHSA-5fpq-26gf-qwcr](https://github.com/advisories/GHSA-5fpq-26gf-qwcr) |
| `glob` | moderate | `13.0.0` | 14.0.6 | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) |
| `minimatch` | moderate | `10.2.5` | 11.0.9 | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |

## توافق أدوات البناء وسير التحقق

- أبقينا Vitest على major4 وأخذنا backport الأمن 4.1.12؛ لم ننتقل إلى major5. [إصدار Vitest4.1.12](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12) يصف تصحيح mocker.
- Happy DOM يحتاج 21.0.4 لأن إصلاح تنفيذ الشيفرة غير مكتمل حتى 21.0.3. [إصدار 21.0.4](https://github.com/capricorn86/happy-dom/releases/tag/v21.0.4) يوضح تصحيح ESM والعزل بين النوافذ. لهذا يلزم نجاح المجموعة الكاملة على الإصدار الجديد، ولا تكفي اختبارات النسخة السابقة وحدها.
- Puppeteer25.1 القديم و 25.18.1 المصحح كلاهما يطلب Node>=22.12. وُحّد Node في workflows تحقق PR إلى 24 مثل CI الرئيسي. صُحح Node في بناء release وفحص المعاينة اليدوي إلى 24 أيضا؛ لم تُشغّل هذه المسارات أو يتغير trigger النشر أو مهاجرات الإنتاج، وبقي Playwright1.57 مطابقا لصورة CI المقفلة.
- صارت خطوات تعديل الاعتماديات وكتابة الملفات و commit/push في `security-remediation.yml` مشروطة بـ `workflow_dispatch` واختيار `apply_remediation:true`؛ القيمة الافتراضية false. فحص PR يستعمل frozen lockfile ويتحقق من عدم تغيّر ملفات الاعتماديات. التنفيذ اليدوي لا يكتب إلى main أو develop أو tag.
- بقيت بوابات الأنواع والبناء والاختبارات وفحص الإنتاج، وأصبح فحص كل الاعتماديات شرطا مانعا أيضا. لا يُنشأ commit تلقائي في PR عادي بسبب هذه المعالجة.

## التحقق المنجز

| التحقق | ما أثبته | النتيجة |
|---|---|---|
| `test/security-dependency-policy.test.ts` | تطابق 30 floor مع package والقفل، تطابق قائمتي overrides، توافق Playwright مع صورة CI، حراسة PR من تعديل/دفع ملفات الاعتماديات | 4/4 ناجحة |
| `products.test.tsx` على الأدوات الجديدة | العرض، الخطأ، إعادة المحاولة والعودة للمنتجات على Happy DOM21/Vitest4.1.12 | 12/12 ناجحة |
| `admin-order-effects-bundle.test.ts` | إدراج وحدات الولاء المحلية في بناء esbuild | 1/1 ناجح |
| sharp native smoke | فك SVG اصطناعي بسيط إلى PNG بأبعاد صحيحة، وقراءة librsvg2.63.2 من المكتبة المحملة | ناجح |
| Chromium BiDi/Zod4 smoke | parser الحقيقي يقبل بيانات navigate صحيحة ويرفض نوع context خاطئ؛ Puppeteerlaunch/connect يُحمّلان كدوال | ناجح؛ لم يُطلق متصفح |
| Vercel NFT/glob smoke | تتبع require ديناميكي إلى ملفي JSON محليين اصطناعيين، دون warnings | ناجح |
| أول مجموعة كاملة بعد تحديث الأدوات | 474 ملفا ناجحا وملف متجاوز؛ 4906 اختبارات ناجحة و7 متجاوزة، لكن 81 رفضا غير معالج من إلغاء الحركة | **exit1؛ ليست نتيجة كاملة ناجحة**، رغم `success:true` في JSON reporter |
| إعادة ملفات الحركة التسعة + اختبارات adapter الستة | 10 ملفات و136 اختبارا؛ شروط السلة والشراء والموافقة الأصلية بقيت كما هي | **exit0**، صفر أخطاء غير معالجة؛ 27.32 ثانية |
| فحص نوعي مباشر لملفات setup/adapter/اختباره | `tsc --noEmit --strict`؛ لأن هذه الملفات خارج include الخاص بمشروع العميل | **exit0**؛ دون توسيع tsconfig أو استعمال noCheck |

البناء الكامل وأي إعادة كاملة بعد معالجة توافق الحركة يوثقهما تقرير التكامل الرئيسي عند اكتمالهما. نتيجة الإعادة المركزة لا تحول نتيجة المجموعة الكاملة السابقة إلى نجاح، ولا تثبت التحقق في متصفح حي أو الإنتاج.

### سبب فشل إلغاء الحركة وحدود معالجته

كل الأخطاء الـ81 كانت `AbortError: The animation was canceled.` من `Happy DOM 21.0.4 Animation.cancel()` عند إيقاف Motion للحركة. قراءة التنفيذ المثبت وإعادة إنتاجه بعملية Node مع `--unhandled-rejections=strict` أثبتتا أن Happy DOM يرفض `finished` دون تعليم الوعد بأنه معالج. [Web Animations، القسم 4.4.14](https://www.w3.org/TR/web-animations-1/#canceling-an-animation-section) يطلب رفض الوعد بـ AbortError وتعليم `[[PromiseIsHandled]]` بأنه true معا؛ ليست المشكلة دليلا على خطأ في إلغاء Motion للحركة.

أضيف `test/helpers/happy-dom-animation.ts` واستدعاء داخل `vitest.setup.ts` عندما تكون البيئة Happy DOM فقط. يضيف معالجا للوعد الأصلي لحظة الإلغاء، ويترك الوعد نفسه مرفوضا لمن يستهلكه. لا يغير إصدار الحزم، أو كود المتجر، أو توقيت/أحداث الإلغاء الأصلية، ولا يسجل معالجا عاما للأخطاء. يعالج هذا السلوك المحدد فقط؛ لا يدعي استكمال كل اختلافات Happy DOM عن المواصفة.

اختبارات العمليات المعزولة تثبت أن التنفيذ غير المصحح يخرج بفشل؛ وأن إلغاء الحركة الجارية والمتوقفة وإعادة تشغيلها يعمل؛ وأن المستهلك يرى AbortError؛ وأن إلغاء idle والبيئة الأخرى لا يتغيران. كما تثبت أن رفض وعد مشتق أهمله المستهلك، ورفض أي وعد آخر غير مرتبط، يخرجان بفشل فعلي. لذلك لم يُستخدم `ignoreUnhandledErrors` أو إخفاء عام للأخطاء. عند إصلاح upstream لهذا السلوك سيكشف اختبار إعادة الإنتاج ذلك، ويمكن حينها إزالة adapter مع بقاء اختبارات سلوك المستهلك.

ظلت تحذيرات peer قديمة غير مرتبطة بتنبيهات الأمان: `@vercel/node` مع `@vercel/build-utils`، و `zod-validation-error` مع خط Zod. لم نخفها أو نفرض تحويل major آخر بسببها؛ الإصدارات المباشرة الخاصة بها لم تتغير في مقارنة القفل. فحص audit الصفري لا يلغي هذه التحذيرات ولا الديون النوعية القديمة في التطبيق.

## أدلة الجلسة

| الدليل | السجل |
|---|---|
| تنبيهات الأصل | `/workspace/scratch/02f01ebc162a/dependency_audit_all.json` |
| نتيجة كل الاعتماديات بعد | `/workspace/scratch/02f01ebc162a/dependency_audit_all_after.json` |
| نتيجة الإنتاج بعد | `/workspace/scratch/02f01ebc162a/dependency_audit_prod_after.json` |
| التثبيت المقفول بلا scripts | `/workspace/scratch/02f01ebc162a/dependency_install_final.log` |
| سياسة القفل و workflow | `/workspace/scratch/02f01ebc162a/dependency_policy_final_tests.log` |
| DOM وإدراج الوحدات | `/workspace/scratch/02f01ebc162a/dependency_policy_dom_tests.log`؛ حالة count أولية في الاختبار الجديد صُححت إلى القائمة الفعلية 30، ثم 4/4 في الإعادة |
| native/parser/tracer smoke | `/workspace/scratch/02f01ebc162a/dependency_toolchain_smoke.log` |
| المجموعة الكاملة بعد تحديث الأدوات، exit1 | `/workspace/scratch/02f01ebc162a/full_suite_after_dependencies.log`؛ توزيع الأخطاء في `/workspace/scratch/02f01ebc162a/animation_unhandled_summary.json` |
| إعادة الحركة المركزة، exit0 | `/workspace/scratch/02f01ebc162a/happy_dom_animation_focused_final.log` |
| أنواع setup/adapter/الاختبار، exit0 | `/workspace/scratch/02f01ebc162a/happy_dom_animation_types.log` |

SHA-256 لملف القفل الذي خضع لهذا الفحص: `1e9f6f8a3e99e6d667fb6c6372e01665f27e39c74de0f3a4803ea87fcfa095e0`.

لم تتغير سياسة التقريب إلى الأعلى، ولا ربط الشروط بالموافقة على التسويق عبر واتساب، ولا سياسة أسعار/عرض المنتجات القادمة.
