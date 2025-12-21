import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

const COMPARISON_KEY = "aquavo_comparison";
const MAX_COMPARE = 4;

interface ComparisonContextType {
    compareIds: string[];
    addToCompare: (productId: string) => void;
    removeFromCompare: (productId: string) => void;
    clearCompare: () => void;
    isInCompare: (productId: string) => boolean;
    canAdd: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | null>(null);

export function ComparisonProvider({ children }: { children: ReactNode }) {
    const [compareIds, setCompareIds] = useState<string[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const stored = localStorage.getItem(COMPARISON_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Sync with localStorage changes from other tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === COMPARISON_KEY) {
                setCompareIds(e.newValue ? JSON.parse(e.newValue) : []);
            }
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const addToCompare = useCallback((productId: string) => {
        setCompareIds((prev) => {
            if (prev.includes(productId)) return prev;
            if (prev.length >= MAX_COMPARE) return prev;
            const updated = [...prev, productId];
            localStorage.setItem(COMPARISON_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const removeFromCompare = useCallback((productId: string) => {
        setCompareIds((prev) => {
            const updated = prev.filter((id) => id !== productId);
            localStorage.setItem(COMPARISON_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearCompare = useCallback(() => {
        localStorage.removeItem(COMPARISON_KEY);
        setCompareIds([]);
    }, []);

    const isInCompare = useCallback((productId: string) => compareIds.includes(productId), [compareIds]);

    return (
        <ComparisonContext.Provider
            value={{
                compareIds,
                addToCompare,
                removeFromCompare,
                clearCompare,
                isInCompare,
                canAdd: compareIds.length < MAX_COMPARE,
            }}
        >
            {children}
        </ComparisonContext.Provider>
    );
}

export function useComparison() {
    const context = useContext(ComparisonContext);
    if (!context) {
        throw new Error("useComparison must be used within ComparisonProvider");
    }
    return context;
}
