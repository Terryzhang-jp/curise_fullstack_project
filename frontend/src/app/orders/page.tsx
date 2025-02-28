'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface Order {
  id: number;
  order_no: string;
  ship_id: number;
  company_id: number;
  port_id: number;
  order_date: string;
  delivery_date: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
  ship?: {
    name: string;
  };
  company?: {
    name: string;
  };
  port?: {
    name: string;
  };
}

interface Ship {
  id: number;
  name: string;
}

interface Company {
  id: number;
  name: string;
}

interface Port {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  code?: string;
  price: number;
}

interface Supplier {
  id: number;
  name: string;
}

interface OrderItem {
  product_id: number;
  supplier_id: number;
  quantity: number;
  price: number;
}

interface OrderFormData {
  order_no: string;
  ship_id: number;
  company_id: number;
  port_id: number;
  order_date: string;
  delivery_date: string;
  notes: string;
  items: OrderItem[];
}

// 计算剩余天数
function calculateRemainingDays(deliveryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  delivery.setHours(0, 0, 0, 0);
  const diffTime = delivery.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const { toast } = useToast();

  // 新增状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ships, setShips] = useState<Ship[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  const [formData, setFormData] = useState<OrderFormData>({
    order_no: '',
    ship_id: 0,
    company_id: 0,
    port_id: 0,
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    items: []
  });

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/orders/?include_relations=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('订单数据:', data);  // 添加调试信息
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('获取订单列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取船舶数据
  const fetchShips = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/ships/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setShips(data);
    } catch (error) {
      console.error('Error fetching ships:', error);
      toast({
        title: "错误",
        description: "获取船舶数据失败",
        variant: "destructive",
      });
    }
  };

  // 获取公司数据
  const fetchCompanies = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/companies/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "错误",
        description: "获取公司数据失败",
        variant: "destructive",
      });
    }
  };

  // 获取港口数据
  const fetchPorts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/ports/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPorts(data);
    } catch (error) {
      console.error('Error fetching ports:', error);
      toast({
        title: "错误",
        description: "获取港口数据失败",
        variant: "destructive",
      });
    }
  };

  // 获取产品数据
  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/products/?limit=100', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "错误",
        description: "获取产品数据失败",
        variant: "destructive",
      });
    }
  };

  // 获取供应商数据
  const fetchSuppliers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/suppliers/?limit=100', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: "错误",
        description: "获取供应商数据失败",
        variant: "destructive",
      });
    }
  };

  // 加载所有必要数据
  useEffect(() => {
    fetchOrders();
    fetchShips();
    fetchCompanies();
    fetchPorts();
    fetchProducts();
    fetchSuppliers();
  }, []);

  // 表单输入处理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // 下拉框选择处理
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: parseInt(value)
    });
  };

  // 添加产品项
  const addProductItem = () => {
    if (products.length > 0 && suppliers.length > 0) {
      const product = products[0];
      const newItem: OrderItem = {
        product_id: product.id,
        supplier_id: suppliers[0].id,
        quantity: 1,
        price: product.price || 0
      };
      setOrderItems([...orderItems, newItem]);
    }
  };

  // 更新产品项
  const updateOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = [...orderItems];
    if (field === 'product_id' && products) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: parseInt(value),
          price: product.price
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: field === 'quantity' || field === 'price' ? parseFloat(value) : parseInt(value)
      };
    }
    setOrderItems(updatedItems);
  };

  // 移除产品项
  const removeOrderItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };

  // 创建订单
  const handleCreateOrder = async () => {
    if (!formData.order_no || !formData.ship_id || !formData.company_id || !formData.port_id) {
      toast({
        title: "错误",
        description: "请填写必要的订单信息",
        variant: "destructive",
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: "错误",
        description: "订单必须包含至少一个产品",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // 准备提交数据
    const submitData = {
      ...formData,
      items: orderItems,
      status: "pending"
    };

    try {
      const response = await fetch('http://localhost:8000/api/v1/orders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: "成功",
        description: `订单 ${result.order_no} 创建成功`,
      });
      
      // 重置表单和关闭对话框
      setFormData({
        order_no: '',
        ship_id: 0,
        company_id: 0,
        port_id: 0,
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        items: []
      });
      setOrderItems([]);
      setIsDialogOpen(false);
      
      // 重新加载订单列表
      await fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "创建订单失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算待处理订单数量
  const pendingOrdersCount = Array.isArray(orders) 
    ? orders.filter(order => order.status === 'pending').length 
    : 0;

  const columns = [
    {
      header: '订单编号',
      accessorKey: 'order_no',
    },
    {
      header: '船舶',
      accessorKey: 'ship.name',
    },
    {
      header: '公司',
      accessorKey: 'company.name',
    },
    {
      header: '港口',
      accessorKey: 'port.name',
    },
    {
      header: '订单日期',
      accessorKey: 'order_date',
      cell: ({ row }: { row: any }) => {
        const date = new Date(row.original.order_date);
        return date.toLocaleDateString('zh-CN');
      },
    },
    {
      header: '交货日期',
      accessorKey: 'delivery_date',
      cell: ({ row }: { row: any }) => {
        const date = new Date(row.original.delivery_date);
        const remainingDays = calculateRemainingDays(row.original.delivery_date);
        const remainingClass = remainingDays < 0 ? 'text-red-500' : 
                             remainingDays <= 7 ? 'text-yellow-500' : 
                             'text-green-500';
        return (
          <div>
            <div>{date.toLocaleDateString('zh-CN')}</div>
            <div className={`text-xs ${remainingClass}`}>
              {remainingDays < 0 
                ? `已超期 ${Math.abs(remainingDays)} 天`
                : `还剩 ${remainingDays} 天`}
            </div>
          </div>
        );
      },
    },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }: { row: any }) => (
        <span className={`px-2 py-1 rounded-full text-sm ${
          row.original.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          row.original.status === 'completed' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.original.status === 'pending' ? '待处理' :
           row.original.status === 'completed' ? '已完成' :
           '已取消'}
        </span>
      ),
    },
    {
      header: '总金额',
      accessorKey: 'total_amount',
      cell: ({ row }: { row: any }) => (
        <span>¥{row.original.total_amount.toFixed(2)}</span>
      ),
    },
    {
      header: '操作',
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-2">
          <Link href={`/orders/${row.original.id}`}>
            <Button variant="outline" size="sm">
              查看详情
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={async (e) => {
              e.preventDefault();
              if (!window.confirm('确定要删除此订单吗？此操作不可撤销。')) {
                return;
              }
              try {
                const response = await fetch(
                  `http://localhost:8000/api/v1/orders/${row.original.id}`,
                  {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  }
                );
                if (!response.ok) {
                  throw new Error('删除订单失败');
                }
                // 重新加载订单列表
                fetchOrders();
              } catch (error) {
                console.error('Error deleting order:', error);
                alert('删除订单失败');
              }
            }}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">订单管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            今天是 {today.toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => {
            setIsDialogOpen(true);
            setOrderItems([]);
          }}>
            <PlusIcon className="h-4 w-4 mr-2" />
            创建订单
          </Button>
          <Link href="/order-analysis/upload">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              上传订单
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="mb-4">
          <h2 className="text-lg font-medium">待处理订单统计</h2>
          <p className="text-sm text-gray-500 mt-1">
            共有 {pendingOrdersCount} 个待处理订单
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
      />

      {/* 创建订单对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建新订单</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_no">订单编号</Label>
                <Input
                  id="order_no"
                  name="order_no"
                  value={formData.order_no}
                  onChange={handleInputChange}
                  placeholder="请输入订单编号"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ship_id">船舶</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('ship_id', value)}
                  value={formData.ship_id ? formData.ship_id.toString() : ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择船舶" />
                  </SelectTrigger>
                  <SelectContent>
                    {ships.map((ship) => (
                      <SelectItem key={ship.id} value={ship.id.toString()}>
                        {ship.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company_id">公司</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('company_id', value)}
                  value={formData.company_id ? formData.company_id.toString() : ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择公司" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="port_id">港口</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('port_id', value)}
                  value={formData.port_id ? formData.port_id.toString() : ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择港口" />
                  </SelectTrigger>
                  <SelectContent>
                    {ports.map((port) => (
                      <SelectItem key={port.id} value={port.id.toString()}>
                        {port.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="order_date">订单日期</Label>
                <Input
                  id="order_date"
                  name="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delivery_date">交付日期</Label>
                <Input
                  id="delivery_date"
                  name="delivery_date"
                  type="date"
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Input
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="可选备注信息"
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">订单产品项</h3>
                <Button type="button" onClick={addProductItem}>
                  添加产品
                </Button>
              </div>
              
              {orderItems.length === 0 && (
                <p className="text-sm text-gray-500">点击"添加产品"按钮来添加产品项</p>
              )}
              
              {orderItems.map((item, index) => (
                <div key={index} className="p-4 border rounded-md space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`product_${index}`}>产品</Label>
                      <Select
                        onValueChange={(value) => updateOrderItem(index, 'product_id', value)}
                        value={item.product_id.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择产品" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} {product.code ? `(${product.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`supplier_${index}`}>供应商</Label>
                      <Select
                        onValueChange={(value) => updateOrderItem(index, 'supplier_id', value)}
                        value={item.supplier_id.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择供应商" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`quantity_${index}`}>数量</Label>
                      <Input
                        id={`quantity_${index}`}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                        min="1"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`price_${index}`}>单价</Label>
                      <Input
                        id={`price_${index}`}
                        type="number"
                        value={item.price}
                        onChange={(e) => updateOrderItem(index, 'price', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">
                      总金额: ¥{(item.quantity * item.price).toFixed(2)}
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeOrderItem(index)}
                    >
                      移除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateOrder} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 