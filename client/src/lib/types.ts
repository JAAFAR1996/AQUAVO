
export interface Address {
    id: string;
    label: string;
    address: string;
    phone?: string;
    isDefault?: boolean;
}

export interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
}

export interface Order {
    id: string;
    createdAt: string; // or Date
    total: string | number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    paymentStatus?: string;
    paymentMethod?: string;
    paymentRecordStatus?: string | null;
    items: OrderItem[];
}

export interface Coupon {
    id: string;
    code: string;
    description: string;
    type: 'percentage' | 'fixed';
    value: number;
    usedCount: number;
}

export interface UserProfileExtra {
    phone: string;
    memberSince: string;
    avatar: string;
    addresses: Address[];
    birthDate?: string;
}
