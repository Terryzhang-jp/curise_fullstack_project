import Image from "next/image";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          邮轮供应链管理系统
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          一个现代化的邮轮供应链管理系统，帮助您高效管理邮轮供应链的各个环节。
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: '国家和港口管理',
            description: '管理全球各个国家和港口信息，支持灵活的数据操作。'
          },
          {
            title: '公司和船舶管理',
            description: '全面的公司和船舶信息管理，包括基本信息、联系方式等。'
          },
          {
            title: '供应商管理',
            description: '完整的供应商管理功能，包括供应商信息、类别关联等。'
          },
          {
            title: '产品管理',
            description: '强大的产品管理系统，支持产品分类、价格管理等功能。'
          },
          {
            title: '订单管理',
            description: '高效的订单处理流程，从创建到交付的全程跟踪。'
          },
          {
            title: '库存管理',
            description: '实时库存监控，支持多维度的库存分析和管理。'
          }
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg bg-white p-8 shadow-lg ring-1 ring-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {feature.title}
            </h3>
            <p className="mt-4 text-gray-500">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
