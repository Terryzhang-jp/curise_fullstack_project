/**
 * 邮件模板相关类型定义
 */

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateCreate {
  name: string;
  subject: string;
  content: string;
}

export interface EmailTemplateUpdate {
  name?: string;
  subject?: string;
  content?: string;
}

export interface EmailTemplateList {
  templates: EmailTemplate[];
  total: number;
}

// 预定义的模板类型
export type TemplateType = 
  | 'order_notification'      // 订单通知
  | 'quotation_request'       // 询价请求
  | 'supplier_notification'   // 供应商通知
  | 'test_email'             // 测试邮件
  | 'custom';                // 自定义

// 模板变量定义
export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

// 不同模板类型的可用变量
export const TEMPLATE_VARIABLES: Record<TemplateType, TemplateVariable[]> = {
  order_notification: [
    { key: '{{supplier_name}}', label: '供应商名称', description: '收件供应商的名称', example: '新鲜食品供应商' },
    { key: '{{invoice_number}}', label: '订单号', description: '订单的唯一标识号', example: 'INV-2025-001' },
    { key: '{{voyage_number}}', label: '航次号', description: '邮轮航次编号', example: 'VOY-2025-001' },
    { key: '{{delivery_date}}', label: '交货日期', description: '期望的交货日期', example: '2025-08-15' },
    { key: '{{delivery_address}}', label: '交货地址', description: '货物交付地址', example: '东京港码头A区' },
    { key: '{{product_count}}', label: '产品数量', description: '订单中的产品种类数量', example: '15' },
    { key: '{{total_amount}}', label: '订单总额', description: '订单的总金额', example: '¥125,000' },
    { key: '{{contact_person}}', label: '联系人', description: '负责此订单的联系人', example: '张三' },
    { key: '{{contact_email}}', label: '联系邮箱', description: '联系人的邮箱地址', example: 'zhang@company.com' },
    { key: '{{current_date}}', label: '当前日期', description: '邮件发送的日期', example: '2025-08-06' },
    { key: '{{current_time}}', label: '当前时间', description: '邮件发送的时间', example: '14:30:00' }
  ],
  quotation_request: [
    { key: '{{supplier_name}}', label: '供应商名称', description: '收件供应商的名称', example: '新鲜食品供应商' },
    { key: '{{delivery_date}}', label: '期望交货日期', description: '希望供应商交货的日期', example: '2025-08-15' },
    { key: '{{delivery_port}}', label: '交货港口', description: '货物交付的港口', example: '东京港' },
    { key: '{{contact_person}}', label: '联系人', description: '询价的联系人', example: '李四' },
    { key: '{{contact_email}}', label: '联系邮箱', description: '联系人邮箱', example: 'li@company.com' },
    { key: '{{product_list}}', label: '产品清单', description: '需要询价的产品列表', example: '苹果 x100个\n香蕉 x200个' },
    { key: '{{estimated_amount}}', label: '预估金额', description: '预估的订单总金额', example: '¥50,000' },
    { key: '{{additional_notes}}', label: '备注信息', description: '额外的说明或要求', example: '请提供有机认证' },
    { key: '{{current_date}}', label: '当前日期', description: '邮件发送的日期', example: '2025-08-06' }
  ],
  supplier_notification: [
    { key: '{{supplier_name}}', label: '供应商名称', description: '收件供应商的名称', example: '优质供应商' },
    { key: '{{notification_title}}', label: '通知标题', description: '通知的主要标题', example: '重要通知' },
    { key: '{{notification_content}}', label: '通知内容', description: '通知的详细内容', example: '请注意新的交货要求' },
    { key: '{{contact_person}}', label: '联系人', description: '发送通知的联系人', example: '王五' },
    { key: '{{contact_email}}', label: '联系邮箱', description: '联系人邮箱', example: 'wang@company.com' },
    { key: '{{current_date}}', label: '当前日期', description: '邮件发送的日期', example: '2025-08-06' }
  ],
  test_email: [
    { key: '{{test_message}}', label: '测试消息', description: '测试邮件的主要内容', example: '这是一封测试邮件' },
    { key: '{{config_name}}', label: '配置名称', description: '使用的邮件配置名称', example: 'Gmail配置' },
    { key: '{{sender_name}}', label: '发件人名称', description: '邮件发件人显示名称', example: '邮轮系统' },
    { key: '{{current_date}}', label: '当前日期', description: '邮件发送的日期', example: '2025-08-06' },
    { key: '{{current_time}}', label: '当前时间', description: '邮件发送的时间', example: '14:30:00' }
  ],
  custom: [
    { key: '{{custom_field_1}}', label: '自定义字段1', description: '可自定义的字段', example: '自定义内容' },
    { key: '{{custom_field_2}}', label: '自定义字段2', description: '可自定义的字段', example: '自定义内容' },
    { key: '{{current_date}}', label: '当前日期', description: '邮件发送的日期', example: '2025-08-06' },
    { key: '{{current_time}}', label: '当前时间', description: '邮件发送的时间', example: '14:30:00' }
  ]
};

