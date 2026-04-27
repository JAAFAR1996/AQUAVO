import { Resend } from "resend";

// Email configuration
// For production, set this environment variable:
// - RESEND_API_KEY: Your Resend API key (starts with re_)
// - SMTP_FROM: Sender email address (must be a verified domain in Resend)

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn("[Email] Resend API key not found. Set RESEND_API_KEY environment variable.");
    return null;
  }

  return new Resend(apiKey);
}

function getFromEmail(): string {
  // Use the verified domain email, or fallback to the Resend testing email
  return process.env.SMTP_FROM || "AQUAVO <onboarding@resend.dev>";
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Email log types
type EmailType = "welcome" | "discount" | "password_reset";

interface EmailLogData {
  emailType: EmailType;
  recipientEmail: string;
  productId?: string;
  productName?: string;
  discountPercentage?: number;
  status: "sent" | "failed";
  errorMessage?: string;
}

// Log email to database
async function logEmailToDatabase(data: EmailLogData): Promise<void> {
  try {
    const { getDb } = await import("../db.js");
    const { emailLogs } = await import("../../shared/schema.js");

    const db = getDb();
    if (!db) {
      console.warn("[Email] Database not initialized, skipping email log");
      return;
    }

    await db.insert(emailLogs).values({
      emailType: data.emailType,
      recipientEmail: data.recipientEmail,
      productId: data.productId,
      productName: data.productName,
      discountPercentage: data.discountPercentage,
      status: data.status,
      errorMessage: data.errorMessage,
    });

    console.log(`[Email] Logged ${data.emailType} email to ${data.recipientEmail} (${data.status})`);
  } catch (error) {
    console.error("[Email] Failed to log email to database:", error);
  }
}

// ... (imports and config)

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const resend = getResendClient();
  const fromEmail = getFromEmail();

  if (!resend) {
    console.log("[Email] Skipping email send - Resend API key not configured");
    console.log("[Email] Would have sent to:", options.to);
    console.log("[Email] Subject:", options.subject);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text || "",
      html: options.html || "",
    });

    if (error) {
      console.error("[Email] Resend API error:", error);
      return false;
    }

    console.log(`[Email] Successfully sent to: ${options.to}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string): Promise<boolean> {
  const logoUrl = `${process.env.VITE_PUBLIC_BASE_URL || 'https://www.aquavoiq.com'}/logo_aquavo.png`;
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --bg-body: #f8fafc;
            --bg-container: #ffffff;
            --text-main: #334155;
            --text-heading: #1e293b;
            --bg-feature: #f1f5f9;
            --border-color: rgba(0,0,0,0.05);
            --shadow-glass: 0 20px 40px rgba(0, 0, 0, 0.08);
            --header-gradient: linear-gradient(135deg, #059669 0%, #047857 100%);
            --btn-bg: #10b981;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg-body: #0f172a;
                --bg-container: #1e293b;
                --text-main: #cbd5e1;
                --text-heading: #f8fafc;
                --bg-feature: #334155;
                --border-color: rgba(255,255,255,0.05);
                --shadow-glass: 0 20px 40px rgba(0, 0, 0, 0.4);
                --header-gradient: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
                --btn-bg: #10b981;
            }
        }
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        body { font-family: 'Tajawal', Arial, sans-serif; background-color: var(--bg-body); margin: 0; padding: 40px 20px; transition: background-color 0.3s; }
        .container { max-width: 600px; margin: 0 auto; background-color: var(--bg-container); border-radius: 24px; border: 1px solid var(--border-color); overflow: hidden; box-shadow: var(--shadow-glass); transition: all 0.3s; }
        .header { background: var(--header-gradient); padding: 50px 30px; text-align: center; color: white; position: relative; }
        .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: var(--bg-container); border-radius: 50% 50% 0 0; }
        .content { padding: 40px 35px; color: var(--text-main); line-height: 1.8; font-size: 16px; }
        .welcome-text { font-size: 28px; font-weight: 800; color: var(--text-heading); margin-bottom: 20px; text-align: center; background: linear-gradient(to right, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .message { margin-bottom: 35px; text-align: center; }
        .features { background-color: var(--bg-feature); padding: 25px; border-radius: 16px; margin-bottom: 35px; border: 1px solid var(--border-color); }
        .feature-item { display: flex; align-items: center; margin-bottom: 15px; color: var(--text-heading); font-weight: 500; font-size: 17px; }
        .feature-icon { margin-left: 15px; background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; }
        .btn { display: block; width: fit-content; margin: 0 auto; background-color: var(--btn-bg); color: white !important; padding: 16px 40px; border-radius: 99px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3); transition: transform 0.2s; }
        .btn:hover { transform: translateY(-3px); }
        .footer { background-color: var(--bg-body); padding: 30px 20px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px dashed var(--border-color); }
        .logo-img { max-width: 160px; margin-bottom: 20px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
        .contact { margin-top: 20px; font-weight: bold; color: var(--text-heading); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="AQUAVO" class="logo-img">
            <h1 style="margin:0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">عائلة AQUAVO ترحب بك 🌿</h1>
        </div>
        <div class="content">
            <div class="welcome-text">سعداء جداً لانضمامك</div>
            <div class="message">
                مرحباً بك في مجتمع AQUAVO. لم تقم بمجرد الاشتراك، بل انضممت إلى عائلة شغوفة بكل ما يتعلق بعالم الأحواض والأسماك في العراق.
                <br><br>
                رحلتك معنا ستكون مليئة بالإلهام، المعلومات القيمة، وأفضل العروض החصرية التي خصصناها لأجلك.
            </div>

            <div class="features">
                <div style="text-align:center; margin-bottom:20px; font-weight:800; color: var(--text-heading); font-size: 18px;">ماذا تتوقع منا؟</div>
                <div class="feature-item"><span class="feature-icon">✨</span> نصائح ممتازة للعناية بأسماكك</div>
                <div class="feature-item"><span class="feature-icon">🎁</span> تخفيضات خاصة للمشتركين فقط</div>
                <div class="feature-item"><span class="feature-icon">🆕</span> الوصول للمنتجات قبل الجميع</div>
            </div>

            <a href="${process.env.VITE_PUBLIC_BASE_URL || 'https://www.aquavoiq.com'}" class="btn">اكتشف المتجر الآن</a>
            
            <div class="contact">
                <p>هل تحتاج إلى مساعدة؟ فريقنا هنا دائماً.</p>
                <p>واتساب: 07747880678 | إيميل: info@aquavoiq.com</p>
            </div>
        </div>
    </div>
    <div class="footer">
        <p>© ${new Date().getFullYear()} AQUAVO. جميع الحقوق محفوظة.</p>
        <p>صُنع بحب 💚 لأجل هواة الأسماك في العراق</p>
    </div>
</body>
</html>
  `;

  const success = await sendEmail({
    to: email,
    subject: "أهلاً بك في عائلة AQUAVO! 🌿",
    html,
    text: "مرحباً بك في عائلة AQUAVO! نحن سعداء جداً بانضمامك إلينا. ستصلك قريباً أفضل العروض والنصائح."
  });

  // Log to database
  await logEmailToDatabase({
    emailType: "welcome",
    recipientEmail: email,
    status: success ? "sent" : "failed",
  });

  return success;
}

