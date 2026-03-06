"""
状态效果系统
处理中毒、灼烧、麻痹、冰冻、睡眠等状态
"""
import random
from typing import Dict, List


class StatusEffect:
    """状态效果类"""
    
    @staticmethod
    def apply_status_effect(monster: Dict, effect: str) -> Dict:
        """
        应用状态效果
        
        Args:
            monster: 怪物数据
            effect: 效果名称
        
        Returns:
            应用结果
        """
        result = {
            "success": False,
            "message": "",
            "damage": 0
        }
        
        if monster['status'] != 'normal':
            result['message'] = f"{monster['name']}已经处于{monster['status']}状态"
            return result
        
        # 根据效果类型应用
        if effect == 'poison':
            monster['status'] = 'poisoned'
            result['success'] = True
            result['message'] = f"{monster['name']}中毒了！"
        
        elif effect == 'burn':
            monster['status'] = 'burned'
            result['success'] = True
            result['message'] = f"{monster['name']}被灼烧了！"
        
        elif effect == 'paralyze':
            monster['status'] = 'paralyzed'
            result['success'] = True
            result['message'] = f"{monster['name']}麻痹了！"
        
        elif effect == 'freeze':
            monster['status'] = 'frozen'
            result['success'] = True
            result['message'] = f"{monster['name']}被冻住了！"
        
        elif effect == 'sleep':
            monster['status'] = 'sleeping'
            result['success'] = True
            result['message'] = f"{monster['name']}睡着了！"
        
        return result
    
    @staticmethod
    def process_status_effect(monster: Dict) -> Dict:
        """
        处理状态效果（每回合结束时调用）
        
        Args:
            monster: 怪物数据
        
        Returns:
            处理结果
        """
        result = {
            "can_act": True,
            "damage": 0,
            "message": "",
            "status_cleared": False
        }
        
        status = monster.get('status', 'normal')
        
        if status == 'normal':
            return result
        
        # 中毒：每回合损失1/8 HP
        if status == 'poisoned':
            damage = max(1, int(monster['max_hp'] / 8))
            monster['hp'] = max(0, monster['hp'] - damage)
            result['damage'] = damage
            result['message'] = f"{monster['name']}受到毒素伤害 {damage}！"
        
        # 灼烧：每回合损失1/16 HP + 攻击减半
        elif status == 'burned':
            damage = max(1, int(monster['max_hp'] / 16))
            monster['hp'] = max(0, monster['hp'] - damage)
            result['damage'] = damage
            result['message'] = f"{monster['name']}受到灼烧伤害 {damage}！"
        
        # 麻痹：25%几率无法行动
        elif status == 'paralyzed':
            if random.random() < 0.25:
                result['can_act'] = False
                result['message'] = f"{monster['name']}因麻痹无法行动！"
        
        # 冰冻：无法行动，10%几率解冻
        elif status == 'frozen':
            if random.random() < 0.1:
                monster['status'] = 'normal'
                result['status_cleared'] = True
                result['message'] = f"{monster['name']}解冻了！"
            else:
                result['can_act'] = False
                result['message'] = f"{monster['name']}被冻住无法行动！"
        
        # 睡眠：无法行动，持续1-3回合
        elif status == 'sleeping':
            # 简化处理：20%几率醒来
            if random.random() < 0.2:
                monster['status'] = 'normal'
                result['status_cleared'] = True
                result['message'] = f"{monster['name']}醒来了！"
            else:
                result['can_act'] = False
                result['message'] = f"{monster['name']}正在睡觉..."
        
        return result
    
    @staticmethod
    def clear_status(monster: Dict) -> Dict:
        """
        清除状态效果
        
        Args:
            monster: 怪物数据
        
        Returns:
            清除结果
        """
        old_status = monster.get('status', 'normal')
        monster['status'] = 'normal'
        
        return {
            "success": True,
            "old_status": old_status,
            "message": f"{monster['name']}的{old_status}状态被清除了！"
        }


# 状态效果实例
status_effect = StatusEffect()


def apply_status_from_technique(monster: Dict, technique_effects: List[str]) -> Dict:
    """
    从技能效果中应用状态
    
    Args:
        monster: 怪物数据
        technique_effects: 技能效果列表（格式：["poison:30", "burn:10"]）
    
    Returns:
        应用结果
    """
    for effect_str in technique_effects:
        parts = effect_str.split(':')
        if len(parts) == 2:
            effect_name = parts[0]
            probability = int(parts[1])
            
            # 根据概率判断是否触发
            if random.randint(1, 100) <= probability:
                return status_effect.apply_status_effect(monster, effect_name)
    
    return {"success": False, "message": "状态效果未触发"}
