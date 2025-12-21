import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useCart } from "@/contexts/cart-context";
import { useLocation } from "wouter";

type ShrimpStage = "larva" | "teen" | "boss" | "whale" | "cleaner" | "glitch";

interface ShrimpContextType {
    stage: ShrimpStage;
    isGoldenActive: boolean;
    goldenCaught: boolean;
    catchGoldenShrimp: () => void;
}

const ShrimpContext = createContext<ShrimpContextType | undefined>(undefined);

// Constants for cart value thresholds
const VIP_CART_THRESHOLD = 100000; // IQD - VIP status threshold

export function ShrimpProvider({ children }: { children: ReactNode }) {
    const { items } = useCart();
    const [stage, setStage] = useState<ShrimpStage>("larva");
    const [isGoldenActive, setIsGoldenActive] = useState(false);
    const [goldenCaught, setGoldenCaught] = useState(false);
    const [location] = useLocation();

    // Evolution Logic based on Cart Items
    useEffect(() => {
        const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
        const cartValue = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        if (totalItems === 0) {
            setStage("larva");
        } else if (totalItems <= 2) {
            setStage("teen");
        } else if (cartValue > VIP_CART_THRESHOLD) {
            setStage("whale");
        } else {
            setStage("boss");
        }
    }, [items, location]);

    // Golden Shrimp Logic (Run once on mount)
    useEffect(() => {
        const checkGoldenSpawn = () => {
            // Check if already caught today
            const lastCaught = localStorage.getItem("aquavo-golden-date");
            const today = new Date().toDateString();

            if (lastCaught === today) {
                setGoldenCaught(true);
                return;
            }

            // 1% Chance
            const random = Math.random();
            // For testing, you might want to increase this, but spec says 1%
            // const GOLDEN_PROBABILITY = 0.01; 
            const GOLDEN_PROBABILITY = 0.01;

            if (random < GOLDEN_PROBABILITY) {
                setIsGoldenActive(true);
            }
        };

        checkGoldenSpawn();
    }, []);

    const catchGoldenShrimp = () => {
        setIsGoldenActive(false);
        setGoldenCaught(true);
        localStorage.setItem("aquavo-golden-date", new Date().toDateString());
        localStorage.setItem("aquavo-golden-caught", "true");

        // You could trigger a toast here or in the component
    };

    return (
        <ShrimpContext.Provider
            value={{
                stage,
                isGoldenActive,
                goldenCaught,
                catchGoldenShrimp,
            }}
        >
            {children}
        </ShrimpContext.Provider>
    );
}

export function useShrimp() {
    const context = useContext(ShrimpContext);
    if (context === undefined) {
        throw new Error("useShrimp must be used within a ShrimpProvider");
    }
    return context;
}
