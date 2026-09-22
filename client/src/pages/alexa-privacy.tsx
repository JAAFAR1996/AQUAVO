import { useEffect } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  KeyRound,
  Database,
  Ban,
  Users,
  Unlink,
  Mail,
  CheckCircle2
} from "lucide-react";

const PAGE_TITLE = "AQUAVO Home AI — Alexa Privacy Notice | إشعار خصوصية Alexa";
const PAGE_DESCRIPTION =
  "Privacy notice for the AQUAVO Home AI private Alexa Smart Home integration (single authorized household). | إشعار الخصوصية لتكامل AQUAVO Home AI الخاص مع Amazon Alexa لمنزل واحد مصرح له.";

export default function AlexaPrivacy() {
  // This is a private, single-household integration notice — set noindex client-side
  // without touching the site-wide shared HTML template used by every route.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = PAGE_TITLE;

    let descTag = document.querySelector('meta[name="description"]');
    const prevDesc = descTag?.getAttribute("content") ?? null;
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.setAttribute("name", "description");
      document.head.appendChild(descTag);
    }
    descTag.setAttribute("content", PAGE_DESCRIPTION);

    const robotsTag = document.createElement("meta");
    robotsTag.setAttribute("name", "robots");
    robotsTag.setAttribute("content", "noindex, nofollow");
    robotsTag.setAttribute("data-alexa-privacy-robots", "true");
    document.head.appendChild(robotsTag);

    return () => {
      document.title = prevTitle;
      if (descTag && prevDesc !== null) descTag.setAttribute("content", prevDesc);
      robotsTag.remove();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans" data-testid="alexa-privacy-page">
      <Navbar />

      <section className="relative py-20 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-48 h-48 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary bg-primary/10 px-4 py-1 text-sm">
              <Shield className="w-4 h-4 ml-2" />
              Private Household Integration · تكامل خاص لمنزل واحد
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-6" data-testid="text-page-title" dir="ltr">
              AQUAVO Home AI — Alexa Privacy Notice
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              إشعار خصوصية AQUAVO Home AI لتكامل Alexa
            </h2>
            <p className="text-sm text-muted-foreground mt-2" data-testid="text-effective-date">
              Effective date / تاريخ السريان: 2026-09-23
            </p>
          </motion.div>
        </div>
      </section>

      <main id="main-content" className="flex-1 py-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-16">

          {/* ── English ─────────────────────────────────────────────── */}
          <motion.section
            dir="ltr"
            className="text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Badge variant="outline" className="mb-6">English</Badge>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> What this is
                </h3>
                <p className="text-muted-foreground">
                  <strong>AQUAVO Home AI</strong> is a private smart-home voice-control integration
                  using Amazon Alexa, built for a single authorized household. It is not a public
                  product and is not offered to other users or households.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" /> Login with Amazon (LWA)
                </h3>
                <p className="text-muted-foreground mb-3">
                  Login with Amazon is used only to confirm that a request comes from the one
                  authorized household's Amazon account. The OAuth scope requested is{" "}
                  <code className="text-sm bg-muted px-1.5 py-0.5 rounded">profile:user_id</code>,
                  which returns only the Amazon account identifier (<code className="text-sm bg-muted px-1.5 py-0.5 rounded">user_id</code>).
                </p>
                <p className="text-muted-foreground">
                  We do not request or receive the user's name or email address from Amazon.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" /> Data touched during operation
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span>
                      <strong>Amazon account identifier (user_id):</strong> checked on each request
                      against a fixed allow-list of exactly one household account. Not stored beyond
                      that check.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span>
                      <strong>OAuth/LWA access token:</strong> used only transiently, server-side, to
                      call Amazon's own token-validation endpoints during each request. It is never
                      written to any log or database by this system.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span>
                      <strong>Alexa Smart Home directives:</strong> for example a device command
                      (turn a light on/off, set brightness), a room/endpoint identifier, and the
                      requested state. A record of the most recent response per unique Alexa request
                      ID is kept on our own private server, specifically to prevent a duplicate or
                      replayed request from being executed twice. As currently implemented, there is{" "}
                      <strong>no automatic deletion</strong> of these duplicate-prevention records yet
                      — they persist on the private server until manually cleared.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span>
                      <strong>Minimal technical security records</strong> (a short-lived
                      signature/timestamp used to authenticate requests between our own server
                      components) are automatically deleted after about 2 minutes.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-6 border-green-500/30 bg-green-500/5">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-green-600" /> What we do not do
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• We do not use this data for advertising.</li>
                  <li>• We do not sell personal information.</li>
                  <li>
                    • We do not share data with third parties, except the infrastructure strictly
                    required to operate the integration (Amazon's own Alexa/LWA services, and our
                    own cloud relay/tunnel infrastructure). No other third party ever receives this
                    data.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Access &amp; use restrictions
                </h3>
                <p className="text-muted-foreground">
                  Access is restricted to the one authorized household's Amazon account; no other
                  account can be authenticated. Smart-home commands received are used only to carry
                  out the specific requested home-automation action (e.g., turning a light on/off) —
                  nothing else.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Unlink className="w-5 h-5 text-primary" /> Revocation
                </h3>
                <p className="text-muted-foreground">
                  The household can revoke this integration's access at any time via the Alexa app's
                  Skills &amp; Games account-linking settings (unlink/disable the skill), or by
                  removing the linked security profile in their Amazon account settings. Revoking
                  access stops all future authentication; it does not retroactively delete records
                  already described above.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" /> Contact
                </h3>
                <p className="text-muted-foreground">
                  For privacy questions about this integration, contact{" "}
                  <a href="mailto:info@aquavoiq.com" className="text-primary underline">
                    info@aquavoiq.com
                  </a>.
                </p>
              </CardContent>
            </Card>
          </motion.section>

          {/* ── Arabic ──────────────────────────────────────────────── */}
          <motion.section
            dir="rtl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Badge variant="outline" className="mb-6">العربية</Badge>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> ما هو هذا التكامل
                </h3>
                <p className="text-muted-foreground">
                  <strong>AQUAVO Home AI</strong> هو تكامل خاص للتحكم الصوتي بالمنزل الذكي باستخدام
                  Amazon Alexa، تم بناؤه لخدمة منزل واحد مصرح له فقط. هذا ليس منتجاً عاماً وغير
                  متاح لأي مستخدمين أو منازل أخرى.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" /> تسجيل الدخول عبر أمازون (LWA)
                </h3>
                <p className="text-muted-foreground mb-3">
                  يُستخدم تسجيل الدخول عبر أمازون فقط للتأكد من أن الطلب صادر من حساب أمازون الخاص
                  بالمنزل الواحد المصرح له. نطاق الصلاحية (OAuth scope) المطلوب هو{" "}
                  <code className="text-sm bg-muted px-1.5 py-0.5 rounded" dir="ltr">profile:user_id</code>{" "}
                  والذي يعيد فقط معرّف حساب أمازون (
                  <code className="text-sm bg-muted px-1.5 py-0.5 rounded" dir="ltr">user_id</code>).
                </p>
                <p className="text-muted-foreground">
                  نحن لا نطلب ولا نستلم اسم المستخدم أو بريده الإلكتروني من أمازون.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" /> البيانات التي يتم التعامل معها أثناء التشغيل
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span>
                      <strong>معرّف حساب أمازون (user_id):</strong> يتم التحقق منه في كل طلب مقابل
                      قائمة سماح ثابتة تحتوي على حساب منزل واحد فقط، ولا يتم تخزينه بعد هذا التحقق.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span>
                      <strong>رمز الوصول OAuth/LWA:</strong> يُستخدم بشكل مؤقت فقط، من جانب الخادم،
                      لاستدعاء نقاط تحقق الرمز الخاصة بأمازون نفسها أثناء كل طلب. لا يتم تسجيله أبداً
                      في أي سجل (log) أو قاعدة بيانات من قبل هذا النظام.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span>
                      <strong>أوامر Alexa Smart Home:</strong> مثل أمر تحكم بجهاز (تشغيل/إطفاء إضاءة،
                      ضبط السطوع)، معرّف الغرفة/الجهاز، والحالة المطلوبة. يتم الاحتفاظ بسجل لآخر رد
                      لكل معرّف طلب Alexa فريد على خادمنا الخاص، وذلك تحديداً لمنع تنفيذ طلب مكرر أو
                      معاد إرساله مرتين. في التطبيق الحالي، <strong>لا يوجد حذف تلقائي</strong> لهذه
                      السجلات الخاصة بمنع التكرار بعد — وتبقى على الخادم الخاص إلى أن يتم مسحها يدوياً.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span>
                      <strong>سجلات أمنية تقنية بسيطة</strong> (توقيع/طابع زمني قصير الأجل يُستخدم
                      لمصادقة الطلبات بين مكونات خادمنا) يتم حذفها تلقائياً بعد نحو دقيقتين.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-6 border-green-500/30 bg-green-500/5">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-green-600" /> ما لا نقوم به
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• لا نستخدم هذه البيانات لأغراض إعلانية.</li>
                  <li>• لا نبيع أي معلومات شخصية.</li>
                  <li>
                    • لا نشارك البيانات مع أي طرف ثالث باستثناء البنية التحتية الضرورية لتشغيل
                    التكامل (خدمات أمازون Alexa/LWA نفسها، والبنية التحتية السحابية الخاصة بنا
                    للربط/النفق). لا يستلم أي طرف ثالث آخر هذه البيانات على الإطلاق.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> قيود الوصول والاستخدام
                </h3>
                <p className="text-muted-foreground">
                  يقتصر الوصول على حساب أمازون الخاص بالمنزل الواحد المصرح له فقط؛ ولا يمكن مصادقة
                  أي حساب آخر. تُستخدم أوامر المنزل الذكي المستلمة فقط لتنفيذ إجراء الأتمتة المنزلية
                  المطلوب تحديداً (مثل تشغيل/إطفاء إضاءة) — ولا شيء غير ذلك.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Unlink className="w-5 h-5 text-primary" /> إلغاء الربط
                </h3>
                <p className="text-muted-foreground">
                  يمكن للمنزل إلغاء وصول هذا التكامل في أي وقت من خلال إعدادات ربط الحساب في تطبيق
                  Alexa (Skills &amp; Games)، بإلغاء ربط أو تعطيل المهارة (skill)، أو عبر إزالة ملف
                  الأمان المرتبط من إعدادات حساب أمازون الخاص بهم. إلغاء الوصول يوقف أي مصادقة
                  مستقبلية، ولا يحذف بأثر رجعي السجلات الموضحة أعلاه.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" /> التواصل
                </h3>
                <p className="text-muted-foreground">
                  لأي أسئلة تتعلق بخصوصية هذا التكامل، يرجى التواصل عبر{" "}
                  <a href="mailto:info@aquavoiq.com" className="text-primary underline" dir="ltr">
                    info@aquavoiq.com
                  </a>.
                </p>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
