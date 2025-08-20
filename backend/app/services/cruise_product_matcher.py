import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from difflib import SequenceMatcher

from app.models.models import Product as ProductModel
from app.schemas.cruise_order import CruiseOrderProduct, ProductMatchResult

logger = logging.getLogger(__name__)


class CruiseProductMatcher:
    """邮轮订单产品匹配器"""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
    
    def match_products(self, cruise_products: List[CruiseOrderProduct], delivery_date: datetime = None) -> List[ProductMatchResult]:
        """
        匹配邮轮订单产品与数据库中的产品

        Args:
            cruise_products: 邮轮订单产品列表
            delivery_date: 送货时间，用于验证产品有效期

        Returns:
            List[ProductMatchResult]: 匹配结果列表
        """
        try:
            self.logger.info(f"开始匹配 {len(cruise_products)} 个产品，送货时间: {delivery_date}")

            # 获取数据库中的所有产品
            db_products = self.db.query(ProductModel).filter(ProductModel.status == True).all()
            self.logger.info(f"数据库中有 {len(db_products)} 个活跃产品")

            match_results = []

            for cruise_product in cruise_products:
                match_result = self._match_single_product(cruise_product, db_products, delivery_date)
                match_results.append(match_result)

            # 统计匹配结果
            matched_count = sum(1 for result in match_results if result.match_status == "matched")
            self.logger.info(f"匹配完成: {matched_count}/{len(cruise_products)} 个产品匹配成功")

            return match_results

        except Exception as e:
            self.logger.error(f"产品匹配失败: {str(e)}")
            raise Exception(f"产品匹配失败: {str(e)}")
    
    def _match_single_product(self, cruise_product: CruiseOrderProduct, db_products: List[ProductModel], delivery_date: datetime = None) -> ProductMatchResult:
        """匹配单个产品"""
        try:
            best_match = None
            best_score = 0.0
            match_reason = ""
            best_time_valid = True

            for db_product in db_products:
                score, reason, time_valid = self._calculate_match_score(cruise_product, db_product, delivery_date)
                if score > best_score:
                    best_score = score
                    best_match = db_product
                    match_reason = reason
                    best_time_valid = time_valid

            # 确定匹配状态 - 时间验证有一票否决权
            if best_score >= 0.9 and best_time_valid:  # 高置信度匹配且时间有效
                match_status = "matched"
            elif best_score >= 0.7 and best_time_valid:  # 中等置信度且时间有效
                match_status = "possible_match"
            elif best_score >= 0.9 and not best_time_valid:  # 高置信度但时间无效
                match_status = "not_matched"  # 时间一票否决
                match_reason += " (时间验证失败)"
            elif best_score >= 0.7 and not best_time_valid:  # 中等置信度但时间无效
                match_status = "not_matched"  # 时间一票否决
                match_reason += " (时间验证失败)"
            else:
                match_status = "not_matched"
            
            # 构建匹配的产品信息
            matched_product_dict = None
            if best_match:
                matched_product_dict = {
                    "id": best_match.id,
                    "code": best_match.code,
                    "product_name_en": best_match.product_name_en,
                    "product_name_zh": "",  # Product model doesn't have zh field
                    "product_name_jp": best_match.product_name_jp,
                    "purchase_price": float(best_match.price) if best_match.price else 0.0,
                    "currency": best_match.currency,
                    "supplier_id": best_match.supplier_id,
                    "category_id": best_match.category_id,
                }
            
            result = ProductMatchResult(
                cruise_product=cruise_product,
                matched_product=matched_product_dict,
                match_status=match_status,
                match_score=best_score,
                match_reason=match_reason
            )
            
            self.logger.debug(f"产品匹配: {cruise_product.product_name} -> {match_status} (分数: {best_score:.2f})")
            return result
            
        except Exception as e:
            self.logger.error(f"单个产品匹配失败: {str(e)}")
            return ProductMatchResult(
                cruise_product=cruise_product,
                matched_product=None,
                match_status="error",
                match_score=0.0,
                match_reason=f"匹配过程出错: {str(e)}"
            )
    
    def _calculate_match_score(self, cruise_product: CruiseOrderProduct, db_product: ProductModel, delivery_date: datetime = None) -> tuple[float, str, bool]:
        """
        计算匹配分数

        Returns:
            tuple[float, str, bool]: (分数, 匹配原因, 时间验证结果)
        """
        score = 0.0
        reasons = []

        # 🔍 DEBUG: 添加匹配过程日志
        self.logger.info(f"🎯 开始计算匹配分数:")
        self.logger.info(f"  邮轮产品: {cruise_product.product_name}")
        self.logger.info(f"  邮轮产品代码: {cruise_product.item_code}")
        self.logger.info(f"  数据库产品: {db_product.product_name_en}")
        self.logger.info(f"  数据库产品代码: {db_product.code}")
        self.logger.info(f"  送货时间: {delivery_date}")

        # 1. Item Code完全匹配 (最高优先级)
        if cruise_product.item_code and db_product.code:
            code_match = cruise_product.item_code.upper() == db_product.code.upper()
            self.logger.info(f"  🔍 代码匹配检查: '{cruise_product.item_code.upper()}' == '{db_product.code.upper()}' = {code_match}")
            if code_match:
                score = 1.0
                reasons.append("产品代码完全匹配")
                self.logger.info(f"  ✅ 代码完全匹配，分数: {score}")

                # 代码匹配后，进行时间验证
                if delivery_date:
                    time_valid = self._is_time_range_valid(db_product, delivery_date)
                    self.logger.info(f"  ⏰ 时间验证结果: {time_valid}")
                    if time_valid:
                        reasons.append("送货时间在有效期内")
                    else:
                        reasons.append("送货时间超出有效期范围")
                    return score, "; ".join(reasons), time_valid
                else:
                    # 没有送货时间，跳过时间验证
                    return score, "; ".join(reasons), True
        
        # 2. 产品名称相似度匹配
        name_scores = []
        
        # 与英文名称比较
        if db_product.product_name_en:
            similarity = SequenceMatcher(None, 
                cruise_product.product_name.upper(), 
                db_product.product_name_en.upper()
            ).ratio()
            name_scores.append(similarity)
            if similarity > 0.8:
                reasons.append(f"英文名称相似度高 ({similarity:.2f})")
        
        # 跳过中文名称比较，因为Product模型没有product_name_zh字段
        # if db_product.product_name_zh:
        #     similarity = SequenceMatcher(None, 
        #         cruise_product.product_name.upper(), 
        #         db_product.product_name_zh.upper()
        #     ).ratio()
        #     name_scores.append(similarity)
        #     if similarity > 0.8:
        #         reasons.append(f"中文名称相似度高 ({similarity:.2f})")
        
        # 与日文名称比较
        if db_product.product_name_jp:
            similarity = SequenceMatcher(None, 
                cruise_product.product_name.upper(), 
                db_product.product_name_jp.upper()
            ).ratio()
            name_scores.append(similarity)
            if similarity > 0.8:
                reasons.append(f"日文名称相似度高 ({similarity:.2f})")
        
        # 取最高的名称相似度
        if name_scores:
            max_name_score = max(name_scores)
            score += max_name_score * 0.8  # 名称匹配权重0.8
        
        # 3. 关键词匹配
        keyword_score = self._calculate_keyword_match(cruise_product.product_name, db_product)
        score += keyword_score * 0.2  # 关键词匹配权重0.2
        
        if keyword_score > 0.5:
            reasons.append("包含关键词匹配")
        
        # 确保分数不超过1.0
        score = min(score, 1.0)

        # 最后进行时间验证（如果有匹配分数）
        time_valid = True  # 默认时间验证通过
        if delivery_date and score > 0:
            time_valid = self._is_time_range_valid(db_product, delivery_date)
            self.logger.info(f"  ⏰ 时间验证结果: {time_valid}")
            if time_valid:
                reasons.append("送货时间在有效期内")
            else:
                reasons.append("送货时间超出有效期范围")

        return score, "; ".join(reasons) if reasons else "无明显匹配特征", time_valid
    
    def _calculate_keyword_match(self, cruise_name: str, db_product: ProductModel) -> float:
        """计算关键词匹配分数"""
        cruise_words = set(cruise_name.upper().split())
        
        all_db_words = set()
        if db_product.product_name_en:
            all_db_words.update(db_product.product_name_en.upper().split())
        # 跳过中文名称，因为Product模型没有product_name_zh字段
        # if db_product.product_name_zh:
        #     all_db_words.update(db_product.product_name_zh.upper().split())
        if db_product.product_name_jp:
            all_db_words.update(db_product.product_name_jp.upper().split())
        
        if not cruise_words or not all_db_words:
            return 0.0
        
        # 计算交集比例
        intersection = cruise_words.intersection(all_db_words)
        union = cruise_words.union(all_db_words)
        
        if not union:
            return 0.0
        
        return len(intersection) / len(union)

    def _is_time_range_valid(self, db_product: ProductModel, delivery_date: datetime) -> bool:
        """
        验证送货时间是否在产品有效期范围内

        Args:
            db_product: 数据库产品
            delivery_date: 送货时间

        Returns:
            bool: True表示时间在有效期内，False表示超出有效期
        """
        try:
            # 🔍 DEBUG: 添加详细的时间验证日志
            self.logger.info(f"🔍 时间验证开始:")
            self.logger.info(f"  产品: {db_product.product_name_en} (ID: {db_product.id})")
            self.logger.info(f"  产品代码: {db_product.code}")
            self.logger.info(f"  送货时间: {delivery_date} (类型: {type(delivery_date)})")
            self.logger.info(f"  有效期开始: {db_product.effective_from} (类型: {type(db_product.effective_from)})")
            self.logger.info(f"  有效期结束: {db_product.effective_to} (类型: {type(db_product.effective_to)})")

            # 🔧 修复时区问题：统一转换为无时区的datetime对象进行比较
            from datetime import datetime
            import pandas as pd

            # 转换送货时间为标准datetime（无时区）
            if isinstance(delivery_date, pd.Timestamp):
                delivery_dt = delivery_date.to_pydatetime().replace(tzinfo=None)
            elif hasattr(delivery_date, 'replace'):
                delivery_dt = delivery_date.replace(tzinfo=None)
            else:
                delivery_dt = delivery_date

            # 转换数据库时间为无时区datetime
            effective_from_dt = None
            effective_to_dt = None

            if db_product.effective_from:
                if hasattr(db_product.effective_from, 'replace'):
                    effective_from_dt = db_product.effective_from.replace(tzinfo=None)
                else:
                    effective_from_dt = db_product.effective_from

            if db_product.effective_to:
                if hasattr(db_product.effective_to, 'replace'):
                    effective_to_dt = db_product.effective_to.replace(tzinfo=None)
                else:
                    effective_to_dt = db_product.effective_to

            self.logger.info(f"  🔧 时区修复后:")
            self.logger.info(f"    送货时间: {delivery_dt}")
            self.logger.info(f"    有效期开始: {effective_from_dt}")
            self.logger.info(f"    有效期结束: {effective_to_dt}")

            # 如果产品没有设置有效期，默认认为有效
            if not effective_from_dt and not effective_to_dt:
                self.logger.info(f"  ✅ 结果: 产品没有设置有效期，默认有效")
                return True

            # 只有起始时间，检查送货时间是否在起始时间之后
            if effective_from_dt and not effective_to_dt:
                result = delivery_dt >= effective_from_dt
                self.logger.info(f"  📅 只有起始时间检查: {delivery_dt} >= {effective_from_dt} = {result}")
                return result

            # 只有结束时间，检查送货时间是否在结束时间之前
            if not effective_from_dt and effective_to_dt:
                result = delivery_dt <= effective_to_dt
                self.logger.info(f"  📅 只有结束时间检查: {delivery_dt} <= {effective_to_dt} = {result}")
                return result

            # 有完整的时间范围，检查送货时间是否在范围内
            if effective_from_dt and effective_to_dt:
                start_check = effective_from_dt <= delivery_dt
                end_check = delivery_dt <= effective_to_dt
                result = start_check and end_check
                self.logger.info(f"  📅 完整时间范围检查:")
                self.logger.info(f"    开始时间检查: {effective_from_dt} <= {delivery_dt} = {start_check}")
                self.logger.info(f"    结束时间检查: {delivery_dt} <= {effective_to_dt} = {end_check}")
                self.logger.info(f"    最终结果: {start_check} AND {end_check} = {result}")
                return result

            self.logger.info(f"  ✅ 结果: 默认返回True")
            return True

        except Exception as e:
            self.logger.error(f"❌ 时间范围验证异常: {str(e)}")
            self.logger.error(f"  产品: {db_product.product_name_en if hasattr(db_product, 'product_name_en') else 'Unknown'}")
            self.logger.error(f"  送货时间: {delivery_date}")
            self.logger.error(f"  异常类型: {type(e).__name__}")
            import traceback
            self.logger.error(f"  异常堆栈: {traceback.format_exc()}")
            # ⚠️ 修改: 异常时返回False，而不是True
            self.logger.error(f"  ❌ 因异常返回False")
            return False

    def get_match_statistics(self, match_results: List[ProductMatchResult]) -> Dict[str, Any]:
        """获取匹配统计信息"""
        total = len(match_results)
        matched = sum(1 for r in match_results if r.match_status == "matched")
        possible = sum(1 for r in match_results if r.match_status == "possible_match")
        unmatched = sum(1 for r in match_results if r.match_status == "not_matched")
        errors = sum(1 for r in match_results if r.match_status == "error")
        
        return {
            "total_products": total,
            "matched_products": matched,
            "possible_matches": possible,
            "unmatched_products": unmatched,
            "error_products": errors,
            "match_rate": (matched / total * 100) if total > 0 else 0,
            "avg_score": sum(r.match_score for r in match_results) / total if total > 0 else 0
        }