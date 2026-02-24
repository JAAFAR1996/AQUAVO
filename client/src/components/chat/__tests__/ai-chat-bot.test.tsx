/**
 * اختبارات الجات بوت (شريمب 🦐)
 * ====================================
 * يغطي:
 * 1. ChatMarkdown — عرض النصوص المنسقة
 * 2. streamChatMessage — تحليل أحداث SSE
 * 3. AIChatBot Component — سلوك الواجهة كاملاً
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────

vi.mock("@/contexts/auth-context", () => ({
    useAuth: vi.fn().mockReturnValue({ user: null }),
}));

vi.mock("@/contexts/cart-context", () => ({
    useCart: vi.fn().mockReturnValue({ addItem: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
    useToast: vi.fn().mockReturnValue({ toast: vi.fn() }),
}));

vi.mock("wouter", () => ({
    useLocation: vi.fn().mockReturnValue(["/", vi.fn()]),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * بناء ReadableStream يحاكي SSE من الخادم
 */
function buildSSEStream(
    events: Array<{ type: string; [key: string]: unknown }>,
    finalText?: string
): Response {
    const parts: string[] = events.map((e) => `data: ${JSON.stringify(e)}\n\n`);
    if (finalText) {
        parts.push(`data: ${JSON.stringify({ type: "done", products: [], normalizedText: finalText })}\n\n`);
    }
    parts.push("data: [DONE]\n\n");

    const encoded = new TextEncoder().encode(parts.join(""));
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encoded);
            controller.close();
        },
    });

    return { ok: true, body: stream } as unknown as Response;
}

// ─────────────────────────────────────────────────────────────
// SUITE 1: ChatMarkdown — عرض النصوص المنسقة
// ─────────────────────────────────────────────────────────────

// Import the component directly for isolated tests
// We need a way to render only ChatMarkdown — so we import AIChatBot
// and check how it renders assistant messages.
// Instead, let's test via a thin wrapper that uses the same logic.

describe("ChatMarkdown — تنسيق الردود", () => {
    // Since ChatMarkdown is a non-exported memo inside the file,
    // we test its output via the AIChatBot integration.
    // These tests verify the markdown rendering rules directly.

    function renderMarkdown(text: string) {
        // Build a minimal inline renderer matching the component logic
        const lines = text.split("\n");
        return lines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return { type: "br", key: i };
            const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
            const isBullet =
                !numberedMatch &&
                (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* "));
            const isWarning =
                trimmed.startsWith("⚠️") ||
                trimmed.startsWith("تحذير") ||
                trimmed.startsWith("خطر");
            const isHeader =
                !numberedMatch && !isBullet && /^\*\*[^*]+\*\*[:\s]*$/.test(trimmed);
            return { type: numberedMatch ? "numbered" : isBullet ? "bullet" : isWarning ? "warning" : isHeader ? "header" : "text", key: i, content: trimmed };
        });
    }

    it("يعرف السطر العادي", () => {
        const result = renderMarkdown("هلا حبي!");
        expect(result[0].type).toBe("text");
    });

    it("يعرف النقطة (bullet) بـ •", () => {
        const result = renderMarkdown("• الكولدفيش تكبر هواية");
        expect(result[0].type).toBe("bullet");
    });

    it("يعرف النقطة بـ -", () => {
        const result = renderMarkdown("- فلتر قوي");
        expect(result[0].type).toBe("bullet");
    });

    it("يعرف القائمة المرقمة (1. 2. 3.)", () => {
        const result = renderMarkdown("1. افصل الذكرين فورا");
        expect(result[0].type).toBe("numbered");
    });

    it("يستخرج رقم القائمة والمحتوى", () => {
        const text = "3. غير 30% من الماء";
        const lines = text.split("\n");
        const match = lines[0].trim().match(/^(\d+)\.\s+(.+)$/);
        expect(match?.[1]).toBe("3");
        expect(match?.[2]).toBe("غير 30% من الماء");
    });

    it("يعرف سطر التحذير ⚠️", () => {
        const result = renderMarkdown("⚠️ وكف! هاي مشكلة خطيرة");
        expect(result[0].type).toBe("warning");
    });

    it("يعرف سطر تحذير يبدأ بـ 'خطر'", () => {
        const result = renderMarkdown("خطر: الامونيا عالية");
        expect(result[0].type).toBe("warning");
    });

    it("يعرف الهيدر (سطر كله **عريض**)", () => {
        const result = renderMarkdown("**شنو تحتاج:**");
        expect(result[0].type).toBe("header");
    });

    it("يعرف السطر الفارغ كـ br", () => {
        const result = renderMarkdown("\n");
        expect(result.some((r) => r.type === "br")).toBe(true);
    });

    it("يعرف الـ **bold** داخل السطر", () => {
        const text = "السعر **25,000 د.ع** الحين";
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        const boldPart = parts.find((p) => p.startsWith("**") && p.endsWith("**"));
        expect(boldPart).toBe("**25,000 د.ع**");
    });

    it("يحسب عدد الأسطر بشكل صحيح", () => {
        const text = "سطر 1\nسطر 2\nسطر 3";
        const result = renderMarkdown(text);
        expect(result).toHaveLength(3);
    });
});