export async function sendProductDiscountEmail(email: string, product: { name: string, price: string, originalPrice?: string, slug: string, image: string }): Promise<boolean> {
  const discount = product.originalPrice
    ? Math.round(((parseFloat(product.originalPrice) - parseFloat(product.price)) / parseFloat(product.originalPrice)) * 100)
    : 0;

  const logoUrl = `${process.env.VITE_PUBLIC_BASE_URL || 'https://www.aquavoiq.com'}/logo_aquavo.png`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --bg-body: #f8fafc;
            --bg-container: #ffffff;
            --text-main: #334155;
            --text-heading: #0f172a;
            --bg-feature: #f1f5f9;
            --border-color: rgba(0,0,0,0.05);
            --shadow-glass: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --header-bg: #1e293b;
            --btn-bg: #3b82f6;
            --desc-box-bg: #f8fafc;
            --price-new: #059669;
            --price-old: #94a3b8;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg-body: #0f172a;
                --bg-container: #1e293b;
                --text-main: #cbd5e1;
                --text-heading: #f8fafc;
                --bg-feature: #334155;
                --border-color: rgba(255,255,255,0.05);
                --shadow-glass: 0 20px 40px rgba(0, 0, 0, 0.4);
                --header-bg: #111827;
                --btn-bg: #3b82f6;
                --desc-box-bg: #334155;
                --price-new: #10b981;
                --price-old: #64748b;
            }
        }
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        body { font-family: 'Tajawal', Arial, sans-serif; background-color: var(--bg-body); margin: 0; padding: 40px 20px; transition: background-color 0.3s; }
        .container { max-width: 600px; margin: 0 auto; background-color: var(--bg-container); border-radius: 24px; border: 1px solid var(--border-color); overflow: hidden; box-shadow: var(--shadow-glass); transition: all 0.3s; }
        .header { background: var(--header-bg); padding: 40px 30px; text-align: center; border-radius: 24px 24px 0 0; }
        .badge { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 8px 16px; border-radius: 99px; font-weight: 800; display: inline-block; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); }
        .product-img { width: 100%; height: 350px; object-fit: cover; background-color: var(--bg-feature); }
        .content { padding: 40px 35px; }
        .product-title { font-size: 26px; font-weight: 800; color: var(--text-heading); margin: 0 0 15px 0; }
        .price-container { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
        .current-price { color: var(--price-new); font-size: 28px; font-weight: 800; }
        .old-price { color: var(--price-old); text-decoration: line-through; font-size: 18px; }
        .description-box { background-color: var(--desc-box-bg); border-right: 4px solid var(--btn-bg); padding: 20px; margin: 25px 0; border-radius: 8px 0 0 8px; color: var(--text-main); font-size: 16px; line-height: 1.8; }
        .btn { display: block; width: 100%; text-align: center; background-color: var(--btn-bg); color: white !important; padding: 18px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 20px; margin-top: 30px; transition: transform 0.2s, background-color 0.2s; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.25); border: none; }
        .btn:hover { background-color: #2563eb; transform: translateY(-2px); }
        .logo-img { height: 45px; margin-bottom: 15px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2)); }
        .footer { padding: 30px 20px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px dashed var(--border-color); background-color: var(--bg-body); border-radius: 0 0 24px 24px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="AQUAVO" class="logo-img">
            <div>
                ${discount > 0 ? `<div class="badge">تخفيض ${discount}% 🔥</div>` : '<div class="badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">منتج مميز ✨</div>'}
            </div>
            <h1 style="color:white; margin:0; font-size:26px; font-weight: 700;">فرصة لا تفوت!</h1>
        </div>
        <img src="${product.image}" alt="${product.name}" class="product-img">
        <div class="content">
            <h2 class="product-title">${product.name}</h2>
            <div class="price-container">
                <span class="current-price">${parseFloat(product.price).toLocaleString()} د.ع</span>
                ${product.originalPrice ? `<span class="old-price">${parseFloat(product.originalPrice).toLocaleString()} د.ع</span>` : ''}
            </div>
            
            <div class="description-box">
                لأنك من عائلتنا المميزة، أردنا أن تكون أول من يعلم بهذا العرض الخاص. الكمية محدودة جداً، لا تضيع الفرصة قبل نفاذ المخزون!
            </div>

            <a href="${process.env.VITE_PUBLIC_BASE_URL || 'https://www.aquavoiq.com'}/product/${product.slug}" class="btn">احصل عليه الآن 🛒</a>
            
            <div style="margin-top: 30px; text-align: center; color: var(--text-heading); font-weight: bold;">
                <p>للطلب السريع عبر واتساب:</p>
                <p style="color: var(--btn-bg); font-size: 18px; direction: ltr;">+964 774 788 0678</p>
            </div>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} AQUAVO. جميع الحقوق محفوظة.</p>
            <p>صُنع بحب 💚 لأجل هواة الأسماك في العراق</p>
        </div>
    </div>
