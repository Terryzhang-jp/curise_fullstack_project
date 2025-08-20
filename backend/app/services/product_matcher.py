"""
产品匹配服务
用于将订单中的产品与数据库中的产品进行匹配
"""
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import Product
import re
from difflib import SequenceMatcher
import logging

logger = logging.getLogger(__name__)

class ProductMatcher:
    """产品匹配器"""
    
    def __init__(self, db: Session):
        self.db = db
        self.products_cache = None
        self._load_products()
    
    def _load_products(self):
        """加载所有产品到缓存"""
        try:
            products = self.db.query(Product).filter(Product.status == True).all()
            self.products_cache = [
                {
                    "id": p.id,
                    "name_en": p.product_name_en or "",
                    "name_jp": p.product_name_jp or "",
                    "code": p.code or "",
                    "category_id": p.category_id,
                    "supplier_id": p.supplier_id,
                    "unit": p.unit or "",
                    "price": float(p.price) if p.price else 0,
                    "brand": p.brand or "",
                    "search_text": self._create_search_text(p)
                }
                for p in products
            ]
            logger.info(f"加载了 {len(self.products_cache)} 个产品到缓存")
        except Exception as e:
            logger.error(f"加载产品缓存失败: {str(e)}")
            self.products_cache = []
    
    def _create_search_text(self, product: Product) -> str:
        """创建产品搜索文本"""
        texts = []
        if product.product_name_en:
            texts.append(product.product_name_en.lower())
        if product.product_name_jp:
            texts.append(product.product_name_jp.lower())
        if product.code:
            texts.append(product.code.lower())
        if product.brand:
            texts.append(product.brand.lower())
        return " ".join(texts)
    
    def match_product(self, order_item: Dict[str, Any]) -> Dict[str, Any]:
        """
        匹配单个产品
        
        Args:
            order_item: 订单项目字典
            
        Returns:
            匹配结果字典
        """
        if not self.products_cache:
            return {
                "matched": False,
                "product_id": None,
                "confidence": 0.0,
                "match_type": "no_cache",
                "candidates": []
            }
        
        product_name = order_item.get("product_name", "").strip()
        product_code = order_item.get("product_code", "").strip()
        
        if not product_name and not product_code:
            return {
                "matched": False,
                "product_id": None,
                "confidence": 0.0,
                "match_type": "no_input",
                "candidates": []
            }
        
        # 尝试不同的匹配策略
        matches = []
        
        # 1. 精确代码匹配
        if product_code:
            exact_code_match = self._match_by_code(product_code)
            if exact_code_match:
                matches.append(exact_code_match)
        
        # 2. 精确名称匹配
        if product_name:
            exact_name_match = self._match_by_exact_name(product_name)
            if exact_name_match:
                matches.append(exact_name_match)
        
        # 3. 模糊名称匹配
        if product_name:
            fuzzy_matches = self._match_by_fuzzy_name(product_name)
            matches.extend(fuzzy_matches)
        
        # 4. 关键词匹配
        if product_name:
            keyword_matches = self._match_by_keywords(product_name)
            matches.extend(keyword_matches)
        
        # 去重并排序
        unique_matches = self._deduplicate_matches(matches)
        sorted_matches = sorted(unique_matches, key=lambda x: x["confidence"], reverse=True)
        
        # 返回最佳匹配
        if sorted_matches:
            best_match = sorted_matches[0]
            return {
                "matched": best_match["confidence"] >= 0.7,
                "product_id": best_match["product_id"],
                "confidence": best_match["confidence"],
                "match_type": best_match["match_type"],
                "candidates": sorted_matches[:5]  # 返回前5个候选
            }
        
        return {
            "matched": False,
            "product_id": None,
            "confidence": 0.0,
            "match_type": "no_match",
            "candidates": []
        }
    
    def _match_by_code(self, product_code: str) -> Optional[Dict[str, Any]]:
        """通过产品代码精确匹配"""
        code_lower = product_code.lower()
        
        for product in self.products_cache:
            if product["code"].lower() == code_lower:
                return {
                    "product_id": product["id"],
                    "confidence": 1.0,
                    "match_type": "exact_code",
                    "product": product
                }
        return None
    
    def _match_by_exact_name(self, product_name: str) -> Optional[Dict[str, Any]]:
        """通过产品名称精确匹配"""
        name_lower = product_name.lower().strip()
        
        for product in self.products_cache:
            if (product["name_en"].lower() == name_lower or 
                product["name_jp"].lower() == name_lower):
                return {
                    "product_id": product["id"],
                    "confidence": 1.0,
                    "match_type": "exact_name",
                    "product": product
                }
        return None
    
    def _match_by_fuzzy_name(self, product_name: str, threshold: float = 0.8) -> List[Dict[str, Any]]:
        """通过模糊名称匹配"""
        matches = []
        name_lower = product_name.lower().strip()
        
        for product in self.products_cache:
            # 与英文名称比较
            if product["name_en"]:
                similarity = SequenceMatcher(None, name_lower, product["name_en"].lower()).ratio()
                if similarity >= threshold:
                    matches.append({
                        "product_id": product["id"],
                        "confidence": similarity,
                        "match_type": "fuzzy_name_en",
                        "product": product
                    })
            
            # 与日文名称比较
            if product["name_jp"]:
                similarity = SequenceMatcher(None, name_lower, product["name_jp"].lower()).ratio()
                if similarity >= threshold:
                    matches.append({
                        "product_id": product["id"],
                        "confidence": similarity,
                        "match_type": "fuzzy_name_jp",
                        "product": product
                    })
        
        return matches
    
    def _match_by_keywords(self, product_name: str, threshold: float = 0.6) -> List[Dict[str, Any]]:
        """通过关键词匹配"""
        matches = []
        
        # 提取关键词
        keywords = self._extract_keywords(product_name)
        if not keywords:
            return matches
        
        for product in self.products_cache:
            score = self._calculate_keyword_score(keywords, product["search_text"])
            if score >= threshold:
                matches.append({
                    "product_id": product["id"],
                    "confidence": score,
                    "match_type": "keyword",
                    "product": product
                })
        
        return matches
    
    def _extract_keywords(self, text: str) -> List[str]:
        """提取关键词"""
        # 移除特殊字符，分割单词
        cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
        words = cleaned.split()
        
        # 过滤停用词和短词
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        keywords = [word for word in words if len(word) > 2 and word not in stop_words]
        
        return keywords
    
    def _calculate_keyword_score(self, keywords: List[str], search_text: str) -> float:
        """计算关键词匹配分数"""
        if not keywords:
            return 0.0
        
        matched_keywords = 0
        for keyword in keywords:
            if keyword in search_text:
                matched_keywords += 1
        
        return matched_keywords / len(keywords)
    
    def _deduplicate_matches(self, matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """去重匹配结果"""
        seen_ids = set()
        unique_matches = []
        
        for match in matches:
            product_id = match["product_id"]
            if product_id not in seen_ids:
                seen_ids.add(product_id)
                unique_matches.append(match)
            else:
                # 如果已存在，保留置信度更高的
                for i, existing in enumerate(unique_matches):
                    if existing["product_id"] == product_id:
                        if match["confidence"] > existing["confidence"]:
                            unique_matches[i] = match
                        break
        
        return unique_matches
    
    def match_order_items(self, order_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        批量匹配订单项目
        
        Args:
            order_items: 订单项目列表
            
        Returns:
            匹配结果列表
        """
        results = []
        
        for item in order_items:
            match_result = self.match_product(item)
            results.append({
                "order_item": item,
                "match_result": match_result
            })
        
        return results
    
    def get_match_statistics(self, match_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """获取匹配统计信息"""
        total_items = len(match_results)
        matched_items = sum(1 for result in match_results if result["match_result"]["matched"])
        
        match_types = {}
        confidence_distribution = {"high": 0, "medium": 0, "low": 0}
        
        for result in match_results:
            match_result = result["match_result"]
            
            # 统计匹配类型
            match_type = match_result["match_type"]
            match_types[match_type] = match_types.get(match_type, 0) + 1
            
            # 统计置信度分布
            confidence = match_result["confidence"]
            if confidence >= 0.9:
                confidence_distribution["high"] += 1
            elif confidence >= 0.7:
                confidence_distribution["medium"] += 1
            else:
                confidence_distribution["low"] += 1
        
        return {
            "total_items": total_items,
            "matched_items": matched_items,
            "unmatched_items": total_items - matched_items,
            "match_rate": matched_items / total_items if total_items > 0 else 0,
            "match_types": match_types,
            "confidence_distribution": confidence_distribution
        }
