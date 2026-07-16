import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, MapPin, AlertCircle, Search, ChevronDown } from "lucide-react";
import { CustomerInfo, GOVERNORATES } from "./types";
import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CustomerInfoFormProps {
    customerInfo: CustomerInfo;
    setCustomerInfo: (info: CustomerInfo) => void;
    errors: Record<string, string>;
    isGuest: boolean;
}

export function CustomerInfoForm({ customerInfo, setCustomerInfo, errors, isGuest }: CustomerInfoFormProps) {
    const [govOpen, setGovOpen] = useState(false);
    const [govSearch, setGovSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const filteredGovs = GOVERNORATES.filter(gov =>
        gov.label.includes(govSearch) || gov.value.toLowerCase().includes(govSearch.toLowerCase())
    );

    const selectedLabel = GOVERNORATES.find(g => g.value === customerInfo.governorate)?.label;

    const selectGov = (value: string) => {
        setCustomerInfo({ ...customerInfo, governorate: value });
        setGovOpen(false);
        setGovSearch("");
        triggerRef.current?.focus();
    };

    const closeGov = () => {
        setGovOpen(false);
        setGovSearch("");
        triggerRef.current?.focus();
    };

    // Keyboard navigation for the searchable listbox
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, filteredGovs.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const gov = filteredGovs[activeIndex];
            if (gov) selectGov(gov.value);
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeGov();
        }
    };

    // Reset the highlighted option whenever the list or open-state changes
    useEffect(() => { setActiveIndex(0); }, [govSearch, govOpen]);

    // Close on outside click
    useEffect(() => {
        if (!govOpen) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setGovOpen(false);
                setGovSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [govOpen]);

    return (
        <div className="space-y-4 mt-4">
            {/* Guest Checkout Note - Only show if not logged in */}
            {isGuest && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <p>
                        <Link href="/login">
                            <span className="text-primary font-semibold hover:underline cursor-pointer">سجل دخولك</span>
                        </Link>
                        {" "}إذا عندك حساب، أو كمل معلومات التوصيل كضيف.
                    </p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    الاسم الكامل
                </Label>
                <Input
                    id="name"
                    data-clarity-mask="True"
                    placeholder="أدخل اسمك الكامل"
                    autoComplete="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className={errors.name ? 'border-red-500' : ''}
                    aria-invalid={!!errors.name}
                    aria-required="true"
                    aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                    <p id="name-error" role="alert" className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    رقم الهاتف
                </Label>
                <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    data-clarity-mask="True"
                    placeholder="07801234567"
                    autoComplete="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className={errors.phone ? 'border-red-500' : ''}
                    dir="ltr"
                    aria-invalid={!!errors.phone}
                    aria-required="true"
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                    <p id="phone-error" role="alert" className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.phone}
                    </p>
                )}
            </div>

            {/* Governorate — Custom inline searchable dropdown (works inside Radix Dialog) */}
            <div className="space-y-2">
                <Label htmlFor="governorate" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    المحافظة
                </Label>
                <div className="relative" ref={dropdownRef}>
                    {/* Trigger button */}
                    <button
                        type="button"
                        id="governorate"
                        ref={triggerRef}
                        role="combobox"
                        aria-expanded={govOpen}
                        aria-haspopup="listbox"
                        aria-controls="governorate-listbox"
                        aria-invalid={!!errors.governorate}
                        aria-required="true"
                        aria-describedby={errors.governorate ? "governorate-error" : undefined}
                        onClick={() => { setGovOpen(prev => !prev); setGovSearch(""); }}
                        onKeyDown={(e) => {
                            if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !govOpen) {
                                e.preventDefault();
                                setGovOpen(true);
                                setGovSearch("");
                            }
                        }}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm text-right",
                            "bg-background hover:bg-accent/30 transition-colors cursor-pointer",
                            errors.governorate ? "border-red-500" : "border-input",
                            !customerInfo.governorate && "text-muted-foreground"
                        )}
                    >
                        <span>{selectedLabel || "اختر المحافظة"}</span>
                        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", govOpen && "rotate-180")} />
                    </button>

                    {/* Inline dropdown — no Portal, stays inside Dialog DOM */}
                    {govOpen && (
                        <div className="absolute z-[9999] w-full mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                            {/* Search input */}
                            <div className="flex items-center border-b border-border px-2">
                                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                <input
                                    autoFocus
                                    data-clarity-mask="True"
                                    role="combobox"
                                    aria-expanded={govOpen}
                                    aria-controls="governorate-listbox"
                                    aria-autocomplete="list"
                                    aria-activedescendant={filteredGovs[activeIndex] ? `gov-opt-${filteredGovs[activeIndex].value}` : undefined}
                                    aria-label="ابحث عن المحافظة"
                                    placeholder="ابحث... (مثال: بغ)"
                                    value={govSearch}
                                    onChange={(e) => setGovSearch(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="flex-1 px-2 py-2 text-sm bg-transparent outline-none text-right"
                                    dir="rtl"
                                />
                            </div>
                            {/* Options list */}
                            <ul id="governorate-listbox" role="listbox" aria-label="المحافظة" className="max-h-[200px] overflow-y-auto py-1">
                                {filteredGovs.length === 0 ? (
                                    <li className="px-3 py-2 text-sm text-muted-foreground text-center">لا توجد نتائج</li>
                                ) : filteredGovs.map((gov, idx) => (
                                    <li
                                        key={gov.value}
                                        id={`gov-opt-${gov.value}`}
                                        role="option"
                                        aria-selected={customerInfo.governorate === gov.value}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            selectGov(gov.value);
                                        }}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={cn(
                                            "px-3 py-2 text-sm cursor-pointer text-right hover:bg-accent hover:text-accent-foreground transition-colors",
                                            idx === activeIndex && "bg-accent text-accent-foreground",
                                            customerInfo.governorate === gov.value && "bg-primary/10 text-primary font-medium"
                                        )}
                                    >
                                        {gov.label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                {errors.governorate && (
                    <p id="governorate-error" role="alert" className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.governorate}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    العنوان
                </Label>
                <Input
                    id="address"
                    data-clarity-mask="True"
                    placeholder="المنطقة، الشارع، أقرب نقطة دالة..."
                    autoComplete="street-address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className={errors.address ? 'border-red-500' : ''}
                    aria-invalid={!!errors.address}
                    aria-required="true"
                    aria-describedby={errors.address ? "address-error" : undefined}
                />
                {errors.address && (
                    <p id="address-error" role="alert" className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.address}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                <Input
                    id="notes"
                    data-clarity-mask="True"
                    placeholder="أي ملاحظات للتوصيل..."
                    autoComplete="off"
                    value={customerInfo.notes}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                />
            </div>
        </div>
    );
}
