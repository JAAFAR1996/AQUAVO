/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { BreedingSpecies } from "@/data/breeding-data";

// Register fonts with better error handling
let fontLoaded = false;
try {
    // Register Noto Sans Arabic from a more reliable CDN
    Font.register({
        family: "Arabic",
        fonts: [
            {
                src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-arabic@5.0.13/files/noto-sans-arabic-arabic-400-normal.woff",
                fontWeight: 400,
            },
            {
                src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-arabic@5.0.13/files/noto-sans-arabic-arabic-700-normal.woff",
                fontWeight: 700,
            },
        ],
    });
    fontLoaded = true;
    console.log("Arabic font loaded successfully for PDF");
} catch (error) {
    console.warn("Failed to register Arabic font for PDF, falling back to Helvetica", error);
}

// Fallback font in case Arabic fails
Font.registerHyphenationCallback((word) => [word]);


const styles = StyleSheet.create({
    page: {
        fontFamily: "Arabic",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        padding: 30,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: "#10b981",
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#064e3b",
    },
    logo: {
        width: 40,
        height: 40,
    },
    section: {
        margin: 10,
        padding: 10,
        flexGrow: 1,
    },
    speciesCard: {
        backgroundColor: "#f0fdf4",
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    speciesTitle: {
        fontSize: 20,
        marginBottom: 5,
        color: "#065f46",
        textAlign: "right",
    },
    speciesSubTitle: {
        fontSize: 14,
        color: "#6b7280",
        textAlign: "right",
        marginBottom: 10,
    },
    row: {
        flexDirection: "row-reverse", // Right to leftish
        marginBottom: 5,
        justifyContent: "flex-start",
    },
    label: {
        fontSize: 12,
        color: "#4b5563",
        width: 100,
        textAlign: "right",
        marginLeft: 10,
    },
    value: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#111827",
        textAlign: "right",
    },
    timelineContainer: {
        marginTop: 20,
    },
    timelineHeader: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#059669",
        textAlign: "right",
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    timelineItem: {
        flexDirection: "row-reverse",
        marginBottom: 10,
        padding: 8,
        backgroundColor: "#f9fafb",
        borderRadius: 4,
    },
    timelineDate: {
        width: 80,
        fontSize: 10,
        color: "#6b7280",
        textAlign: "center",
        borderLeftWidth: 1,
        borderLeftColor: "#d1d5db",
        marginLeft: 10,
    },
    timelineContent: {
        flex: 1,
    },
    timelineTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#1f2937",
        textAlign: "right",
    },
    timelineDesc: {
        fontSize: 10,
        color: "#4b5563",
        textAlign: "right",
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: "center",
        color: "#9ca3af",
        fontSize: 10,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingTop: 10,
    },
});

interface BreedingPlanPDFProps {
    species: BreedingSpecies;
    timeline: any[]; // Using existing timeline structure
    inputData: {
        pairs: number;
        startDate: string;
        temp: number;
        ph: number;
    };
}

export const BreedingPlanPDF = ({ species, timeline, inputData }: BreedingPlanPDFProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>خطة التكاثر - AQUAVO</Text>
            </View>

            {/* Species Info */}
            <View style={styles.speciesCard}>
                <Text style={styles.speciesTitle}>{species.arabicName}</Text>
                <Text style={styles.speciesSubTitle}>{species.name}</Text>

                <View style={styles.row}>
                    <Text style={styles.value}>{species.minTankSize} لتر</Text>
                    <Text style={styles.label}>:أقل حجم حوض</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.value}>{species.optimalTemp.min} - {species.optimalTemp.max} °C</Text>
                    <Text style={styles.label}>:الحرارة المثالية</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.value}>{species.optimalPH.min} - {species.optimalPH.max}</Text>
                    <Text style={styles.label}>:الرقم الهيدروجيني</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.value}>
                        {species.difficulty === "easy" ? "سهل" :
                            species.difficulty === "moderate" ? "متوسط" : "صعب"}
                    </Text>
                    <Text style={styles.label}>:الصعوبة</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.value}>{species.avgFryCount.min} - {species.avgFryCount.max}</Text>
                    <Text style={styles.label}>:صغار لكل دورة</Text>
                </View>
            </View>

            {/* User Inputs */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, marginBottom: 5, textAlign: "right", color: "#374151" }}>:مدخلاتك</Text>
                <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
                    <View style={{ backgroundColor: "#eff6ff", padding: 8, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: "#1e40af", textAlign: "center" }}>تاريخ البدء</Text>
                        <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center" }}>{inputData.startDate}</Text>
                    </View>
                    <View style={{ backgroundColor: "#eff6ff", padding: 8, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: "#1e40af", textAlign: "center" }}>عدد الأزواج</Text>
                        <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center" }}>{inputData.pairs}</Text>
                    </View>
                    <View style={{ backgroundColor: "#eff6ff", padding: 8, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: "#1e40af", textAlign: "center" }}>الحرارة الحالية</Text>
                        <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center" }}>{inputData.temp}°C</Text>
                    </View>
                    <View style={{ backgroundColor: "#eff6ff", padding: 8, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: "#1e40af", textAlign: "center" }}>pH الحالي</Text>
                        <Text style={{ fontSize: 12, fontWeight: "bold", textAlign: "center" }}>{inputData.ph}</Text>
                    </View>
                </View>
            </View>

            {/* Timeline */}
            <View style={styles.timelineContainer}>
                <Text style={styles.timelineHeader}>الجدول الزمني المتوقع</Text>
                {timeline.map((event, index) => (
                    <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineDate}>
                            <Text>{new Date(event.date).toLocaleDateString('en-GB')}</Text>
                        </View>
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineTitle}>{event.eventAr}</Text>
                            <Text style={styles.timelineDesc}>{event.description}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>تم الإنشاء بواسطة AQUAVO - {new Date().toLocaleDateString()}</Text>
                <Text>نتمنى لك تكاثراً ناجحاً!</Text>
            </View>
        </Page>
    </Document>
);
