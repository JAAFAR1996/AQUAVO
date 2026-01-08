/**
 * Early Access Leads Management - إدارة قائمة الحجز المبكر
 * 
 * Admin component to view and manage early access leads
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Phone,
    Calendar,
    Users,
    CheckCircle2,
    Clock,
    RefreshCw,
    Search,
    Download,
    MessageCircle,
    Ticket,
    Copy,
    Check,
    Trash2,
    AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface EarlyAccessLead {
    id: string;
    phone: string;
    name?: string;
    source: string;
    status: string;
    notes?: string;
    ipAddress?: string;
    createdAt: string;
    contactedAt?: string;
    convertedAt?: string;
}

export function EarlyAccessManagement() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/early-access/leads/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to delete lead");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/early-access/leads"] });
            toast({
                title: "تم الحذف",
                description: "تم حذف السجل وإلغاء كود الخصم",
            });
            setDeletingId(null);
        },
        onError: () => {
            toast({
                title: "خطأ",
                description: "فشل حذف السجل",
                variant: "destructive",
            });
            setDeletingId(null);
        },
    });

    const handleDelete = (id: string, phone: string) => {
        if (confirm(`هل أنت متأكد من حذف الرقم ${phone}?\nسيتم إلغاء كود الخصم المرتبط به.`)) {
            setDeletingId(id);
            deleteMutation.mutate(id);
        }
    };

    // Fetch leads
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["/api/early-access/leads"],
        queryFn: async () => {
            const response = await fetch("/api/early-access/leads", {
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to fetch leads");
            return response.json();
        },
    });

    const leads: EarlyAccessLead[] = data?.leads || [];

    // Filter leads
    const filteredLeads = leads.filter((lead) => {
        const matchesSearch =
            lead.phone.includes(searchQuery) ||
            lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.notes?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Get coupon code from notes
    const getCouponFromNotes = (notes?: string): string | null => {
        if (!notes) return null;
        const match = notes.match(/Coupon:\s*(\S+)/);
        return match ? match[1] : null;
    };

    // Copy to clipboard
    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({
            title: "تم النسخ",
            description: "تم نسخ الكود إلى الحافظة",
        });
    };

    // Format WhatsApp link
    const getWhatsAppLink = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, "");
        // Add Iraq country code if not present
        const fullPhone = cleanPhone.startsWith("964")
            ? cleanPhone
            : `964${cleanPhone.replace(/^0/, "")}`;
        return `https://wa.me/${fullPhone}`;
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ["الهاتف", "الاسم", "الحالة", "كود الخصم", "تاريخ التسجيل"];
        const rows = filteredLeads.map((lead) => [
            lead.phone,
            lead.name || "-",
            lead.status,
            getCouponFromNotes(lead.notes) || "-",
            format(new Date(lead.createdAt), "yyyy-MM-dd HH:mm"),
        ]);

        const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `early-access-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
        link.click();
    };

    // Stats
    const stats = {
        total: leads.length,
        pending: leads.filter((l) => l.status === "pending").length,
        contacted: leads.filter((l) => l.status === "contacted").length,
        converted: leads.filter((l) => l.status === "converted").length,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <Clock className="w-3 h-3 mr-1" />
                        بانتظار التواصل
                    </Badge>
                );
            case "contacted":
                return (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        تم التواصل
                    </Badge>
                );
            case "converted":
                return (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        تم التحويل
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (error) {
        return (
            <Card className="border-red-500/20">
                <CardContent className="pt-6">
                    <div className="text-center text-red-400">
                        <p>حدث خطأ في تحميل البيانات</p>
                        <Button onClick={() => refetch()} variant="outline" className="mt-4">
                            إعادة المحاولة
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-cyan-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">إجمالي المسجلين</p>
                                <p className="text-3xl font-bold text-cyan-400">{stats.total}</p>
                            </div>
                            <Users className="w-10 h-10 text-cyan-400/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">بانتظار التواصل</p>
                                <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
                            </div>
                            <Clock className="w-10 h-10 text-yellow-400/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">تم التواصل</p>
                                <p className="text-3xl font-bold text-blue-400">{stats.contacted}</p>
                            </div>
                            <MessageCircle className="w-10 h-10 text-blue-400/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">تم التحويل</p>
                                <p className="text-3xl font-bold text-green-400">{stats.converted}</p>
                            </div>
                            <CheckCircle2 className="w-10 h-10 text-green-400/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Card */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-primary" />
                                قائمة الحجز المبكر
                            </CardTitle>
                            <CardDescription>
                                {filteredLeads.length} عميل محتمل
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                                تحديث
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToCSV}
                                disabled={filteredLeads.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                تصدير CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="بحث برقم الهاتف أو الاسم..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pr-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الحالات</SelectItem>
                                <SelectItem value="pending">بانتظار التواصل</SelectItem>
                                <SelectItem value="contacted">تم التواصل</SelectItem>
                                <SelectItem value="converted">تم التحويل</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>لا يوجد عملاء مسجلين بعد</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">#</TableHead>
                                        <TableHead className="text-right">الهاتف</TableHead>
                                        <TableHead className="text-right">كود الخصم</TableHead>
                                        <TableHead className="text-right">الحالة</TableHead>
                                        <TableHead className="text-right">تاريخ التسجيل</TableHead>
                                        <TableHead className="text-right">الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.map((lead, index) => {
                                        const couponCode = getCouponFromNotes(lead.notes);
                                        return (
                                            <TableRow key={lead.id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                                        <span className="font-mono" dir="ltr">{lead.phone}</span>
                                                    </div>
                                                    {lead.name && (
                                                        <p className="text-xs text-muted-foreground mt-1">{lead.name}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {couponCode ? (
                                                        <div className="flex items-center gap-2">
                                                            <code className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-sm font-mono">
                                                                {couponCode}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => copyToClipboard(couponCode, lead.id)}
                                                            >
                                                                {copiedId === lead.id ? (
                                                                    <Check className="w-3 h-3 text-green-400" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(lead.status)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        {format(new Date(lead.createdAt), "d MMM yyyy", { locale: ar })}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {format(new Date(lead.createdAt), "HH:mm")}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                            className="gap-2"
                                                        >
                                                            <a
                                                                href={getWhatsAppLink(lead.phone)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <MessageCircle className="w-4 h-4 text-green-500" />
                                                                واتساب
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-2 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                                            onClick={() => handleDelete(lead.id, lead.phone)}
                                                            disabled={deletingId === lead.id}
                                                        >
                                                            {deletingId === lead.id ? (
                                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                            حذف
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default EarlyAccessManagement;
