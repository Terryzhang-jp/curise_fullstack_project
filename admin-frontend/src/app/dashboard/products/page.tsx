"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { getProducts, getProduct, deleteProduct } from "@/lib/api/products";
import { getCategories } from "@/lib/api/categories";
import { getCountries } from "@/lib/api/countries";
import { getPorts } from "@/lib/api/ports";
import type { Product, Category, Country, Port } from "@/lib/api/types";
import { toast } from "sonner";
import ProductForm from "./components/ProductForm";

interface ProductHistory {
  id: number;
  product_id: number;
  product_name: string;
  product_name_en: string | null;
  category_id: number;
  category_name: string;
  country_id: number;
  country_name: string;
  supplier_id: number;
  supplier_name: string;
  status: string;
  history_date: string;
  created_at: string;
  updated_at: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);
  const [countryFilter, setCountryFilter] = useState<number | undefined>(undefined);
  const [portFilter, setPortFilter] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<'id' | 'product_name_en' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 获取产品列表（不包含港口筛选，在前端处理）
  const { data: allProducts = [], isLoading, error, refetch } = useQuery<Product[]>({
    queryKey: ["products", countryFilter, categoryFilter],
    queryFn: () => getProducts({
      country_id: countryFilter,
      category_id: categoryFilter
    }),
  });

  // 根据搜索条件和港口筛选过滤产品
  const filteredProducts = allProducts.filter((product) => {
    // 搜索条件筛选
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        product.product_name_en?.toLowerCase().includes(searchLower) ||
        product.product_name_jp?.toLowerCase().includes(searchLower) ||
        product.code?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // 港口筛选
    if (portFilter !== undefined) {
      if (product.port_id !== portFilter) return false;
    }

    return true;
  });

  // 排序处理函数
  const handleSort = (field: 'id' | 'product_name_en') => {
    if (sortField === field) {
      // 如果点击的是当前排序字段，切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果点击的是新字段，设置为升序
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 应用排序的产品列表
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;

    if (sortField === 'id') {
      const aValue = a.id;
      const bValue = b.id;

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    } else if (sortField === 'product_name_en') {
      const aName = (a.product_name_en || '').toLowerCase().trim();
      const bName = (b.product_name_en || '').toLowerCase().trim();

      // 智能排序：数字开头的产品名称排在字母后面
      const aStartsWithNumber = /^[0-9]/.test(aName);
      const bStartsWithNumber = /^[0-9]/.test(bName);

      // 如果一个是数字开头，一个是字母开头
      if (aStartsWithNumber && !bStartsWithNumber) {
        return sortDirection === 'asc' ? 1 : -1; // 数字开头排在后面(升序时)
      }
      if (!aStartsWithNumber && bStartsWithNumber) {
        return sortDirection === 'asc' ? -1 : 1; // 字母开头排在前面(升序时)
      }

      // 同类型之间的正常字符串比较
      if (sortDirection === 'asc') {
        return aName.localeCompare(bName);
      } else {
        return bName.localeCompare(aName);
      }
    }

    return 0;
  });



  // 获取排序图标
  const getSortIcon = (field: 'id' | 'product_name_en') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  // 获取类别列表用于筛选
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 10, // 10分钟内不重新获取
  });

  // 获取国家列表用于筛选
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
    staleTime: 1000 * 60 * 10, // 10分钟内不重新获取
  });

  // 获取港口列表用于筛选
  const { data: ports = [] } = useQuery<Port[]>({
    queryKey: ["ports"],
    queryFn: () => getPorts(),
    staleTime: 1000 * 60 * 10, // 10分钟内不重新获取
  });

  // 删除产品的mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      refetch();
      toast.success("产品删除成功");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "删除失败");
    },
  });

  // 处理添加/编辑模态窗口打开
  const handleAdd = () => {
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  // 处理编辑
  const handleEdit = async (product: Product) => {
    try {
      console.log('开始获取产品详情:', product.id);
      // 获取完整的产品数据
      const fullProduct = await getProduct(product.id);
      console.log('获取到的完整产品数据:', fullProduct);
      setEditingProduct(fullProduct);
      console.log('设置编辑产品数据后的状态:', fullProduct);
      setIsAddModalOpen(true);
    } catch (error) {
      console.error('获取产品详情失败:', error);
      toast.error("获取产品详情失败");
    }
  };

  // 处理批量上传
  const handleUpload = () => {
    router.push("/dashboard/products/upload");
  };

  // 添加/编辑成功处理
  const handleSuccess = () => {
    setIsAddModalOpen(false);
    refetch();
    toast.success(editingProduct ? "产品更新成功" : "产品添加成功");
  };

  // 处理类别筛选变更
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === "all" ? undefined : parseInt(value, 10));
  };

  // 处理国家筛选变更
  const handleCountryChange = (value: string) => {
    setCountryFilter(value === "all" ? undefined : parseInt(value, 10));
  };

  // 处理港口筛选变更
  const handlePortChange = (value: string) => {
    setPortFilter(value === "all" ? undefined : parseInt(value, 10));
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    if (window.confirm("确定要删除这个产品吗？删除后无法恢复")) {
      try {
        await deleteProduct(id);
        refetch();
        toast.success("产品删除成功");
      } catch (error) {
        toast.error("删除失败");
      }
    }
  };

  if (error) {
    return <div className="p-6">加载失败: {JSON.stringify(error)}</div>;
  }

  return (
    <div>
      <PageHeader
        title="产品管理"
        description="管理系统中的产品信息"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              批量导入
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              添加产品
            </Button>
          </div>
        }
      />

      {/* 筛选和搜索区域 */}
      <div className="mb-4 flex gap-4 flex-wrap">
        <div className="w-64">
          <Input
            placeholder="搜索产品名称或代码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-48">
          <Select
            value={categoryFilter?.toString() || "all"}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有类别</SelectItem>
              {categories.map((category: Category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={countryFilter?.toString() || "all"}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择国家" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有国家</SelectItem>
              {countries.map((country: Country) => (
                <SelectItem key={country.id} value={country.id.toString()}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={portFilter?.toString() || "all"}
            onValueChange={handlePortChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择港口" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有港口</SelectItem>
              {ports.map((port: Port) => (
                <SelectItem key={port.id} value={port.id.toString()}>
                  {port.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(searchTerm || categoryFilter || countryFilter || portFilter || sortField) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setCategoryFilter(undefined);
              setCountryFilter(undefined);
              setPortFilter(undefined);
              setSortField(null);
              setSortDirection('asc');
            }}
          >
            清除筛选和排序
          </Button>
        )}
      </div>

      {/* 搜索结果统计 */}
      {!isLoading && (
        <div className="mb-4 text-sm text-gray-600">
          {searchTerm ? (
            <span>
              搜索 &ldquo;{searchTerm}&rdquo; 找到 {sortedProducts.length} 个结果
              {allProducts.length !== sortedProducts.length && (
                <span className="ml-2">（共 {allProducts.length} 个产品）</span>
              )}
            </span>
          ) : (
            <span>共 {sortedProducts.length} 个产品</span>
          )}
          {sortField && (
            <span className="ml-4 text-sm text-gray-500">
              按 {sortField === 'id' ? 'ID' : '英文名称'} {sortDirection === 'asc' ? '升序' : '降序'} 排序
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">加载中...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-medium hover:bg-gray-100 flex items-center gap-1"
                    onClick={() => handleSort('id')}
                  >
                    ID
                    {getSortIcon('id')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-medium hover:bg-gray-100 flex items-center gap-1"
                    onClick={() => handleSort('product_name_en')}
                  >
                    英文名称
                    {getSortIcon('product_name_en')}
                  </Button>
                </TableHead>
                <TableHead>日文名称</TableHead>
                <TableHead>代码</TableHead>
                <TableHead>类别</TableHead>
                <TableHead>国家</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>港口</TableHead>
                <TableHead>单位</TableHead>
                <TableHead>单位大小</TableHead>
                <TableHead>包装数量</TableHead>
                <TableHead>品牌</TableHead>
                <TableHead>货币</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>起始日期</TableHead>
                <TableHead>结束日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length > 0 ? (
                sortedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell>{product.product_name_en}</TableCell>
                    <TableCell>{product.product_name_jp || "-"}</TableCell>
                    <TableCell>{product.code || "-"}</TableCell>
                    <TableCell>{product.category?.name || "-"}</TableCell>
                    <TableCell>{product.country?.name || "-"}</TableCell>
                    <TableCell>{product.supplier?.name || "-"}</TableCell>
                    <TableCell>{product.port?.name || "-"}</TableCell>
                    <TableCell>{product.unit || "-"}</TableCell>
                    <TableCell>{product.unit_size || "-"}</TableCell>
                    <TableCell>{product.pack_size || "-"}</TableCell>
                    <TableCell>{product.brand || "-"}</TableCell>
                    <TableCell>{product.currency || "-"}</TableCell>
                    <TableCell>
                      {product.price ? `${product.price.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      {product.effective_from
                        ? new Date(product.effective_from).toLocaleDateString('zh-CN')
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {product.effective_to
                            ? new Date(product.effective_to).toLocaleDateString('zh-CN')
                            : "-"
                          }
                        </span>
                        {product.effective_from && product.effective_to && (
                          <span className={`text-xs mt-1 ${
                            new Date() > new Date(product.effective_to)
                              ? "text-red-600"
                              : new Date() < new Date(product.effective_from)
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}>
                            {new Date() > new Date(product.effective_to)
                              ? "已过期"
                              : new Date() < new Date(product.effective_from)
                              ? "未生效"
                              : "有效期内"
                            }
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.status ? "启用" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          编辑
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                            >
                              删除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除产品 &quot;{product.product_name_en}&quot; 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(product.id)}
                              >
                                确认删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={17} className="text-center py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        product={editingProduct}
        onSuccess={handleSuccess}
      />
    </div>
  );
}