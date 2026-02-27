import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Redirect /aquarium-wizard → /journey
 * The journey page now includes all wizard functionality.
 */
export default function AquariumWizard() {
    const [, setLocation] = useLocation();

    useEffect(() => {
        setLocation("/journey");
    }, [setLocation]);

    return null;
}
