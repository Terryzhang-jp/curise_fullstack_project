"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProduct, updateProduct } from "@/lib/api/products";
import { getCategories } from "@/lib/api/categories";
import { getCountries } from "@/lib/api/countries";
import { getSuppliers } from "@/lib/api/suppliers";
import { getPorts } from "@/lib/api/ports";
import { Product, ProductCreate, ProductUpdate, Category, Country, Supplier, Port } from "@/lib/api/types";
import { toast } from "sonner";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

export default function ProductForm({ isOpen, onClose, product, onSuccess }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductCreate | ProductUpdate>({
    product_name_en: product?.product_name_en || "",
    product_name_jp: product?.product_name_jp || "",
    code: product?.code || "",
    category_id: product?.category_id,
    country_id: product?.country_id,
    supplier_id: product?.supplier_id,
    port_id: product?.port_id,
    unit: product?.unit || "",
    price: product?.price ?? "",
    unit_size: product?.unit_size || "",
    pack_size: product?.pack_size,
    country_of_origin: product?.country_of_origin,
    brand: product?.brand || "",
    currency: product?.currency || "",
    effective_from: product?.effective_from || "",
    effective_to: product?.effective_to || "",
    status: product?.status ?? true,
  });

  // 监听 product 变化，更新表单数据
  useEffect(() => {
    if (product) {
      setFormData({
        product_name_en: product.product_name_en || "",
        product_name_jp: product.product_name_jp || "",
        code: product.code || "",
        category_id: product.category_id,
        country_id: product.country_id,
        supplier_id: product.supplier_id,
        port_id: product.port_id,
        unit: product.unit || "",
        price: product.price ?? "",
        unit_size: product.unit_size || "",
        pack_size: product.pack_size,
        country_of_origin: product.country_of_origin,
        brand: product.brand || "",
        currency: product.currency || "",
        effective_from: product.effective_from || "",
        effective_to: product.effective_to || "",
        status: product.status ?? true,
      });
    }
  }, [product]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 获取所有类别
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  // 获取所有国家
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
  });

  // 获取所有供应商
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => getSuppliers(),
  });

  // 获取港口列表
  const { data: ports = [] } = useQuery({
    queryKey: ["ports"],
    queryFn: () => getPorts(),
    staleTime: 1000 * 60 * 10, // 10分钟内不重新获取
  });

  // 处理表单提交
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      toast.success("产品创建成功");
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "创建失败");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductUpdate }) => updateProduct(id, data),
    onSuccess: () => {
      toast.success("产品更新成功");
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "更新失败");
    },
  });

  const handleClose = () => {
    if (!createMutation.isPending && !updateMutation.isPending) {
      onClose();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (e.target instanceof HTMLInputElement && type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else if (["category_id", "country_id", "supplier_id", "country_of_origin", "port_id"].includes(name)) {
      setFormData({
        ...formData,
        [name]: value ? parseInt(value, 10) : undefined,
      });
    } else if (name === "price") {
      setFormData({
        ...formData,
        [name]: value ? parseFloat(value) : "",
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  // 处理Select组件的值变更
  const handleSelectChange = (name: string, value: string) => {
    if (["category_id", "country_id", "supplier_id", "country_of_origin", "port_id"].includes(name)) {
      setFormData({
        ...formData,
        [name]: value ? parseInt(value, 10) : undefined,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_name_en) {
      newErrors.product_name_en = "产品英文名称不能为空";
    }

    if (!formData.category_id) {
      newErrors.category_id = "请选择产品类别";
    }

    if (!formData.country_id) {
      newErrors.country_id = "请选择产品所属国家";
    }

    if (!formData.effective_from) {
      newErrors.effective_from = "起始日期不能为空";
    }

    // 验证日期逻辑：如果有结束日期，确保结束日期不早于起始日期
    if (formData.effective_from && formData.effective_to) {
      const startDate = new Date(formData.effective_from);
      const endDate = new Date(formData.effective_to);
      if (endDate < startDate) {
        newErrors.effective_to = "结束日期不能早于起始日期";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (product) {
      // 更新产品
      const updateData: ProductUpdate = {
        product_name_en: formData.product_name_en,
        product_name_jp: formData.product_name_jp,
        category_id: formData.category_id as number,
        country_id: formData.country_id as number,
        supplier_id: formData.supplier_id,
        port_id: formData.port_id,
        unit: formData.unit,
        price: formData.price === "" ? 0 : formData.price,
        unit_size: formData.unit_size,
        pack_size: formData.pack_size,
        country_of_origin: formData.country_of_origin,
        brand: formData.brand,
        currency: formData.currency,
        effective_from: formData.effective_from || undefined,
        effective_to: formData.effective_to || undefined,
        status: formData.status
      };

      // 调试信息
      console.log("提交更新数据：", updateData);
      console.log("country_of_origin 类型：", typeof updateData.country_of_origin);
      console.log("country_of_origin 值：", updateData.country_of_origin);

      updateMutation.mutate({ id: product.id, data: updateData });
    } else {
      // 创建产品
      const createData: ProductCreate = {
        product_name_en: formData.product_name_en as string,
        product_name_jp: formData.product_name_jp,
        code: formData.code,
        category_id: formData.category_id as number,
        country_id: formData.country_id as number,
        supplier_id: formData.supplier_id,
        port_id: formData.port_id,
        unit: formData.unit,
        price: formData.price === "" ? 0 : formData.price,
        unit_size: formData.unit_size,
        pack_size: formData.pack_size,
        country_of_origin: formData.country_of_origin,
        brand: formData.brand,
        currency: formData.currency,
        effective_from: formData.effective_from || undefined,
        effective_to: formData.effective_to || undefined,
        status: formData.status
      };

      // 调试信息
      console.log("提交创建数据：", createData);
      console.log("country_of_origin 类型：", typeof createData.country_of_origin);
      console.log("country_of_origin 值：", createData.country_of_origin);

      createMutation.mutate(createData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={product ? "编辑产品" : "添加产品"}
      description={product ? `编辑产品：${product.product_name_en}` : "添加新产品到系统"}
      size="xl"
      footer={
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            取消
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "提交中..."
              : product
              ? "更新"
              : "确认"}
          </Button>
        </div>
      }
    >
      <div className="overflow-y-auto max-h-[65vh] pr-2">
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="product_name_en">
              产品英文名称 <span className="text-red-500">*</span>
            </FormLabel>
            <Input
              id="product_name_en"
              name="product_name_en"
              value={formData.product_name_en as string}
              onChange={handleChange}
              placeholder="请输入产品英文名称"
              error={errors.product_name_en}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="product_name_jp">产品日语名称</FormLabel>
            <Input
              id="product_name_jp"
              name="product_name_jp"
              value={formData.product_name_jp as string}
              onChange={handleChange}
              placeholder="请输入产品日语名称"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="code">产品代码</FormLabel>
            <Input
              id="code"
              name="code"
              value={formData.code as string}
              onChange={handleChange}
              placeholder="请输入产品代码"
              disabled={!!product && !!product.code}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="category_id">
              产品类别 <span className="text-red-500">*</span>
            </FormLabel>
            <Select
              value={formData.category_id?.toString() || ""}
              onValueChange={(value) => handleSelectChange("category_id", value)}
            >
              <SelectTrigger className={errors.category_id ? "border-destructive" : ""}>
                <SelectValue placeholder="选择类别" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category: Category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <div className="text-sm text-destructive mt-1">{errors.category_id}</div>
            )}
          </FormField>

          <FormField>
            <FormLabel htmlFor="country_id">
              所属国家 <span className="text-red-500">*</span>
            </FormLabel>
            <Select
              value={formData.country_id?.toString() || ""}
              onValueChange={(value) => handleSelectChange("country_id", value)}
            >
              <SelectTrigger className={errors.country_id ? "border-destructive" : ""}>
                <SelectValue placeholder="选择国家" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country: Country) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country_id && (
              <div className="text-sm text-destructive mt-1">{errors.country_id}</div>
            )}
          </FormField>

          <FormField className="mb-4">
            <FormLabel>供应商</FormLabel>
            <Select
              value={formData.supplier_id?.toString() || ""}
              onValueChange={(value) => handleSelectChange("supplier_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择供应商" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier: Supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField className="mb-4">
            <FormLabel>港口</FormLabel>
            <Select
              value={formData.port_id?.toString() || ""}
              onValueChange={(value) => handleSelectChange("port_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择港口" />
              </SelectTrigger>
              <SelectContent>
                {ports.map((port: Port) => (
                  <SelectItem key={port.id} value={port.id.toString()}>
                    {port.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField>
            <FormLabel htmlFor="unit">单位</FormLabel>
            <Input
              id="unit"
              name="unit"
              value={formData.unit as string}
              onChange={handleChange}
              placeholder="请输入单位"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="unit_size">单位大小</FormLabel>
            <Input
              id="unit_size"
              name="unit_size"
              value={formData.unit_size as string}
              onChange={handleChange}
              placeholder="如: 450g"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="pack_size">包装数量</FormLabel>
            <Input
              id="pack_size"
              name="pack_size"
              type="text"
              value={formData.pack_size as string}
              onChange={handleChange}
              placeholder="如: 30个, 1箱, 500g装"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="country_of_origin">原产国</FormLabel>
            <Select
              value={formData.country_of_origin?.toString() || ""}
              onValueChange={(value) => handleSelectChange("country_of_origin", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择原产国" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country: Country) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField>
            <FormLabel htmlFor="brand">品牌</FormLabel>
            <Input
              id="brand"
              name="brand"
              value={formData.brand as string}
              onChange={handleChange}
              placeholder="请输入品牌"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="currency">货币</FormLabel>
            <Input
              id="currency"
              name="currency"
              value={formData.currency as string}
              onChange={handleChange}
              placeholder="如: JPY, USD"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="price">价格</FormLabel>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              placeholder="请输入价格"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="effective_from">
              起始日期 <span className="text-red-500">*</span>
            </FormLabel>
            <Input
              id="effective_from"
              name="effective_from"
              type="date"
              value={formData.effective_from ? formData.effective_from.split('T')[0] : ""}
              onChange={handleChange}
              error={errors.effective_from}
            />
            {errors.effective_from && (
              <div className="text-sm text-destructive mt-1">{errors.effective_from}</div>
            )}
          </FormField>

          <FormField>
            <FormLabel htmlFor="effective_to">结束日期</FormLabel>
            <Input
              id="effective_to"
              name="effective_to"
              type="date"
              value={formData.effective_to ? formData.effective_to.split('T')[0] : ""}
              onChange={handleChange}
              error={errors.effective_to}
            />
            {errors.effective_to && (
              <div className="text-sm text-destructive mt-1">{errors.effective_to}</div>
            )}
            <div className="text-sm text-muted-foreground mt-1">
              如果为空，系统将自动设置为起始日期+3个月
            </div>
          </FormField>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="status"
              name="status"
              checked={formData.status as boolean}
              onChange={handleChange}
              className="rounded border-slate-300"
            />
            <label htmlFor="status" className="text-sm font-medium">
              启用产品
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}