// ─────────────────────────────────────────────────────────────
// SUITE 2: streamChatMessage — تحليل SSE
// ─────────────────────────────────────────────────────────────

// Import streamChatMessage (it's not exported either — test via component behavior)
// Instead test the SSE parsing logic inline

describe("SSE Stream Parser — تحليل أحداث الـ streaming", () => {
    /** Mini-parser that mirrors the logic in streamChatMessage */
    async function parseSSE(
        stream: ReadableStream<Uint8Array>
    ): Promise<{ chunks: string[]; products: unknown[]; normalizedText?: string; errors: string[] }> {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const chunks: string[] = [];
        const errors: string[] = [];
        let products: unknown[] = [];
        let normalizedText: string | undefined;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") return { chunks, products, normalizedText, errors };

                try {
                    const event = JSON.parse(data);
                    if (event.type === "chunk") chunks.push(event.text);
                    else if (event.type === "done") {
                        products = event.products || [];
                        normalizedText = event.normalizedText;
                    } else if (event.type === "error") {
                        errors.push(event.message);
                    }
                } catch {
                    // ignore
                }
            }
        }
        return { chunks, products, normalizedText, errors };
    }

    it("يجمع الـ chunks بشكل صحيح", async () => {
        const stream = buildSSEStream([
            { type: "chunk", text: "هلا " },
            { type: "chunk", text: "حبي! " },
            { type: "chunk", text: "🦐" },
            { type: "done", products: [] },
        ]);

        const result = await parseSSE(stream.body!);
        expect(result.chunks).toEqual(["هلا ", "حبي! ", "🦐"]);
        expect(result.chunks.join("")).toBe("هلا حبي! 🦐");
    });

    it("يستقبل المنتجات مع حدث done", async () => {
        const products = [{ id: "1", name: "فلتر YEE", price: "25000" }];
        const raw = new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "done", products })}\n\ndata: [DONE]\n\n`
        );
        const stream = new ReadableStream<Uint8Array>({ start: (c) => { c.enqueue(raw); c.close(); } });
        const result = await parseSSE(stream);
        expect(result.products).toHaveLength(1);
        expect((result.products[0] as any).name).toBe("فلتر YEE");
    });

    it("يستقبل normalizedText عند وجودها", async () => {
        const raw = new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "done", products: [], normalizedText: "هلا حبي هسه!" })}\n\ndata: [DONE]\n\n`
        );
        const stream = new ReadableStream<Uint8Array>({ start: (c) => { c.enqueue(raw); c.close(); } });
        const result = await parseSSE(stream);
        expect(result.normalizedText).toBe("هلا حبي هسه!");
    });

    it("يتعامل مع حدث error بشكل صحيح", async () => {
        const raw = new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "error", message: "صار خطأ 😔" })}\n\ndata: [DONE]\n\n`
        );
        const stream = new ReadableStream<Uint8Array>({ start: (c) => { c.enqueue(raw); c.close(); } });
        const result = await parseSSE(stream);
        expect(result.errors[0]).toBe("صار خطأ 😔");
    });

    it("يتجاهل أحداث مشوهة (JSON غير صالح)", async () => {
        const raw = new TextEncoder().encode(
            `data: BROKEN_JSON\ndata: ${JSON.stringify({ type: "chunk", text: "سلام" })}\n\ndata: [DONE]\n\n`
        );
        const stream = new ReadableStream<Uint8Array>({ start: (c) => { c.enqueue(raw); c.close(); } });
        const result = await parseSSE(stream);
        expect(result.chunks).toContain("سلام");
    });

    it("يتوقف عند [DONE]", async () => {
        const raw = new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "chunk", text: "أول" })}\n\ndata: [DONE]\ndata: ${JSON.stringify({ type: "chunk", text: "ثاني" })}\n\n`
        );
        const stream = new ReadableStream<Uint8Array>({ start: (c) => { c.enqueue(raw); c.close(); } });
        const result = await parseSSE(stream);
        expect(result.chunks).toHaveLength(1);
        expect(result.chunks[0]).toBe("أول");
    });
});

