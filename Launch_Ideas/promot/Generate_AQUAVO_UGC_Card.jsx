#target illustrator

// ============================================================
//  AQUAVO UGC Card Generator - Adobe Illustrator ExtendScript
//  النسخة المصححة - النص العربي صح من اليمين
// ============================================================
//
//  ⚠️  قبل تشغيل هذا السكريبت — افعل هذا مرة وحدة بس:
//  1. Edit > Preferences > Type > ✅ Show Indic Options
//  2. اختار أي نص > Paragraph Panel > ☰ > Middle Eastern Single-Line Composer
//  3. شغل السكريبت
// ============================================================

var BG_IMAGE = "C:/Users/jaafa/Downloads/ros/ChatGPT Image Apr 23, 2026, 10_18_42 AM.png";
var LOGO_IMG = "C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/brand/logos/aquavo-vertical.png";

function mm(v) { return v * 2.834645; }

function makeRGB(r, g, b) {
    var c = new RGBColor();
    c.red = r; c.green = g; c.blue = b;
    return c;
}

// --- تعيين اتجاه RTL لكل فقرة في الإطار ---
function setRTL(textFrame) {
    try {
        for (var i = 0; i < textFrame.paragraphs.length; i++) {
            textFrame.paragraphs[i].paragraphDirection = ParagraphDirectionType.RIGHT_TO_LEFT_DIRECTION;
        }
    } catch(e) {
        // إذا ما اشتغلت: تحتاج تفعّل Middle Eastern Composer من الـ Preferences
    }
}

// --- تعيين الخط ---
function setFont(charAttr, boldName, regName, useBold) {
    var names = useBold
        ? [boldName, "Cairo Bold", "Cairo-Bold", "Cairo", "Arial Bold", "Arial-BoldMT"]
        : [regName,  "Cairo Regular", "Cairo-Regular", "Cairo", "Arial", "ArialMT"];
    for (var i = 0; i < names.length; i++) {
        try { charAttr.textFont = app.textFonts.getByName(names[i]); return; } catch(e) {}
    }
}