</body>
</html>
  `;
  // Send email and log to database

  const success = await sendEmail({
    to: email,
    subject: `فرصة خاصة لك: تخفيض على ${product.name} 🔥`,
    html,
    text: `تخفيض مميز على ${product.name}! السعر الـجديد: ${product.price} د.ع. تسوق الآن: ${process.env.VITE_PUBLIC_BASE_URL}/product/${product.slug}`
  });

  // Log to database
  await logEmailToDatabase({
    emailType: "discount",
    recipientEmail: email,
    productName: product.name,
    discountPercentage: discount,
    status: success ? "sent" : "failed",
  });

  return success;
}

export async function sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  const userName = email.split('@')[0]; // Extract name from email
  const logoUrl = `${process.env.VITE_PUBLIC_BASE_URL || 'https://www.aquavoiq.com'}/logo_aquavo.png`;


  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
      background: linear-gradient(135deg, #e0f7fa 0%, #e3f2fd 50%, #f0f9ff 100%);
      margin: 0; 
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 24px; 
      overflow: hidden; 
      box-shadow: 0 20px 60px rgba(0, 139, 176, 0.15);
    }
    .header { 
      background: linear-gradient(135deg, #0284c7 0%, #0891b2 50%, #06b6d4 100%);
      padding: 50px 30px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: shimmer 3s infinite;
    }
    @keyframes shimmer {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(180deg); }
    }
    .logo-img { 
      max-width: 180px; 
      margin-bottom: 15px;
      position: relative;
    }
    .header h1 { 
      color: white; 
      font-size: 32px; 
      font-weight: 700;
      text-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: relative;
    }
    .header p {
      color: rgba(255,255,255,0.9);
      font-size: 16px;
      margin-top: 10px;
      position: relative;
    }
    .content { 
      padding: 40px 35px; 
      text-align: right;
      background: linear-gradient(180deg, #fafafa 0%, white 100%);
    }
    .greeting {
      font-size: 22px;
      color: #1e3a5f;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .greeting-icon {
      font-size: 28px;
    }
    .content p { 
      color: #4b5563; 
      line-height: 1.9; 
      font-size: 16px;
      margin-bottom: 15px;
    }
    .highlight-box {
      background: linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%);
      border-right: 4px solid #0891b2;
      padding: 20px;
      border-radius: 12px;
      margin: 25px 0;
    }
    .highlight-box p {
      color: #0e7490;
      margin: 0;
      font-weight: 500;
    }
    .button-container {
      text-align: center;
      margin: 35px 0;
    }
    .button { 
      display: inline-block; 
      background: linear-gradient(135deg, #0284c7 0%, #0891b2 100%);
      color: white !important; 
      padding: 18px 45px; 
      text-decoration: none; 
      border-radius: 50px; 
      font-weight: 700; 
      font-size: 18px;
      box-shadow: 0 8px 25px rgba(8, 145, 178, 0.35);
      transition: all 0.3s ease;
    }
    .button:hover { 
      transform: translateY(-2px);
      box-shadow: 0 12px 35px rgba(8, 145, 178, 0.45);
    }
    .security-notice { 
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 1px solid #fcd34d;
      border-right: 4px solid #f59e0b;
      padding: 20px; 
      border-radius: 12px; 
      margin: 25px 0;
    }
    .security-notice p {
      color: #92400e;
      margin: 0;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .security-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .link-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .link-box p {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .link-text {
      word-break: break-all;
      background: white;
      padding: 12px;
      border-radius: 6px;
      font-size: 13px;
      color: #0284c7;
      border: 1px solid #e2e8f0;
      display: block;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 30px 0;
    }
    .help-section {
      background: #f8fafc;
      padding: 25px;
      border-radius: 16px;
      text-align: center;
    }
    .help-section p {
      color: #64748b;
      font-size: 15px;
      margin-bottom: 8px;
    }
    .help-section a {
      color: #0891b2;
      text-decoration: none;
      font-weight: 600;
    }
    .footer { 
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
      padding: 35px; 
      text-align: center;
    }
    .footer p {
      color: rgba(255,255,255,0.8);
      font-size: 14px;
      line-height: 1.8;
      margin: 5px 0;
    }
    .footer-tagline {
      color: #06b6d4 !important;
      font-weight: 600;
      font-size: 16px !important;
      margin-top: 15px !important;
    }
    .social-links {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .social-links p {
      color: rgba(255,255,255,0.5);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="AQUAVO" class="logo-img">
      <h1>AQUAVO</h1>
      <p>عالمك المائي المتكامل</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        <span class="greeting-icon">👋</span>
        <span>مرحباً ${userName}!</span>
      </div>
      
      <p>نأمل أن تكون بخير! تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في AQUAVO.</p>
      
      <div class="highlight-box">
        <p>لا تقلق، نحن هنا لمساعدتك! اضغط على الزر أدناه لإنشاء كلمة مرور جديدة وآمنة.</p>
      </div>
      
      <div class="button-container">
        <a href="${resetUrl}" class="button">🔐 إعادة تعيين كلمة المرور</a>
      </div>
      
      <div class="security-notice">
        <p>
          <span class="security-icon">⏰</span>
          <span>
            <strong>تنبيه أمني:</strong> هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط لحماية حسابك.
            إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان - حسابك لا يزال آمناً!
          </span>
        </p>
      </div>
      
      <div class="link-box">
        <p>📋 إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:</p>
        <span class="link-text">${resetUrl}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="help-section">
        <p>هل تحتاج مساعدة؟ فريقنا جاهز لخدمتك!</p>
        <p>تواصل معنا عبر واتساب أو البريد الإلكتروني</p>
      </div>
    </div>
    
    <div class="footer">
      <p>AQUAVO - متجرك الأول للأسماك والأحواض</p>
      <p class="footer-tagline">✨ نحول حلمك المائي إلى حقيقة ✨</p>
      <div class="social-links">
        <p>© ${new Date().getFullYear()} AQUAVO - جميع الحقوق محفوظة</p>
        <p>هذه رسالة آلية، يرجى عدم الرد عليها مباشرة</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
مرحباً ${userName}! 👋

نأمل أن تكون بخير!

تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في AQUAVO.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 لإعادة تعيين كلمة المرور:
افتح الرابط التالي في متصفحك:
${resetUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ تنبيه أمني:
• هذا الرابط صالح لمدة ساعة واحدة فقط
• إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة
• حسابك لا يزال آمناً!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

هل تحتاج مساعدة؟ فريقنا جاهز لخدمتك!

مع أطيب التحيات،
فريق AQUAVO 🐟
✨ نحول حلمك المائي إلى حقيقة ✨
  `.trim();

  const success = await sendEmail({
    to: email,
    subject: "🔐 إعادة تعيين كلمة المرور - AQUAVO",
    html,
    text,
  });

  // Log to database
  await logEmailToDatabase({
    emailType: "password_reset",
    recipientEmail: email,
    status: success ? "sent" : "failed",
  });

  return success;
}

// Verify Resend connection
export async function verifyEmailConnection(): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) return false;

  console.log("[Email] Resend API key loaded successfully");
  return true;
}
