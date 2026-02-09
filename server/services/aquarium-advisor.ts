import { groqClient } from "./groq-client.js";
import { db } from "../db.js";
import {
    aquariumDesigns,
    products,
    type InsertAquariumDesign,
} from "../../shared/schema.js";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Aquarium Advisor Service
 * مساعد افتراضي لتصميم أحواض الأسماك
 */
export class AquariumAdvisor {

    /**
     * إنشاء تصميم حوض جديد
     */
    async createDesign(params: {
        userId: string;
        name: string;
        tankSize: number; // liters
        tankType: "freshwater" | "saltwater" | "brackish";
        budget?: number;
        experience?: "beginner" | "intermediate" | "expert";
        preferences?: {
            theme?: string;
            fishTypes?: string[];
            plantTypes?: string[];
        };
    }): Promise<{
        designId: string;
        recommendations: {
            fish: Array<{ name: string; quantity: number; reason: string }>;
            plants: Array<{ name: string; reason: string }>;
            equipment: Array<{ name: string; reason: string }>;
            decorations: Array<{ name: string; reason: string }>;
        };
        tips: string[];
        estimatedCost: number;
    }> {
        try {
            if (!groqClient.hasKeys()) {
                throw new Error("No Groq API keys configured");
            }

            const prompt = `
أنت خبير أحواض أسماك وتساعد في تصميم حوض مثالي.

معلومات الحوض:
- الحجم: ${params.tankSize} لتر
- النوع: ${params.tankType === "freshwater" ? "مياه عذبة" : params.tankType === "saltwater" ? "مياه مالحة" : "مياه شبه مالحة"}
- الميزانية: ${params.budget ? params.budget + " دينار" : "غير محددة"}
- مستوى الخبرة: ${params.experience || "مبتدئ"}
- التفضيلات: ${JSON.stringify(params.preferences || {})}

قدم توصيات شاملة تشمل:
1. أنواع الأسماك المناسبة (مع الكمية المقترحة)
2. النباتات المناسبة
3. المعدات المطلوبة
4. الديكورات
5. نصائح للعناية

أجب بصيغة JSON فقط:
{
  "fish": [{"name": "...", "quantity": 0, "reason": "..."}],
  "plants": [{"name": "...", "reason": "..."}],
  "equipment": [{"name": "...", "reason": "..."}],
  "decorations": [{"name": "...", "reason": "..."}],
  "tips": ["..."],
  "estimatedCost": 0
}
`;

            const text = await groqClient.chatText([{ role: "user", content: prompt }], {
                temperature: 0.4,
                maxTokens: 1024,
                model: "llama-3.1-8b-instant"
            });

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Failed to parse AI response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Save design
            const [design] = await db
                .insert(aquariumDesigns)
                .values({
                    userId: params.userId,
                    name: params.name,
                    tankSize: params.tankSize.toString(),
                    tankType: params.tankType,
                    // Use 'any' cast because AI returns simple objects {name, quantity} 
                    // while schema expects {id, quantity} which we don't have yet.
                    selectedFish: parsed.fish as any,
                    // Schema has selectedDecor but parsed has decorations
                    selectedDecor: parsed.decorations as any,
                    selectedEquipment: parsed.equipment as any,
                    budget: params.budget?.toString(),
                    estimatedCost: parsed.estimatedCost?.toString(),
                    // Store tips in aiWarnings as it is a string[] column
                    aiWarnings: parsed.tips,
                    // store plants in aiNotes as JSON string since we don't have a column
                    aiNotes: JSON.stringify({ plants: parsed.plants, generatedAt: new Date().toISOString() }),
                    status: "draft",
                    createdAt: new Date(),
                } as any)
                .returning({ id: aquariumDesigns.id });

            return {
                designId: design.id,
                recommendations: {
                    fish: parsed.fish,
                    plants: parsed.plants,
                    equipment: parsed.equipment,
                    decorations: parsed.decorations,
                },
                tips: parsed.tips,
                estimatedCost: parsed.estimatedCost,
            };
        } catch (error) {
            console.error("Error creating design:", error);
            throw error;
        }
    }

    /**
     * فحص توافق الأسماك
     */
    async checkFishCompatibility(
        fish1: string,
        fish2: string
    ): Promise<{
        compatible: boolean;
        score: number; // 0-100
        reason: string;
        warnings: string[];
        tips: string[];
    }> {
        try {
            if (!groqClient.hasKeys()) {
                return {
                    compatible: true,
                    score: 50,
                    reason: "Service unavailable",
                    warnings: [],
                    tips: []
                };
            }

            const prompt = `
أنت خبير في توافق الأسماك.

السمكة الأولى: ${fish1}
السمكة الثانية: ${fish2}

حدد مدى توافقهما للعيش معاً في نفس الحوض.

أجب بصيغة JSON فقط:
{
  "compatible": true/false,
  "score": 0-100,
  "reason": "شرح مختصر",
  "warnings": ["تحذيرات إن وجدت"],
  "tips": ["نصائح للتعايش"]
}
`;

            const text = await groqClient.chatText([{ role: "user", content: prompt }], {
                temperature: 0.2,
                maxTokens: 512,
                model: "llama-3.1-8b-instant"
            });

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Failed to parse AI response");
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error("Error checking compatibility:", error);
            throw error;
        }
    }