// ============================================================
//  الدالة الرئيسية
// ============================================================
function buildCard() {

    var W = mm(100);
    var H = mm(100);

    var colNavy      = makeRGB(13,  31,  61);   // #0D1F3D
    var colTeal      = makeRGB(0,  188, 188);   // #00BCBC
    var colWhite     = makeRGB(255, 255, 255);
    var colSubText   = makeRGB(200, 215, 230);  // رمادي فاتح

    // 1. إنشاء المستند
    var doc = app.documents.add(DocumentColorSpace.RGB, W, H);

    // ── طبقة الخلفية (Navy) ──────────────────────────────────
    var layBG = doc.layers[0];
    layBG.name = "1_Navy_Background";
    var bgRect = layBG.pathItems.rectangle(H, 0, W, H);
    bgRect.fillColor = colNavy;
    bgRect.stroked = false;

    // ── طبقة صورة الحوض ─────────────────────────────────────
    var layPhoto = doc.layers.add();
    layPhoto.name = "2_Aquascape_Photo";

    var imgFile = new File(BG_IMAGE);
    if (imgFile.exists) {
        var placed = layPhoto.placedItems.add();
        placed.file = imgFile;

        var targetH = H * 0.70;
        var scaleX  = (W / placed.width)  * 100;
        var scaleY  = (targetH / placed.height) * 100;
        var sc      = Math.max(scaleX, scaleY);
        placed.resize(sc, sc);

        // محاذاة الصورة: تغطي الجزء العلوي
        placed.position = [-(placed.width - W) / 2, H];
    } else {
        // Placeholder
        var ph = layPhoto.pathItems.rectangle(H, 0, W, H * 0.70);
        ph.fillColor = makeRGB(30, 60, 90);
        ph.stroked = false;
    }

    // ── Gradient Overlay (الصورة تتلاشى إلى Navy) ───────────
    var layOv = doc.layers.add();
    layOv.name = "3_Gradient_Overlay";

    var ovH   = H * 0.50;
    var ovTop = H * 0.52;   // يبدأ من نص الكارد
    var ovRect = layOv.pathItems.rectangle(ovTop, 0, W, ovH);
    ovRect.stroked = false;

    var grad = doc.gradients.add();
    grad.type = GradientType.LINEAR;

    // من شفاف إلى Navy
    var s0 = grad.gradientStops[0];
    s0.color   = colNavy;
    s0.opacity = 0;
    s0.rampPoint = 0;

    var s1 = grad.gradientStops[1];
    s1.color   = colNavy;
    s1.opacity = 100;
    s1.rampPoint = 100;

    var gc = new GradientColor();
    gc.gradient = grad;
    gc.angle    = 90;
    gc.length   = 1;
    gc.origin   = [W / 2, ovTop - ovH / 2];
    ovRect.fillColor = gc;

    // ── طبقة النصوص ─────────────────────────────────────────
    var layTxt = doc.layers.add();
    layTxt.name = "4_Arabic_Text";

    var marginX = mm(6);
    var txtW    = W - marginX * 2;

    // --- العنوان الرئيسي ---
    var tTitle = layTxt.textFrames.areaText(
        layTxt.pathItems.rectangle(H * 0.395, marginX, txtW, mm(17))
    );
    tTitle.contents = "\u0631\u0627\u0648\u064A\u0646\u0627 \u062D\u0648\u0636\u0643\u0021";
    // = "راوينا حوضك!"

    var caTitle = tTitle.textRange.characterAttributes;
    caTitle.fillColor = colWhite;
    caTitle.size      = 30;
    setFont(caTitle, "Cairo-Bold", "Cairo-Regular", true);

    tTitle.textRange.paragraphAttributes.justification = Justification.RIGHT;
    setRTL(tTitle);

    // --- النص الثانوي ---
    var tSub = layTxt.textFrames.areaText(
        layTxt.pathItems.rectangle(H * 0.285, marginX, txtW, mm(15))
    );
    tSub.contents = "\u062D\u0648\u0636\u0643 \u0645\u0645\u0643\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u0646\u062C\u0645 \u0627\u0644\u062C\u0627\u064A \u0639\u0644\u0649 \u0635\u0641\u062D\u062A\u0646\u0627\u0021";
    // = "حوضك ممكن يكون النجم الجاي على صفحتنا!"

    var caSub = tSub.textRange.characterAttributes;
    caSub.fillColor = colSubText;
    caSub.size      = 13;
    setFont(caSub, "Cairo-Bold", "Cairo-Regular", false);

    tSub.textRange.paragraphAttributes.justification = Justification.RIGHT;
    setRTL(tSub);

    // --- الهاشتاق ---
    var tHash = layTxt.textFrames.areaText(
        layTxt.pathItems.rectangle(H * 0.150, marginX, txtW, mm(12))
    );
    tHash.contents = "#\u062D\u0648\u0636\u064A_\u0645\u0639_\u0627\u0643\u0648\u0627\u0641";
    // = "#حوضي_مع_اكواف"

    var caHash = tHash.textRange.characterAttributes;
    caHash.fillColor = colTeal;
    caHash.size      = 21;
    setFont(caHash, "Cairo-Bold", "Cairo-Regular", true);

    tHash.textRange.paragraphAttributes.justification = Justification.CENTER;
    setRTL(tHash);

    // ── طبقة اللوغو ─────────────────────────────────────────
    var layLogo = doc.layers.add();
    layLogo.name = "5_AQUAVO_Logo";

    var logoFile = new File(LOGO_IMG);
    if (logoFile.exists) {
        var logo = layLogo.placedItems.add();
        logo.file = logoFile;

        var logoW  = mm(24);
        var logoSc = (logoW / logo.width) * 100;
        logo.resize(logoSc, logoSc);

        var mR = mm(4);
        var mT = mm(4);
        logo.position = [W - logo.width - mR, H - mT];
    }

    // ── رسالة نجاح ──────────────────────────────────────────
    alert(
        "\u2705 \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0643\u0627\u0631\u062F!\n\n" +
        "\u0625\u0630\u0627 \u0627\u0644\u0646\u0635 \u0644\u0633\u0651\u0647 \u0645\u0639\u0643\u0648\u0633:\n" +
        "Paragraph Panel > \u2630 > Middle Eastern Single-Line Composer\n\u062B\u0645 \u0634\u063A\u0651\u0644 \u0627\u0644\u0633\u0643\u0631\u064A\u0628\u062A \u0645\u0631\u0629 \u062B\u0627\u0646\u064A\u0629\n\n" +
        "\u0644\u062A\u0635\u062F\u064A\u0631 PNG: File > Export As > PNG (300 DPI)"
    );
}

buildCard();
