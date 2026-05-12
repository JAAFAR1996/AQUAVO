import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User } from "@shared/schema";
import { Loader2, User as UserIcon, Mail, Phone, Calendar, Search, ChevronLeft, ChevronRight, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function CustomersManagement() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const limit = 20;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset page on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: result, isLoading } = useQuery<{ users: User[], total: number } | User[]>({
        queryKey: ["/api/admin/users", page, limit, debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (debouncedSearch) params.append("search", debouncedSearch);

            const res = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch users");
            return res.json();
        }
    });

    const { data: stats } = useQuery<{ total: number, admins: number, customers: number }>({
        queryKey: ["/api/admin/users/stats"],
        queryFn: async () => {
            const res = await fetch("/api/admin/users/stats", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch user stats");
            return res.json();
        }
    });

    // Normalize data structure handling both backward compatibility arrays and new paginated objects
    const users = Array.isArray(result) ? result : (result?.users || []);
    const totalCount = Array.isArray(result) ? result.length : (result?.total || 0);
    const totalPages = Math.ceil(totalCount / limit);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">العملاء</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.customers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">المسؤولين</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.admins || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="h-6 w-6" />
                                إدارة العملاء
                            </CardTitle>
                            <CardDescription>
                                عرض وإدارة حسابات المستخدمين
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="بحث بالاسم أو البريد..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pr-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">المستخدم</TableHead>
                                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                                    <TableHead className="text-right">الهاتف</TableHead>
                                    <TableHead className="text-center">تاريخ التسجيل</TableHead>
                                    <TableHead className="text-center">الدور</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-sm font-bold text-primary">
                                                        {(user.fullName || user.email || "?").charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                {user.fullName || "مستخدم"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span dir="ltr">{(user as any).phone || "—"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
                                                <Calendar className="h-4 w-4" />
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : "غير متوفر"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={user.role === 'admin' ? "destructive" : "secondary"}>
                                                {user.role === 'admin' ? "أدمن" : "عميل"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            {search ? "لا توجد نتائج للبحث" : "لا يوجد مستخدمين"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4 gap-2">
                            <div className="text-xs text-muted-foreground ml-2">
                                صفحة {page} من {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronRight className="h-4 w-4 ml-1" />
                                السابق
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                التالي
                                <ChevronLeft className="h-4 w-4 mr-1" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