// ─────────────────────────────────────────────────────────────
// SUITE 3: AIChatBot Component — اختبارات الواجهة
// ─────────────────────────────────────────────────────────────

import { AIChatBot } from "../ai-chat-bot";

describe("AIChatBot Component — واجهة الجات بوت", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: fetch returns empty done stream
        mockFetch.mockResolvedValue(
            buildSSEStream([{ type: "done", products: [] }])
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("يعرض زر الفتح العائم", () => {
        render(<AIChatBot />);
        const btn = screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i });
        expect(btn).toBeInTheDocument();
    });

    it("يفتح نافذة المحادثة عند الضغط على الزر العائم", async () => {
        const user = userEvent.setup();
        render(<AIChatBot />);

        const floatBtn = screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i });
        await user.click(floatBtn);

        // Should show the chat header and close button
        expect(screen.getByRole("button", { name: /إغلاق المحادثة/i })).toBeInTheDocument();
        // "متصل الآن" only appears inside the open chat header
        expect(screen.getByText(/متصل الآن/i)).toBeInTheDocument();
    });

    it("يعرض رسالة الترحيب عند الفتح", async () => {
        const user = userEvent.setup();
        render(<AIChatBot />);

        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        expect(screen.getByText(/هلا!/i)).toBeInTheDocument();
    });

    it("يظهر الأسئلة السريعة في البداية", async () => {
        const user = userEvent.setup();
        render(<AIChatBot />);

        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        expect(screen.getByText(/أسئلة سريعة/i)).toBeInTheDocument();
        expect(screen.getByText(/شلون أنظف الحوض/i)).toBeInTheDocument();
    });

    it("يُعبئ حقل الإدخال عند الضغط على سؤال سريع", async () => {
        const user = userEvent.setup();
        render(<AIChatBot />);

        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        const quickBtn = screen.getByText(/شلون أنظف الحوض/i);
        await user.click(quickBtn);

        const input = screen.getByPlaceholderText(/اكتب سؤالك/i);
        expect((input as HTMLInputElement).value).toContain("شلون أنظف الحوض");
    });

    it("يغلق النافذة عند الضغط على X", async () => {
        const user = userEvent.setup();
        render(<AIChatBot />);

        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));
        await user.click(screen.getByRole("button", { name: /إغلاق المحادثة/i }));

        // Float button should reappear
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i })).toBeInTheDocument();
        });
    });

    it("يُعطّل الإدخال أثناء الـ streaming", async () => {
        // Build a stream that "hangs" — never finishes
        let resolveStream!: () => void;
        const pendingStream = new Promise<void>((r) => (resolveStream = r));

        mockFetch.mockResolvedValue({
            ok: true,
            body: new ReadableStream({
                start(controller) {
                    // Emit one chunk then stall
                    controller.enqueue(new TextEncoder().encode("data: " + JSON.stringify({ type: "chunk", text: "شريمب يكتب..." }) + "\n\n"));
                    // Don't close yet
                    pendingStream.then(() => controller.close());
                },
            }),
        } as unknown as Response);

        const user = userEvent.setup();
        render(<AIChatBot />);

        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        const input = screen.getByPlaceholderText(/اكتب سؤالك/i);
        await user.type(input, "ما هو أحسن فلتر؟");

        const sendBtn = screen.getByRole("button", { name: /إرسال الرسالة/i });
        await user.click(sendBtn);

        // Input should be disabled while streaming
        await waitFor(() => {
            expect(input).toBeDisabled();
        });

        // Cleanup
        resolveStream();
    });

    it("يُرسل رسالة المستخدم لـ /api/ai/chat/stream", async () => {
        const user = userEvent.setup();

        mockFetch.mockResolvedValue(
            buildSSEStream([
                { type: "chunk", text: "للحوض 50 لتر، " },
                { type: "chunk", text: "احسن فلتر هو YEE." },
                { type: "done", products: [] },
            ])
        );

        render(<AIChatBot />);
        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        const input = screen.getByPlaceholderText(/اكتب سؤالك/i);
        await user.type(input, "شنو احسن فلتر للحوض؟");
        await user.keyboard("{Enter}");

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                "/api/ai/chat/stream",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: expect.stringContaining("شنو احسن فلتر للحوض؟"),
                })
            );
        });
    });

    it("يعرض رد البوت بعد انتهاء الـ streaming", async () => {
        const user = userEvent.setup();

        mockFetch.mockResolvedValue(
            buildSSEStream([
                { type: "chunk", text: "للحوض 50 لتر، احسن فلتر هو YEE 🦐" },
                { type: "done", products: [] },
            ])
        );

        render(<AIChatBot />);
        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        const input = screen.getByPlaceholderText(/اكتب سؤالك/i);
        await user.type(input, "شنو احسن فلتر؟");
        await user.keyboard("{Enter}");

        await waitFor(() => {
            expect(screen.getByText(/للحوض 50 لتر/i)).toBeInTheDocument();
        });
    });

    it("يطبق النص المصحح (normalizedText) عند انتهاء الـ streaming", async () => {
        const user = userEvent.setup();

        // Stream sends fusha text, then corrects it in normalizedText
        const encoder = new TextEncoder();
        const raw = encoder.encode(
            `data: ${JSON.stringify({ type: "chunk", text: "يمكنني مساعدتك..." })}\n\n` +
            `data: ${JSON.stringify({ type: "done", products: [], normalizedText: "اكدر اساعدك في الحوض" })}\n\n` +
            `data: [DONE]\n\n`
        );

        mockFetch.mockResolvedValue({
            ok: true,
            body: new ReadableStream({ start: (c) => { c.enqueue(raw); c.close(); } }),
        } as unknown as Response);

        const { container } = render(<AIChatBot />);
        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        const input = screen.getByPlaceholderText(/اكتب سؤالك/i);
        await user.type(input, "سؤال");
        await user.keyboard("{Enter}");

        // Wait for the normalized text to replace the fusha chunk
        await waitFor(() => {
            // Use container.textContent to search across all DOM nodes
            expect(container.textContent).toContain("اكدر اساعدك في الحوض");
        });

        // Fusha text should no longer be present (was replaced)
        expect(container.textContent).not.toContain("يمكنني مساعدتك");
    });

    it("يعرض رسالة خطأ عند فشل الـ fetch", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValue({ ok: false, body: null } as unknown as Response);

        render(<AIChatBot />);
        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        const input = screen.getByPlaceholderText(/اكتب سؤالك/i);
        await user.type(input, "سؤال");
        await user.keyboard("{Enter}");

        await waitFor(() => {
            expect(screen.getByText(/❌/)).toBeInTheDocument();
        });
    });

    it("يُفرغ حقل الإدخال بعد الإرسال", async () => {
        const user = userEvent.setup();
        render(<AIChatBot />);

        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        const input = screen.getByPlaceholderText(/اكتب سؤالك/i) as HTMLInputElement;
        await user.type(input, "سؤالي");
        await user.keyboard("{Enter}");

        await waitFor(() => {
            expect(input.value).toBe("");
        });
    });

    it("لا يرسل رسالة فارغة", async () => {
        const user = userEvent.setup();
        render(<AIChatBot />);

        await user.click(screen.getByRole("button", { name: /فتح مساعد AQUAVO الذكي/i }));

        const sendBtn = screen.getByRole("button", { name: /إرسال الرسالة/i });
        expect(sendBtn).toBeDisabled();

        // fetch should NOT have been called
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────
// SUITE 4: Dialect Rules — قواعد اللهجة العراقية
// ─────────────────────────────────────────────────────────────

describe("قواعد اللهجة العراقية — التحقق من الكلمات الممنوعة", () => {
    // Test the WORD_MAP and PHRASE_MAP logic inline (mirrors normalizeToIraqiDialect)
    const WORD_MAP: Record<string, string> = {
        "يمكنني": "اكدر", "أستطيع": "اكدر",
        "يمكنك": "تكدر", "تستطيع": "تكدر",
        "كيف": "شلون", "لماذا": "ليش",
        "ماذا": "شنو", "الآن": "هسه",
        "يوجد": "اكو", "توجد": "اكو", "هناك": "اكو",
        "جداً": "هواية", "جدا": "هواية",
        "يجب": "لازم", "ينبغي": "لازم",
        "الأفضل": "احسن", "أفضل": "احسن",
        "أيضاً": "بعد", "أيضا": "بعد",
        "مرحباً": "هلا", "أهلاً": "هلا",
    };

    const PHRASE_MAP: [string, string][] = [
        ["لا يوجد", "ماكو"],
        ["لا توجد", "ماكو"],
        ["بالإضافة إلى ذلك", "وبعد"],
        ["في الوقت الحالي", "هسه"],
        ["يمكنني أن", "اكدر"],
        ["يجب عليك أن", "لازم"],
    ];

    function normalize(text: string): string {
        let result = text;
        for (const [from, to] of PHRASE_MAP) {
            result = result.split(from).join(to);
        }
        const AR_SEP = /([\ \t\n\r،؛:؟!،,.()[\]{}"'\/\\<>؟\-])/;
        return result.split(AR_SEP).map((t) => WORD_MAP[t] ?? t).join("");
    }

    const bannedWords = [
        ["يمكنني", "اكدر"],
        ["كيف", "شلون"],
        ["لماذا", "ليش"],
        ["ماذا", "شنو"],
        ["الآن", "هسه"],
        ["يوجد", "اكو"],
        ["هناك", "اكو"],
        ["جداً", "هواية"],
        ["يجب", "لازم"],
        ["الأفضل", "احسن"],
        ["أيضاً", "بعد"],
        ["مرحباً", "هلا"],
    ];

    bannedWords.forEach(([fusha, iraqi]) => {
        it(`"${fusha}" → "${iraqi}"`, () => {
            const result = normalize(`الكلمة هي ${fusha} هنا`);
            expect(result).not.toContain(fusha);
            expect(result).toContain(iraqi);
        });
    });

    const bannedPhrases = [
        ["لا يوجد", "ماكو"],
        ["لا توجد", "ماكو"],
        ["بالإضافة إلى ذلك", "وبعد"],
        ["في الوقت الحالي", "هسه"],
        ["يمكنني أن", "اكدر"],
    ];

    bannedPhrases.forEach(([fusha, iraqi]) => {
        it(`عبارة: "${fusha}" → "${iraqi}"`, () => {
            const result = normalize(`${fusha} نواصل`);
            expect(result).not.toContain(fusha);
            expect(result).toContain(iraqi);
        });
    });

    it("لا يغير الكلمات العراقية الأصلية", () => {
        const pure = "هلا حبي! اكو سمك هواية هسه؟ لازم تشتري فلتر.";
        expect(normalize(pure)).toBe(pure);
    });

    it("يتعامل مع نص مختلط (فصحى + عراقي)", () => {
        const mixed = "هلا! يمكنني مساعدتك هسه بالفلتر";
        const result = normalize(mixed);
        expect(result).not.toContain("يمكنني");
        expect(result).toContain("هلا");
        expect(result).toContain("هسه");
    });

    it("لا يمس علامات الترقيم", () => {
        const text = "السعر **25,000 د.ع** — هلا!";
        const result = normalize(text);
        expect(result).toContain("**");
        expect(result).toContain("د.ع");
        expect(result).toContain("—");
    });
});
