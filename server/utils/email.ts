import nodemailer from "nodemailer";

// Email configuration
// For production, set these environment variables:
// - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com, smtp.mail.yahoo.com)
// - SMTP_PORT: SMTP port (usually 587 for TLS or 465 for SSL)
// - SMTP_USER: Your email address
// - SMTP_PASS: Your email password or app-specific password
// - SMTP_FROM: Sender email address

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[Email] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.");
    return null;
  }

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const config = getEmailConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
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
  const transport = getTransporter();
  const config = getEmailConfig();

  if (!transport || !config) {
    console.log("[Email] Skipping email send - SMTP not configured");
    console.log("[Email] Would have sent to:", options.to);
    console.log("[Email] Subject:", options.subject);
    return false;
  }

  try {
    await transport.sendMail({
      from: `"AQUAVO" <${config.from}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[Email] Successfully sent to: ${options.to}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string): Promise<boolean> {
  const logoUrl = `${process.env.VITE_PUBLIC_BASE_URL || 'https://aquavo.iq'}/logo_aquavo.png`;
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        body { font-family: 'Tajawal', Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center; color: white; }
        .content { padding: 40px 30px; color: #334155; line-height: 1.8; }
        .welcome-text { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 20px; text-align: center; }
        .message { font-size: 16px; color: #475569; margin-bottom: 30px; text-align: center; }
        .features { background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
        .feature-item { display: flex; align-items: center; margin-bottom: 12px; color: #0f172a; font-weight: 500; }
        .feature-icon { margin-left: 10px; color: #10b981; }
        .btn { display: block; width: fit-content; margin: 0 auto; background-color: #10b981; color: white; padding: 14px 32px; border-radius: 99px; text-decoration: none; font-weight: bold; transition: transform 0.2s; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; }
        .logo-img { max-width: 150px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="AQUAVO" class="logo-img">
            <h1 style="margin:0; font-size: 28px;">أهلاً بك في عائلة AQUAVO! 🌿</h1>
        </div>
        <div class="content">
            <div class="welcome-text">سعداء جداً بانضمامك إلينا</div>
            <div class="message">
                مرحباً بك في مجتمع AQUAVO. لم تقم بمجرد الاشتراك في نشرة بريدية، بل انضممت إلى عائلة شغوفة بكل ما يتعلق بعالم الأحواض والأسماك.
                <br><br>
                نعدك بأن تكون رحلتك معنا مليئة بالإلهام، المعلومات القيمة، وأفضل العروض الحصرية التي نختارها بعناية لأجلك.
            </div>

            <div class="features">
                <div style="text-align:center; margin-bottom:15px; font-weight:700;">ماذا ستجد في رسائلنا؟</div>
                <div class="feature-item">✨ نصائح حصرية للعناية بأسماكك</div>
                <div class="feature-item">🎁 عروض وتخفيضات خاصة للمشتركين فقط</div>
                <div class="feature-item">🆕 أحدث المنتجات قبل الجميع</div>
            </div>

            <a href="${process.env.VITE_PUBLIC_BASE_URL || 'https://aquavo.iq'}" class="btn">اكتشف منتجاتنا المميزة</a>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} AQUAVO. جميع الحقوق محفوظة.</p>
            <p>صنع بحب 💚 لأجل هواة الأسماك في العراق</p>
        </div>
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

  const logoUrl = `${process.env.VITE_PUBLIC_BASE_URL || 'https://aquavo.iq'}/logo_aquavo.png`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        body { font-family: 'Tajawal', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .header { background: #1e293b; padding: 30px; text-align: center; }
        .badge { background-color: #ef4444; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 10px; }
        .product-img { width: 100%; height: 300px; object-fit: cover; background-color: #f1f5f9; }
        .content { padding: 30px; }
        .product-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0; }
        .price-container { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .current-price { color: #059669; font-size: 24px; font-weight: 800; }
        .old-price { color: #94a3b8; text-decoration: line-through; font-size: 16px; }
        .description-box { background-color: #f8fafc; border-right: 4px solid #3b82f6; padding: 15px; margin: 20px 0; color: #475569; }
        .btn { display: block; width: 100%; text-align: center; background-color: #3b82f6; color: white; padding: 16px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; margin-top: 25px; transition: background-color 0.2s; }
        .btn:hover { background-color: #2563eb; }
        .logo-img { height: 40px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="AQUAVO" class="logo-img">
            ${discount > 0 ? `<div class="badge">تخفيض ${discount}% 🔥</div>` : '<div class="badge">منتج مميز ✨</div>'}
            <h1 style="color:white; margin:0; font-size:24px;">فرصة لا تفوت!</h1>
        </div>
        <img src="${product.image}" alt="${product.name}" class="product-img">
        <div class="content">
            <h2 class="product-title">${product.name}</h2>
            <div class="price-container">
                <span class="current-price">${parseFloat(product.price).toLocaleString()} د.ع</span>
                ${product.originalPrice ? `<span class="old-price">${parseFloat(product.originalPrice).toLocaleString()} د.ع</span>` : ''}
            </div>
            
            <div class="description-box">
                لأنك من عائلتنا المميزة، أردنا أن تكون أول من يعلم بهذا العرض الخاص. الكمية محدودة، لا تضيع الفرصة!
            </div>

            <a href="${process.env.VITE_PUBLIC_BASE_URL || 'https://aquavo.iq'}/product/${product.slug}" class="btn">احصل عليه الآن 🛒</a>
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
  const logoUrl = `${process.env.VITE_PUBLIC_BASE_URL || 'https://aquavo.iq'}/logo_aquavo.png`;


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

// Verify SMTP connection
export async function verifyEmailConnection(): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;

  try {
    await transport.verify();
    console.log("[Email] SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("[Email] SMTP verification failed:", error);
    return false;
  }
}
