// API通用响应类型
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

// 基础响应类型
export interface BaseResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

// 分页参数
export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// 基础模型的通用字段
export interface BaseModel {
  id: number;
  created_at?: string;
  updated_at?: string;
}

// 带状态的模型
export interface StatusModel extends BaseModel {
  status: boolean;
}

// 国家模型
export interface Country extends StatusModel {
  name: string;
  code: string;
}

// 国家创建参数
export interface CountryCreate {
  name: string;
  code: string;
  status?: boolean;
}

// 国家更新参数
export interface CountryUpdate {
  name?: string;
  code?: string;
  status?: boolean;
}

// 港口模型
export interface Port extends StatusModel {
  id: number;
  name: string;
  code?: string;
  country_id: number;
  country?: Country;
  location?: string;
}

// 港口创建类型
export interface PortCreate {
  name: string;
  code?: string;
  country_id: number;
  status?: boolean;
  location?: string;
}

// 港口更新类型
export interface PortUpdate {
  name?: string;
  code?: string;
  country_id?: number;
  status?: boolean;
  location?: string;
}

// 公司模型
export interface Company extends StatusModel {
  name: string;
  country_id: number;
  country?: Country;
  contact?: string;
  email?: string;
  phone?: string;
}

// 公司创建参数
export interface CompanyCreate {
  name: string;
  country_id: number;
  contact?: string;
  email?: string;
  phone?: string;
  status?: boolean;
}

// 公司更新参数
export interface CompanyUpdate {
  name?: string;
  country_id?: number;
  contact?: string;
  email?: string;
  phone?: string;
  status?: boolean;
}

// 船舶模型
export interface Ship extends StatusModel {
  name: string;
  company_id: number;
  company?: Company;
  ship_type?: string;
  capacity: number;
}

// 船舶创建参数
export interface ShipCreate {
  name: string;
  company_id: number;
  ship_type?: string;
  capacity: number;
  status?: boolean;
}

// 船舶更新参数
export interface ShipUpdate {
  name?: string;
  company_id?: number;
  ship_type?: string;
  capacity?: number;
  status?: boolean;
}

// 类别模型
export interface Category extends StatusModel {
  name: string;
  code: string;
  description?: string;
}

// 类别创建参数
export interface CategoryCreate {
  name: string;
  code: string;
  description?: string;
  status?: boolean;
}

// 类别更新参数
export interface CategoryUpdate {
  name?: string;
  code?: string;
  description?: string;
  status?: boolean;
}

// 产品模型
export interface Product extends StatusModel {
  product_name_en: string;  // 英文名称（主要字段）
  product_name_jp?: string;  // 日语名称
  code?: string;
  category_id: number;
  country_id: number;
  supplier_id?: number;
  port_id?: number;  // 港口ID
  unit?: string;
  price?: number;
  unit_size?: string;  // 单位重量，如"450g"
  pack_size?: number;  // 包装数量，如"30"
  country_of_origin?: number;  // 原产国ID
  brand?: string;  // 品牌
  currency?: string;  // 货币类型
  effective_from?: string;
  effective_to?: string;
  category?: Category;
  country?: Country;
  supplier?: Company;
  port?: {
    id: number;
    name: string;
    code?: string;
  };
}

// 产品创建类型
export interface ProductCreate {
  product_name_en: string;  // 英文名称（主要字段）
  product_name_jp?: string;  // 日语名称
  code?: string;
  category_id: number;
  country_id: number;
  supplier_id?: number;
  port_id?: number;  // 港口ID
  unit?: string;
  price?: number;
  unit_size?: string;  // 单位重量，如"450g"
  pack_size?: number;  // 包装数量，如"30"
  country_of_origin?: number;  // 原产国ID
  brand?: string;  // 品牌
  currency?: string;  // 货币类型
  effective_from?: string;
  effective_to?: string;
  status?: boolean;
}

// 产品更新类型
export interface ProductUpdate {
  product_name_en?: string;  // 英文名称（主要字段）
  product_name_jp?: string;  // 日语名称
  code?: string;
  category_id?: number;
  country_id?: number;
  supplier_id?: number;
  port_id?: number;  // 港口ID
  unit?: string;
  price?: number;
  unit_size?: string;  // 单位重量，如"450g"
  pack_size?: number;  // 包装数量，如"30"
  country_of_origin?: number;  // 原产国ID
  brand?: string;  // 品牌
  currency?: string;  // 货币类型
  effective_from?: string;
  effective_to?: string;
  status?: boolean;
}

// 供应商模型
export interface Supplier extends StatusModel {
  name: string;
  code?: string;
  country_id: number;
  country?: Country;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  categories?: Category[];
}

// 供应商创建参数
export interface SupplierCreate {
  name: string;
  code?: string;
  country_id: number;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: boolean;
}

// 供应商更新参数
export interface SupplierUpdate {
  name?: string;
  code?: string;
  country_id?: number;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: boolean;
}

// 供应商类别关联参数
export interface SupplierCategoryUpdate {
  category_ids: number[];
}