// 预定义模板
export const DEFAULT_TEMPLATES: Record<TemplateType, Partial<EmailTemplateCreate>> = {
  order_notification: {
    name: '订单通知模板',
    subject: '订单通知 - {{invoice_number}}',
    content: `尊敬的{{supplier_name}}：

您好！

附件是最新的订单明细，请查收。

订单信息：
- 订单号：{{invoice_number}}
- 航次：{{voyage_number}}
- 交货日期：{{delivery_date}}
- 交货地址：{{delivery_address}}
- 产品数量：{{product_count}}种
- 订单总额：{{total_amount}}

如有任何问题，请及时与我们联系。

联系人：{{contact_person}}
联系邮箱：{{contact_email}}

谢谢！

此致
敬礼

---
此邮件由系统自动发送，发送时间：{{current_date}} {{current_time}}`
  },
  quotation_request: {
    name: '询价请求模板',
    subject: '邮轮订单询价请求 - {{delivery_date}}',
    content: `尊敬的{{supplier_name}}：

您好！

我们是邮轮供应链管理系统，现有一批邮轮订单需要采购以下产品，诚邀您提供报价。

【订单详情】
期望交货日期: {{delivery_date}}
交货地点: {{delivery_port}}
联系人: {{contact_person}}
联系邮箱: {{contact_email}}

【产品清单】
{{product_list}}

【订单总计】
预估总金额: {{estimated_amount}}

【备注】
{{additional_notes}}

请您在收到此邮件后3个工作日内回复报价，包括：
1. 各产品的最新报价
2. 可供货数量
3. 交货时间安排
4. 付款条件

如有任何疑问，请随时联系我们。

谢谢！

邮轮供应链管理系统
联系人: {{contact_person}}
邮箱: {{contact_email}}
发送时间: {{current_date}}`
  },
  supplier_notification: {
    name: '供应商通知模板',
    subject: '{{notification_title}}',
    content: `尊敬的{{supplier_name}}：

您好！

{{notification_content}}

如有任何疑问，请随时联系我们。

联系人：{{contact_person}}
联系邮箱：{{contact_email}}

谢谢！

此致
敬礼

---
发送时间：{{current_date}}`
  },
  test_email: {
    name: '测试邮件模板',
    subject: '邮件系统测试 - {{config_name}}',
    content: `{{test_message}}

配置信息：
- 配置名称：{{config_name}}
- 发件人：{{sender_name}}
- 发送时间：{{current_date}} {{current_time}}

如果您收到这封邮件，说明邮件系统配置正常！

此致
{{sender_name}}`
  },
  custom: {
    name: '自定义模板',
    subject: '自定义邮件主题',
    content: `这是一个自定义邮件模板。

您可以在这里编写任何内容，并使用以下变量：
- {{custom_field_1}}
- {{custom_field_2}}
- {{current_date}}
- {{current_time}}

请根据您的需要修改此模板。`
  }
};