    /**
     * توليد قائمة تسوق من التصميم
     */
    async generateShoppingList(designId: string): Promise<{
        items: Array<{
            category: string;
            name: string;
            productId?: string;
            price?: number;
            available: boolean;
        }>;
        totalEstimate: number;
        unavailableItems: string[];
    }> {
        try {
            if (!db) throw new Error("Database not initialized");

            // Get design
            const design = await db
                .select()
                .from(aquariumDesigns)
                .where(eq(aquariumDesigns.id, designId))
                .limit(1);

            if (design.length === 0) {
                throw new Error("Design not found");
            }

            const d = design[0];
            const items: Array<{
                category: string;
                name: string;
                productId?: string;
                price?: number;
                available: boolean;
            }> = [];
            const unavailableItems: string[] = [];
            let totalEstimate = 0;

            // Process fish - cast to any because we stored custom object
            const fish = (d.selectedFish as any) as Array<{ name: string; quantity: number }> || [];
            for (const f of fish) {
                const product = await this.findMatchingProduct(f.name, "fish");
                if (product) {
                    items.push({
                        category: "أسماك",
                        name: f.name,
                        productId: product.id,
                        price: parseFloat(product.price) * (f.quantity || 1),
                        available: true,
                    });
                    totalEstimate += parseFloat(product.price) * (f.quantity || 1);
                } else {
                    items.push({
                        category: "أسماك",
                        name: f.name,
                        available: false,
                    });
                    unavailableItems.push(f.name);
                }
            }

            // Process plants - extract from aiNotes
            let plants: Array<{ name: string }> = [];
            try {
                if (d.aiNotes) {
                    const notes = JSON.parse(d.aiNotes);
                    if (notes && notes.plants) {
                        plants = notes.plants;
                    }
                }
            } catch (e) {
                // ignore parse error
            }

            for (const p of plants) {
                const product = await this.findMatchingProduct(p.name, "plants");
                if (product) {
                    items.push({
                        category: "نباتات",
                        name: p.name,
                        productId: product.id,
                        price: parseFloat(product.price),
                        available: true,
                    });
                    totalEstimate += parseFloat(product.price);
                } else {
                    items.push({
                        category: "نباتات",
                        name: p.name,
                        available: false,
                    });
                    unavailableItems.push(p.name);
                }
            }

            // Process equipment
            const equipment = (d.selectedEquipment as any) as Array<{ name: string }> || [];
            for (const e of equipment) {
                const product = await this.findMatchingProduct(e.name, "equipment");
                if (product) {
                    items.push({
                        category: "معدات",
                        name: e.name,
                        productId: product.id,
                        price: parseFloat(product.price),
                        available: true,
                    });
                    totalEstimate += parseFloat(product.price);
                } else {
                    items.push({
                        category: "معدات",
                        name: e.name,
                        available: false,
                    });
                    unavailableItems.push(e.name);
                }
            }

            return {
                items,
                totalEstimate,
                unavailableItems,
            };
        } catch (error) {
            console.error("Error generating shopping list:", error);
            throw error;
        }
    }

    /**
     * البحث عن منتج مطابق
     */
    private async findMatchingProduct(
        itemName: string,
        _category: string
    ): Promise<{ id: string; price: string } | null> {
        try {
            if (!db) return null;

            // Simple text search
            const matchingProducts = await db
                .select({
                    id: products.id,
                    price: products.price,
                })
                .from(products)
                .where(
                    sql`LOWER(${products.name}) LIKE LOWER(${"%" + itemName + "%"})`
                )
                .limit(1);

            return matchingProducts[0] || null;
        } catch (error) {
            console.error("Error finding matching product:", error);
            return null;
        }
    }

    /**
     * الحصول على تصاميم المستخدم
     */
    async getUserDesigns(userId: string): Promise<
        Array<{
            id: string;
            name: string;
            tankSize: string;
            tankType: string | null;
            status: string | null;
            createdAt: Date;
        }>
    > {
        try {
            if (!db) throw new Error("Database not initialized");

            return await db
                .select({
                    id: aquariumDesigns.id,
                    name: aquariumDesigns.name,
                    tankSize: aquariumDesigns.tankSize,
                    tankType: aquariumDesigns.tankType,
                    status: aquariumDesigns.status,
                    createdAt: aquariumDesigns.createdAt
                })
                .from(aquariumDesigns)
                .where(eq(aquariumDesigns.userId, userId))
                .orderBy(desc(aquariumDesigns.createdAt));
        } catch (error) {
            console.error("Error getting user designs:", error);
            throw error;
        }
    }

    /**
     * الحصول على تصميم بالـ ID
     */
    async getDesign(designId: string): Promise<{
        id: string;
        name: string;
        tankSize: string;
        tankType: string | null;
        fish: unknown;
        plants: unknown;
        equipment: unknown;
        decorations: unknown;
        estimatedCost: string | null;
        aiSuggestions: unknown;
        status: string | null;
    } | null> {
        try {
            if (!db) throw new Error("Database not initialized");

            const designs = await db
                .select()
                .from(aquariumDesigns)
                .where(eq(aquariumDesigns.id, designId))
                .limit(1);

            const d = designs[0];
            if (!d) return null;

            let plants = null;
            try {
                if (d.aiNotes) {
                    const notes = JSON.parse(d.aiNotes);
                    if (notes) plants = notes.plants;
                }
            } catch (e) { }

            return {
                id: d.id,
                name: d.name,
                tankSize: d.tankSize,
                tankType: d.tankType,
                fish: d.selectedFish,
                plants: plants,
                equipment: d.selectedEquipment,
                decorations: d.selectedDecor,
                estimatedCost: d.estimatedCost,
                aiSuggestions: {
                    tips: d.aiWarnings, // We stored tips in aiWarnings
                    plants: plants
                },
                status: d.status,
            };
        } catch (error) {
            console.error("Error getting design:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const aquariumAdvisor = new AquariumAdvisor();
